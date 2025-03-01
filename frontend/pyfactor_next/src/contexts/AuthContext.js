'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession, getCurrentUser, signOut, fetchUserAttributes } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { logger } from '@/utils/logger';
import { isPublicRoute, isOnboardingRoute } from '@/lib/authUtils';

const AuthContext = createContext({
  isLoading: true,
  hasSession: false,
  hasError: false,
  user: null,
  session: null,
});

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    isLoading: true,
    hasSession: false,
    hasError: false,
    user: null,
    session: null,
  });
  const router = useRouter();
  const refreshingRef = useRef(false);
  const sessionCheckRef = useRef(null);
  const sessionAttempts = useRef(0);
  const maxSessionAttempts = 3;

  const checkSession = async (attempt = 1) => {
    if (refreshingRef.current) {
      logger.debug('[AuthContext] Session check already in progress, skipping');
      return;
    }

    refreshingRef.current = true;
    sessionAttempts.current = attempt;

    try {
      logger.debug('[AuthContext] Starting session check:', {
        attempt,
        maxAttempts: maxSessionAttempts
      });

      // Get current session
      const { tokens } = await fetchAuthSession();
      
      logger.debug('[AuthContext] Session tokens found:', {
        hasIdToken: !!tokens?.idToken,
        hasAccessToken: !!tokens?.accessToken,
        hasRefreshToken: !!tokens?.refreshToken,
        attempt
      });

      if (!tokens?.idToken) {
        throw new Error('No valid session');
      }

      // Wait a moment to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No current user found');
      }

      // Fetch user attributes directly
      const attributes = await fetchUserAttributes();
      const onboardingStatus = attributes['custom:onboarding'];

      logger.debug('[AuthContext] Current user fetched:', {
        username: user.username,
        attributes,
        onboardingStatus
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasSession: true,
        hasError: false,
        user: { ...user, attributes },
        session: { tokens },
      }));

      // Handle onboarding redirect if needed
      const currentPath = window.location.pathname;

      if (onboardingStatus === 'NOT_STARTED' && currentPath !== '/onboarding/business-info') {
        logger.debug('[AuthContext] Redirecting to business info for NOT_STARTED status');
        router.push('/onboarding/business-info');
      }

    } catch (error) {
      logger.error('[AuthContext] Failed to check session:', {
        error: error.message,
        code: error.code,
        attempt,
        stack: error.stack
      });

      if (attempt < maxSessionAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`[AuthContext] Retrying session check after ${delay}ms (attempt ${attempt + 1}/${maxSessionAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        refreshingRef.current = false;
        return checkSession(attempt + 1);
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasSession: false,
        hasError: true,
        user: null,
        session: null,
      }));

      // Sign out on session error
      try {
        await signOut();
      } catch (signOutError) {
        logger.error('[AuthContext] Error signing out:', signOutError);
      }

      const pathname = window.location.pathname;
      if (!isPublicRoute(pathname) && pathname !== '/') {
        router.push('/auth/signin');
      }
    } finally {
      refreshingRef.current = false;
    }
  };

  useEffect(() => {
    const handleAuthEvents = async ({ payload }) => {
      logger.debug('[AuthContext] Auth event received:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
          if (sessionCheckRef.current) {
            clearTimeout(sessionCheckRef.current);
          }
          sessionCheckRef.current = setTimeout(() => {
            checkSession();
          }, 1000);
          break;

        case 'signedOut':
          logger.debug('[AuthContext] User signed out, clearing state');
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            user: null,
            session: null,
          }));
          break;

        case 'tokenRefresh':
          if (!refreshingRef.current) {
            logger.debug('[AuthContext] Token refresh triggered');
            await checkSession();
          }
          break;

        case 'tokenRefresh_failure':
          logger.error('[AuthContext] Token refresh failed:', payload.data);
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            hasError: true,
            user: null,
            session: null,
          }));
          
          try {
            await signOut();
          } catch (error) {
            logger.error('[AuthContext] Error signing out:', error);
          }

          const pathname = window.location.pathname;
          if (!isPublicRoute(pathname) && pathname !== '/') {
            router.push('/auth/signin');
          }
          break;

        case 'configured':
          logger.debug('[AuthContext] Amplify configured event received');
          await checkSession();
          break;

        case 'configurationError':
          logger.error('[AuthContext] Configuration error:', payload.data);
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            hasError: true,
          }));
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', handleAuthEvents);
    logger.debug('[AuthContext] Auth event listener registered');

    checkSession();

    return () => {
      logger.debug('[AuthContext] Cleaning up auth event listener');
      unsubscribe();
      if (sessionCheckRef.current) {
        clearTimeout(sessionCheckRef.current);
      }
    };
  }, [router]);

  useEffect(() => {
    logger.debug('[AuthContext] Auth state updated:', {
      isLoading: state.isLoading,
      hasSession: state.hasSession,
      hasError: state.hasError,
      hasUser: !!state.user,
      hasTokens: !!state.session?.tokens,
      attempts: sessionAttempts.current,
      userAttributes: state.user?.attributes
    });
  }, [state]);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    logger.error('[AuthContext] useAuthContext called outside of provider');
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
