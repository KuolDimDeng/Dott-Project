import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';
import { Hub } from '@/config/amplifyUnified';
import { setCacheValue, getCacheValue } from './appCache';

/**
 * Migration function to convert ID tokens to access tokens
 * This should be called at application startup to handle any
 * existing authentication that might still be using ID tokens
 */
export function migrateToAccessTokens() {
  if (typeof window === 'undefined') return;
  
  try {
    // Initialize APP_CACHE if needed
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    
    if (!window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {};
    }
    
    // Check if we need to migrate from ID token to access token
    const legacyIdToken = window.__APP_CACHE.auth.idToken || getCacheValue('idToken');
    
    // If we have a legacy token stored, but don't have a primary token
    if (legacyIdToken && !window.__APP_CACHE.auth.token) {
      logger.info('[Auth] Migrating from ID token to access token auth');
      
      // Try to fetch a fresh session with access token
      fetchAuthSession().then(session => {
        if (session?.tokens?.accessToken) {
          // Store the access token as the primary token
          window.__APP_CACHE.auth.token = session.tokens.accessToken.toString();
          setCacheValue('token', session.tokens.accessToken.toString());
          
          // Store the ID token separately
          if (session?.tokens?.idToken) {
            window.__APP_CACHE.auth.idToken = session.tokens.idToken.toString();
            setCacheValue('idToken', session.tokens.idToken.toString());
          }
          
          logger.info('[Auth] Successfully migrated to access token auth');
        }
      }).catch(error => {
        logger.warn('[Auth] Failed to migrate to access token auth:', error);
      });
    }
  } catch (error) {
    logger.error('[Auth] Error in token migration:', error);
  }
}

// Call migration function immediately
migrateToAccessTokens();

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

// Global state to track refresh attempts
let isRefreshing = false;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 20000; // 20 seconds minimum between refreshes (reduced from 60s)
let refreshPromise = null;
let lastSuccessfulRefresh = 0;
const TOKEN_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_ATTEMPT_RESET_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Add this new function to better manage the Hub listener issue
// This will patch the AWS Amplify Hub system to deduplicate tokenRefresh events
export function setupHubDeduplication() {
  if (typeof window === 'undefined') return;
  
  // Initialize our Hub protection if it doesn't exist
  if (!window.__hubProtectionInitialized) {
    logger.debug('[Hub Protection] Setting up token refresh event deduplication');
    
    // Get original Hub dispatch function
    const originalHubDispatch = Hub.dispatch;
    
    // Keep track of recent events to deduplicate them
    const recentEvents = new Map();
    const MAX_EVENTS = 25; // Maximum number of recent events to track
    const DEDUPLICATION_WINDOW = 2000; // 2 seconds window for deduplication
    
    // Monkey patch Hub.dispatch to deduplicate events
    Hub.dispatch = function dedupedDispatch(channel, payload) {
      // Only intercept auth channel
      if (channel === 'auth') {
        // Only deduplicate tokenRefresh events
        if (payload.event === 'tokenRefresh') {
          const now = Date.now();
          
          // Create a key based on event name
          const eventKey = `${payload.event}`;
          
          // Check if we've seen this event very recently
          if (recentEvents.has(eventKey)) {
            const lastTimestamp = recentEvents.get(eventKey);
            
            // If the event was seen very recently, drop it
            if (now - lastTimestamp < DEDUPLICATION_WINDOW) {
              logger.debug(`[Hub Protection] Dropping duplicate event: ${payload.event} (${now - lastTimestamp}ms ago)`);
              return;
            }
          }
          
          // Update event timestamp
          recentEvents.set(eventKey, now);
          
          // If map is too large, remove oldest entries
          if (recentEvents.size > MAX_EVENTS) {
            const oldestKey = Array.from(recentEvents.keys())[0];
            recentEvents.delete(oldestKey);
          }
        }
      }
      
      // Call original dispatch function
      return originalHubDispatch.call(this, channel, payload);
    };
    
    window.__hubProtectionInitialized = true;
    logger.debug('[Hub Protection] Hub event deduplication initialized');
  }
}

// Call the setup function immediately
setupHubDeduplication();

// Add a function to ensure the APP_CACHE auth provider is set
export function ensureAuthProvider() {
  if (typeof window !== 'undefined') {
    try {
      // Initialize APP_CACHE if needed
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = {};
      }
      
      // Initialize auth section if needed
      if (!window.__APP_CACHE.auth) {
        window.__APP_CACHE.auth = {};
      }
      
      // Set provider to cognito if not already set
      if (!window.__APP_CACHE.auth.provider) {
        logger.info('[Auth] Setting missing auth provider to "cognito" in APP_CACHE');
        window.__APP_CACHE.auth.provider = 'cognito';
      }
      
      return true;
    } catch (e) {
      logger.error('[Auth] Error ensuring auth provider:', e);
      return false;
    }
  }
  return false;
}

// Call the function immediately to set provider on load
ensureAuthProvider();

// Reset refresh attempt count periodically
setInterval(() => {
  refreshAttemptCount = 0;
}, REFRESH_ATTEMPT_RESET_INTERVAL);

