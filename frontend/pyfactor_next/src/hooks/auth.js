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

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const router = useRouter();
  const { refreshSession } = useSession();
  const refreshingRef = useRef(false);

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

  const handleSignIn = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[Auth] Starting sign in for user:', email);
      
      // Static import of enhancedSignIn is preferred over dynamic import to avoid issues
      logger.debug('[Auth] Using standard sign in flow');
      // Skip the dynamic import attempt and go straight to standard flow
      
      // Fall back to standard sign in if enhanced version fails
      const signInResult = await retryOperation(async () => {
        try {
          const result = await authSignIn({
            username: email,
            password,
            options: {
              authFlowType: AUTH_FLOWS.USER_SRP
            }
          });
          
          logger.debug('[Auth] Sign in API call succeeded with result:', {
            isSignedIn: result.isSignedIn,
            nextStep: result.nextStep?.signInStep
          });
          
          return {
            success: true,
            result: result
          };
        } catch (error) {
          logger.error('[Auth] Sign in API call error:', {
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
      
      if (!signInResult.success) {
        logger.error('[Auth] Sign in result not successful:', signInResult);
        throw new Error(signInResult.error || 'Sign in failed');
      }
      
      const result = signInResult.result;
      logger.debug('[Auth] Sign in completed successfully, checking session');
      
      try {
        // Try to get the user's attributes
        const userAttributes = await fetchUserAttributes();
        logger.debug('[Auth] User attributes fetched:', userAttributes);
        
        // If we have user attributes, check onboarding status
        const onboardingStatus = userAttributes['custom:onboarding'] || 'NOT_STARTED';
        const setupDone = userAttributes['custom:setupdone'] || 'FALSE';
        
        logger.debug('[Auth] User onboarding status:', {
          onboardingStatus,
          setupDone
        });
        
        // Refresh the session context
        refreshSession();
        
        return {
          success: true,
          isComplete: true,
          userInfo: {
            attributes: userAttributes,
            onboardingStatus,
            setupDone,
            email: userAttributes.email || email
          }
        };
      } catch (attributesError) {
        // If we can't get attributes, just return basic success
        logger.warn('[Auth] Could not fetch user attributes:', attributesError);
        
        return {
          success: true,
          isComplete: true,
          nextStep: 'SIGNED_IN'
        };
      }
    } catch (error) {
      // Extract more detailed error information
      const errorMessage = error.message || 'Sign in failed';
      const errorCode = error.code || 'unknown_error';
      
      logger.error('[Auth] Sign in failed:', {
        error: errorMessage,
        code: errorCode,
        email: email, // Log email for debugging
        name: error.name,
        stack: error.stack
      });
      
      // Set a more user-friendly error message based on the error code
      let userFriendlyMessage = errorMessage;
      
      if (errorCode === 'NotAuthorizedException') {
        userFriendlyMessage = 'Incorrect username or password';
      } else if (errorCode === 'UserNotFoundException') {
        userFriendlyMessage = 'We couldn\'t find an account with this email address';
      } else if (errorCode === 'UserNotConfirmedException') {
        userFriendlyMessage = 'Please verify your email address before signing in';
      } else if (errorMessage.includes('network') || errorCode === 'NetworkError') {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again';
      } else if (error.name === 'AbortError' || errorMessage.includes('timed out')) {
        userFriendlyMessage = 'Sign in timed out. Please try again';
      }
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

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
  
  const handleSignUp = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 second timeout

    try {
      // If username is not provided, use email as username
      if (!data.username && data.email) {
        data.username = data.email;
      }

      logger.debug('[Auth] Starting sign up for user:', data.username);
      
      const signUpParams = {
        username: data.username,
        password: data.password,
        attributes: {
          email: data.email,
          given_name: data.firstName || '',
          family_name: data.lastName || '',
          'custom:onboarding': 'NOT_STARTED'
        },
        autoSignIn: {
          enabled: true
        }
      };
      
      // Add any additional attributes from the data object
      for (const key in data) {
        if (key.startsWith('custom:') && !signUpParams.attributes[key]) {
          signUpParams.attributes[key] = data[key];
        }
      }
      
      // Static import is preferred over dynamic import
      logger.debug('[Auth] Using standard sign up flow');
      
      try {
        const result = await authSignUp(signUpParams);
        
        logger.debug('[Auth] Sign up result:', {
          success: result.isSignUpComplete,
          nextStep: result.nextStep?.signUpStep,
          userId: result.userId
        });
        
        // Return success and the next step
        clearTimeout(timeoutId);
        return { 
          success: true, 
          nextStep: result.nextStep?.signUpStep, 
          userId: result.userId
        };
      } catch (signUpError) {
        // If aborted due to timeout
        if (controller.signal.aborted) {
          throw new Error('Sign up request timed out. Please try again.');
        }
        throw signUpError;
      }
    } catch (error) {
      logger.error('[Auth] Sign up error:', error);
      setError(error.message || 'An error occurred during sign up');
      return { 
        success: false, 
        error: error.message || 'Failed to sign up',
        code: error.code
      };
    } finally {
      clearTimeout(timeoutId);
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
            return response;
          } catch (apiError) {
            logger.error('[Auth] Raw API call failed with error:', apiError);
            throw apiError;
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

      if (!confirmResponse || (typeof confirmResponse === 'object' && !confirmResponse.success && 
          confirmResponse.error)) {
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
        userId: result.userId || confirmResponse.userId
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
              setSession(sessionResponse.session);
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
          setSession(null);
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
          setSession(null);
          router.push('/auth/signin');
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', handleAuthEvents);
    return () => unsubscribe();
  }, [router, refreshSession]);

  const handleResendVerificationCode = useCallback(async (email) => {
    if (!email) {
      throw new Error('Email is required to resend the verification code');
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[Auth] Resending sign up code for:', email);
      
      const result = await retryOperation(async () => {
        try {
          const response = await authResendSignUpCode({
            username: email,
          });
          
          logger.debug('[Auth] Resend code API response:', response);
          
          return {
            success: true,
            result: response
          };
        } catch (error) {
          logger.error('[Auth] Resend code API error:', {
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

      if (!result.success) {
        logger.error('[Auth] Resend code failed:', result);
        throw new Error(result.error || 'Failed to resend verification code');
      }

      logger.debug('[Auth] Resend code completed successfully for:', email);
      
      return {
        success: true,
        email
      };
    } catch (error) {
      logger.error('[Auth] Failed to resend code:', {
        error: error.message,
        code: error.code,
        email
      });
      
      // Format user-friendly error message
      let userMessage = error.message;
      
      if (error.code === 'UserNotFoundException') {
        userMessage = 'No account found with this email address.';
      } else if (error.code === 'LimitExceededException') {
        userMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'InvalidParameterException') {
        if (error.message.includes('already confirmed')) {
          userMessage = 'Your account is already verified. Please sign in.';
        } else {
          userMessage = 'Invalid email address. Please check and try again.';
        }
      } else if (error.message.includes('network')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(userMessage);
      throw new Error(userMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle password reset request (forgot password)
  const resetPassword = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);

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
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, [router, retryOperation]);

  // Handle confirming password reset with code
  const confirmPasswordReset = useCallback(async (email, code, newPassword) => {
    setIsLoading(true);
    setError(null);

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
      
      setError(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage, code: errorCode };
    } finally {
      setIsLoading(false);
    }
  }, [router, retryOperation]);

  return {
    isLoading,
    error,
    session,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendVerificationCode: handleResendVerificationCode,
    resetPassword,
    confirmPasswordReset
  };
}