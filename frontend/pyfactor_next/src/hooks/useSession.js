import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Increase token refresh interval from default
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Parse user attributes from cookies for better resilience
const getUserAttributesFromCookies = () => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  // Check for onboarding-related cookies
  const attributes = {};
  if (cookies.onboardingStep) {
    attributes['custom:onboarding'] = cookies.onboardingStep;
  }
  if (cookies.onboardedStatus) {
    attributes.onboardingStatus = cookies.onboardedStatus;
  }
  if (cookies.subplan) {
    attributes['custom:subplan'] = cookies.subplan;
  }
  
  return Object.keys(attributes).length > 0 ? attributes : null;
};

export function useSession() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshInProgressRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  
  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set a timeout to clear loading state after 5 seconds regardless of session result
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      logger.warn('[useSession] Loading timeout reached, forcing loading state to false');
    }, 5000);
    
    // Development mode bypass handling
    if (process.env.NODE_ENV === 'development') {
      try {
        // Check if bypass is enabled
        const bypassAuth = localStorage.getItem('bypassAuthValidation') === 'true';
        const authSuccess = localStorage.getItem('authSuccess') === 'true';
        
        if (bypassAuth && authSuccess) {
          logger.info('[useSession] Development mode: using bypass auth');
          
          // Create a mock session
          const mockSession = {
            tokens: {
              idToken: {
                toString: () => 'mock-id-token',
                payload: {
                  email: localStorage.getItem('authUser') || 'user@example.com',
                  email_verified: true,
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true',
                  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
                }
              },
              accessToken: {
                toString: () => 'mock-access-token',
                payload: {
                  sub: 'user-123',
                  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
                }
              }
            }
          };
          
          // User attributes
          const mockAttributes = {
            email: localStorage.getItem('authUser') || 'user@example.com',
            email_verified: true,
            'custom:onboarding': 'complete',
            'custom:setupdone': 'true',
            'custom:tenantId': localStorage.getItem('tenantId') || 'user-tenant'
          };
          
          // Set mock session
          setSession({
            ...mockSession,
            userAttributes: mockAttributes
          });
          
          // Set cookies for server API routes
          if (typeof document !== 'undefined') {
            const expires = new Date();
            expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
            document.cookie = `bypassAuthValidation=true; path=/; expires=${expires.toUTCString()}`;
            document.cookie = `authUser=${mockAttributes.email}; path=/; expires=${expires.toUTCString()}`;
            document.cookie = `tenantId=${mockAttributes['custom:tenantId']}; path=/; expires=${expires.toUTCString()}`;
            document.cookie = `hasSession=true; path=/; expires=${expires.toUTCString()}`;
          }
          
          setError(null);
          setIsLoading(false);
          
          return mockSession;
        }
      } catch (devError) {
        logger.error('[useSession] Error in development mode bypass:', devError);
      }
    }
    
    // Prevent duplicate refresh attempts - both local and global
    if (refreshInProgressRef.current || (typeof window !== 'undefined' && window.__tokenRefreshInProgress)) {
      logger.debug('[useSession] Refresh already in progress, skipping');
      return session;
    }
    
    // Check global cooldown
    if (typeof window !== 'undefined' && window.__tokenRefreshCooldown) {
      const now = Date.now();
      if (now < window.__tokenRefreshCooldown) {
        logger.warn('[useSession] In global cooldown period, skipping refresh');
        return session;
      }
    }
    
    try {
      refreshInProgressRef.current = true;
      // Set global lock
      if (typeof window !== 'undefined') {
        window.__tokenRefreshInProgress = true;
      }
      
      logger.debug('[useSession] Refreshing session');
      setIsLoading(true);
      
      // Check if we've exceeded max refresh attempts
      const refreshCount = parseInt(sessionStorage.getItem('tokenRefreshCount') || '0', 10);
      if (refreshCount >= 3) {
        const lastRefreshTime = parseInt(sessionStorage.getItem('lastTokenRefreshTime') || '0', 10);
        const now = Date.now();
        if (now - lastRefreshTime < 30000) {
          logger.error('[useSession] Too many refresh attempts, stopping refresh cycle');
          setError(new Error('Too many refresh attempts'));
          setIsLoading(false);
          
          // Set global cooldown
          if (typeof window !== 'undefined') {
            window.__tokenRefreshCooldown = now + 60000; // 1 minute cooldown
          }
          
          return null;
        }
      }
      
      // Try to get the cached session first
      try {
        const sessionData = await fetchAuthSession();
        
        if (sessionData?.tokens?.idToken) {
          // Verify token expiration
          try {
            const decodedToken = JSON.parse(atob(sessionData.tokens.idToken.toString().split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (decodedToken.exp && decodedToken.exp < now) {
              logger.debug('[useSession] Token expired, forcing refresh');
              throw new Error('Token expired');
            }
          } catch (tokenError) {
            logger.warn('[useSession] Token verification failed:', tokenError);
            throw tokenError;
          }
          
          logger.debug('[useSession] Session fetched successfully');
          
          // Store token in cookies for better resilience
          if (typeof document !== 'undefined') {
            // Use more secure cookie settings
            const expires = new Date();
            expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
            const domain = window.location.hostname === 'localhost' ? '' : `domain=${window.location.hostname}; `;
            const secure = window.location.protocol === 'https:' ? 'secure; ' : '';
            
            document.cookie = `authToken=${sessionData.tokens.idToken.toString()}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
            document.cookie = `hasSession=true; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
          }
          
          setError(null);
          setIsLoading(false);
          
          return sessionData;
        }
      } catch (sessionError) {
        logger.error('[useSession] Error fetching session:', sessionError);
        setError(sessionError);
        setIsLoading(false);
        return null;
      }
    } catch (refreshError) {
      logger.error('[useSession] Error refreshing session:', refreshError);
      setError(refreshError);
      setIsLoading(false);
      return null;
    } finally {
      // Reset global lock
      if (typeof window !== 'undefined') {
        window.__tokenRefreshInProgress = false;
      }
      refreshInProgressRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    refreshSession();
    
    // Cleanup when component unmounts
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [refreshSession]);

  // Extra useEffect to prevent loading state from being stuck
  useEffect(() => {
    // Set a hard timeout to ensure loading state doesn't get stuck
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        logger.warn('[useSession] Global loading timeout reached, forcing loading state to false');
      }
    }, 7000); // A bit longer than the refreshSession timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  return { user: session, loading: isLoading, error };
}