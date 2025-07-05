/**
 * Token Manager
 * 
 * Provides utilities for storing and retrieving authentication tokens
 * Uses Cognito attributes and AppCache instead of cookies
 */

import { setCacheValue, getCacheValue } from @/utils/appCache';
import { logger } from '@/utils/logger';

/**
 * Store authentication tokens in AppCache
 * 
 * @param {Object} tokens - The tokens to store
 * @param {string} tokens.idToken - ID token
 * @param {string} tokens.accessToken - Access token
 * @param {string} tokens.refreshToken - Refresh token
 */
export function storeTokens(tokens) {
  if (!tokens) return;
  
  try {
    // Store tokens in AppCache
    if (tokens.idToken) {
      setCacheValue('idToken', tokens.idToken, { ttl: 3600000 }); // 1 hour
    }
    
    if (tokens.accessToken) {
      setCacheValue('accessToken', tokens.accessToken, { ttl: 3600000 }); // 1 hour
    }
    
    if (tokens.refreshToken) {
      setCacheValue('refreshToken', tokens.refreshToken, { ttl: 86400000 }); // 24 hours
    }
    
    // Store timestamp for expiration calculations
    setCacheValue('tokenTimestamp', Date.now(), { ttl: 86400000 });
    
    logger.debug('[TokenManager] Tokens stored in AppCache');
  } catch (error) {
    logger.error('[TokenManager] Error storing tokens:', error);
  }
}

/**
 * Clear authentication tokens from AppCache
 */
export function clearTokens() {
  try {
    // Clear tokens from AppCache
    setCacheValue('idToken', null);
    setCacheValue('accessToken', null);
    setCacheValue('refreshToken', null);
    setCacheValue('tokenTimestamp', null);
    
    logger.debug('[TokenManager] Tokens cleared from AppCache');
  } catch (error) {
    logger.error('[TokenManager] Error clearing tokens:', error);
  }
}

/**
 * Get authentication tokens from AppCache
 * 
 * @returns {Object|null} The tokens or null if not found
 */
export function getTokens() {
  try {
    const idToken = getCacheValue('idToken');
    const accessToken = getCacheValue('accessToken');
    const refreshToken = getCacheValue('refreshToken');
    
    if (!idToken || !accessToken) {
      return null;
    }
    
    return {
      idToken,
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('[TokenManager] Error getting tokens:', error);
    return null;
  }
}

/**
 * Check if tokens are expired
 * 
 * @returns {boolean} True if tokens are expired
 */
export function areTokensExpired() {
  try {
    const timestamp = getCacheValue('tokenTimestamp');
    if (!timestamp) return true;
    
    // Consider tokens expired after 50 minutes (tokens typically last 1 hour)
    const expirationTime = 50 * 60 * 1000; // 50 minutes in milliseconds
    return Date.now() - timestamp > expirationTime;
  } catch (error) {
    logger.error('[TokenManager] Error checking token expiration:', error);
    return true;
  }
}