/**
 * Utility for forcing a session refresh when auth tokens expire
 * This handles automatically refreshing the user's session when 401 errors occur
 */

/**
 * Refreshes the user's authentication session
 * This will either get a new token silently or force re-login if needed
 * 
 * @returns {Promise<boolean>} True if refresh was successful
 */
export const refreshUserSession = async () => {
  logger.info('[Auth] Attempting to refresh user session');
  
  try {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      logger.info('[Auth] Another refresh is already in progress, waiting for it to complete');
      return refreshPromise;
    }
    
    // Check if we've refreshed recently to prevent hammering the auth server
    const now = Date.now();
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      logger.debug('[Auth] Refresh attempt too soon after previous attempt, using cached token');
      
      // Return true if last refresh was successful and recent
      if (now - lastSuccessfulRefresh < TOKEN_CACHE_DURATION) {
        return true;
      }
    }
    
    // Mark that we're refreshing and track the time
    isRefreshing = true;
    lastRefreshTime = now;
    
    // Create a promise to track this refresh attempt
    refreshPromise = (async () => {
      try {
        // Track refresh attempts to prevent infinite loops
        refreshAttemptCount++;
        if (refreshAttemptCount > MAX_REFRESH_ATTEMPTS) {
          logger.warn(`[Auth] Maximum refresh attempts (${MAX_REFRESH_ATTEMPTS}) reached`);
          return await forceRelogin();
        }
        
        // Try to get the authentication provider
        const authProvider = window?.__APP_CACHE?.auth?.provider;
        
        if (!authProvider) {
          logger.warn('[Auth] No auth provider found in APP_CACHE');
          return await forceRelogin();
        }
        
        // Check if we have an auth mechanism to refresh the token
        if (typeof window.refreshAuthToken === 'function') {
          logger.info('[Auth] Using refreshAuthToken function');
          const result = await window.refreshAuthToken();
          
          if (result?.success) {
            logger.info('[Auth] Token refresh successful');
            lastSuccessfulRefresh = Date.now();
            
            // Store the new token in APP_CACHE
            if (result.tokens) {
              storeTokensInAppCache(result.tokens);
            }
            
            return true;
          }
        }
        
        // Try Amplify's fetchAuthSession to get fresh tokens
        try {
          logger.info('[Auth] Attempting to refresh session using Amplify');
          const session = await fetchAuthSession({ forceRefresh: true });
          
          if (session?.tokens) {
            logger.info('[Auth] Amplify session refresh successful');
            lastSuccessfulRefresh = Date.now();
            
            // Store the new tokens in APP_CACHE
            storeTokensInAppCache({
              idToken: session.tokens.idToken?.toString(),
              accessToken: session.tokens.accessToken?.toString(),
              refreshToken: session.tokens.refreshToken?.toString()
            });
            
            return true;
          }
        } catch (amplifyError) {
          logger.error('[Auth] Amplify refresh failed:', amplifyError);
        }
        
        // Try Cognito-specific refresh if available
        if (authProvider === 'cognito' && window.AWS && window.AWS.Cognito) {
          logger.info('[Auth] Attempting Cognito session refresh');
          try {
            // Try to refresh the Cognito session
            const auth = window.AWS.Cognito.Auth;
            if (auth && typeof auth.currentSession === 'function') {
              const session = await auth.currentSession();
              if (session) {
                // Update the token in APP_CACHE
                lastSuccessfulRefresh = Date.now();
                storeTokensInAppCache({
                  idToken: session.getIdToken().getJwtToken(),
                  accessToken: session.getAccessToken().getJwtToken(),
                  refreshToken: session.getRefreshToken().getToken()
                });
                
                logger.info('[Auth] Updated token in APP_CACHE via Cognito');
                return true;
              }
            }
          } catch (cognitoError) {
            logger.error('[Auth] Cognito refresh failed:', cognitoError);
          }
        }
        
        // If we get here, we need to force a relogin
        return await forceRelogin();
      } finally {
        // Make sure to reset the refreshing flag when done
        isRefreshing = false;
      }
    })();
    
    return await refreshPromise;
  } catch (error) {
    logger.error('[Auth] Error refreshing session:', error);
    isRefreshing = false;
    return await forceRelogin();
  }
};

/**
 * Store tokens in APP_CACHE
 * @param {Object} tokens The tokens to store
 */
