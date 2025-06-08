import appCache from '../utils/appCache';

'use client';

import { appCache } from '../utils/appCache';
import { useState, useEffect, useCallback } from 'react';
import { appCache } from '../utils/appCache';
import { useRouter } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { getCurrentUser, signOut  } from '@/config/amplifyUnified';
import { appCache } from '../utils/appCache';
import { saveUserPreference, getUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';

// Auth-specific preference keys
const AUTH_PREF_KEYS = {
  NEEDS_REAUTHENTICATION: 'custom:needs_reauthentication',
  LAST_AUTH_TIME: 'custom:last_auth_time',
  AUTH_TOKEN_EXPIRY: 'custom:auth_token_expiry',
  AUTH_MIGRATION_COMPLETE: 'custom:auth_preferences_migrated'
};

// Constants
const CACHE_KEY_PREFIX = 'auth_';
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Hook for managing authentication state
 * Uses Cognito attributes with AppCache for better performance
 * 
 * @returns {Object} Auth state and related utilities
 */
export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if auth migration is complete
  const checkAuthMigration = useCallback(async () => {
    try {
      // First check AppCache
      const cachedMigration = getCacheValue(`${CACHE_KEY_PREFIX}migration_complete`);
      if (cachedMigration === true) {
        return true;
      }
      
      // If not in cache, check Cognito
      const migrationComplete = await getUserPreference(AUTH_PREF_KEYS.AUTH_MIGRATION_COMPLETE);
      
      // If migration is complete, update cache
      if (migrationComplete === 'true') {
        setCacheValue(`${CACHE_KEY_PREFIX}migration_complete`, true);
        return true;
      }
      
      // If migration is not complete, perform migration
      if (typeof window !== 'undefined') {
        // Check if there are any auth-related items in localStorage that need migration
        // Get values from appCache.getAll() first, then fall back to localStorage for migration
        const appCache = appCache.getAll() || {};
        const auth = appCache.auth || {};
        
        const needsReauth = auth.needsReauthentication === true || 
                           (typeof localStorage !== 'undefined' && localStorage.getItem('needsReauthentication') === 'true');
        
        const lastAuthTime = auth.lastAuthTime || 
                            (typeof localStorage !== 'undefined' && localStorage.getItem('lastAuthTime'));
        
        const tokenExpiry = auth.tokenExpiry || 
                           (typeof localStorage !== 'undefined' && localStorage.getItem('tokenExpiry'));
        
        // If any items exist, migrate them to Cognito
        if (needsReauth || lastAuthTime || tokenExpiry) {
          const attributes = {};
          
          if (needsReauth) {
            attributes[AUTH_PREF_KEYS.NEEDS_REAUTHENTICATION] = 'true';
            setNeedsReauthentication(true);
          }
          
          if (lastAuthTime) {
            attributes[AUTH_PREF_KEYS.LAST_AUTH_TIME] = lastAuthTime;
          }
          
          if (tokenExpiry) {
            attributes[AUTH_PREF_KEYS.AUTH_TOKEN_EXPIRY] = tokenExpiry;
          }
          
          // Save to Cognito
          if (Object.keys(attributes).length > 0) {
            // Save all attributes
            await Promise.all(
              Object.entries(attributes).map(([key, value]) => 
                saveUserPreference(key, value)
              )
            );
            
            // Update AppCache
            if (needsReauth) {
              setCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`, true);
            }
            
            if (lastAuthTime) {
              setCacheValue(`${CACHE_KEY_PREFIX}last_auth_time`, lastAuthTime);
            }
            
            if (tokenExpiry) {
              setCacheValue(`${CACHE_KEY_PREFIX}token_expiry`, tokenExpiry);
            }
            
            // Clear from localStorage now that we've migrated
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('needsReauthentication');
              localStorage.removeItem('lastAuthTime');
              localStorage.removeItem('tokenExpiry');
            }
          }
        }
        
        // Mark migration as complete
        await saveUserPreference(AUTH_PREF_KEYS.AUTH_MIGRATION_COMPLETE, 'true');
        setCacheValue(`${CACHE_KEY_PREFIX}migration_complete`, true);
      }
      
      return true;
    } catch (error) {
      logger.error('[useAuth] Error checking auth migration:', error);
      return false;
    }
  }, []);
  
  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current user from Amplify
      const authUser = await getCurrentUser();
      setIsAuthenticated(!!authUser);
      setUser(authUser);
      
      // Check if migration is needed
      await checkAuthMigration();
      
      // Check if re-authentication is needed
      // First check AppCache for better performance
      const cachedNeedsReauth = getCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`);
      if (cachedNeedsReauth === true) {
        setNeedsReauthentication(true);
      } else {
        // If not in cache, check Cognito
        const needsReauth = await getUserPreference(AUTH_PREF_KEYS.NEEDS_REAUTHENTICATION);
        if (needsReauth === 'true') {
          setNeedsReauthentication(true);
          setCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`, true);
        } else {
          setNeedsReauthentication(false);
          setCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`, false);
        }
      }
      
      // Check last auth time to determine session expiry
      if (authUser) {
        const cachedLastAuthTime = getCacheValue(`${CACHE_KEY_PREFIX}last_auth_time`);
        const lastAuthTime = cachedLastAuthTime 
          ? parseInt(cachedLastAuthTime, 10)
          : parseInt(await getUserPreference(AUTH_PREF_KEYS.LAST_AUTH_TIME, Date.now().toString()), 10);
        
        const now = Date.now();
        if (now - lastAuthTime > SESSION_TIMEOUT) {
          // Session expired, needs re-authentication
          await setReauthenticationRequired(true);
        }
      }
      
      return authUser;
    } catch (error) {
      logger.error('[useAuth] Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthMigration]);
  
  // Set re-authentication required flag
  const setReauthenticationRequired = useCallback(async (required = true) => {
    try {
      // Update state
      setNeedsReauthentication(required);
      
      // Update AppCache
      setCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`, required);
      
      // Save to Cognito
      await saveUserPreference(AUTH_PREF_KEYS.NEEDS_REAUTHENTICATION, required ? 'true' : 'false');
      
      // Store in global AppCache for easy access
      if (typeof window !== 'undefined') {
        appCache.getAll() = appCache.getAll() || {};
        appCache.getAll().auth = appCache.getAll().auth || {};
        appCache.set('auth.needsReauthentication', required);
      }
    } catch (error) {
      logger.error('[useAuth] Error setting reauthentication flag:', error);
    }
  }, []);
  
  // Update last auth time
  const updateLastAuthTime = useCallback(async () => {
    try {
      const now = Date.now();
      
      // Update AppCache
      setCacheValue(`${CACHE_KEY_PREFIX}last_auth_time`, now);
      
      // Save to Cognito
      await saveUserPreference(AUTH_PREF_KEYS.LAST_AUTH_TIME, now.toString());
      
      // Reset re-authentication flag
      await setReauthenticationRequired(false);
      
      // Store in global AppCache for easy access
      if (typeof window !== 'undefined') {
        appCache.getAll() = appCache.getAll() || {};
        appCache.getAll().auth = appCache.getAll().auth || {};
        appCache.set('auth.lastAuthTime', now);
      }
    } catch (error) {
      logger.error('[useAuth] Error updating last auth time:', error);
    }
  }, [setReauthenticationRequired]);
  
  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear auth-related caches
      setCacheValue(`${CACHE_KEY_PREFIX}needs_reauthentication`, null);
      setCacheValue(`${CACHE_KEY_PREFIX}last_auth_time`, null);
      setCacheValue(`${CACHE_KEY_PREFIX}token_expiry`, null);
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      logger.error('[useAuth] Error signing out:', error);
      setError(error);
    }
  }, [router]);
  
  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    needsReauthentication,
    checkAuth,
    setReauthenticationRequired,
    updateLastAuthTime,
    signOut: handleSignOut
  };
}

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
          'custom:onboarding': 'not_started',
          'custom:setupdone': 'false',
          'custom:userrole': 'owner',
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
        userRole: 'owner',
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