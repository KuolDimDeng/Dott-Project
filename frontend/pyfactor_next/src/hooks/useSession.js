import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Increase token refresh interval from default
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
// Increase loading timeout to prevent premature session loading failure
const LOADING_TIMEOUT = 10000; // 10 seconds instead of 5
// Maximum number of consecutive refresh failures before entering cooldown
const MAX_REFRESH_FAILURES = 5;
// Cooldown period after exceeding max failures (milliseconds)
const REFRESH_COOLDOWN = 60000; // 1 minute
// Log throttling for session messages
const LOG_THROTTLE_INTERVAL = 10000; // 10 seconds
// Minimum time between refresh attempts (milliseconds)
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds
// Global session log cache to prevent duplicate logs
const sessionLogCache = new Map();
// Track last successful refresh globally (unix timestamp)
let lastSuccessfulRefresh = 0;

/**
 * Throttle session-related logs
 * @param {string} message - Log message
 * @param {number} interval - Throttle interval in ms
 * @returns {boolean} - Whether to log this message
 */
const shouldLogSessionMessage = (message, interval = LOG_THROTTLE_INTERVAL) => {
  const now = Date.now();
  const lastLog = sessionLogCache.get(message);
  
  if (!lastLog || (now - lastLog) > interval) {
    sessionLogCache.set(message, now);
    
    // Clean up old messages occasionally
    if (sessionLogCache.size > 50) {
      const expiryTime = now - interval;
      for (const [key, time] of sessionLogCache.entries()) {
        if (time < expiryTime) {
          sessionLogCache.delete(key);
        }
      }
    }
    
    return true;
  }
  
  return false;
};

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
  if (cookies.tenantId || cookies.businessid) {
    attributes['custom:tenantId'] = cookies.tenantId || cookies.businessid;
  }
  if (cookies.email) {
    attributes.email = cookies.email;
  }
  if (cookies.hasSession === 'true') {
    attributes.hasSession = true;
  }
  
  return Object.keys(attributes).length > 0 ? attributes : null;
};

