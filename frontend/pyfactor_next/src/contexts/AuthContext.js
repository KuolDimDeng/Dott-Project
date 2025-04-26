'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { appendLanguageParam } from '@/utils/languageUtils';
import {
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  Hub
} from '@/config/amplifyUnified';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';
import { logMemoryUsage, trackMemory, detectMemorySpike, clearMemoryTracking } from '@/utils/memoryDebug';
import { setTokens } from '@/utils/tenantUtils';
import { initializeTenantContext } from '@/utils/tenantContext';

// Create a minimal initial state object
const initialState = {
  isLoading: true,
  hasSession: false,
  hasError: false,
  user: null,
  session: null,
};

// Create context with default values
const AuthContext = createSafeContext(initialState);

// Reusable state setter to reduce object creation
const createStateSetter = (loading, session, error, user, sessionObj) => ({
  isLoading: loading,
  hasSession: session,
  hasError: error,
  user,
  session: sessionObj,
});

// Helper to extract only essential user data
const extractEssentialUserData = (user, attributes) => {
  if (!user) return null;
  
  // Only include essential user properties
  return {
    username: user.username,
    userId: user.userId,
    // Only include essential attributes
    attributes: {
      email: attributes.email,
      'custom:onboarding': attributes['custom:onboarding'],
      'custom:userrole': attributes['custom:userrole'], // Include user role for menu access checks
      // Add other essential attributes as needed
    }
  };
};

// Helper to extract only essential token data
const extractEssentialTokenData = (tokens) => {
  if (!tokens) return null;
  
  return {
    idToken: tokens.idToken ? {
      jwtToken: tokens.idToken.toString()
    } : null,
    // Include other essential token data if needed
  };
};

// Helper to determine if a route is a dashboard route
const isDashboardRoute = (pathname) => {
  return pathname && (
    pathname.startsWith('/dashboard') || 
    pathname.includes('/tenant/') && pathname.includes('/dashboard')
  );
};

