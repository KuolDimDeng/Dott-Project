/**
 * Utility functions for API routes
 */
import { logger } from './logger';
// Use dynamic import for server components

/**
 * Helper function to check if code is running on server
 * @returns {boolean} True if running on server
 */
export const isServer = () => typeof window === 'undefined';

/**
 * Extract tokens from the request
 * @param {Request} request - The incoming request
 * @returns {Object} Object containing the extracted tokens
 */
export async function getTokens(request) {
  logger.debug('[ApiUtils] Extracting tokens from request');

  let accessToken = null;
  let idToken = null;
  let tenantId = null;
  
  // Check if authorization header exists
  if (request && request.headers) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
      logger.debug('[ApiUtils] Found access token in Authorization header');
    }
    
    // Check other potential headers
    idToken = request.headers.get('x-id-token') || null;
    if (idToken) {
      logger.debug('[ApiUtils] Found ID token in x-id-token header');
    }
    
    tenantId = request.headers.get('x-tenant-id') || null;
    if (tenantId) {
      logger.debug('[ApiUtils] Found tenant ID in x-tenant-id header');
    }
  }
  
  // If not in headers, try to get from cookies
  if (!accessToken || !idToken || !tenantId) {
    try {
      // Dynamic import for server-side cookies
      const { cookies } = await import('next/headers');
      const cookieStore = cookies();
      
      if (!accessToken) {
        // Try multiple potential cookie names
        accessToken = cookieStore.get('accessToken')?.value || 
                      cookieStore.get('access_token')?.value || 
                      cookieStore.get('CognitoIdentityServiceProvider.*_accessToken')?.value;
      }
      
      if (!idToken) {
        // Try multiple potential cookie names
        idToken = cookieStore.get('idToken')?.value || 
                 cookieStore.get('id_token')?.value || 
                 cookieStore.get('CognitoIdentityServiceProvider.*_idToken')?.value;
      }
      
      if (!tenantId) {
        tenantId = cookieStore.get('tenantId')?.value || 
                  cookieStore.get('businessId')?.value;
      }
      
      // Log all cookies for debugging (only in dev)
      if (process.env.NODE_ENV === 'development') {
        const allCookies = cookieStore.getAll();
        logger.debug(`[ApiUtils] Found ${allCookies.length} cookies in request`);
        allCookies.forEach(cookie => {
          if (!cookie.name.toLowerCase().includes('token')) {
            logger.debug(`[ApiUtils] Cookie: ${cookie.name}`);
          } else {
            logger.debug(`[ApiUtils] Auth Cookie present: ${cookie.name}`);
          }
        });
      }
    } catch (error) {
      logger.warn('[ApiUtils] Error accessing cookies:', error.message);
    }
  }
  
  // If still no tokens, try to get from request cookies manually
  if ((!accessToken || !idToken) && request && request.cookies) {
    try {
      // Some Next.js versions provide cookies directly on request
      if (typeof request.cookies.get === 'function') {
        if (!accessToken) {
          accessToken = request.cookies.get('accessToken')?.value;
        }
        if (!idToken) {
          idToken = request.cookies.get('idToken')?.value;
        }
        if (!tenantId) {
          tenantId = request.cookies.get('tenantId')?.value;
        }
      }
    } catch (error) {
      logger.warn('[ApiUtils] Error accessing request cookies directly:', error.message);
    }
  }
  
  return {
    accessToken,
    idToken,
    tenantId
  };
}

/**
 * Get API base URL
 * @returns {string} The base URL for API calls
 */
export function getApiBaseUrl() {
  // In development, use the local API
  // In production, use the deployed API URL from env vars
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  
  return process.env.NEXT_PUBLIC_API_URL || '';
}

/**
 * Create authorization headers with token
 * @param {string} token - The auth token
 * @param {string} tenantId - Optional tenant ID
 * @returns {Headers} Headers object with authorization
 */
export function createAuthHeaders(token, tenantId = null) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });
  
  if (tenantId) {
    headers.append('X-Tenant-ID', tenantId);
  }
  
  return headers;
}

/**
 * Handle API error responses
 * @param {Response} response - The API response
 * @returns {Promise<Object>} The error object
 */
export async function handleApiError(response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      return { 
        status: response.status, 
        message: errorData.detail || errorData.message || errorData.error || 'Unknown API error',
        errors: errorData.errors || null,
        data: errorData
      };
    } else {
      const text = await response.text();
      return { 
        status: response.status, 
        message: text || 'API error with non-JSON response',
        raw: text
      };
    }
  } catch (error) {
    return { 
      status: response.status || 500, 
      message: `Failed to parse API error: ${error.message}`,
      originalError: error.toString()
    };
  }
} 