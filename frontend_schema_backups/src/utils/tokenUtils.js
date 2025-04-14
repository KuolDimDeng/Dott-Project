/**
 * Utility functions for handling authentication tokens
 */
import { logger } from './logger';
// Remove static import of server components
// import { cookies, headers } from 'next/headers';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';

/**
 * Check if code is running on server side
 * @returns {boolean} True if running on server
 */
const isServer = () => typeof window === 'undefined';

/**
 * Gets a valid access token for API requests with proper error handling and validation
 * @returns {Promise<string>} A valid access token
 */
export async function getAccessToken() {
  // Use server or client implementation based on environment
  return isServer() ? getServerAccessToken() : getClientAccessToken();
}

/**
 * Gets a valid access token on the client side
 * @returns {Promise<string>} A valid access token
 */
async function getClientAccessToken() {
  try {
    // Check for cached token first
    const cachedToken = sessionStorage.getItem('accessToken');
    const cachedTokenExpiry = sessionStorage.getItem('accessTokenExpiry');
    
    // If we have a cached token that's not expired, use it
    if (cachedToken && cachedTokenExpiry) {
      const expiryTime = parseInt(cachedTokenExpiry, 10);
      // Add a 5-minute buffer to ensure token doesn't expire during use
      const now = Date.now() + (5 * 60 * 1000); 
      
      if (expiryTime > now) {
        console.log('[tokenUtils] Using cached access token');
        return cachedToken;
      }
      
      console.log('[tokenUtils] Cached token expired, refreshing');
    }
    
    // Get token from Auth service
    const Auth = (await import('@aws-amplify/auth')).default;
    const session = await Auth.currentSession();
    
    if (!session) {
      console.error('[tokenUtils] No current session available');
      // Try fallback to AppCache
      const appCacheToken = getCacheValue('auth_token');
      if (appCacheToken) {
        console.log('[tokenUtils] Using fallback token from AppCache');
        return appCacheToken;
      }
      throw new Error('No authentication session available');
    }
    
    // Get and validate access token
    const token = session.getAccessToken().getJwtToken();
    
    if (!token) {
      console.error('[tokenUtils] Failed to get access token from session');
      throw new Error('Failed to get access token');
    }
    
    // Decode token to get expiry time
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp) {
          // Store token with expiry for future use
          sessionStorage.setItem('accessToken', token);
          sessionStorage.setItem('accessTokenExpiry', payload.exp * 1000);
          console.log(`[tokenUtils] Token cached with expiry ${new Date(payload.exp * 1000).toISOString()}`);
        }
      } catch (decodeError) {
        console.warn('[tokenUtils] Could not decode token for caching:', decodeError.message);
      }
    }
    
    return token;
  } catch (error) {
    console.error('[tokenUtils] Error getting access token:', error);
    
    // Fallback to AppCache
    try {
      const appCacheToken = getCacheValue('auth_token') || getCacheValue('id_token');
      if (appCacheToken) {
        console.log('[tokenUtils] Using token from AppCache as fallback');
        return appCacheToken;
      }
    } catch (cacheError) {
      console.error('[tokenUtils] AppCache fallback failed:', cacheError);
    }
    
    // If all else fails, throw error to be handled by caller
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Gets a valid access token on the server side
 * @returns {Promise<string>} A valid access token
 */
async function getServerAccessToken() {
  try {
    logger.debug('[tokenUtils] Getting access token on server');
    
    // Server-side token handling - simplified to avoid dynamic imports
    logger.warn('[tokenUtils] No token found on server side');
    return null;
  } catch (error) {
    logger.error('[tokenUtils] Error getting server access token:', error);
    return null;
  }
}

/**
 * Get the current ID token
 * @returns {Promise<string|null>} The ID token or null if not found
 */
export async function getIdToken() {
  // Use the server or client implementation based on environment
  return isServer() ? getServerIdToken() : getClientIdToken();
}

/**
 * Get the ID token on the client side
 * @returns {Promise<string|null>} The ID token or null
 */
async function getClientIdToken() {
  try {
    // Try to get from auth context first
    try {
      // Import from contexts directly since we don't have authUtils
      const { useAuthContext } = await import('@/contexts/AuthContext.js');
      const authContext = useAuthContext();
      if (authContext && authContext.session && authContext.session.tokens) {
        const token = authContext.session.tokens.idToken;
        if (token) {
          return token;
        }
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting ID token from auth context:', e);
    }

    // Try to get from AppCache
    const appCacheToken = getCacheValue('id_token');
    if (appCacheToken) {
      return appCacheToken;
    }

    logger.warn('[TokenUtils] No ID token found from any source');
    return null;
  } catch (error) {
    logger.error('[TokenUtils] Error getting ID token:', error);
    return null;
  }
}

/**
 * Get ID token on the server side
 * @returns {Promise<string|null>} The ID token or null
 */
async function getServerIdToken() {
  try {
    // Server-side token handling - simplified to avoid dynamic imports
    logger.warn('[TokenUtils] No ID token found from server sources');
    return null;
  } catch (error) {
    logger.error('[TokenUtils] Error getting server ID token:', error);
    return null;
  }
}

/**
 * Set tokens in AppCache
 * @param {Object} tokens - The tokens object containing accessToken and idToken
 */
export function setTokens(tokens) {
  if (!tokens) return;
  
  const { accessToken, idToken } = tokens;
  
  // Set in AppCache with 1 day expiry
  const ttl = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  
  if (accessToken) {
    setCacheValue('access_token', accessToken, { ttl });
  }
  
  if (idToken) {
    setCacheValue('id_token', idToken, { ttl });
  }
}

/**
 * Clear tokens from AppCache
 */
export function clearTokens() {
  // Clear from AppCache
  removeCacheValue('access_token');
  removeCacheValue('id_token');
  removeCacheValue('auth_token');
} 