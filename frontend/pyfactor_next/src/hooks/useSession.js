import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { setCacheValue, getCacheValue } from '@/utils/appCache';
import { getTokens, storeTokens, areTokensExpired } from '@/utils/tokenManager';

// Increase token refresh interval from default
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
// Reduce loading timeout for faster dashboard loading
const LOADING_TIMEOUT = 5000; // Reduced from 20s to 5s for faster sign-in
// Maximum number of consecutive refresh failures before entering cooldown
const MAX_REFRESH_FAILURES = 5;
// Cooldown period after exceeding max failures (milliseconds)
const REFRESH_COOLDOWN = 60000; // 1 minute
// Log throttling for session messages
const LOG_THROTTLE_INTERVAL = 10000; // 10 seconds
// Minimum time between refresh attempts (milliseconds)
const MIN_REFRESH_INTERVAL = 20000; // Reduced from 30s to 20s for more responsive refreshes // 30 seconds
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
export const getUserAttributesFromCognito = async () => {
  try {
    // First check the AppCache for better performance
    const cachedAttributes = getCacheValue('user_attributes');
    if (cachedAttributes) {
      if (shouldLogSessionMessage('[useSession] Using cached user attributes')) {
        logger.debug('[useSession] Using cached user attributes');
      }
      return cachedAttributes;
    }
    
    // If not in cache, fetch from Cognito
    const attributes = await fetchUserAttributes();
    
    // Store in AppCache for future use
    if (attributes) {
      setCacheValue('user_attributes', attributes, { ttl: 3600000 }); // 1 hour
    }
    
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
  const isMounted = useRef(true);
  // Track component's refresh timestamp
  const lastRefreshTimestampRef = useRef(Date.now());
  
  // Add cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        setIsLoading(false);
        
        if (shouldLogSessionMessage('[useSession] Loading timeout reached')) {
          logger.warn('[useSession] Global loading timeout reached, forcing loading state to false');
        }
        
        // Try to get attributes from Cognito as fallback
        getUserAttributesFromCognito().then(attributes => {
          if (!isMounted.current) return;
          
          if (attributes) {
            if (shouldLogSessionMessage('[useSession] Using Cognito attributes fallback after timeout')) {
              logger.info('[useSession] Loading timed out with no session. Using Cognito attributes fallback.');
            }
            // Use cached tokens if available, otherwise create minimal session
            const cachedTokens = getTokens();
            setSession({ 
              tokens: cachedTokens || {},
              userAttributes: attributes,
              isPartial: true // Flag to indicate this is a partial session
            });
            
            // Set a flag to indicate we had to use a fallback
            if (typeof window !== 'undefined') {
              window.__sessionUsedFallback = true;
            }
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
      
      // Check if we have a session in the AppCache first
      const cachedTokens = getTokens();
      
      // If tokens aren't expired, use them
      if (cachedTokens && !areTokensExpired()) {
        if (shouldLogSessionMessage('[useSession] Using cached tokens')) {
          logger.debug('[useSession] Using cached tokens');
        }
        
        // Get user attributes to complete the session
        const userAttributes = await getUserAttributesFromCognito();
        
        // If we have attributes, we can use the cached tokens
        if (userAttributes) {
          setSession({
            tokens: cachedTokens,
            userAttributes
          });
          setIsLoading(false);
          refreshInProgressRef.current = false;
          if (typeof window !== 'undefined') {
            window.__tokenRefreshInProgress = false;
          }
          
          return { tokens: cachedTokens, userAttributes };
        }
      }
      
      // If we need to fetch a new session, continue with the standard fetch
      const sessionData = await fetchAuthSession();
      
      if (sessionData?.tokens?.idToken) {
        // Store tokens in AppCache
        const tokens = {
          idToken: sessionData.tokens.idToken.toString(),
          accessToken: sessionData.tokens.accessToken.toString(),
          refreshToken: sessionData.tokens.refreshToken?.toString()
        };
        
        // Store tokens in AppCache
        storeTokens(tokens);
        
        // Get user attributes
        const userAttributes = await getUserAttributesFromCognito();
        
        if (userAttributes) {
          // Store in app cache for better performance
          setSession({
            tokens,
            userAttributes
          });
          
          // Update global timestamp
          lastSuccessfulRefresh = Date.now();
          refreshFailuresRef.current = 0;
          
          // Store important user info in AppCache
          setCacheValue('user_info', {
            email: userAttributes.email,
            firstName: userAttributes.given_name,
            lastName: userAttributes.family_name,
            tenantId: userAttributes['custom:tenant_ID'] || userAttributes['custom:businessid']
          }, { ttl: 86400000 }); // 24 hours
          
          if (shouldLogSessionMessage('[useSession] Session refreshed successfully')) {
            logger.debug('[useSession] Session refreshed successfully');
          }
        }
      } else {
        throw new Error('No ID token found in session');
      }
      
      setIsLoading(false);
      return session;
    } catch (error) {
      refreshFailuresRef.current++;
      
      logger.error('[useSession] Failed to refresh session:', {
        message: error.message,
        code: error.code,
        failureCount: refreshFailuresRef.current
      });
      
      setError(error);
      
      // If we've reached max failures, set global cooldown
      if (refreshFailuresRef.current >= MAX_REFRESH_FAILURES && typeof window !== 'undefined') {
        window.__tokenRefreshCooldown = Date.now() + REFRESH_COOLDOWN;
        
        logger.warn(`[useSession] Maximum refresh failures (${MAX_REFRESH_FAILURES}) reached. Entering cooldown for ${REFRESH_COOLDOWN/1000}s`);
      }
      
      setIsLoading(false);
      return null;
    } finally {
      refreshInProgressRef.current = false;
      if (typeof window !== 'undefined') {
        window.__tokenRefreshInProgress = false;
      }
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
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