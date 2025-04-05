'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { useSession } from './useSession';
import { setupHubDeduplication } from '@/utils/refreshUserSession';

// Initialize Hub protection on import
setupHubDeduplication();

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

const AUTH_FLOWS = {
  USER_PASSWORD: 'ALLOW_USER_PASSWORD_AUTH',
  USER_SRP: 'ALLOW_USER_SRP_AUTH',
  REFRESH_TOKEN: 'ALLOW_REFRESH_TOKEN_AUTH'
};

// Add this utility function at the top of the file before the useAuth hook
function formatAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  // Format Cognito error messages to be more user-friendly
  if (error.message) {
    if (error.code === 'NotAuthorizedException') {
      return 'Incorrect username or password';
    } else if (error.code === 'UserNotFoundException') {
      return 'Account not found';
    } else if (error.code === 'InvalidParameterException') {
      if (error.message.includes('password')) {
        return 'Password does not meet requirements';
      }
      return error.message;
    } else if (error.code === 'CodeMismatchException') {
      return 'Incorrect verification code';
    } else if (error.code === 'ExpiredCodeException') {
      return 'Verification code has expired';
    } else if (error.code === 'LimitExceededException') {
      return 'Too many attempts, please try again later';
    } else if (error.name === 'UnexpectedLambdaException') {
      return 'There was a problem with the verification service. Please try again.';
    }
  }
  
  return error.message || 'An error occurred';
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { refreshSession } = useSession();
  const refreshingRef = useRef(false);
  const [userFriendlyMessage, setUserFriendlyMessage] = useState('');

  // Safety mechanism to prevent stuck loading state
  useEffect(() => {
    if (isLoading) {
      // Auto-reset loading state after 15 seconds if stuck
      const timeout = setTimeout(() => {
        logger.debug('[Auth] Auto-resetting loading state after timeout');
        setIsLoading(false);
      }, 15000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  
  // Force reset loading state on component mount
  useEffect(() => {
    const loadingState = localStorage.getItem('auth_loading_state');
    if (loadingState) {
      logger.debug('[Auth] Found stored loading state, cleaning up');
      localStorage.removeItem('auth_loading_state');
    }
    
    // Safety reset
    setIsLoading(false);
  }, []);

  // Helper function to create user in backend after Cognito signup
  const createBackendUser = async (userData) => {
    try {
      logger.debug('[Auth] Creating user in backend:', {
        email: userData.email,
        hasCognitoId: !!userData.cognitoId
      });
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          cognito_id: userData.cognitoId,
          confirmed: userData.confirmed || false,
          business_name: userData.businessName,
          business_type: userData.businessType,
          country: userData.country,
          legal_structure: userData.legalStructure
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[Auth] Backend user creation failed:', {
          status: response.status,
          error: errorData.error || response.statusText
        });
        return false;
      }
      
      const data = await response.json();
      logger.debug('[Auth] Backend user creation successful:', data);
      return true;
    } catch (error) {
      logger.error('[Auth] Error creating backend user:', error);
      return false;
    }
  };

  const retryOperation = async (operation, retryCount = 0) => {
    try {
      const result = await operation();
      logger.debug('[Auth] Operation completed successfully');
      return result;
    } catch (error) {
      logger.debug(`[Auth] Operation failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, {
        error: error.message,
        code: error.code,
        name: error.name
      });
      
      if (retryCount < MAX_RETRIES && 
          (error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.code === 'NetworkError')) {
        const delay = Math.pow(2, retryCount) * RETRY_DELAY;
        logger.debug(`[Auth] Retrying operation after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryOperation(operation, retryCount + 1);
      }
      throw error;
    }
  };

  // Function to validate authentication status - helps avoid false negatives
  const validateAuthentication = async () => {
    // In development, bypass validation to ensure login flow works
    if (process.env.NODE_ENV === 'development') {
      const bypassValidation = localStorage.getItem('bypassAuthValidation');
      if (bypassValidation === 'true') {
        logger.debug('[Auth] Development bypass: Skipping session validation');
        return true;
      }
    }
    
    // First check for session cookies
    const hasSessionCookie = document.cookie.includes('hasSession=true');
    const hasTenantId = document.cookie.includes('tenantId=') || document.cookie.includes('businessid=');
    const hasAuthToken = document.cookie.includes('authToken=') || 
                        (document.cookie.includes('CognitoIdentityServiceProvider') && 
                         document.cookie.includes('.idToken'));
    
    if (hasSessionCookie) {
      logger.debug('[Auth] Session cookie found, attempting validation');
    }
    
    if (hasTenantId) {
      logger.debug('[Auth] Tenant ID cookie found, good sign of previous authentication');
    }
    
    // If we have both session and tenant ID, treat this as validated
    // This acts as a fallback when Cognito validation fails but we know user was previously signed in
    if (hasSessionCookie && hasTenantId && hasAuthToken) {
      logger.info('[Auth] Session validated via cookies (hasSession + tenantId + authToken)');
      return true;
    }
    
    try {
      // Try multiple validation methods with retries and fallbacks
      let methodIndex = 0;
      const methods = [
        // Method 1: Use fetchAuthSession
        async () => {
          logger.debug('[Auth] Trying validation method 1: fetchAuthSession');
          const session = await authFetchAuthSession({
            forceRefresh: true
          });
          return session?.tokens?.idToken ? true : false;
        },
        // Method 2: Try getCurrentUser
        async () => {
          logger.debug('[Auth] Trying validation method 2: getCurrentUser');
          const currentUser = await authGetCurrentUser();
          return currentUser?.userId ? true : false;
        },
        // Method 3: Check local storage for valid token data
        async () => {
          logger.debug('[Auth] Trying validation method 3: local storage tokens');
          // Check for specific Cognito storage keys that indicate a previous session
          if (typeof localStorage !== 'undefined') {
            const lastAuthUserKey = Object.keys(localStorage).find(key => 
              key.includes('CognitoIdentityServiceProvider') && key.includes('LastAuthUser')
            );
            
            if (lastAuthUserKey) {
              const lastAuthUser = localStorage.getItem(lastAuthUserKey);
              if (lastAuthUser) {
                // Look for token for this user
                const tokenKey = Object.keys(localStorage).find(key => 
                  key.includes('CognitoIdentityServiceProvider') && 
                  key.includes(lastAuthUser) && 
                  key.includes('idToken')
                );
                
                if (tokenKey) {
                  logger.debug('[Auth] Found valid token in local storage');
                  return true;
                }
              }
            }
          }
          return false;
        }
      ];
      
      // Try each method with exponential backoff
      for (const method of methods) {
        methodIndex++;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const result = await method();
            if (result) {
              logger.debug(`[Auth] Session validation successful via method ${methodIndex} on attempt ${retryCount + 1}`);
              return true;
            }
            
            // If method succeeded but returned falsy, try next method or retry
            logger.debug(`[Auth] Method ${methodIndex} returned false on attempt ${retryCount + 1}`);
          } catch (error) {
            logger.warn(`[Auth] Method ${methodIndex} failed on attempt ${retryCount + 1}:`, error);
          }
          
          retryCount++;
          if (retryCount <= maxRetries) {
            // Exponential backoff with jitter for better resilience
            const baseDelay = Math.pow(2, retryCount) * 500;
            const jitter = Math.floor(Math.random() * 300);
            const delay = baseDelay + jitter;
            logger.debug(`[Auth] Retrying method ${methodIndex} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Last resort: If we have session cookies but all methods failed,
      // we'll trust the cookies in development mode
      if (process.env.NODE_ENV === 'development' && hasSessionCookie && hasTenantId) {
        logger.warn('[Auth] All validation methods failed but session cookies found. Trusting cookies in development mode.');
        return true;
      }
      
      // All methods failed after retries
      return false;
    } catch (error) {
      logger.error('[Auth] Error during validation:', error);
      
      // Last resort fallback - if we have cookies, consider authenticated
      if (hasSessionCookie && hasTenantId) {
        logger.info('[Auth] Validation error but session cookies found, using fallback authentication');
        return true;
      }
      
      return false;
    }
  };

  const handleSignIn = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Regular sign-in flow for production
      const signInData = await retryOperation(async () => {
        try {
          const flowResult = await authSignIn({
            username: email,
            password,
            options: {
              authFlowType: AUTH_FLOWS.USER_PASSWORD,
              clientMetadata: {
                attempt_time: new Date().toISOString(),
                auth_flow: AUTH_FLOWS.USER_PASSWORD,
                client_type: 'web'
              }
            }
          });
          
          logger.debug('[Auth] Sign in API call succeeded with result:', {
            authFlow: AUTH_FLOWS.USER_PASSWORD,
            isSignedIn: signInData.isSignedIn,
            nextStep: signInData.nextStep?.signInStep
          });
          
          return {
            success: true,
            result: signInData
          };
        } catch (error) {
          logger.error(`[Auth] Sign in API call error with flow ${AUTH_FLOWS.USER_PASSWORD}:`, {
            message: error.message,
            code: error.code,
            name: error.name
          });
          
          return {
            success: false,
            error: error.message,
            code: error.code,
            name: error.name
          };
        }
      });
      
      // Double-check authentication status even if sign-in appeared successful
      if (signInData.hasNextStep && signInData.nextStep === 'DONE') {
        try {
          const isValid = await validateAuthentication();
          if (!isValid) {
            logger.warn('[Auth] Sign-in appeared successful but session validation failed');
            
            if (process.env.NODE_ENV === 'development') {
              // In development, bypass validation failure
              logger.debug('[Auth] Development mode: Bypassing validation failure');
              setIsAuthenticated(true);
            } else {
              throw new Error('Authentication failed. Please try again.');
            }
          } else {
            // Session validation succeeded
            setIsAuthenticated(true);
          }
        } catch (validationError) {
          // Even if validation fails, consider authenticated in development
          if (process.env.NODE_ENV === 'development') {
            setIsAuthenticated(true);
            logger.debug('[Auth] Development: Forcing authenticated state despite validation error');
          } else {
            throw validationError;
          }
        }
      }
      
      setAuthError(null);
      setIsLoading(false);
      
      if (signInData.success) {
        logger.debug('[handleSignIn] Sign in successful, redirecting to business info');
        router.push('/onboarding/business-info');
        return signInData;
      }
      
      return signInData;
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Sign in failed';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Sign in failed:', {
        error: errorMessage,
        code: errorCode,
        name: error.name,
        email: email, // Log email for debugging
        stack: error.stack?.slice(0, 500), // Limit stack trace length for readability
        timestamp: new Date().toISOString()
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'NotAuthorizedException') {
        userFriendlyMessage = 'Incorrect username or password';
      } else if (errorCode === 'UserNotFoundException') {
        userFriendlyMessage = 'We couldn\'t find an account with this email address';
      } else if (errorCode === 'UserNotConfirmedException') {
        userFriendlyMessage = 'Please verify your email address before signing in';
      } else if (errorCode === 'PasswordResetRequiredException') {
        userFriendlyMessage = 'You need to reset your password';
      } else if (errorCode === 'TooManyRequestsException' || errorMessage.includes('too many')) {
        userFriendlyMessage = 'Too many sign-in attempts. Please wait and try again later';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again';
      } else if (error.name === 'AbortError' || errorMessage.includes('timed out')) {
        userFriendlyMessage = 'Sign in timed out. Please try again';
      } else if (errorMessage.includes('challenge')) {
        userFriendlyMessage = 'Additional verification required. Please check your email';
      } else if (errorMessage.includes('CAPTCHA') || errorMessage.includes('captcha')) {
        userFriendlyMessage = 'CAPTCHA verification failed. Please try again';
      }
      
      setAuthError(userFriendlyMessage);
      return { 
        success: false, 
        error: userFriendlyMessage, 
        code: errorCode,
        original: error.message // Include original message for debugging
      };
    } finally {
      setIsLoading(false);
    }
  }, [retryOperation, validateAuthentication]);

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

      setUser(null);
      router.push('/auth/signin');
      return { success: true };
    } catch (error) {
      logger.error('[Auth] Sign out failed:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  const handleSignUp = useCallback(async (data) => {
    logger.debug('[Auth] Starting signup process for user:', data.email);
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Store loading state in localStorage for potential recovery
      localStorage.setItem('auth_loading_state', 'signup');
      
      logger.debug('[Auth] Starting sign up process', { 
        email: data.email, 
        hasPassword: !!data.password
      });
      
      // Setup client metadata with additional information
      const clientMetadata = {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        businessType: data.businessType,
        country: data.country,
        legalStructure: data.legalStructure,
        auto_confirm: 'true', // Signal that verification is disabled
      };
      
      // Use Amplify v6 signUp
      const { nextStep, signUpResponse } = await authSignUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            given_name: data.firstName,
            family_name: data.lastName,
          },
          clientMetadata
        }
      });

      logger.debug('[Auth] Sign up API call completed', { 
        nextStep: nextStep?.signUpStep,
        isSignUpComplete: !!signUpResponse?.isSignUpComplete,
        hasUser: !!signUpResponse
      });
      
      const isSignupComplete = signUpResponse?.isSignUpComplete === true;
      
      // Let's consider the signup successful even if verification is needed
      const success = true;

      // IMPORTANT: Automatically confirm the user right after signup
      try {
        logger.debug('[Auth] Auto-confirming user after signup:', data.email);
        
        // Get the base URL from the window location
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        // Call the admin API to confirm the user
        const confirmResponse = await fetch(`${baseUrl}/api/admin/confirm-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email })
        });
        
        if (confirmResponse.ok) {
          const confirmResult = await confirmResponse.json();
          logger.debug('[Auth] User auto-confirmed successfully:', confirmResult);
          
          // Store the confirmation status
          try {
            localStorage.setItem('userConfirmed', 'true');
            localStorage.setItem('userEmail', data.email);
          } catch (e) {
            // Ignore storage errors
          }
        } else {
          // Enhanced error handling for non-OK responses
          try {
            const errorText = await confirmResponse.text();
            let errorJson;
            try {
              errorJson = JSON.parse(errorText);
            } catch (e) {
              // Not JSON, use the text directly
              errorJson = { error: errorText || 'Unknown error' };
            }
            
            logger.error('[Auth] Failed to auto-confirm user:', {
              status: confirmResponse.status,
              statusText: confirmResponse.statusText,
              errorDetails: errorJson
            });
          } catch (parseError) {
            logger.error('[Auth] Failed to auto-confirm user (parse error):', {
              status: confirmResponse.status,
              statusText: confirmResponse.statusText
            });
          }
        }
      } catch (confirmError) {
        // Better error handling for network or other errors
        logger.error('[Auth] Error during auto-confirmation:', {
          error: confirmError.message,
          stack: confirmError.stack
        });
        // Continue even if confirmation fails - user will need to verify email
      }
      
      // Now create user in the backend immediately (don't wait for verification)
      await createBackendUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        businessType: data.businessType,
        country: data.country,
        legalStructure: data.legalStructure,
        cognitoId: signUpResponse?.userId || '',
        confirmed: true // Consider the user confirmed
      });
      
      setIsLoading(false);
      
      return {
        success,
        nextStep: nextStep?.signUpStep || null,
        userId: signUpResponse?.userId,
        isComplete: isSignupComplete
      };
    } catch (error) {
      logger.error('[Auth] Sign up error:', error);
      setAuthError(error.message || 'An error occurred during sign up');
      return { 
        success: false, 
        error: error.message || 'Failed to sign up',
        code: error.code
      };
    } finally {
      setIsLoading(false);
      // Clear loading state marker
      localStorage.removeItem('auth_loading_state');
    }
  }, []);

  const handleConfirmSignUp = useCallback(async (email, code) => {
    logger.debug('[Auth] handleConfirmSignUp called with:', { email, code: code?.length });

    
    try {
      // First, perform the confirmation with Cognito
      // Note: confirmSignUp from amplifyUnified needs an object with username and confirmationCode
      logger.debug('[Auth] Calling Amplify confirmSignUp with:', { 
        username: email, 
        confirmationCode: code 
      });
      
      const confirmResponse = await authConfirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      logger.debug('[Auth] Amplify confirmation response:', confirmResponse);
      
      // Mark as confirmation success with Cognito
      let backendSuccess = true;
      
      // Once confirmed, try to create user in Django backend
      try {
        logger.debug('[Auth] Creating user in backend after confirmation');
        
        // Make the API call to create the user in the backend
        const result = await retryOperation(async () => {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              confirmed: true,
              first_name: '', // Add minimal required fields
              last_name: '',
              cognito_id: ''
            })
          });
          
          // If unauthorized, we'll handle this later (after sign-in)
          if (response.status === 401) {
            logger.debug('[Auth] Backend registration requires authentication, continuing with confirmation');
            return { success: true, needsAuth: true };
          }
          
          if (!response.ok) {
            // If response is not ok, throw error with status
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Backend registration failed: ${response.status} ${errorData.message || response.statusText}`);
          }
          
          return await response.json();
        }, 3);
        
        logger.debug('[Auth] Backend user creation result:', result);
        
        // Clear verification-related data from session storage
        try {
          sessionStorage.removeItem('pendingVerificationEmail');
          sessionStorage.removeItem('verificationCodeSent');
          localStorage.removeItem('verificationCodeSentAt');
        } catch (e) {
          // Ignore storage errors
        }
      } catch (error) {
        // Log the backend registration failure but don't fail the overall verification
        logger.error('[Auth] Backend registration failed after successful confirmation:', error);
        // We will create the backend user after login
        backendSuccess = false;
      }
      
      // Return success regardless of backend status - user can still log in
      return {
        success: true,
        backendSuccess
      };
    } catch (error) {
      logger.error('[Auth] Confirmation error:', {
        message: error.message,
        code: error.code || 'unknown'
      });
      
      let errorMessage = error.message || 'An error occurred during confirmation';
      let errorCode = error.code || 'unknown_error';
      
      // Create more user-friendly error messages
      if (errorCode === 'CodeMismatchException' || errorMessage.includes('code mismatch')) {
        errorMessage = 'The verification code is incorrect. Please try again.';
      } else if (errorCode === 'ExpiredCodeException' || errorMessage.includes('expired')) {
        errorMessage = 'The verification code has expired. Please request a new code.';
      } else if (errorCode === 'TooManyRequestsException' || errorMessage.includes('too many attempts')) {
        errorMessage = 'Too many attempts. Please wait a moment and try again.';
      }
      
      return {
        success: false,
        error: errorMessage,
        code: errorCode
      };
    }
  }, [retryOperation]);

  useEffect(() => {
    // Make sure Hub protection is initialized
    setupHubDeduplication();
    
    const handleAuthEvents = async ({ payload }) => {
      logger.debug('[Auth] Auth event received:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
          try {
            const sessionResponse = await authFetchAuthSession({
              forceRefresh: true
            });

            logger.debug('[Auth] Session fetched after sign in:', sessionResponse);

            if (sessionResponse.success && sessionResponse.session?.tokens?.idToken) {
              setUser(sessionResponse.session);
              if (!refreshingRef.current) {
                await refreshSession();
              }
              logger.debug('[Auth] Session established after sign in');
            }
          } catch (error) {
            logger.error('[Auth] Error handling sign in:', error);
          }
          break;

        case 'signedOut':
          setUser(null);
          logger.debug('[Auth] Session cleared after sign out');
          break;

        case 'tokenRefresh':
          try {
            // Check if we've had too many refresh attempts
            const refreshCount = parseInt(sessionStorage.getItem('tokenRefreshCount') || '0', 10);
            const lastRefreshTime = parseInt(sessionStorage.getItem('lastTokenRefreshTime') || '0', 10);
            const now = Date.now();
            
            // Global lock to prevent concurrent refresh attempts
            if (window.__tokenRefreshInProgress) {
              logger.debug('[Auth] Token refresh already in progress, skipping');
              return;
            }
            
            // If we've refreshed more than 3 times in 30 seconds, stop to prevent loops
            if (refreshCount >= 3 && (now - lastRefreshTime) < 30000) {
              logger.error('[Auth] Too many token refresh attempts in short period, stopping refresh cycle');
              sessionStorage.setItem('tokenRefreshCount', '0');
              // Add a longer cooldown period
              window.__tokenRefreshCooldown = now + 60000; // 1 minute cooldown
              return;
            }
            
            // Check if we're in cooldown period
            if (window.__tokenRefreshCooldown && now < window.__tokenRefreshCooldown) {
              logger.warn('[Auth] Token refresh in cooldown period, skipping');
              return;
            }
            
            // Set global refresh lock
            window.__tokenRefreshInProgress = true;
            
            try {
              // Update refresh count and timestamp
              sessionStorage.setItem('tokenRefreshCount', (refreshCount + 1).toString());
              sessionStorage.setItem('lastTokenRefreshTime', now.toString());
              
              logger.debug('[Auth] Handling token refresh, attempt:', refreshCount + 1);
              
              // Add a small delay to prevent rapid consecutive refreshes
              if (refreshCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              const sessionResponse = await authFetchAuthSession({
                forceRefresh: true
              });
              
              logger.debug('[Auth] Session fetched after token refresh:', sessionResponse);
            } finally {
              // Always clear the lock
              window.__tokenRefreshInProgress = false;
            }
          } catch (error) {
            logger.error('[Auth] Error during token refresh:', error);
            // Clear the lock in case of error
            if (typeof window !== 'undefined') {
              window.__tokenRefreshInProgress = false;
            }
          }
          break;

        case 'tokenRefresh_failure':
          logger.error('[Auth] Token refresh failed:', payload.data);
          setUser(null);
          router.push('/auth/signin');
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', handleAuthEvents);
    return () => unsubscribe();
  }, [router, refreshSession]);

  const handleResendVerificationCode = useCallback(async (email) => {
    // Validate email is provided
    if (!email) {
      return {
        success: false,
        error: 'Email is required to resend verification code'
      };
    }
    
    setIsLoading(true);
    
    // Implement a global lock to prevent multiple concurrent requests
    if (typeof window !== 'undefined') {
      if (window._verificationInProgress === true) {
        logger.debug('[Auth] Verification already in progress, preventing duplicate');
        return {
          success: true,
          message: 'Verification code is being sent. Please wait...',
          code: 'InProgress'
        };
      }
      
      window._verificationInProgress = true;
      // Auto-release lock after 10 seconds in case of error
      const lockTimeout = setTimeout(() => {
        window._verificationInProgress = false;
      }, 10000);
    }
    
    try {
      // Set a mutex flag to prevent duplicate sends
      const verificationInProgress = localStorage.getItem('verificationInProgress');
      const verificationStartTime = localStorage.getItem('verificationStartTime');
      const now = Date.now();
      
      if (verificationInProgress === 'true' && verificationStartTime) {
        const timeSince = now - parseInt(verificationStartTime);
        // If the last verification attempt was less than 5 seconds ago, prevent duplicate
        if (timeSince < 5000) {
          logger.debug('[Auth] Verification in progress, preventing duplicate send');
          
          if (typeof window !== 'undefined') {
            window._verificationInProgress = false;
            clearTimeout(window._verificationLockTimeout);
          }
          
          return {
            success: true,
            message: 'Verification code is being sent. Please wait...',
            code: 'InProgress'
          };
        }
      }
      
      // Set the mutex flag
      try {
        localStorage.setItem('verificationInProgress', 'true');
        localStorage.setItem('verificationStartTime', now.toString());
      } catch (e) {
        logger.warn('[Auth] Failed to set verification mutex:', e);
      }
      
      // Check if we've recently sent a code to prevent duplicates
      try {
        const lastCodeSentTime = sessionStorage.getItem('verificationCodeSentAt');
        const verificationCodeSent = sessionStorage.getItem('verificationCodeSent');
        
        // Also check localStorage for cross-tab prevention
        const signupCodeSent = localStorage.getItem('signupCodeSent');
        const signupCodeTimestamp = localStorage.getItem('signupCodeTimestamp');
        
        const thirtySecondsInMs = 30 * 1000;
        const currentTime = Date.now();
        
        if (lastCodeSentTime && (currentTime - parseInt(lastCodeSentTime)) < thirtySecondsInMs) {
          logger.debug('[Auth] Code recently sent (last 30 seconds), preventing duplicate');
          
          // Clear the mutex
          try {
            localStorage.removeItem('verificationInProgress');
          } catch (e) {
            logger.warn('[Auth] Failed to clear verification mutex:', e);
          }
          
          if (typeof window !== 'undefined') {
            window._verificationInProgress = false;
            clearTimeout(window._verificationLockTimeout);
          }
          
          return {
            success: true,
            message: 'Verification code was just sent. Please check your email inbox.',
            code: 'RecentlySent'
          };
        }
        
        if (signupCodeTimestamp && (currentTime - parseInt(signupCodeTimestamp)) < thirtySecondsInMs) {
          logger.debug('[Auth] Code recently sent (localStorage, last 30 seconds), preventing duplicate');
          
          // Clear the mutex
          try {
            localStorage.removeItem('verificationInProgress');
          } catch (e) {
            logger.warn('[Auth] Failed to clear verification mutex:', e);
          }
          
          if (typeof window !== 'undefined') {
            window._verificationInProgress = false;
            clearTimeout(window._verificationLockTimeout);
          }
          
          return {
            success: true,
            message: 'Verification code was just sent. Please check your email inbox.',
            code: 'RecentlySent'
          };
        }
      } catch (storageError) {
        logger.debug('[Auth] Error checking verification storage:', storageError);
        // Continue if storage check fails
      }
      
      logger.debug('[Auth] Resending sign up code for:', email);
      
      // Call the Amplify resendSignUpCode API
      const response = await retryOperation(async () => {
        try {
          const result = await authResendSignUpCode({
            username: email
          });
          
          logger.debug('[Auth] Resend code API response:', result);
          
          // Record that we sent a code
          try {
            const timestamp = Date.now().toString();
            sessionStorage.setItem('verificationCodeSentAt', timestamp);
            sessionStorage.setItem('pendingVerificationEmail', email);
            sessionStorage.setItem('verificationCodeSent', 'true');
            sessionStorage.setItem('verificationCodeTimestamp', timestamp);
            
            // Also store in localStorage to prevent duplicates across tabs
            localStorage.setItem('signupCodeSent', 'true');
            localStorage.setItem('signupCodeTimestamp', timestamp);
          } catch (e) {
            logger.warn('[Auth] Failed to store verification timestamp:', e);
          }
          
          return {
            success: true,
            destination: result.destination,
            deliveryMedium: result.deliveryMedium,
            attributeName: result.attributeName
          };
        } catch (error) {
          logger.error('[Auth] Error resending verification code:', {
            message: error.message,
            code: error.code, 
            name: error.name
          });
          
          // Special handling for specific errors
          if (error.code === 'LimitExceededException') {
            return {
              success: false,
              error: 'You\'ve reached the limit for verification code requests. Please try again later.',
              code: 'LimitExceededException'
            };
          } else if (error.message?.includes('already confirmed') || 
                    (error.code === 'NotAuthorizedException' && error.message?.includes('confirmed'))) {
            return {
              success: false,
              error: 'This account is already confirmed. Please try signing in.',
              code: 'AlreadyConfirmed'
            };
          }
          
          return {
            success: false,
            error: formatAuthErrorMessage(error),
            code: error.code
          };
        }
      });
      
      logger.debug('[Auth] Resend code operation completed with result:', response);
      
      // Clear the mutex
      try {
        localStorage.removeItem('verificationInProgress');
      } catch (e) {
        logger.warn('[Auth] Failed to clear verification mutex:', e);
      }
      
      // Release the window lock
      if (typeof window !== 'undefined') {
        window._verificationInProgress = false;
        clearTimeout(window._verificationLockTimeout);
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to resend verification code');
      }
      
      logger.debug('[Auth] Operation completed successfully');
      return response;
    } catch (error) {
      logger.error('[Auth] Error in resendVerificationCode:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      // Clear the mutex in case of error
      try {
        localStorage.removeItem('verificationInProgress');
      } catch (e) {
        logger.warn('[Auth] Failed to clear verification mutex:', e);
      }
      
      // Release the window lock
      if (typeof window !== 'undefined') {
        window._verificationInProgress = false;
        clearTimeout(window._verificationLockTimeout);
      }
      
      return {
        success: false,
        error: error.message || 'Failed to resend verification code'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle password reset request (forgot password)
  const resetPassword = useCallback(async (email) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      logger.debug('[Auth] Starting password reset for:', email);
      
      const result = await retryOperation(async () => {
        try {
          // Call the Amplify resetPassword function
          const response = await authResetPassword({
            username: email
          });
          
          logger.debug('[Auth] Reset password code sent successfully:', {
            nextStep: response.nextStep?.resetPasswordStep
          });
          
          return {
            success: true,
            result: response
          };
        } catch (apiError) {
          logger.error('[Auth] API error sending reset password code:', {
            message: apiError.message,
            code: apiError.code,
            name: apiError.name
          });
          
          return {
            success: false,
            error: apiError.message,
            code: apiError.code,
            name: apiError.name
          };
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset code');
      }

      // Redirect to reset-password page with email
      router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      
      return { success: true };
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Failed to send reset code';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Reset password request failed:', {
        error: errorMessage,
        code: errorCode,
        email,
        name: error.name,
        stack: error.stack
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'LimitExceededException') {
        userFriendlyMessage = 'Too many reset password attempts. Please try again later.';
      } else if (errorCode === 'UserNotFoundException') {
        userFriendlyMessage = 'We couldn\'t find an account with this email address.';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorCode === 'InvalidParameterException') {
        userFriendlyMessage = 'Please enter a valid email address.';
      }
      
      setAuthError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, [router, retryOperation]);

  // Handle confirming password reset with code
  const confirmPasswordReset = useCallback(async (email, code, newPassword) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      logger.debug('[Auth] Confirming password reset for:', email);
      
      const result = await retryOperation(async () => {
        try {
          // Call the Amplify confirmResetPassword function
          await authConfirmResetPassword({
            username: email,
            confirmationCode: code,
            newPassword
          });
          
          logger.debug('[Auth] Password reset confirmed successfully');
          
          return {
            success: true
          };
        } catch (apiError) {
          logger.error('[Auth] API error confirming password reset:', {
            message: apiError.message,
            code: apiError.code,
            name: apiError.name
          });
          
          return {
            success: false,
            error: apiError.message,
            code: apiError.code,
            name: apiError.name
          };
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to confirm password reset');
      }

      // Password reset successful, redirect to sign in page
      router.push('/auth/signin');
      
      return { success: true };
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Failed to reset password';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Confirm password reset failed:', {
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
      } else if (errorCode === 'InvalidPasswordException' || errorMessage.includes('password')) {
        userFriendlyMessage = 'Password does not meet requirements. Please ensure it has at least 8 characters including uppercase, lowercase, numbers, and special characters.';
      }
      
      setAuthError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, [router, retryOperation]);

  return {
    isAuthenticated,
    isLoading,
    authError,
    user,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendVerificationCode: handleResendVerificationCode,
    resetPassword,
    confirmPasswordReset,
    validateAuthentication
  };
}