function storeTokensInAppCache(tokens) {
  try {
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    
    if (!window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {};
    }
    
    // Store the access token in APP_CACHE as the primary token for API authorization
    if (tokens.accessToken) {
      window.__APP_CACHE.auth.token = tokens.accessToken; // Use access token as the primary token
      setCacheValue('token', tokens.accessToken);
      
      // Always set the auth provider to 'cognito' to prevent "No auth provider found" errors
      window.__APP_CACHE.auth.provider = 'cognito';
      
      // Parse and store token expiry
      const decodedToken = parseJwt(tokens.accessToken);
      if (decodedToken.exp) {
        window.__APP_CACHE.auth.tokenExpiry = decodedToken.exp * 1000;
        setCacheValue('tokenExpiry', decodedToken.exp * 1000);
      }
    }
    
    // Store ID token separately if provided
    if (tokens.idToken) {
      window.__APP_CACHE.auth.idToken = tokens.idToken;
      setCacheValue('idToken', tokens.idToken);
      
      // Extract user ID from ID token if available
      const decodedIdToken = parseJwt(tokens.idToken);
      if (decodedIdToken.sub) {
        window.__APP_CACHE.auth.userId = decodedIdToken.sub;
        setCacheValue('userId', decodedIdToken.sub);
      }
    }
    
    // Store refresh token if provided
    if (tokens.refreshToken) {
      window.__APP_CACHE.auth.refreshToken = tokens.refreshToken;
      setCacheValue('refreshToken', tokens.refreshToken);
    }
    
    // Store timestamp of when we got these tokens
    const timestamp = Date.now();
    window.__APP_CACHE.auth.tokenTimestamp = timestamp;
    setCacheValue('tokenTimestamp', timestamp);
    
    // Mark that we have a session
    window.__APP_CACHE.auth.hasSession = true;
    setCacheValue('hasSession', true);
    
    logger.debug('[RefreshSession] Stored tokens in APP_CACHE');
    return true;
  } catch (error) {
    logger.error('[AuthCache] Error storing tokens in APP_CACHE:', error);
    return false;
  }
}

/**
 * Force the user to log in again when their session cannot be refreshed
 * 
 * @returns {Promise<boolean>} Always returns false as we're redirecting
 */
const forceRelogin = async () => {
  logger.warn('[Auth] Forcing relogin due to expired session');
  
  try {
    // Store the current URL to return after login
    const currentPath = window.location.pathname + window.location.search;
    if (window.__APP_CACHE) {
      if (!window.__APP_CACHE.auth) {
        window.__APP_CACHE.auth = {};
      }
      window.__APP_CACHE.auth.redirectAfterLogin = currentPath;
      setCacheValue('redirectAfterLogin', currentPath);
    }
    
    // Clear any cached auth data
    if (window.__APP_CACHE && window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth.token = null;
      window.__APP_CACHE.auth.accessToken = null;
      window.__APP_CACHE.auth.refreshToken = null;
      window.__APP_CACHE.auth.hasSession = false;
      window.__APP_CACHE.auth.tokenExpiry = null;
    }
    
    // Show a user-friendly message
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Your session has expired. Redirecting to login...');
    } else {
      alert('Your session has expired. Please log in again.');
    }
    
    // Give the user time to see the message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Redirect to login
    window.location.href = '/login?expired=true&redirect=' + encodeURIComponent(currentPath);
    
    return false;
  } catch (error) {
    logger.error('[Auth] Error in forceRelogin:', error);
    // Fallback to basic redirect
    window.location.href = '/login';
    return false;
  }
};

export default refreshUserSession;

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');
    
    // Clear tokens from APP_CACHE
    if (window.__APP_CACHE && window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {
        provider: window.__APP_CACHE.auth.provider // Keep the provider info
      };
    }
    
    // Clear tokens from appCache utility
    setCacheValue('token', null); // Clear the primary token (access token)
    setCacheValue('idToken', null);
    setCacheValue('refreshToken', null);
    setCacheValue('tokenTimestamp', null);
    setCacheValue('tokenExpiry', null);
    setCacheValue('hasSession', false);
    
    // Also try to call Amplify signOut if available
    try {
      await signOut();
      logger.debug('[Session] Amplify signOut completed');
    } catch (signOutError) {
      logger.warn('[Session] Error during Amplify signOut:', {
        error: signOutError.message
      });
      // Continue even if Amplify signOut fails
    }
    
    logger.debug('[Session] Session cleared successfully');
    return true;
  } catch (error) {
    logger.error('[Session] Failed to clear session:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

export const getStoredTokens = () => {
  try {
    if (typeof window === 'undefined') {
      return { idToken: null, accessToken: null, token: null, tokenTimestamp: null };
    }
    
    // Try to get from APP_CACHE first
    if (window.__APP_CACHE?.auth) {
      return {
        token: window.__APP_CACHE.auth.token || null, // This is now the access token
        idToken: window.__APP_CACHE.auth.idToken || null,
        accessToken: window.__APP_CACHE.auth.token || null, // For backward compatibility
        tokenTimestamp: window.__APP_CACHE.auth.tokenTimestamp || null
      };
    }
    
    // Fallback to getCacheValue
    const token = getCacheValue('token');
    const idToken = getCacheValue('idToken');
    const tokenTimestamp = getCacheValue('tokenTimestamp');
    
    return {
      token,
      idToken,
      accessToken: token, // For backward compatibility
      tokenTimestamp: tokenTimestamp ? parseInt(tokenTimestamp, 10) : null
    };
  } catch (error) {
    logger.warn('[getStoredTokens] Error reading tokens from AppCache', error);
    return { token: null, idToken: null, accessToken: null, tokenTimestamp: null };
  }
};
