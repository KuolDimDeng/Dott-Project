'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useSession } from './useSession';

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
  const { refreshSession } = useSession();
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
        await amplifySignOut({ global: true });
        logger.debug('[Auth] Signed out existing user');
      } catch (error) {
        // Ignore errors here as there might not be a signed-in user
        logger.debug('[Auth] No existing user to sign out');
      }

      logger.debug('[Auth] Starting sign in process:', { 
        username,
        authFlow: AUTH_FLOWS.USER_SRP
      });

      // First attempt SRP authentication (more secure)
      let signInResult = await retryOperation(async () => {
        return amplifySignIn({
          username,
          password,
          options: {
            authFlowType: 'USER_SRP_AUTH'
          }
        });
      });

      logger.debug('[Auth] Sign in result:', {
        isSignedIn: signInResult.isSignedIn,
        nextStep: signInResult.nextStep?.signInStep
      });

      // If SRP fails, fallback to USER_PASSWORD auth
      if (!signInResult.isSignedIn) {
        logger.debug('[Auth] SRP auth failed, falling back to USER_PASSWORD auth');
        signInResult = await retryOperation(async () => {
          return amplifySignIn({
            username,
            password,
            options: {
              authFlowType: 'USER_PASSWORD_AUTH'
            }
          });
        });

        logger.debug('[Auth] Password auth result:', {
          isSignedIn: signInResult.isSignedIn,
          nextStep: signInResult.nextStep?.signInStep
        });
      }

      if (!signInResult.isSignedIn) {
        if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          logger.debug('[Auth] User needs to confirm signup');
          router.push(`/auth/verify-email?email=${encodeURIComponent(username)}`);
          return { success: false, nextStep: signInResult.nextStep };
        }
        throw new Error('Sign in failed');
      }

      logger.debug('[Auth] Sign in successful, fetching session');

      // Get session immediately after sign in
      const authSession = await retryOperation(async () => {
        return fetchAuthSession({
          forceRefresh: true
        });
      });

      logger.debug('[Auth] Session fetched:', {
        hasIdToken: !!authSession.tokens?.idToken,
        hasAccessToken: !!authSession.tokens?.accessToken,
        hasRefreshToken: !!authSession.tokens?.refreshToken
      });

      if (!authSession?.tokens?.idToken) {
        throw new Error('No valid session after sign in');
      }

      // Update session state
      setSession(authSession);

      // Get current user before refreshing session
      const user = await getCurrentUser();
      logger.debug('[Auth] Current user fetched:', {
        username: user.username,
        attributes: Object.keys(user.attributes)
      });

      // Refresh session to set up cookies
      const refreshResult = await refreshSession();
      if (!refreshResult) {
        throw new Error('Failed to establish session');
      }

      logger.debug('[Auth] Session established successfully');

      return { success: true, user };
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
  }, [router, refreshSession]);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      logger.debug('[Auth] Starting sign out process');

      await retryOperation(async () => {
        await amplifySignOut({ global: true });
      });

      setSession(null);
      logger.debug('[Auth] Sign out completed successfully');
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
        await amplifySignOut({ global: true });
        logger.debug('[Auth] Signed out existing user');
      } catch (error) {
        // Ignore errors here as there might not be a signed-in user
        logger.debug('[Auth] No existing user to sign out');
      }

      logger.debug('[Auth] Starting sign up process:', { 
        email: userData.email,
        attributes: Object.keys(userData)
      });

      const signUpResult = await retryOperation(async () => {
        return signUp({
          username: userData.email,
          password: userData.password,
          options: {
            userAttributes: {
              email: userData.email,
              given_name: userData.firstName,
              family_name: userData.lastName,
              'custom:onboarding': 'NOT_STARTED',
              'custom:setupdone': 'FALSE',
              'custom:userrole': 'OWNER',
              'custom:created_at': new Date().toISOString()
            },
            autoSignIn: {
              enabled: true,
              authFlowType: 'USER_SRP_AUTH'
            }
          }
        });
      });

      logger.debug('[Auth] Sign up completed:', {
        isComplete: signUpResult.isSignUpComplete,
        nextStep: signUpResult.nextStep?.signUpStep,
        userId: signUpResult.userId
      });

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
      logger.error('[Auth] Sign up failed:', {
        error: error.message,
        code: error.code,
        email: userData.email
      });
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmSignUp = useCallback(async (email, code) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[Auth] Starting sign up confirmation:', { email });

      // First confirm the signup with Cognito
      const result = await retryOperation(async () => {
        return confirmSignUp({
          username: email,
          confirmationCode: code
        });
      });

      logger.debug('[Auth] Confirmation completed:', {
        isComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        email
      });

      // After confirmation, sign in to get tokens
      const signInResult = await amplifySignIn({
        username: email,
        options: {
          authFlowType: 'USER_SRP_AUTH'
        }
      });

      if (!signInResult.isSignedIn) {
        throw new Error('Failed to sign in after confirmation');
      }

      // Get session for backend request
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session after confirmation');
      }

      // Create user in Django backend
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
          'X-Id-Token': tokens.idToken
        },
        body: JSON.stringify({
          email: email,
          cognitoId: result.userId,
          userRole: 'OWNER'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user in backend');
      }

      const backendResult = await response.json();
      logger.debug('[Auth] Backend user creation completed:', backendResult);
      
      return {
        success: true,
        isComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        userId: backendResult.userId
      };
    } catch (error) {
      logger.error('[Auth] Confirmation failed:', {
        error: error.message,
        code: error.code,
        email
      });
      setError(error.message);
      return { success: false, error: error.message };
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
            const authSession = await fetchAuthSession({
              forceRefresh: true
            });

            logger.debug('[Auth] Session fetched after sign in:', {
              hasIdToken: !!authSession.tokens?.idToken,
              hasAccessToken: !!authSession.tokens?.accessToken,
              hasRefreshToken: !!authSession.tokens?.refreshToken
            });

            if (authSession?.tokens?.idToken) {
              setSession(authSession);
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
            const authSession = await fetchAuthSession({
              forceRefresh: true
            });

            logger.debug('[Auth] Session fetched after token refresh:', {
              hasIdToken: !!authSession.tokens?.idToken,
              hasAccessToken: !!authSession.tokens?.accessToken,
              hasRefreshToken: !!authSession.tokens?.refreshToken
            });

            if (authSession?.tokens?.idToken) {
              setSession(authSession);
              if (!refreshingRef.current) {
                await refreshSession();
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
  }, [router, refreshSession]);

  return {
    isLoading,
    error,
    session,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
  };
}