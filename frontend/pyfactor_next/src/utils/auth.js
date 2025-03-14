import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { jwtDecode } from 'jwt-decode';

/**
 * Get the current authentication token
 * @returns {Promise<string|null>} The ID token or null if not authenticated
 */
export async function getAuthToken() {
  try {
    logger.debug('[Auth] Getting auth token');
    const { tokens } = await fetchAuthSession();
    
    if (!tokens?.idToken) {
      logger.warn('[Auth] No ID token available');
      return null;
    }
    
    return tokens.idToken.toString();
  } catch (error) {
    logger.error('[Auth] Error getting auth token:', error);
    return null;
  }
}

/**
 * Get the current access token
 * @returns {Promise<string|null>} The access token or null if not authenticated
 */
export async function getAccessToken() {
  try {
    logger.debug('[Auth] Getting access token');
    const { tokens } = await fetchAuthSession();
    
    if (!tokens?.accessToken) {
      logger.warn('[Auth] No access token available');
      return null;
    }
    
    return tokens.accessToken.toString();
  } catch (error) {
    logger.error('[Auth] Error getting access token:', error);
    return null;
  }
}
/**
 * Get a refreshed access token if the current one is expired or about to expire
 * @param {string} [currentToken] - Optional current token to check and refresh
 * @returns {Promise<string|null>} The refreshed access token or null if not authenticated
 */
export async function getRefreshedAccessToken(currentToken) {
  try {
    logger.debug('[Auth] Getting refreshed access token');
    
    // Check if we're in a server-side environment
    const isServerSide = typeof window === 'undefined';
    
    // If we're on the server side and have a current token, just return it
    // Server-side token refresh is handled differently
    if (isServerSide && currentToken) {
      logger.debug('[Auth] Server-side context with token, returning as-is');
      return currentToken;
    }
    
    // First try to get the current session
    const { tokens } = await fetchAuthSession();
    
    if (!tokens?.accessToken) {
      logger.warn('[Auth] No access token available');
      return null;
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const decoded = jwtDecode(tokens.accessToken.toString());
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesInSeconds = 5 * 60;
    
    if (decoded.exp && decoded.exp - now < fiveMinutesInSeconds) {
      logger.info('[Auth] Token is expired or about to expire, refreshing...');
      // Force token refresh
      try {
        const { tokens: newTokens } = await fetchAuthSession({ forceRefresh: true });
        logger.info('[Auth] Token refreshed successfully');
        return newTokens.accessToken.toString();
      } catch (refreshError) {
        logger.error('[Auth] Error refreshing token:', refreshError);
        // If refresh fails but token is still valid, return the original token
        if (decoded.exp > now) {
          logger.warn('[Auth] Using original token as fallback');
          return tokens.accessToken.toString();
        }
        return null;
      }
    }
    
    logger.debug('[Auth] Current token is still valid');
    return tokens.accessToken.toString();
  } catch (error) {
    logger.error('[Auth] Error getting refreshed access token:', error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    logger.error('[Auth] Error checking authentication status:', error);
    return false;
  }
}

/**
 * Check if a token is expired
 * @param {string} token - The JWT token to check
 * @returns {boolean} True if token is expired, false otherwise
 */
export function isTokenExpired(token) {
  try {
    if (!token) return true;
    
    const decoded = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    
    return decoded.exp && decoded.exp < now;
  } catch (error) {
    logger.error('[Auth] Error checking token expiration:', error);
    return true; // Assume expired if we can't decode
  }
}