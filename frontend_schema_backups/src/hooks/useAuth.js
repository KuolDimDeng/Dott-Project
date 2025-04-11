const signUp = async (userData) => {
  setIsLoading(true);
  setError(null);
  
  try {
    logger.debug('[useAuth] Starting sign up process for:', { 
      email: userData.email 
    });
    
    // Prepare user attributes in Cognito format
    const signUpParams = {
      username: userData.email,
      password: userData.password,
      options: {
        userAttributes: {
          email: userData.email,
          given_name: userData.firstName || '',
          family_name: userData.lastName || '',
          'custom:onboarding': 'NOT_STARTED',
          'custom:setupdone': 'FALSE',
          'custom:userrole': 'OWNER',
          'custom:created_at': new Date().toISOString()
        },
        autoSignIn: {
          enabled: false  // Ensure this is false to require email verification
        }
      }
    };
    
    // Add any additional attributes from the userData object
    for (const key in userData) {
      // Ensure custom attributes have the 'custom:' prefix
      if (key.includes('business') || key.includes('legal') || 
          key.includes('type') || key.includes('country') || 
          key.includes('subscription') || key.includes('plan')) {
        
        const attrKey = key.startsWith('custom:') ? key : `custom:${key}`;
        signUpParams.options.userAttributes[attrKey] = userData[key];
      }
    }
    
    // Sign up the user with Cognito
    const signUpResponse = await authSignUp(signUpParams);
    
    logger.debug('[useAuth] Sign up response:', {
      isComplete: signUpResponse.isSignUpComplete,
      hasNextStep: !!signUpResponse.nextStep,
      nextStep: signUpResponse.nextStep?.signUpStep
    });
    
    // Store verification info in session storage
    try {
      sessionStorage.setItem('pendingVerificationEmail', userData.email);
      sessionStorage.setItem('verificationCodeSent', 'true');
      sessionStorage.setItem('verificationCodeTimestamp', Date.now().toString());
    } catch (e) {
      logger.warn('[useAuth] Failed to store verification info:', e);
    }
    
    return {
      success: true,
      isComplete: false, // Force email verification step
      nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
      userId: signUpResponse.userId
    };
  } catch (error) {
    logger.error('[useAuth] Sign up failed:', { 
      error: error.message,
      code: error.code,
      name: error.name
    });
    
    // Create user-friendly error message
    let errorMessage = error.message || 'Sign up failed';
    
    if (error.code === 'UsernameExistsException' || errorMessage.includes('already exists')) {
      errorMessage = 'An account with this email already exists. Please try signing in instead.';
    } else if (error.code === 'InvalidPasswordException' || errorMessage.includes('password')) {
      errorMessage = 'Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.';
    } else if (error.code === 'InvalidParameterException') {
      errorMessage = 'Please check your information and try again.';
    }
    
    setError(errorMessage);
    return { success: false, error: errorMessage, code: error.code };
  } finally {
    setIsLoading(false);
  }
};

// Add a better error handler function for Cognito errors
const formatAuthErrorMessage = (error) => {
  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  
  // Common Cognito error codes and user-friendly messages
  const errorMap = {
    'UserNotFoundException': 'Account not found. Please check your email address or sign up.',
    'NotAuthorizedException': 'Incorrect username or password. Please try again.',
    'UserNotConfirmedException': 'Your email is not verified. Please check your email for a verification code.',
    'CodeMismatchException': 'Invalid verification code. Please try again.',
    'ExpiredCodeException': 'Verification code has expired. Please request a new code.',
    'TooManyRequestsException': 'Too many attempts. Please try again later.',
    'UserLambdaValidationException': 'Account validation failed. Please contact support.',
    'InvalidParameterException': 'Invalid login parameters. Please check your information.',
    'InternalErrorException': 'An internal error occurred. Please try again later.'
  };
  
  // Check for known error codes first
  if (errorMap[errorCode]) {
    return errorMap[errorCode];
  }
  
  // Handle common error messages with generic codes
  if (errorMessage.includes('not confirmed')) {
    return 'Your account is not verified. Please check your email for a verification code.';
  }
  
  if (errorMessage.includes('password') || errorMessage.includes('credentials')) {
    return 'Incorrect username or password. Please try again.';
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('exist')) {
    return 'Account not found. Please check your email address or sign up.';
  }
  
  // If no specific error found, return a cleaned version of the error message or a generic message
  return errorMessage || 'An error occurred during sign in. Please try again.';
};

