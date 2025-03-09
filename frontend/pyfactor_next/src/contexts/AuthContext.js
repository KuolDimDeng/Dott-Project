'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute, isOnboardingRoute } from '@/lib/authUtils';
import { appendLanguageParam } from '@/utils/languageUtils';
import {
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  isAmplifyConfigured,
  Hub
} from '@/config/amplifyUnified';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';

const AuthContext = createSafeContext({
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
      try {
        const { tokens } = await fetchAuthSession();
        
        logger.debug('[AuthContext] Session tokens found:', {
          hasIdToken: !!tokens?.idToken,
          hasAccessToken: !!tokens?.accessToken,
          hasRefreshToken: !!tokens?.refreshToken,
          attempt
        });

        if (!tokens?.idToken) {
          logger.debug('[AuthContext] No valid session token found');
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            hasError: false,
            user: null,
            session: null,
          }));
          return;
        }
      } catch (sessionError) {
        logger.debug('[AuthContext] Error fetching auth session:', {
          error: sessionError.message,
          code: sessionError.code,
          attempt
        });
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasSession: false,
          hasError: false,
          user: null,
          session: null,
        }));
        return;
      }

      // Wait a moment to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get current user
      try {
        const user = await getCurrentUser();
        if (!user) {
          logger.debug('[AuthContext] No current user found');
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            hasError: false,
            user: null,
            session: null,
          }));
          return;
        }

        // Fetch user attributes directly
        try {
          const attributes = await fetchUserAttributes();
          const onboardingStatus = attributes['custom:onboarding'];

          logger.debug('[AuthContext] Current user fetched:', {
            username: user.username,
            attributes,
            onboardingStatus
          });

          // Get tokens again to ensure they're fresh
          const { tokens } = await fetchAuthSession();

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

          if (onboardingStatus === 'NOT_STARTED' && !currentPath.includes('/onboarding/business-info')) {
            logger.debug('[AuthContext] Redirecting to business info for NOT_STARTED status');
            
            // Use the language utility to get the redirect path with language parameter
            const redirectPath = appendLanguageParam('/onboarding/business-info');
            
            logger.debug('[AuthContext] Redirect path with language parameter:', {
              redirectPath
            });
            
            router.push(redirectPath);
          }
        } catch (attributesError) {
          logger.debug('[AuthContext] Error fetching user attributes:', {
            error: attributesError.message,
            code: attributesError.code,
            attempt
          });
          
          setState(prev => ({
            ...prev,
            isLoading: false,
            hasSession: false,
            hasError: false,
            user: null,
            session: null,
          }));
          return;
        }
      } catch (userError) {
        logger.debug('[AuthContext] Error fetching current user:', {
          error: userError.message,
          code: userError.code,
          attempt
        });
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasSession: false,
          hasError: false,
          user: null,
          session: null,
        }));
        return;
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
        logger.debug('[AuthContext] Attempting to sign out');
        await signOut();
        logger.debug('[AuthContext] Sign out completed');
      } catch (error) {
        logger.error('[AuthContext] Error in sign out process:', error);
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
            logger.debug('[AuthContext] Attempting to sign out after token refresh failure');
            await signOut();
            logger.debug('[AuthContext] Sign out completed after token refresh failure');
          } catch (error) {
            logger.error('[AuthContext] Error in sign out process after token refresh failure:', error);
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
  const context = useSafeContext(AuthContext);
  if (!context) {
    logger.error('[AuthContext] useAuthContext called outside of provider');
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Add useAuth as an alias for useAuthContext for compatibility
export const useAuth = useAuthContext;

export default AuthContext;
