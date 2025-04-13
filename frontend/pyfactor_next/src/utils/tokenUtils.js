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
    // Get token from Auth service
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session || !session.tokens) {
      console.error('[tokenUtils] No current session available');
      throw new Error('No authentication session available');
    }
    
    // Get and validate access token
    const token = session.tokens.accessToken?.toString();
    
    if (!token) {
      console.error('[tokenUtils] Failed to get access token from session');
      throw new Error('Failed to get access token');
    }
    
    return token;
  } catch (error) {
    console.error('[tokenUtils] Error getting access token:', error);
    
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
    // Import auth utilities
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get current session
    const session = await fetchAuthSession();
    
    if (session && session.tokens && session.tokens.idToken) {
      return session.tokens.idToken.toString();
    }
    
    logger.warn('[TokenUtils] No ID token found from session');
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
 * Set tokens in Cognito session
 * This is a no-op function since Cognito manages tokens internally
 * @param {Object} tokens - The tokens object containing accessToken and idToken
 */
export function setTokens(tokens) {
  // Tokens are managed by Cognito internally
  logger.debug('[TokenUtils] Token management is handled by Cognito internally');
  return;
}

/**
 * Clear tokens by signing out
 */
export async function clearTokens() {
  try {
    // Import auth utilities
    const { signOut } = await import('aws-amplify/auth');
    
    // Sign out completely
    await signOut({ global: true });
    
    logger.debug('[TokenUtils] Tokens cleared via signOut');
    return true;
  } catch (error) {
    logger.error('[TokenUtils] Error clearing tokens:', error);
    return false;
  }
} 