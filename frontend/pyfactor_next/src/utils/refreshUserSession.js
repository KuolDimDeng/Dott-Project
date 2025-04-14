import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';
import { Hub } from '@/config/amplifyUnified';
import { setCacheValue, getCacheValue } from './appCache';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

// Global state to track refresh attempts
let isRefreshing = false;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 60000; // 1 minute minimum between refreshes
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

// Reset refresh attempt count periodically
setInterval(() => {
  refreshAttemptCount = 0;
}, REFRESH_ATTEMPT_RESET_INTERVAL);

const setCookie = (name, value, options = {}) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const defaultMaxAge = 2 * 24 * 60 * 60; // 2 days
    
    const cookieOptions = [
      `${name}=${encodeURIComponent(value)}`,
      'path=/',
      options.maxAge ? `max-age=${options.maxAge}` : `max-age=${defaultMaxAge}`,
      isDev ? '' : 'secure',
      options.sameSite || (isDev ? 'samesite=lax' : 'samesite=strict')
    ].filter(Boolean);

    if (!isDev) {
      cookieOptions.push(`domain=${window.location.hostname}`);
    }

    document.cookie = cookieOptions.join('; ');
    logger.debug(`[Session] Setting cookie: ${name}`, {
      isDev,
      maxAge: options.maxAge || defaultMaxAge,
      secure: !isDev,
      sameSite: options.sameSite || (isDev ? 'lax' : 'strict')
    });
    return true;
  } catch (error) {
    logger.error(`[Session] Failed to set cookie ${name}:`, {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

const clearCookie = (name) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const cookieOptions = [
      `${name}=`,
      'path=/',
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      isDev ? '' : 'secure',
      isDev ? 'samesite=lax' : 'samesite=strict'
    ].filter(Boolean);

    if (!isDev) {
      cookieOptions.push(`domain=${window.location.hostname}`);
    }

    document.cookie = cookieOptions.join('; ');
    logger.debug(`[Session] Clearing cookie: ${name}`, {
      isDev,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict'
    });
    return true;
  } catch (error) {
    logger.error(`[Session] Failed to clear cookie ${name}:`, {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Refreshes the user session and returns the tokens
 * Now with improved error handling, fallback mechanisms, and debounce protection
 */
export const refreshUserSession = async () => {
  const now = Date.now();
  const requestId = crypto.randomUUID();
  
  // Global lock system across multiple files
  if (typeof window !== 'undefined' && window.__tokenRefreshInProgress) {
    logger.debug('[refreshUserSession] Global token refresh lock detected, skipping', { requestId });
    
    // Display status message in console for debugging
    console.log('%c[PyFactor] Token refresh in progress...', 'color: #2563eb; font-weight: bold;');
    
    // Return cached tokens if available
    if (typeof localStorage !== 'undefined') {
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      
      if (idToken && accessToken && tokenTimestamp) {
        const tokenAge = now - parseInt(tokenTimestamp, 10);
        if (tokenAge < TOKEN_CACHE_DURATION) {
          return {
            tokens: {
              idToken: { toString: () => idToken },
              accessToken: { toString: () => accessToken }
            },
            isFromCache: true
          };
        }
      }
    }
    
    // If we don't have cached tokens, wait for the lock to clear
    // Don't wait more than 3 seconds to avoid deadlocks
    try {
      await new Promise((resolve, reject) => {
        const checkLock = () => {
          if (!window.__tokenRefreshInProgress) {
            resolve();
          }
        };
        const interval = setInterval(checkLock, 100);
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Timeout waiting for refresh lock'));
        }, 3000);
      });
    } catch (error) {
      logger.warn('[refreshUserSession] Timeout waiting for refresh lock', { requestId });
    }
  }
  
  // Check if we're in global cooldown period
  if (typeof window !== 'undefined' && window.__tokenRefreshCooldown && now < window.__tokenRefreshCooldown) {
    logger.warn('[refreshUserSession] In global cooldown period, skipping refresh', { requestId });
    
    // Return cached tokens if available
    if (typeof localStorage !== 'undefined') {
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      
      if (idToken && accessToken && tokenTimestamp) {
        const tokenAge = now - parseInt(tokenTimestamp, 10);
        if (tokenAge < TOKEN_CACHE_DURATION) {
          return {
            tokens: {
              idToken: { toString: () => idToken },
              accessToken: { toString: () => accessToken }
            },
            isFromCache: true
          };
        }
      }
    }
    
    return null;
  }
  
  // Check if we've exceeded max refresh attempts
  if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
    logger.error('[refreshUserSession] Too many refresh attempts, stopping refresh cycle', { 
      requestId,
      attemptCount: refreshAttemptCount
    });
    
    // Set global cooldown
    if (typeof window !== 'undefined') {
      window.__tokenRefreshCooldown = now + 60000; // 1 minute cooldown
    }
    
    return null;
  }
  
  // Check if we have valid cached tokens first
  if (typeof localStorage !== 'undefined') {
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken');
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');
    
    if (idToken && accessToken && tokenTimestamp) {
      const tokenAge = now - parseInt(tokenTimestamp, 10);
      // Use cached tokens if they're less than 15 minutes old
      if (tokenAge < TOKEN_CACHE_DURATION) {
        logger.debug('[refreshUserSession] Using cached tokens', { 
          tokenAge,
          requestId 
        });
        return {
          tokens: {
            idToken: { toString: () => idToken },
            accessToken: { toString: () => accessToken }
          },
          isFromCache: true
        };
      }
    }
  }
  
  // Debounce mechanism to prevent multiple simultaneous refresh attempts
  if (isRefreshing) {
    logger.debug('[refreshUserSession] Session refresh already in progress, returning existing promise', { requestId });
    return refreshPromise;
  }
  
  // Throttle refreshes to avoid infinite loops
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    logger.warn('[refreshUserSession] Too many refresh attempts, throttling', { 
      timeSinceLastRefresh: now - lastRefreshTime,
      minInterval: MIN_REFRESH_INTERVAL,
      requestId 
    });
    
    // Return cached tokens if available
    if (typeof localStorage !== 'undefined') {
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      
      if (idToken && accessToken && tokenTimestamp) {
        const tokenAge = now - parseInt(tokenTimestamp, 10);
        // Only use cached tokens if they're less than 15 minutes old
        if (tokenAge < TOKEN_CACHE_DURATION) {
          logger.debug('[refreshUserSession] Using cached tokens due to throttling', { 
            tokenAge,
            requestId 
          });
          return {
            tokens: {
              idToken: { toString: () => idToken },
              accessToken: { toString: () => accessToken }
            },
            isFromCache: true
          };
        }
      }
    }
    
    // If we get here, we need to wait
    await new Promise(resolve => setTimeout(resolve, MIN_REFRESH_INTERVAL));
    return refreshUserSession(); // Retry after waiting
  }
  
  // Set refresh state
  isRefreshing = true;
  if (typeof window !== 'undefined') {
    window.__tokenRefreshInProgress = true;
  }
  lastRefreshTime = now;
  refreshAttemptCount++;
  
  // Create a new promise for this refresh attempt
  refreshPromise = (async () => {
    try {
      logger.debug('[refreshUserSession] Attempting to refresh session', { 
        requestId,
        attemptCount: refreshAttemptCount
      });
      
      // First try to get current user
      const currentUser = await getCurrentUser().catch(error => {
        logger.warn('[refreshUserSession] getCurrentUser error', { 
          error: error.message, 
          requestId 
        });
        return null;
      });
      
      if (!currentUser) {
        logger.warn('[refreshUserSession] No current user found', { requestId });
        throw new Error('No authenticated user');
      }
      
      // Then fetch the auth session to get fresh tokens
      const session = await fetchAuthSession();
      
      if (!session?.tokens?.idToken) {
        logger.warn('[refreshUserSession] Fetched session missing tokens', { requestId });
        throw new Error('No valid tokens in session');
      }
      
      // Store tokens in AppCache for fallback
      if (typeof window !== 'undefined') {
        try {
          setCacheValue('idToken', session.tokens.idToken.toString());
          setCacheValue('accessToken', session.tokens.accessToken.toString());
          setCacheValue('tokenTimestamp', Date.now().toString());
          lastSuccessfulRefresh = Date.now();
        } catch (storageError) {
          logger.warn('[refreshUserSession] Error storing tokens in AppCache', { 
            error: storageError.message, 
            requestId 
          });
        }
      }
      
      logger.debug('[refreshUserSession] Session refreshed successfully', { requestId });
      return session;
    } catch (error) {
      logger.error('[refreshUserSession] Error refreshing session', { 
        error: error.message,
        stack: error.stack,
        requestId
      });
      throw error;
    } finally {
      // Reset refresh state after a delay to prevent immediate retries
      setTimeout(() => {
        isRefreshing = false;
        refreshPromise = null;
        if (typeof window !== 'undefined') {
          window.__tokenRefreshInProgress = false;
        }
      }, 5000); // 5 second cooldown
    }
  })();
  
  return refreshPromise;
};

function storeTokensInCookies(tokens) {
  try {
    if (tokens.idToken) {
      const decodedToken = parseJwt(tokens.idToken.toString());
      const tokenExpiry = decodedToken.exp * 1000;
      const now = Date.now();
      const maxAgeSeconds = Math.floor((tokenExpiry - now) / 1000);
      
      setCookie('idToken', tokens.idToken.toString(), { 
        maxAge: Math.min(maxAgeSeconds, 2 * 24 * 60 * 60),
        sameSite: 'lax'
      });
      
      if (decodedToken.sub) {
        setCookie('userId', decodedToken.sub, { 
          maxAge: 7 * 24 * 60 * 60,
          sameSite: 'lax'
        });
      }
      
      setCookie('tokenExpiry', tokenExpiry.toString(), { 
        maxAge: Math.min(maxAgeSeconds, 2 * 24 * 60 * 60),
        sameSite: 'lax'
      });
    }
    
    if (tokens.accessToken) {
      setCookie('accessToken', tokens.accessToken.toString(), { 
        maxAge: 24 * 60 * 60,
        sameSite: 'lax'
      });
    }
    
    setCookie('hasSession', 'true', { 
      maxAge: 24 * 60 * 60,
      sameSite: 'lax'
    });
    
    logger.debug('[RefreshSession] Stored tokens in cookies with enhanced security');
    return true;
  } catch (cookieError) {
    logger.warn('[RefreshSession] Failed to update cookies with new tokens:', cookieError);
    return false;
  }
}

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');

    try {
      const response = await fetch('/api/auth/clear-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to clear cookies via API: ${errorData.error || response.statusText}`);
      }

      logger.debug('[Session] Session cleared successfully');
      return true;
    } catch (cookieError) {
      logger.warn('[Session] Failed to clear cookies via API, falling back to client-side:', {
        error: cookieError.message
      });
      
      const cookiesCleared = [
        clearCookie('idToken'),
        clearCookie('accessToken'),
        clearCookie('refreshToken')
      ];

      if (!cookiesCleared.every(Boolean)) {
        throw new Error('Failed to clear one or more cookies');
      }
      
      logger.debug('[Session] Session cleared successfully (client-side fallback)');
      return true;
    }
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
      return { idToken: null, accessToken: null, tokenTimestamp: null };
    }
    
    const idToken = getCacheValue('idToken');
    const accessToken = getCacheValue('accessToken');
    const tokenTimestamp = getCacheValue('tokenTimestamp');
    
    return {
      idToken,
      accessToken,
      tokenTimestamp: tokenTimestamp ? parseInt(tokenTimestamp, 10) : null
    };
  } catch (error) {
    logger.warn('[getStoredTokens] Error reading tokens from AppCache', error);
    return { idToken: null, accessToken: null, tokenTimestamp: null };
  }
};
