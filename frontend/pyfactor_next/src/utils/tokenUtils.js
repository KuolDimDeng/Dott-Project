/**
 * Utility functions for handling authentication tokens
 */
import { logger } from './logger';
import { cookies, headers } from 'next/headers';

/**
 * Check if code is running on server side
 * @returns {boolean} True if running on server
 */
const isServer = () => typeof window === 'undefined';

/**
 * Get the current access token - CLIENT VERSION
 * Tries multiple sources: auth context, cookies, localStorage
 * @returns {Promise<string|null>} The access token or null if not found
 */
export async function getAccessToken() {
  // Use the server or client implementation based on environment
  return isServer() ? getServerAccessToken() : getClientAccessToken();
}

/**
 * Get access token on the client side
 * @returns {Promise<string|null>} The access token or null
 */
async function getClientAccessToken() {
  try {
    // Try to get from auth context first (most reliable)
    try {
      // Import from contexts directly since we don't have authUtils
      const { useAuthContext } = await import('@/contexts/AuthContext.js');
      const authContext = useAuthContext();
      if (authContext && authContext.session && authContext.session.tokens) {
        const token = authContext.session.tokens.accessToken;
        if (token) {
          return token;
        }
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting token from auth context:', e);
    }

    // Try to get from cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1].trim();
        if (token) {
          return token;
        }
      }
    }

    // Try to get from localStorage as last resort
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        return token;
      }
    }

    logger.warn('[TokenUtils] No access token found from any source');
    return null;
  } catch (error) {
    logger.error('[TokenUtils] Error getting access token:', error);
    return null;
  }
}

/**
 * Get access token on the server side
 * @returns {Promise<string|null>} The access token or null
 */
async function getServerAccessToken() {
  try {
    // Try to get from cookies using next/headers
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('accessToken')?.value;
      if (token) {
        return token;
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting token from server cookies:', e);
    }

    // Try to get from authorization header
    try {
      const headersList = headers();
      const authHeader = headersList.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting token from server headers:', e);
    }

    logger.warn('[TokenUtils] No access token found from server sources');
    return null;
  } catch (error) {
    logger.error('[TokenUtils] Error getting server access token:', error);
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

    // Try to get from cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('idToken='));
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1].trim();
        if (token) {
          return token;
        }
      }
    }

    // Try to get from localStorage as last resort
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('idToken');
      if (token) {
        return token;
      }
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
    // Try to get from cookies using next/headers
    try {
      const cookieStore = cookies();
      const token = cookieStore.get('idToken')?.value;
      if (token) {
        return token;
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting ID token from server cookies:', e);
    }

    // Try to get from x-id-token header
    try {
      const headersList = headers();
      const idToken = headersList.get('x-id-token');
      if (idToken) {
        return idToken;
      }
    } catch (e) {
      logger.debug('[TokenUtils] Error getting ID token from server headers:', e);
    }

    logger.warn('[TokenUtils] No ID token found from server sources');
    return null;
  } catch (error) {
    logger.error('[TokenUtils] Error getting server ID token:', error);
    return null;
  }
}

/**
 * Set tokens in cookies and localStorage
 * @param {Object} tokens - The tokens object containing accessToken and idToken
 */
export function setTokens(tokens) {
  if (!tokens) return;
  
  const { accessToken, idToken } = tokens;
  
  // Set in cookies
  if (typeof document !== 'undefined') {
    const expires = new Date();
    expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 1 day expiry
    
    if (accessToken) {
      document.cookie = `accessToken=${accessToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    }
    
    if (idToken) {
      document.cookie = `idToken=${idToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    }
  }
  
  // Set in localStorage as backup
  if (typeof window !== 'undefined') {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    
    if (idToken) {
      localStorage.setItem('idToken', idToken);
    }
  }
}

/**
 * Clear all auth tokens
 */
export function clearTokens() {
  // Clear from cookies
  if (typeof document !== 'undefined') {
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'idToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
  }
} 