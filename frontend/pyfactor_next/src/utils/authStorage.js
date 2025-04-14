/**
 * Auth Storage Utility
 * 
 * Provides utilities for securely storing authentication-related data
 * Uses AppCache instead of cookies or localStorage for better security
 */

import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Constants for cache keys
const AUTH_STATE_KEY = 'auth_state';
const AUTH_NONCE_KEY = 'auth_nonce';
const AUTH_PKCE_KEY = 'auth_pkce';
const AUTH_REDIRECT_KEY = 'auth_redirect';

/**
 * Stores OAuth state parameter in AppCache
 * 
 * @param {string} state - The OAuth state parameter
 * @returns {boolean} True if successful
 */
export function storeAuthState(state) {
  try {
    setCacheValue(AUTH_STATE_KEY, state, { ttl: 3600000 });
    return true;
  } catch (error) {
    logger.error('[AuthStorage] Error storing auth state:', error);
    return false;
  }
}

/**
 * Retrieves OAuth state parameter from AppCache
 * 
 * @returns {string|null} The state parameter or null
 */
export function getAuthState() {
  try {
    return getCacheValue(AUTH_STATE_KEY);
  } catch (error) {
    logger.error('[AuthStorage] Error getting auth state:', error);
    return null;
  }
}

/**
 * Stores OAuth nonce parameter in AppCache
 * 
 * @param {string} nonce - The OAuth nonce parameter
 * @returns {boolean} True if successful
 */
export function storeAuthNonce(nonce) {
  try {
    setCacheValue(AUTH_NONCE_KEY, nonce, { ttl: 3600000 });
    return true;
  } catch (error) {
    logger.error('[AuthStorage] Error storing auth nonce:', error);
    return false;
  }
}

/**
 * Retrieves OAuth nonce parameter from AppCache
 * 
 * @returns {string|null} The nonce parameter or null
 */
export function getAuthNonce() {
  try {
    return getCacheValue(AUTH_NONCE_KEY);
  } catch (error) {
    logger.error('[AuthStorage] Error getting auth nonce:', error);
    return null;
  }
}

/**
 * Stores PKCE code verifier in AppCache
 * 
 * @param {string} codeVerifier - The PKCE code verifier
 * @returns {boolean} True if successful
 */
export function storePKCEVerifier(codeVerifier) {
  try {
    setCacheValue(AUTH_PKCE_KEY, codeVerifier, { ttl: 3600000 });
    return true;
  } catch (error) {
    logger.error('[AuthStorage] Error storing PKCE verifier:', error);
    return false;
  }
}

/**
 * Retrieves PKCE code verifier from AppCache
 * 
 * @returns {string|null} The code verifier or null
 */
export function getPKCEVerifier() {
  try {
    return getCacheValue(AUTH_PKCE_KEY);
  } catch (error) {
    logger.error('[AuthStorage] Error getting PKCE verifier:', error);
    return null;
  }
}

/**
 * Stores redirect URL in AppCache
 * 
 * @param {string} url - The redirect URL
 * @returns {boolean} True if successful
 */
export function storeRedirectUrl(url) {
  try {
    setCacheValue(AUTH_REDIRECT_KEY, url, { ttl: 3600000 });
    return true;
  } catch (error) {
    logger.error('[AuthStorage] Error storing redirect URL:', error);
    return false;
  }
}

/**
 * Retrieves redirect URL from AppCache
 * 
 * @returns {string|null} The redirect URL or null
 */
export function getRedirectUrl() {
  try {
    return getCacheValue(AUTH_REDIRECT_KEY);
  } catch (error) {
    logger.error('[AuthStorage] Error getting redirect URL:', error);
    return null;
  }
}

/**
 * Clears all authentication data from AppCache
 * 
 * @returns {boolean} True if successful
 */
export function clearAuthData() {
  try {
    setCacheValue(AUTH_STATE_KEY, null);
    setCacheValue(AUTH_NONCE_KEY, null);
    setCacheValue(AUTH_PKCE_KEY, null);
    setCacheValue(AUTH_REDIRECT_KEY, null);
    return true;
  } catch (error) {
    logger.error('[AuthStorage] Error clearing auth data:', error);
    return false;
  }
} 