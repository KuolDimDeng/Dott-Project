'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  confirmSignUp as authConfirmSignUp,
  resetPassword as authResetPassword,
  confirmResetPassword as authConfirmResetPassword,
  getCurrentUser as authGetCurrentUser,
  fetchAuthSession as authFetchAuthSession,
  Hub,
  signOut as authSignOut,
  resendSignUpCode as authResendSignUpCode
} from '@/config/amplifyUnified';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const AUTH_FLOWS = {
  USER_PASSWORD: 'ALLOW_USER_PASSWORD_AUTH',
  USER_SRP: 'ALLOW_USER_SRP_AUTH',
  REFRESH_TOKEN: 'ALLOW_REFRESH_TOKEN_AUTH'
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const router = useRouter();
  const refreshingRef = useRef(false);

  const retryOperation = async (operation, retryCount = 0) => {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < MAX_RETRIES && 
          (error.message.includes('network') || error.message.includes('timeout'))) {
        const delay = Math.pow(2, retryCount) * RETRY_DELAY;
        logger.debug(`[Auth] Retrying operation after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryOperation(operation, retryCount + 1);
      }
      throw error;
    }
  };

  const handleSignIn = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if there's an existing signed-in user
      try {
        try {
          const signOutResult = await authSignOut();
          if (signOutResult.success) {
            logger.debug('[Auth] Signed out existing user');
          } else {
            logger.debug('[Auth] Failed to sign out existing user:', signOutResult.error);
          }
        } catch (error) {
          logger.debug('[Auth] Error signing out existing user:', error);
        }
      } catch (error) {
        // Ignore errors here as there might not be a signed-in user
        logger.debug('[Auth] No existing user to sign out');
      }

      logger.debug('[Auth] Starting sign in process:', {
        username,
        authFlow: 'TRYING_MULTIPLE_FLOWS'
      });

      // Attempt sign in with our updated auth module - directly pass username and password
      // The updated signIn function will try multiple auth flows if needed
      let signInResponse;
      try {
        signInResponse = await authSignIn({
          username,
          password,
          options: {
            authFlowType: 'USER_PASSWORD_AUTH'
          }
        });
        logger.debug('[Auth] Direct sign in successful:', {
          isSignedIn: signInResponse.isSignedIn,
          nextStep: signInResponse.nextStep
        });
      } catch (signInError) {
        logger.error('[Auth] Direct sign in failed:', signInError);
        throw signInError;
      }

      if (!signInResponse.isSignedIn) {
        if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          logger.debug('[Auth] User needs to confirm signup');
          router.push(`/auth/verify-email?email=${encodeURIComponent(username)}`);
          return { success: false, nextStep: signInResponse.nextStep };
        }
        throw new Error('Sign in failed - user not signed in');
      }

      logger.debug('[Auth] Sign in successful, fetching session');

      // Get session immediately after sign in
      let sessionResponse;
      try {
        sessionResponse = await authFetchAuthSession({ forceRefresh: true });
        logger.debug('[Auth] Session fetched successfully:', {
          hasIdToken: !!sessionResponse.tokens?.idToken,
          hasAccessToken: !!sessionResponse.tokens?.accessToken
        });
      } catch (sessionError) {
        logger.error('[Auth] Error fetching session:', sessionError);
        throw new Error('Failed to fetch session after sign in');
      }

      if (!sessionResponse.tokens?.idToken) {
        throw new Error('No valid session token after sign in');
      }

      // Update session state
      setSession(sessionResponse);

      // Get current user before refreshing session
      let currentUser;
      try {
        currentUser = await authGetCurrentUser();
        logger.debug('[Auth] Current user fetched successfully:', {
          username: currentUser.username,
          userId: currentUser.userId
        });
      } catch (userError) {
        logger.error('[Auth] Error fetching current user:', userError);
        throw new Error('Failed to get current user after sign in');
      }

      // No longer need to set cookies, instead store in AppCache and update Cognito attributes
      try {
        logger.debug('[Auth] Storing authentication tokens in AppCache');
        
        // Store tokens in AppCache for client-side access
        const { setInAppCache } = await import('@/utils/appCacheUtils');
        await setInAppCache('idToken', sessionResponse.tokens.idToken.toString(), 3600); // 1 hour TTL
        await setInAppCache('accessToken', sessionResponse.tokens.accessToken.toString(), 3600);
        if (sessionResponse.tokens.refreshToken) {
          await setInAppCache('refreshToken', sessionResponse.tokens.refreshToken.toString(), 86400); // 24 hours TTL
        }
        
        // Update Cognito user attributes with essential information
        const { setCognitoUserAttribute } = await import('@/utils/cognitoUtils');
        
        // Set the authenticated status in user attributes for services that need it
        await setCognitoUserAttribute('custom:authenticated', 'true');
        
        // Extract email and other basic info from tokens if available
        try {
          const payload = sessionResponse.tokens.idToken.payload;
          if (payload && payload.email) {
            await setCognitoUserAttribute('email', payload.email);
          }
        } catch (payloadError) {
          logger.warn('[Auth] Error extracting token payload:', payloadError);
        }
        
        logger.debug('[Auth] Authentication data stored successfully');
      } catch (storageError) {
        logger.error('[Auth] Error storing authentication data:', storageError);
        // Continue even if storage fails
      }

      logger.debug('[Auth] Session established successfully');

      return { success: true, user: currentUser };
    } catch (error) {
      logger.error('[Auth] Sign in failed:', {
        error: error.message,
        username,
        code: error.code,
        stack: error.stack
      });
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      logger.debug('[Auth] Starting sign out process');

      const signOutResult = await retryOperation(async () => {
        return authSignOut();
      });
      
      if (signOutResult.success) {
        logger.debug('[Auth] Sign out completed successfully');
      } else {
        logger.debug('[Auth] Sign out failed:', signOutResult.error);
      }

      setSession(null);
      router.push('/auth/signin');
      return { success: true };
    } catch (error) {
      logger.error('[Auth] Sign out failed:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  const handleSignUp = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if there's an existing signed-in user
      try {
        const signOutResult = await authSignOut();
        if (signOutResult.success) {
          logger.debug('[Auth] Signed out existing user');
        } else {
          logger.debug('[Auth] Failed to sign out existing user:', signOutResult.error);
        }
      } catch (error) {
        // Ignore errors here as there might not be a signed-in user
        logger.debug('[Auth] No existing user to sign out');
      }

      logger.debug('[Auth] Starting sign up process:', { 
        email: userData.email,
        attributes: Object.keys(userData)
      });

      // Log the signup attempt with sanitized data (no password)
      logger.debug('[Auth] Attempting sign up with:', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        attributeCount: Object.keys(userData).length
      });
      
      // Prepare user attributes with all required Cognito attributes
      const timestamp = new Date().toISOString();
      const updatedAttributes = {
        'custom:businesscountry': userData.country || 'us',
        'custom:businessid': '', // Will be set after confirmation
        'custom:businessname': userData.businessName || 
          (userData.firstName ? `${userData.firstName}'s Business` : 
           userData.email ? `${userData.email.split('@')[0]}'s Business` : 'My Business'),
        'custom:businesstype': userData.businessType || 'Other',
        'custom:datefounded': timestamp.split('T')[0], // Just the date part
        'custom:legalstructure': userData.legalStructure || 'Individual',
        'custom:onboardingstatus': 'new',
        'custom:setupdone': 'false',
        'custom:subinterval': 'monthly',
        'custom:subplan': 'free',
        'custom:subscriptioninterval': 'monthly',
        'custom:subscriptionstatus': 'active'
      };
      
      logger.debug('[Auth] Prepared user attributes:', {
        attributeCount: Object.keys(updatedAttributes).length,
        attributes: Object.keys(updatedAttributes)
      });
      
      const signUpResponse = await retryOperation(async () => {
        try {
          logger.debug('[Auth] Calling authSignUp with:', {
            username: userData.email,
            hasPassword: !!userData.password,
            attributeCount: Object.keys(updatedAttributes).length
          });
          
          const response = await authSignUp({
            username: userData.email,
            password: userData.password,
            options: {
              userAttributes: updatedAttributes,
              autoSignIn: {
                enabled: true,
                authFlowType: 'USER_PASSWORD_AUTH'
              }
            }
          });
          
          logger.debug('[Auth] Sign up API response received:', {
            success: response.isSignUpComplete !== undefined,
            isSignUpComplete: response.isSignUpComplete,
            hasNextStep: !!response.nextStep,
            nextStep: response.nextStep?.signUpStep,
            userId: response.userId
          });
          
          return {
            success: true,
            result: response
          };
        } catch (error) {
          logger.error('[Auth] Sign up API call error:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
          });
          
          // Check for specific error codes and translate them into user-friendly errors
          let errorMessage = error.message;
          if (error.code === 'UsernameExistsException') {
            errorMessage = 'An account with this email already exists. Please sign in or reset your password.';
          } else if (error.code === 'InvalidPasswordException') {
            errorMessage = 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.';
          } else if (error.code === 'InvalidParameterException' && error.message.includes('username')) {
            errorMessage = 'Please enter a valid email address.';
          }
          
          return {
            success: false,
            error: errorMessage,
            code: error.code,
            name: error.name
          };
        }
      });

      if (!signUpResponse.success) {
        throw new Error(signUpResponse.error || 'Sign up failed');
      }

      const signUpResult = signUpResponse.result;

      logger.debug('[Auth] Sign up completed:', {
        isComplete: signUpResult.isSignUpComplete,
        nextStep: signUpResult.nextStep?.signUpStep,
        userId: signUpResult.userId
      });

      // Store information for verification page
      try {
        sessionStorage.setItem('pendingVerificationEmail', userData.email);
        sessionStorage.setItem('verificationCodeSent', 'true');
        sessionStorage.setItem('verificationCodeTimestamp', Date.now().toString());
      } catch (e) {
        logger.warn('[Auth] Failed to store verification info in sessionStorage:', e);
      }

      // Don't try to get session or create backend user yet - wait for confirmation
      if (!signUpResult.isSignUpComplete) {
        return {
          success: true,
          isComplete: false,
          nextStep: signUpResult.nextStep,
          userId: signUpResult.userId
        };
      }

      // Return signup result - backend creation will happen after confirmation
      return {
        success: true,
        isComplete: signUpResult.isSignUpComplete,
        nextStep: signUpResult.nextStep,
        userId: signUpResult.userId
      };
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Sign up failed';
      const errorCode = error.code || 'unknown_error';
      
      // Log detailed error information
      logger.error('[Auth] Sign up failed:', {
        error: errorMessage,
        code: errorCode,
        email: userData.email,
        name: error.name,
        stack: error.stack
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'UsernameExistsException' || errorMessage.includes('already exists')) {
        userFriendlyMessage = 'An account with this email already exists. Please try signing in instead.';
      } else if (errorCode === 'InvalidParameterException' && errorMessage.includes('password')) {
        userFriendlyMessage = 'Password does not meet requirements. Please ensure it has at least 8 characters including uppercase, lowercase, numbers, and special characters.';
      } else if (errorCode === 'InvalidParameterException') {
        userFriendlyMessage = 'One or more fields contain invalid values. Please check your information and try again.';
      } else if (errorCode === 'LimitExceededException') {
        userFriendlyMessage = 'Too many attempts. Please try again later.';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmSignUp = useCallback(async (email, code) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[Auth] Starting sign up confirmation:', {
        email,
        codeLength: code?.length
      });

      // First confirm the signup with Cognito
      logger.debug('[Auth] Calling authConfirmSignUp');
      const confirmResponse = await retryOperation(async () => {
        try {
          const response = await authConfirmSignUp({
            username: email,
            confirmationCode: code
          });
          
          logger.debug('[Auth] Confirmation API response received:', {
            isComplete: response.isSignUpComplete,
            hasNextStep: !!response.nextStep,
            nextStep: response.nextStep?.signUpStep
          });
          
          return {
            success: true,
            result: response
          };
        } catch (error) {
          logger.error('[Auth] Confirmation API call error:', {
            message: error.message,
            code: error.code,
            name: error.name
          });
          
          // Create user-friendly error messages for common confirmation errors
          let errorMessage = error.message;
          
          if (error.code === 'CodeMismatchException') {
            errorMessage = 'The verification code you entered is incorrect. Please check your email and try again.';
          } else if (error.code === 'ExpiredCodeException') {
            errorMessage = 'This verification code has expired. We\'ve sent a new code to your email.';
            
            // Attempt to resend the code automatically
            try {
              await authResendSignUpCode({ username: email });
              errorMessage += ' Please check your inbox for the new code.';
            } catch (resendError) {
              logger.error('[Auth] Failed to resend verification code:', resendError);
            }
          } else if (error.code === 'NotAuthorizedException' && error.message.includes('already confirmed')) {
            errorMessage = 'Your account is already confirmed. Please try signing in.';
          } else if (error.code === 'UserNotFoundException') {
            errorMessage = 'No account found with this email address. Please sign up first.';
          } else if (error.code === 'LimitExceededException') {
            errorMessage = 'Too many attempts. Please try again in a few minutes.';
          }
          
          return {
            success: false,
            error: errorMessage,
            code: error.code
          };
        }
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Confirmation failed');
      }

      const result = confirmResponse.result;

      logger.debug('[Auth] Confirmation completed successfully:', {
        isComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        email
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
          userRole: 'owner'
        };
        
        logger.debug('[Auth] Sending user data to backend:', userData);
        
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error('[Auth] Backend API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.message || `Backend API error: ${response.status} ${response.statusText}`);
        }

        const backendResult = await response.json();
        logger.debug('[Auth] Backend user creation completed successfully:', backendResult);
      } catch (backendError) {
        logger.error('[Auth] Backend user creation failed:', {
          error: backendError.message,
          stack: backendError.stack
        });
        throw new Error(`Failed to create user in backend: ${backendError.message}`);
      }
      
      return {
        success: true,
        isComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        userId: backendResult.userId
      };
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Confirmation failed';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Confirmation failed:', {
        error: errorMessage,
        code: errorCode,
        email,
        name: error.name,
        stack: error.stack
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'CodeMismatchException') {
        userFriendlyMessage = 'The verification code is incorrect. Please check and try again.';
      } else if (errorCode === 'ExpiredCodeException') {
        userFriendlyMessage = 'The verification code has expired. Please request a new code.';
      } else if (errorCode === 'LimitExceededException') {
        userFriendlyMessage = 'Too many attempts. Please try again later.';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('backend')) {
        userFriendlyMessage = 'There was an issue creating your account. Please try again or contact support.';
      }
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthEvents = async ({ payload }) => {
      logger.debug('[Auth] Auth event received:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
          try {
            const sessionResponse = await authFetchAuthSession({
              forceRefresh: true
            });

            logger.debug('[Auth] Session fetched after sign in:', sessionResponse);

            if (sessionResponse.tokens?.idToken) {
              setSession(sessionResponse);
              
              // Set up cookies via API route after sign in event
              try {
                logger.debug('[Auth] Storing authentication data after sign in event');
                
                // Store tokens in AppCache for client-side access
                const { setInAppCache } = await import('@/utils/appCacheUtils');
                const tokens = {
                  idToken: payload.data.signInUserSession.idToken.jwtToken,
                  accessToken: payload.data.signInUserSession.accessToken.jwtToken,
                  refreshToken: payload.data.signInUserSession.refreshToken.token
                };
                
                await setInAppCache('idToken', tokens.idToken, 3600); // 1 hour TTL
                await setInAppCache('accessToken', tokens.accessToken, 3600);
                await setInAppCache('refreshToken', tokens.refreshToken, 86400); // 24 hours TTL
                
                logger.debug('[Auth] Authentication data stored after sign in event');
              } catch (storageError) {
                logger.error('[Auth] Error storing authentication data after sign in event:', storageError);
              }
              
              logger.debug('[Auth] Session established after sign in');
            }
          } catch (error) {
            logger.error('[Auth] Error handling sign in:', error);
          }
          break;

        case 'signedOut':
          setSession(null);
          logger.debug('[Auth] Session cleared after sign out');
          break;

        case 'tokenRefresh':
          try {
            const sessionResponse = await authFetchAuthSession({
              forceRefresh: true
            });

            logger.debug('[Auth] Session fetched after token refresh:', sessionResponse);

            if (sessionResponse.tokens?.idToken) {
              setSession(sessionResponse);
              
              // Set up cookies via API route after token refresh
              try {
                logger.debug('[Auth] Storing refreshed tokens in AppCache');
                
                // Store tokens in AppCache for client-side access
                const { setInAppCache } = await import('@/utils/appCacheUtils');
                const tokens = {
                  idToken: payload.data.signInUserSession.idToken.jwtToken,
                  accessToken: payload.data.signInUserSession.accessToken.jwtToken
                };
                
                await setInAppCache('idToken', tokens.idToken, 3600); // 1 hour TTL
                await setInAppCache('accessToken', tokens.accessToken, 3600);
                
                logger.debug('[Auth] Refreshed tokens stored in AppCache');
              } catch (storageError) {
                logger.error('[Auth] Error storing refreshed tokens:', storageError);
              }
              
              logger.debug('[Auth] Session refreshed successfully');
            }
          } catch (error) {
            logger.error('[Auth] Token refresh failed:', error);
            router.push('/auth/signin');
          }
          break;

        case 'tokenRefresh_failure':
          logger.error('[Auth] Token refresh failed:', payload.data);
          setSession(null);
          router.push('/auth/signin');
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', handleAuthEvents);
    return () => unsubscribe();
  }, [router]);

  const handleResendVerificationCode = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[Auth] Resending verification code to:', email);
      
      try {
        const resendResponse = await authResendSignUpCode({ username: email });
        
        logger.debug('[Auth] Resend verification code response:', {
          success: resendResponse.success,
          hasError: !!resendResponse.error
        });
        
        if (!resendResponse.success) {
          throw new Error(resendResponse.error || 'Failed to resend verification code');
        }
        
        logger.debug('[Auth] Verification code resent successfully');
        return { success: true };
      } catch (apiError) {
        logger.error('[Auth] API error resending verification code:', {
          message: apiError.message,
          code: apiError.code,
          name: apiError.name
        });
        throw apiError;
      }
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Failed to resend verification code';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Failed to resend verification code:', {
        error: errorMessage,
        code: errorCode,
        email,
        name: error.name,
        stack: error.stack
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'LimitExceededException') {
        userFriendlyMessage = 'Too many code resend attempts. Please try again later.';
      } else if (errorCode === 'UserNotFoundException') {
        userFriendlyMessage = 'We couldn\'t find an account with this email address.';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    session,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendVerificationCode: handleResendVerificationCode,
  };
}