/**
 * Client-side authentication utilities
 * Ensures proper token handling for API requests
 */

import { logger } from '@/utils/logger';

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with authentication tokens
 */
export function getAuthHeaders() {
  const headers = {};
  
  try {
    // Get tokens from cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    const idToken = cookies['idToken'];
    const accessToken = cookies['accessToken'];
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (idToken) {
      headers['X-Id-Token'] = idToken;
    }
    
    logger.debug('[ClientAuth] Auth headers prepared', {
      hasAccessToken: !!accessToken,
      hasIdToken: !!idToken
    });
    
  } catch (error) {
    logger.error('[ClientAuth] Error getting auth headers:', error);
  }
  
  return headers;
}

/**
 * Make an authenticated API request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const authHeaders = getAuthHeaders();
  
  const requestOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers
    }
  };
  
  logger.debug('[ClientAuth] Making authenticated request to:', url);
  
  try {
    const response = await fetch(url, requestOptions);
    
    if (response.status === 401) {
      logger.warn('[ClientAuth] Authentication failed for request:', url);
      // Could trigger re-authentication here
    }
    
    return response;
  } catch (error) {
    logger.error('[ClientAuth] Request failed:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated by verifying tokens exist
 * @returns {boolean} True if user appears to be authenticated
 */
export function isAuthenticated() {
  try {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    const hasIdToken = !!cookies['idToken'];
    const hasAccessToken = !!cookies['accessToken'];
    
    return hasIdToken || hasAccessToken;
  } catch (error) {
    logger.error('[ClientAuth] Error checking authentication:', error);
    return false;
  }
}

/**
 * Get current user's tenant ID from tokens
 * @returns {string|null} Tenant ID or null if not found
 */
export function getCurrentTenantId() {
  try {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    const idToken = cookies['idToken'];
    if (!idToken) return null;
    
    // Decode the JWT token (client-side, no verification)
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    
    return payload['custom:tenant_ID'] || 
           payload['custom:tenantId'] || 
           payload['custom:businessid'] || 
           null;
  } catch (error) {
    logger.error('[ClientAuth] Error getting tenant ID:', error);
    return null;
  }
} 