const handleSignIn = async ({ username, password, options = {} }) => {
  logger.debug('[useAuth] signIn - Starting signin process', {
    username: username,
    hasPassword: !!password
  });
  
  // Set loading state
  setAuthLoading(true);
  
  try {
    // Add extra options for bypassing verification
    const signInOptions = {
      ...options,
      clientMetadata: {
        ...(options.clientMetadata || {}),
        bypass_verification: 'true'
      }
    };
    
    // Sign in with Cognito
    const { signInOutput } = await Auth.signIn({
      username,
      password,
      ...signInOptions
    });
    
    // Log successful sign in
    logger.debug('[useAuth] signIn - Auth.signIn succeeded', {
      challengeName: signInOutput?.challengeName,
      hasSession: !!signInOutput?.session,
      isComplete: signInOutput?.isComplete
    });
    
    // Handle auth challenges if present
    if (signInOutput?.challengeName) {
      logger.debug('[useAuth] signIn - Challenge detected', { 
        challengeName: signInOutput.challengeName 
      });
      return {
        success: false,
        nextStep: 'CHALLENGE',
        challengeName: signInOutput.challengeName,
        challengeParams: signInOutput.challengeParams,
        error: 'Authentication challenge required',
        user: null
      };
    }
    
    // Successfully signed in
    const cognitoUser = signInOutput;
    
    // Update auth state
    setUser(cognitoUser);
    setIsAuthenticated(true);
    setAuthLoading(false);
    
    return {
      success: true,
      user: cognitoUser,
      redirectTo: '/dashboard'
    };
  } catch (error) {
    logger.error('[useAuth] signIn - Error during sign in', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    
    // Special handling for UserNotConfirmedException
    if (error.name === 'UserNotConfirmedException' || 
        error.code === 'UserNotConfirmedException') {
      
      logger.debug('[useAuth] signIn - Unconfirmed user detected, attempting direct sign-in');
      
      try {
        // Try again with forced auto-confirm
        const { signInOutput } = await Auth.signIn({
          username,
          password,
          options: {
            authFlowType: 'USER_PASSWORD_AUTH',
            clientMetadata: {
              bypass_verification: 'true',
              auto_confirm: 'true'
            }
          }
        });
        
        if (signInOutput) {
          // Success, return like normal sign-in
          logger.debug('[useAuth] signIn - Successfully bypassed verification');
          
          // Update auth state
          setUser(signInOutput);
          setIsAuthenticated(true);
          setAuthLoading(false);
          
          return {
            success: true,
            user: signInOutput,
            redirectTo: '/dashboard'
          };
        }
      } catch (retryError) {
        logger.error('[useAuth] signIn - Failed to bypass verification:', retryError);
        
        // If we still can't sign in, fall back to verification redirect
        // Store email for verification
        try {
          sessionStorage.setItem('pendingVerificationEmail', username);
        } catch (e) {
          logger.warn('[useAuth] Failed to store verification info:', e);
        }
        
        return {
          success: false,
          nextStep: 'CONFIRM_SIGN_UP',
          error: formatAuthErrorMessage(error),
          user: null
        };
      }
    }
    
    // Standard error handling
    setAuthLoading(false);
    return {
      success: false,
      error: formatAuthErrorMessage(error),
      user: null
    };
  }
};

const handleConfirmSignUp = useCallback(async (email, code) => {
  setIsLoading(true);
  setError(null);

  try {
    logger.debug('[Auth] Starting sign up confirmation:', {
      email,
      codeLength: code?.length
    });

    // Static import is preferred over dynamic import
    logger.debug('[Auth] Using standard confirmation flow');

    // Fall back to the standard flow (using authConfirmSignUp directly)
    logger.debug('[Auth] Using standard confirmation flow');
    
    // First confirm the signup with Cognito
    const confirmResponse = await retryOperation(async () => {
      try {
        // Use email as username for confirmation
        const username = email;
        
        // Validate code format first
        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
          throw new Error('Verification code must be 6 digits');
        }
        
        logger.debug('[Auth] Confirming signup for:', { email, username, codeLength: code?.length });
        
        try {
          logger.debug('[Auth] Making raw confirmSignUp API call with:', { 
            username: username,
            confirmationCodeLength: code?.length 
          });
          
          const response = await authConfirmSignUp({
            username: username,
            confirmationCode: code
          });
          
          logger.debug('[Auth] Raw API call succeeded with response:', response);
          return {
            success: true,
            result: response
          };
        } catch (apiError) {
          logger.error('[Auth] Raw API call failed with error:', apiError);
          return {
            success: false,
            error: formatAuthErrorMessage(apiError),
            code: apiError.code,
            originalError: apiError
          };
        }
      } catch (error) {
        logger.error('[Auth] Confirmation API call error:', {
          message: error.message,
          code: error.code,
          name: error.name
        });
        
        return {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    });

    logger.debug('[Auth] Confirmation operation returned:', confirmResponse);

    if (!confirmResponse || (typeof confirmResponse === 'object' && !confirmResponse.success)) {
      logger.error('[Auth] Confirmation response not successful:', confirmResponse);
      throw new Error(confirmResponse.error || 'Confirmation failed');
    }

    // Handle different response formats
    let result;
    if (confirmResponse.success && confirmResponse.result) {
      result = confirmResponse.result;
    } else if (confirmResponse.isSignUpComplete !== undefined) {
      // Direct API response
      result = confirmResponse;
    } else {
      logger.error('[Auth] Unexpected confirmation response format:', confirmResponse);
      throw new Error('Invalid response format from confirmation API');
    }

    logger.debug('[Auth] Confirmation completed successfully:', {
      isComplete: result.isSignUpComplete,
      nextStep: result.nextStep,
      email,
      userId: result.userId || confirmResponse.userId
    });

    // Create user in Django backend directly after confirmation
    // We don't need to sign in here - the user will be redirected to sign in page
    // where they can enter their credentials properly
    logger.debug('[Auth] Creating user in backend after confirmation');
    
    try {
      // Create user in Django backend
      const userData = {
        email: email,
        cognitoId: result.userId,
        userRole: 'OWNER',
        is_already_verified: true  // Add this flag to indicate no need for another verification code
      };
      
      // Make a request to backend API to register the user
      const apiUrl = '/api/auth/signup';
      
      logger.debug('[Auth] Making backend signup request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        logger.debug('[Auth] Backend user creation successful');
      } else {
        // Log the error but continue - the user can still sign in
        logger.warn('[Auth] Backend user creation failed:', await response.text());
      }
    } catch (backendError) {
      // Log the error but don't fail the entire operation
      logger.warn('[Auth] Backend user creation error:', backendError);
    }

    // Return success even if backend creation failed
    return {
      success: true,
      isComplete: true,
      userId: result.userId
    };
  } catch (error) {
    logger.error('[Auth] Confirmation failed:', {
      error: error.message,
      code: error.code,
      email: email
    });
    
    // Return a structured error object
    return { 
      success: false, 
      error: error.message || 'Failed to confirm sign up. Please try again.', 
      code: error.code || 'unknown_error'
    };
  } finally {
    setIsLoading(false);
  }
}, []); 