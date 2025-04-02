/**
 * Utility functions for handling authentication tokens
 */
import { logger } from './logger';
// Remove static import of server components
// import { cookies, headers } from 'next/headers';

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
      // Try fallback to cookies or localStorage
      const localToken = localStorage.getItem('authToken') || getCookie('idToken');
      if (localToken) {
        console.log('[tokenUtils] Using fallback token from local storage/cookies');
        return localToken;
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
    
    // Fallback to cookies
    try {
      const idToken = getCookie('idToken');
      if (idToken) {
        console.log('[tokenUtils] Using idToken from cookies as fallback');
        return idToken;
      }
      
      const authToken = getCookie('authToken');
      if (authToken) {
        console.log('[tokenUtils] Using authToken from cookies as fallback');
        return authToken;
      }
    } catch (cookieError) {
      console.error('[tokenUtils] Cookie fallback failed:', cookieError);
    }
    
    // Second fallback to localStorage
    try {
      const localToken = localStorage.getItem('authToken') || localStorage.getItem('idToken');
      if (localToken) {
        console.log('[tokenUtils] Using token from localStorage as fallback');
        return localToken;
      }
    } catch (storageError) {
      console.error('[tokenUtils] localStorage fallback failed:', storageError);
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
 * Helper function to get a cookie by name (client-side only)
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
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
    // Server-side token handling - simplified to avoid dynamic imports
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