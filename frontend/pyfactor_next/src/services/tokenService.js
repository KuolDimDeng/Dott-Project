'use client';

import { auth0Utils } from '@/config/auth0';

import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from @/utils/appCache';

// Token cache keys
const TOKEN_CACHE_KEY = 'auth_tokens';
const TOKEN_REFRESH_LOCK_KEY = 'refresh_in_progress';
const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Refresh threshold (refresh if less than 5 minutes before expiry)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; 

/**
 * Token Service
 * 
 * Provides centralized management of authentication tokens
 * with automatic refresh handling and resilience patterns
 */
class TokenService {
  constructor() {
    this.refreshPromise = null;
    this.lastRefreshTime = 0;
    this.refreshMinInterval = 30 * 1000; // 30 seconds
    this.listeners = new Set();
  }

  /**
   * Get current auth tokens, refreshing if necessary
   * @param {boolean} forceRefresh - Force refresh tokens even if they're not expired
   * @returns {Promise<Object>} The tokens object
   */
  async getTokens(forceRefresh = false) {
    try {
      logger.debug('[TokenService] Getting tokens', { forceRefresh });
      
      // Check if a refresh is already in progress
      const refreshLock = getCacheValue(TOKEN_REFRESH_LOCK_KEY);
      if (refreshLock) {
        logger.debug('[TokenService] Refresh already in progress, waiting...');
        // Wait a bit and then retrieve the latest tokens
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.getTokens(false); // Recursive call, but don't force refresh to avoid loops
      }
      
      // If forced refresh or enough time has passed since last refresh
      if (forceRefresh || Date.now() - this.lastRefreshTime > this.refreshMinInterval) {
        return await this.refreshTokens();
      }
      
      try {
        // Try to get tokens from Amplify first (most reliable source)
        const session = await fetchAuthSession();
        if (session.tokens) {
          // Cache the tokens for resilience
          this.cacheTokens(session.tokens);
          return session.tokens;
        }
      } catch (amplifyError) {
        logger.warn('[TokenService] Error getting tokens from Amplify:', amplifyError);
        // Fall back to cached tokens
      }
      
      // Check the cache as fallback
      const cachedTokens = getCacheValue(TOKEN_CACHE_KEY);
      if (cachedTokens) {
        return cachedTokens;
      }
      
      // If we got here, we need to refresh
      return await this.refreshTokens();
    } catch (error) {
      logger.error('[TokenService] Error getting tokens:', error);
      
      // Final fallback - try cached tokens even if expired
      const cachedTokens = getCacheValue(TOKEN_CACHE_KEY);
      if (cachedTokens) {
        logger.warn('[TokenService] Falling back to potentially expired cached tokens');
        return cachedTokens;
      }
      
      throw error;
    }
  }

  /**
   * Refresh the authentication tokens
   * @returns {Promise<Object>} The refreshed tokens
   */
  async refreshTokens() {
    // Set a lock to prevent multiple concurrent refreshes
    setCacheValue(TOKEN_REFRESH_LOCK_KEY, true, { ttl: 5000 }); // 5 second lock
    
    try {
      logger.debug('[TokenService] Refreshing tokens');
      
      if (this.refreshPromise) {
        logger.debug('[TokenService] Using existing refresh promise');
        return await this.refreshPromise;
      }
      
      // Create a new refresh promise
      this.refreshPromise = (async () => {
        try {
          // Use Amplify Auth to refresh the session
          const session = await fetchAuthSession();
          
          // Update last refresh timestamp
          this.lastRefreshTime = Date.now();
          
          if (!session.tokens) {
            throw new Error('No tokens returned from refresh');
          }
          
          // Cache the refreshed tokens
          this.cacheTokens(session.tokens);
          
          // Notify listeners
          this.notifyListeners('refresh');
          
          return session.tokens;
        } catch (error) {
          logger.error('[TokenService] Error refreshing tokens:', error);
          
          // Check if this is an expired token or auth error
          if (error.name === 'NotAuthorizedException' || 
              error.message?.includes('expired')) {
            logger.warn('[TokenService] Tokens expired, signing out');
            
            // Notify listeners of expiry
            this.notifyListeners('expired');
            
            // Clear cached tokens
            setCacheValue(TOKEN_CACHE_KEY, null);
            
            try {
              // Sign out to clear Amplify state
              await signOut();
            } catch (signOutError) {
              logger.error('[TokenService] Error signing out:', signOutError);
            }
          }
          
          throw error;
        }
      })();
      
      // Wait for the promise to resolve
      const tokens = await this.refreshPromise;
      
      // Clear the promise so future calls will create a new one
      this.refreshPromise = null;
      
      return tokens;
    } finally {
      // Clear the lock
      setCacheValue(TOKEN_REFRESH_LOCK_KEY, null);
    }
  }

  /**
   * Cache tokens for resilience
   * @param {Object} tokens - The tokens to cache
   */
  cacheTokens(tokens) {
    try {
      setCacheValue(TOKEN_CACHE_KEY, {
        ...tokens,
        timestamp: Date.now()
      }, { ttl: TOKEN_CACHE_TTL });
    } catch (error) {
      logger.error('[TokenService] Error caching tokens:', error);
    }
  }

  /**
   * Add a listener for token events
   * @param {Function} listener - The listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Remove a token event listener
   * @param {Function} listener - The listener to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a token event
   * @param {string} event - The event type ('refresh', 'expired', etc.)
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('[TokenService] Error in token listener:', error);
      }
    });
  }

  /**
   * Check if token needs refresh
   * @returns {Promise<boolean>} True if tokens need refresh
   */
  async needsRefresh() {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens) return true;
      
      // Get expiration time
      const expiration = session.tokens.accessToken?.payload?.exp * 1000 || 0;
      
      // Refresh if less than threshold from expiry
      return Date.now() + REFRESH_THRESHOLD_MS > expiration;
    } catch (error) {
      logger.warn('[TokenService] Error checking token refresh:', error);
      return true; // Refresh if we can't determine
    }
  }
}

// Create a singleton instance
export const tokenService = new TokenService();

// Export a hook for components to use
export function useTokenRefresh() {
  return {
    refreshTokens: () => tokenService.refreshTokens(),
    getTokens: (force = false) => tokenService.getTokens(force),
    needsRefresh: () => tokenService.needsRefresh(),
    addRefreshListener: (listener) => tokenService.addListener(listener)
  };
}

/**
 * Gets authentication session (Auth0 compatibility)
 * @returns {Promise<Object|null>} Session object or null
 */
const fetchAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      return {
        tokens: {
          accessToken: await auth0Utils.getAccessToken(),
          idToken: await auth0Utils.getAccessToken()
        },
        userSub: user.sub
      };
    }
    return null;
  } catch (error) {
    logger.error('[tokenService] Error fetching session:', error);
    return null;
  }
};

/**
 * Signs out user (Auth0 compatibility)
 * @returns {Promise<void>}
 */
const signOut = async () => {
  try {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/logout';
    }
  } catch (error) {
    logger.error('[tokenService] Error signing out:', error);
    throw error;
  }
}; 