export function useSession() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshInProgressRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const refreshFailuresRef = useRef(0);
  const lastRefreshAttemptRef = useRef(0);
  const refreshDebugCountRef = useRef(0);
  // Track component's refresh timestamp
  const lastRefreshTimestampRef = useRef(Date.now());
  
  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    // Check if we should throttle the refresh based on time since last attempt
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimestampRef.current;
    
    // Enforce minimum time between refreshes across the app
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      if (shouldLogSessionMessage(`[useSession] Throttling refresh - only ${timeSinceLastRefresh}ms since last refresh`)) {
        logger.debug(`[useSession] Throttling refresh - only ${Math.round(timeSinceLastRefresh/1000)}s since last refresh, minimum is ${MIN_REFRESH_INTERVAL/1000}s`);
      }
      return session;
    }
    
    // Also check global refresh timestamp
    if (lastSuccessfulRefresh > 0) {
      const timeSinceGlobalRefresh = now - lastSuccessfulRefresh;
      if (timeSinceGlobalRefresh < MIN_REFRESH_INTERVAL) {
        if (shouldLogSessionMessage('[useSession] Recent global refresh detected')) {
          logger.debug(`[useSession] Recent global refresh detected ${Math.round(timeSinceGlobalRefresh/1000)}s ago, skipping`);
        }
        return session;
      }
    }
    
    // Update timestamp even if we don't complete the refresh
    lastRefreshTimestampRef.current = now;
    
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set a timeout to clear loading state after LOADING_TIMEOUT regardless of session result
    // This prevents users from getting stuck in a loading state if auth fails
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      
      if (shouldLogSessionMessage('[useSession] Loading timeout reached')) {
        logger.warn('[useSession] Loading timeout reached, forcing loading state to false');
      }
      
      // Check if we can use cookie fallback
      const cookieAttributes = getUserAttributesFromCookies();
      if (cookieAttributes?.hasSession) {
        if (shouldLogSessionMessage('[useSession] Using cookie fallback after timeout')) {
          logger.info('[useSession] Session loading timed out, but hasSession cookie found. Using cookie fallback.');
        }
        setSession({ userAttributes: cookieAttributes });
      }
    }, LOADING_TIMEOUT);
    
    // Check if we're in cooldown period due to too many failures
    if (refreshFailuresRef.current >= MAX_REFRESH_FAILURES) {
      const timeSinceLastAttempt = now - lastRefreshAttemptRef.current;
      if (timeSinceLastAttempt < REFRESH_COOLDOWN) {
        if (shouldLogSessionMessage('[useSession] In cooldown period')) {
          logger.warn(`[useSession] In cooldown period (${Math.round((REFRESH_COOLDOWN - timeSinceLastAttempt)/1000)}s remaining). Using cached data.`);
        }
        setIsLoading(false);
        return session;
      } else {
        // Reset failure count after cooldown period
        refreshFailuresRef.current = 0;
      }
    }
    
    // Update last attempt timestamp
    lastRefreshAttemptRef.current = now;
    
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
      // Only log this message occasionally to avoid console spam
      refreshDebugCountRef.current++;
      
      if (refreshDebugCountRef.current % 5 === 0 || shouldLogSessionMessage('[useSession] Refresh already in progress')) {
        logger.debug('[useSession] Refresh already in progress, skipping');
      }
      
      return session;
    }
    
    // Check global cooldown
    if (typeof window !== 'undefined' && window.__tokenRefreshCooldown) {
      const now = Date.now();
      if (now < window.__tokenRefreshCooldown) {
        if (shouldLogSessionMessage('[useSession] In global cooldown period')) {
          logger.warn('[useSession] In global cooldown period, skipping refresh');
        }
        setIsLoading(false);
        
        // Even in cooldown, check if we have cookies we can use
        const cookieAttributes = getUserAttributesFromCookies();
        if (cookieAttributes?.hasSession && !session) {
          setSession({ userAttributes: cookieAttributes });
        }
        
        return session;
      }
    }
    
    try {
      refreshInProgressRef.current = true;
      // Set global lock
      if (typeof window !== 'undefined') {
        window.__tokenRefreshInProgress = true;
      }
      
      // Only log occasionally to avoid console spam
      if (shouldLogSessionMessage('[useSession] Refreshing session')) {
        logger.debug('[useSession] Refreshing session');
      }
      
      setIsLoading(true);
      
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
          
          if (shouldLogSessionMessage('[useSession] Session fetched successfully')) {
            logger.debug('[useSession] Session fetched successfully');
          }
          
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
          
          // Also try to fetch user attributes for a more complete session
          try {
            const userAttributes = await fetchUserAttributes();
            if (userAttributes) {
              sessionData.userAttributes = userAttributes;
              
              // Store important user attributes in cookies for better resilience
              if (typeof document !== 'undefined') {
                const expires = new Date();
                expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                const domain = window.location.hostname === 'localhost' ? '' : `domain=${window.location.hostname}; `;
                const secure = window.location.protocol === 'https:' ? 'secure; ' : '';
                
                // Store tenant ID in cookie if available
                if (userAttributes['custom:tenantId']) {
                  document.cookie = `tenantId=${userAttributes['custom:tenantId']}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
                }

                // Store email in cookie for AppBar and other components
                if (userAttributes.email) {
                  document.cookie = `email=${userAttributes.email}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
                  // Also store in localStorage as a fallback
                  localStorage.setItem('email', userAttributes.email);
                  localStorage.setItem('authUser', userAttributes.email);
                }
                
                // Store name parts if available
                if (userAttributes.given_name) {
                  document.cookie = `firstName=${userAttributes.given_name}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
                  localStorage.setItem('firstName', userAttributes.given_name);
                }
                
                if (userAttributes.family_name) {
                  document.cookie = `lastName=${userAttributes.family_name}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
                  localStorage.setItem('lastName', userAttributes.family_name);
                }

                // Store business name if available
                if (userAttributes['custom:businessname']) {
                  document.cookie = `businessName=${userAttributes['custom:businessname']}; path=/; expires=${expires.toUTCString()}; ${domain}${secure}samesite=lax`;
                  localStorage.setItem('businessName', userAttributes['custom:businessname']);
                }
              }
            }
          } catch (attributeError) {
            logger.warn('[useSession] Failed to fetch user attributes:', attributeError);
            // Don't fail the session refresh if attributes fetch fails
          }
          
          // Update global timestamp of last successful refresh
          lastSuccessfulRefresh = Date.now();
          
          // Reset failure counter on success
          refreshFailuresRef.current = 0;
          
          setSession(sessionData);
          setError(null);
          setIsLoading(false);
          
          return sessionData;
        } else {
          // Try cookie fallback if no session data found
          logger.warn('[useSession] No session token found, trying cookie fallback');
          const cookieAttributes = getUserAttributesFromCookies();
          
          if (cookieAttributes?.hasSession) {
            logger.info('[useSession] Using cookie-based session');
            const cookieSession = { userAttributes: cookieAttributes };
            setSession(cookieSession);
            setError(null);
            setIsLoading(false);
            return cookieSession;
          }
          
          // Check if we're on the landing page or main site pages
          // If on landing page, we don't need to throw an error as it's expected to not have a session
          const isPublicPage = typeof window !== 'undefined' && (
            window.location.pathname === '/' || 
            window.location.pathname.startsWith('/auth/') ||
            window.location.pathname.startsWith('/public/') ||
            window.location.pathname === '/about' ||
            window.location.pathname === '/pricing' ||
            window.location.pathname === '/contact'
          );
          
          if (isPublicPage) {
            logger.debug('[useSession] No session on public page - expected behavior');
            setSession(null);
            setError(null);
            setIsLoading(false);
            return null;
          }
          
          // On protected pages, throw the error
          logger.error('[useSession] No valid session data on protected page');
          throw new Error('No valid session data');
        }
      } catch (sessionError) {
        // Increment failure counter
        refreshFailuresRef.current += 1;
        
        logger.error('[useSession] Error fetching session:', sessionError);
        
        // Check for cookie fallback
        const cookieAttributes = getUserAttributesFromCookies();
        if (cookieAttributes?.hasSession) {
          logger.info('[useSession] Session fetch failed, falling back to cookies');
          const cookieSession = { userAttributes: cookieAttributes };
          setSession(cookieSession);
          setError(null);
          setIsLoading(false);
          return cookieSession;
        }
        
        setError(sessionError);
        setIsLoading(false);
        return null;
      }
    } catch (refreshError) {
      // Increment failure counter
      refreshFailuresRef.current += 1;
      
      logger.error('[useSession] Error refreshing session:', refreshError);
      
      // Try cookie fallback as last resort
      const cookieAttributes = getUserAttributesFromCookies();
      if (cookieAttributes?.hasSession) {
        logger.info('[useSession] Session refresh failed, falling back to cookies');
        const cookieSession = { userAttributes: cookieAttributes };
        setSession(cookieSession);
        setError(null);
        setIsLoading(false);
        return cookieSession;
      }
      
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
    
    // Set up a refresh interval - use longer interval to reduce CPU and network usage
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, TOKEN_REFRESH_INTERVAL);
    
    // Cleanup when component unmounts
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      clearInterval(refreshInterval);
    };
  }, [refreshSession]);

  // Extra useEffect to prevent loading state from being stuck
  useEffect(() => {
    // Set a hard timeout to ensure loading state doesn't get stuck
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        logger.warn('[useSession] Global loading timeout reached, forcing loading state to false');
        
        // Check if we can use cookie fallback if no session
        if (!session) {
          const cookieAttributes = getUserAttributesFromCookies();
          if (cookieAttributes?.hasSession) {
            logger.info('[useSession] Loading timed out with no session. Using cookie fallback.');
            setSession({ userAttributes: cookieAttributes });
          }
        }
      }
    }, LOADING_TIMEOUT + 2000); // A bit longer than the refreshSession timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading, session]);

  return { user: session, loading: isLoading, error };
}