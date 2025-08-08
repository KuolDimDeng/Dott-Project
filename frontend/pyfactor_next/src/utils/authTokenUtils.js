/**
 * Auth token utilities for managing tokens and checking expiration
 */

// Auth0 authentication is handled via useSession hook
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Cache keys
const TOKEN_CACHE_PREFIX = 'auth_token_';
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the current auth token is expired
 * 
 * @returns {Promise<boolean>} True if token is expired
 */
export async function isTokenExpired() {
  try {
    // First check cache
    const cachedExpiry = getCacheValue(`${TOKEN_CACHE_PREFIX}expiry`);
    if (cachedExpiry) {
      return Date.now() > parseInt(cachedExpiry, 10);
    }
    
    // Get session from Amplify
    const session = null; // Removed Amplify - using Auth0
    
    if (!session || !session.tokens) {
      // If no session or tokens, consider expired
      return true;
    }
    
    const { idToken, accessToken } = session.tokens;
    
    // Check for token expiration
    // Convert from seconds to milliseconds for comparison with Date.now()
    const idExpiration = idToken.payload.exp * 1000;
    const accessExpiration = accessToken.payload.exp * 1000;
    
    // Use the earlier of the two expirations
    const expiration = Math.min(idExpiration, accessExpiration);
    
    // Cache the expiration time
    setCacheValue(`${TOKEN_CACHE_PREFIX}expiry`, expiration, { ttl: TOKEN_CACHE_TTL });
    
    // Return true if token is expired
    return Date.now() > expiration;
  } catch (error) {
    logger.error('[authTokenUtils] Error checking token expiration:', error);
    // If we can't check, assume token is expired
    return true;
  }
}

/**
 * Refresh the auth token
 * 
 * @returns {Promise<Object>} Refreshed auth session
 */
export async function refreshToken() {
  try {
    // Force refresh the session
    const session = await fetchAuthSession({ forceRefresh: true });
    
    if (!session || !session.tokens) {
      throw new Error('Failed to refresh token');
    }
    
    // Update cache
    const idExpiration = session.tokens.idToken.payload.exp * 1000;
    const accessExpiration = session.tokens.accessToken.payload.exp * 1000;
    const expiration = Math.min(idExpiration, accessExpiration);
    
    setCacheValue(`${TOKEN_CACHE_PREFIX}expiry`, expiration, { ttl: TOKEN_CACHE_TTL });
    
    logger.debug('[authTokenUtils] Token refreshed successfully');
    return session;
  } catch (error) {
    logger.error('[authTokenUtils] Error refreshing token:', error);
    throw error;
  }
}

/**
 * Get the token expiry time
 * 
 * @returns {Promise<number>} Expiry time in milliseconds
 */
export async function getTokenExpiry() {
  try {
    // First check cache
    const cachedExpiry = getCacheValue(`${TOKEN_CACHE_PREFIX}expiry`);
    if (cachedExpiry) {
      return parseInt(cachedExpiry, 10);
    }
    
    // Get session from Amplify
    const session = null; // Removed Amplify - using Auth0
    
    if (!session || !session.tokens) {
      // If no session or tokens, return current time (expired)
      return Date.now();
    }
    
    const { idToken, accessToken } = session.tokens;
    
    // Convert from seconds to milliseconds
    const idExpiration = idToken.payload.exp * 1000;
    const accessExpiration = accessToken.payload.exp * 1000;
    
    // Use the earlier of the two expirations
    const expiration = Math.min(idExpiration, accessExpiration);
    
    // Cache the expiration time
    setCacheValue(`${TOKEN_CACHE_PREFIX}expiry`, expiration, { ttl: TOKEN_CACHE_TTL });
    
    return expiration;
  } catch (error) {
    logger.error('[authTokenUtils] Error getting token expiry:', error);
    // Return current time (expired) if we can't check
    return Date.now();
  }
}

/**
 * Get token remaining time in seconds
 * 
 * @returns {Promise<number>} Remaining seconds
 */
export async function getTokenRemainingTime() {
  try {
    const expiry = await getTokenExpiry();
    const remainingMs = Math.max(0, expiry - Date.now());
    return Math.floor(remainingMs / 1000);
  } catch (error) {
    logger.error('[authTokenUtils] Error getting token remaining time:', error);
    return 0;
  }
}

/**
 * Get the user's Cognito groups from the token
 * 
 * @returns {Promise<string[]>} List of Cognito groups
 */
export async function getUserGroups() {
  try {
    // First check cache
    const cachedGroups = getCacheValue(`${TOKEN_CACHE_PREFIX}groups`);
    if (cachedGroups) {
      return cachedGroups;
    }
    
    // Get session from Amplify
    const session = null; // Removed Amplify - using Auth0
    
    if (!session || !session.tokens || !session.tokens.accessToken) {
      return [];
    }
    
    // Extract groups from token payload
    const groups = session.tokens.accessToken.payload['cognito:groups'] || [];
    
    // Cache the groups
    setCacheValue(`${TOKEN_CACHE_PREFIX}groups`, groups, { ttl: TOKEN_CACHE_TTL });
    
    return groups;
  } catch (error) {
    logger.error('[authTokenUtils] Error getting user groups:', error);
    return [];
  }
}

/**
 * Check if token will expire soon
 * 
 * @param {number} thresholdSeconds - Threshold in seconds
 * @returns {Promise<boolean>} True if token will expire soon
 */
export async function willTokenExpireSoon(thresholdSeconds = 300) {
  try {
    const remainingTime = await getTokenRemainingTime();
    return remainingTime <= thresholdSeconds;
  } catch (error) {
    logger.error('[authTokenUtils] Error checking if token will expire soon:', error);
    return true;
  }
} 