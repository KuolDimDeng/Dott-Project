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

// Function to get user attributes from Cognito
const getUserAttributesFromCognito = async () => {
  try {
    const attributes = await fetchUserAttributes();
    logger.debug('[useSession] Successfully retrieved user attributes from Cognito');
    return attributes;
  } catch (error) {
    logger.warn('[useSession] Error retrieving user attributes from Cognito:', error);
    return null;
  }
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
      
      // Try to get attributes from Cognito as fallback
      getUserAttributesFromCognito().then(attributes => {
        if (attributes) {
          if (shouldLogSessionMessage('[useSession] Using Cognito attributes fallback after timeout')) {
            logger.info('[useSession] Session loading timed out, but Cognito attributes found. Using as fallback.');
          }
          setSession({ userAttributes: attributes });
        }
      }).catch(err => {
        logger.warn('[useSession] Failed to get fallback attributes after timeout:', err);
      });
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
        
        // Even in cooldown, check if we have Cognito attributes we can use
        const userAttributes = await getUserAttributesFromCognito();
        if (userAttributes && !session) {
          setSession({ userAttributes });
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
          
          // Also try to fetch user attributes for a more complete session
          try {
            const userAttributes = await fetchUserAttributes();
            if (userAttributes) {
              sessionData.userAttributes = userAttributes;
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
          // Try Cognito fallback if no session data found
          logger.warn('[useSession] No session token found, trying Cognito attributes fallback');
          const userAttributes = await getUserAttributesFromCognito();
          
          if (userAttributes) {
            logger.info('[useSession] Using Cognito attributes for session');
            const cognitoSession = { userAttributes };
            setSession(cognitoSession);
            setError(null);
            setIsLoading(false);
            return cognitoSession;
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
        
        // Check for Cognito fallback
        const userAttributes = await getUserAttributesFromCognito();
        if (userAttributes) {
          logger.info('[useSession] Session fetch failed, falling back to Cognito attributes');
          const cognitoSession = { userAttributes };
          setSession(cognitoSession);
          setError(null);
          setIsLoading(false);
          return cognitoSession;
        }
        
        setError(sessionError);
        setIsLoading(false);
        return null;
      }
    } catch (refreshError) {
      // Increment failure counter
      refreshFailuresRef.current += 1;
      
      logger.error('[useSession] Error refreshing session:', refreshError);
      
      // Try Cognito fallback as last resort
      const userAttributes = await getUserAttributesFromCognito();
      if (userAttributes) {
        logger.info('[useSession] Session refresh failed, falling back to Cognito attributes');
        const cognitoSession = { userAttributes };
        setSession(cognitoSession);
        setError(null);
        setIsLoading(false);
        return cognitoSession;
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
        
        // Check if we can use Cognito fallback if no session
        if (!session) {
          getUserAttributesFromCognito().then(userAttributes => {
            if (userAttributes) {
              logger.info('[useSession] Loading timed out with no session. Using Cognito attributes fallback.');
              setSession({ userAttributes });
            }
          }).catch(err => {
            logger.error('[useSession] Failed to get Cognito attributes after timeout:', err);
          });
        }
      }
    }, LOADING_TIMEOUT + 2000); // A bit longer than the refreshSession timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading, session]);

  return { user: session, loading: isLoading, error };
}