export function AuthProvider({ children }) {
  // Use a single state object to reduce re-renders
  const [state, setState] = useState(initialState);
  
  const router = useRouter();
  
  // Use refs to track session state
  const refreshingRef = useRef(false);
  const sessionCheckRef = useRef(null);
  const sessionAttempts = useRef(0);
  const maxSessionAttempts = 3;
  
  // Add memory tracking on mount with reduced overhead
  useEffect(() => {
    logMemoryUsage('AuthProvider', 'mount');
    
    // Set up memory tracking interval with reduced frequency (30s instead of 10s)
    const memoryInterval = setInterval(() => {
      trackMemory('AuthProvider', 'interval');
      const spike = detectMemorySpike(20); // Increased threshold to reduce false positives
      if (spike) {
        console.warn('[Memory Spike in AuthProvider]', spike);
        
        // Force garbage collection if available
        if (window.gc) {
          try {
            window.gc();
            console.log('[Memory] Forced garbage collection');
          } catch (e) {
            // Ignore errors if gc is not available
          }
        }
      }
    }, 30000); // Increased from 10s to 30s
    
    return () => {
      clearInterval(memoryInterval);
      logMemoryUsage('AuthProvider', 'unmount');
      
      // Clear memory tracker on unmount to free memory
      clearMemoryTracking();
    };
  }, []);

  // Memoize the checkSession function to prevent recreation on each render
  const checkSession = useCallback(async (attempt = 1) => {
    // Skip if already refreshing
    if (refreshingRef.current) return;
    
    // Track memory before session check
    trackMemory('AuthProvider', 'before-sessionCheck');
    
    refreshingRef.current = true;
    sessionAttempts.current = attempt;

    try {
      // Minimal logging
      logger.debug(`[Auth] Session check #${attempt}`);

      // Get current path to determine if we're in dashboard
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isInDashboard = isDashboardRoute(currentPath);
      
      // Skip auth check for public routes
      if (isPublicRoute(currentPath)) {
        logger.debug(`[Auth] Skipping auth check for public route: ${currentPath}`);
        setState(createStateSetter(false, false, false, null, null));
        refreshingRef.current = false;
        return;
      }

      // Get current session with minimal error handling
      let tokens;
      try {
        // Track memory before auth session fetch
        trackMemory('AuthProvider', 'before-fetchAuthSession');
        
        const session = await fetchAuthSession();
        tokens = session.tokens;
        
        // Store tokens in tenantUtils for API requests
        if (tokens?.accessToken && tokens?.idToken) {
          setTokens(tokens);
          logger.debug('[Auth] Tokens stored in tenantUtils');
          
          // Initialize tenant context after tokens are available
          try {
            await initializeTenantContext();
            logger.info('[Auth] Tenant context initialized after authentication');
          } catch (tenantError) {
            logger.error('[Auth] Error initializing tenant context:', tenantError);
          }
        }
        
        // Track memory after auth session fetch
        trackMemory('AuthProvider', 'after-fetchAuthSession');
        
        if (!tokens?.idToken) {
          setState(createStateSetter(false, false, false, null, null));
          refreshingRef.current = false;
          
          // Only redirect for non-public routes
          if (!isPublicRoute(currentPath)) {
            logger.debug(`[Auth] No valid session found, redirecting to sign-in from: ${currentPath}`);
            router.push('/auth/signin');
          } else {
            logger.debug(`[Auth] No valid session found but on public route, continuing: ${currentPath}`);
          }
          return;
        }
      } catch (sessionError) {
        setState(createStateSetter(false, false, false, null, null));
        refreshingRef.current = false;
        
        // Only redirect for non-public routes
        if (!isPublicRoute(currentPath)) {
          logger.debug(`[Auth] Session error, redirecting to sign-in from: ${currentPath}`);
          // Only set session expired param if there was likely a previous session
          const hadPreviousSession = sessionError.message?.includes('expired') || 
                                    sessionError.code === 'NotAuthorizedException';
          const redirectUrl = hadPreviousSession ? 
                            '/auth/signin?session=expired' : 
                            '/auth/signin';
          router.push(redirectUrl);
        } else {
          logger.debug(`[Auth] Session error but on public route, continuing: ${currentPath}`);
        }
        return;
      }

      // Shorter wait time to reduce latency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get current user with minimal error handling
      try {
        // Track memory before getting current user
        trackMemory('AuthProvider', 'before-getCurrentUser');
        
        const user = await getCurrentUser();
        
        // Track memory after getting current user
        trackMemory('AuthProvider', 'after-getCurrentUser');
        
        if (!user) {
          setState(createStateSetter(false, false, false, null, null));
          refreshingRef.current = false;
          return;
        }

        // Fetch user attributes with minimal error handling
        try {
          // Track memory before fetching user attributes
          trackMemory('AuthProvider', 'before-fetchUserAttributes');
          
          const attributes = await fetchUserAttributes();
          const onboardingStatus = attributes['custom:onboarding'];

          // Track memory after fetching user attributes
          trackMemory('AuthProvider', 'after-fetchUserAttributes');

          // Get fresh tokens
          const { tokens: freshTokens } = await fetchAuthSession();
          
          // Extract only essential user and token data to reduce memory footprint
          const minimalUser = extractEssentialUserData(user, attributes);
          const minimalTokens = extractEssentialTokenData(freshTokens);

          // Update state with minimal user data
          setState(createStateSetter(
            false,
            true,
            false,
            minimalUser,
            { tokens: minimalTokens }
          ));
          
          // Store that the user had a valid session for expiration detection later
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('had_auth_session', 'true');
            } catch (e) {
              // Ignore sessionStorage errors
            }
          }

          // Handle onboarding redirect if needed - but only for non-dashboard routes
          // For dashboard routes, we want to use Cognito's authority for user state
          if (!isInDashboard && onboardingStatus === 'not_started' && !currentPath.includes('/onboarding/business-info')) {
            router.push(appendLanguageParam('/onboarding/business-info'));
          }
        } catch (attributesError) {
          // If in dashboard, we fail because Cognito is the source of truth
          // If not in dashboard, we could try fallbacks here for auth flows
          if (isInDashboard) {
            setState(createStateSetter(false, false, false, null, null));
            refreshingRef.current = false;
            return;
          } else {
            // For non-dashboard routes, we could implement cookie/localStorage fallbacks here
            logger.warn('[Auth] Could not get Cognito attributes but not in dashboard; continuing');
            setState(createStateSetter(false, true, false, {
              username: user.username,
              userId: user.userId,
              // No attributes available
            }, { tokens: extractEssentialTokenData(tokens) }));
          }
        }
      } catch (userError) {
        setState(createStateSetter(false, false, false, null, null));
        refreshingRef.current = false;
        return;
      }
    } catch (error) {
      // Simplified error handling with retry logic
      if (attempt < maxSessionAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        refreshingRef.current = false;
        return checkSession(attempt + 1);
      }

      setState(createStateSetter(false, false, true, null, null));

      // Sign out on session error
      try {
        await signOut();
      } catch (signOutError) {
        // Minimal error logging
        logger.error(`[Auth] Sign out error: ${signOutError.message}`);
      }

      // Redirect if not on public route
      const pathname = window.location.pathname;
      if (!isPublicRoute(pathname) && pathname !== '/') {
        router.push('/auth/signin');
      }
    } finally {
      refreshingRef.current = false;
      
      // Track memory after complete session check
      trackMemory('AuthProvider', 'after-sessionCheck');
    }
  }, [router]);

  // Memoize the auth event handler to prevent recreation on each render
  const handleAuthEvents = useCallback(async ({ payload }) => {
    const event = payload.event;
    
    // Track memory at start of auth event
    trackMemory('AuthProvider', `auth-event-${event}`);
    
    switch (event) {
      case 'signedIn':
        if (sessionCheckRef.current) clearTimeout(sessionCheckRef.current);
        sessionCheckRef.current = setTimeout(() => checkSession(), 1000);
        break;

      case 'signedOut':
        setState(createStateSetter(false, false, false, null, null));
        break;

      case 'tokenRefresh':
        if (!refreshingRef.current) await checkSession();
        break;

      case 'tokenRefresh_failure':
        setState(createStateSetter(false, false, true, null, null));
        
        try {
          await signOut();
          
          const pathname = window.location.pathname;
          // Don't redirect away from verify-email page
          if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
            logger.debug('[Auth] Staying on verify-email page despite token refresh failure');
            break;
          }
          
          // If we're already on the sign-in page, don't redirect again
          if (pathname === '/auth/signin' || pathname.startsWith('/auth/signin')) {
            logger.debug('[Auth] Already on sign-in page, not redirecting');
            break;
          }
          
          // Only redirect if we're on a protected route
          if (!isPublicRoute(pathname) && pathname !== '/') {
            logger.debug('[Auth] Redirecting to sign-in page after token refresh failure');
            // Use window.location for a hard redirect to clear state
            window.location.href = '/auth/signin';
          }
        } catch (error) {
          logger.error('[Auth] Sign out error after token refresh failure:', error);
          // Even if sign out fails, try to redirect if needed
          if (!isPublicRoute(window.location.pathname) && window.location.pathname !== '/') {
            window.location.href = '/auth/signin';
          }
        }
        break;

      case 'configured':
        await checkSession();
        break;

      case 'configurationError':
        setState(createStateSetter(false, false, true, null, null));
        break;
    }
    
    // Track memory at end of auth event
    trackMemory('AuthProvider', `auth-event-${event}-end`);
  }, [checkSession, router]);

  // Set up auth event listener
  useEffect(() => {
    const unsubscribe = Hub.listen('auth', handleAuthEvents);
    
    // Initial session check
    checkSession();

    return () => {
      unsubscribe();
      if (sessionCheckRef.current) {
        clearTimeout(sessionCheckRef.current);
      }
    };
  }, [handleAuthEvents, checkSession]);

  // Track memory on state changes - but limit frequency by using a debounce ref
  const lastStateChangeRef = useRef(Date.now());
  useEffect(() => {
    const now = Date.now();
    // Only track state changes if more than 1 second has passed since the last one
    if (now - lastStateChangeRef.current > 1000) {
      trackMemory('AuthProvider', 'state-change');
      lastStateChangeRef.current = now;
    }
  }, [state]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    // Track memory when context value is created
    trackMemory('AuthProvider', 'context-value-creation');
    return state;
  }, [state]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Simplified context hook with memory tracking
export function useAuthContext() {
  // Track memory when hook is called
  trackMemory('useAuthContext', 'call');
  
  const context = useSafeContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Add useAuth as an alias for useAuthContext for compatibility
export const useAuth = useAuthContext;

export default AuthContext;
