/**
 * Authentication helper functions for server and client components
 * Provides consistent auth handling across the application
 */
import { cookies } from 'next/headers';
import { createLogger } from './logger';

// Create logger for this module
const logger = createLogger('auth-helpers');

/**
 * Extract authentication tokens from request or cookies
 * @param {Request} request - The incoming request (optional)
 * @returns {Object} Authentication data including tokens and user info
 */
export async function getAuth(request = null) {
  try {
    // Get cookie store
    const cookieStore = cookies();
    
    // Check for auth token in cookies
    const authToken = cookieStore.get('authToken')?.value;
    const idToken = cookieStore.get('idToken')?.value;
    
    // Check for Cognito cookies
    const lastAuthUser = cookieStore.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value;
    let cognitoIdToken = null;
    
    if (lastAuthUser) {
      cognitoIdToken = cookieStore.get(`CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.${lastAuthUser}.idToken`)?.value;
    }
    
    // Extract token from Authorization header if present in request
    let headerToken = null;
    if (request && request.headers) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        headerToken = authHeader.substring(7);
      }
    }
    
    // Get tenantId from cookies
    const tenantId = cookieStore.get('tenantId')?.value || cookieStore.get('businessid')?.value;
    
    // Check if we have any valid auth token
    const hasAuth = Boolean(authToken || idToken || cognitoIdToken || headerToken);
    
    // Get user ID if available
    let userId = cookieStore.get('userId')?.value;
    
    // For logging purposes (avoid sensitive data)
    logger.debug('Auth data collected', {
      hasAuthToken: Boolean(authToken),
      hasIdToken: Boolean(idToken),
      hasCognitoIdToken: Boolean(cognitoIdToken),
      hasHeaderToken: Boolean(headerToken),
      hasTenantId: Boolean(tenantId),
      hasUserId: Boolean(userId)
    });
    
    return {
      // Auth status
      isAuthenticated: hasAuth,
      // Tokens
      authToken: authToken || headerToken,
      idToken: idToken || cognitoIdToken || headerToken,
      // User info
      userId,
      tenantId,
      // Raw tokens for specific needs
      cognitoIdToken,
      headerToken
    };
  } catch (error) {
    logger.error('Error getting auth data:', { error: error.message });
    
    // Return safe defaults
    return {
      isAuthenticated: false,
      authToken: null,
      idToken: null,
      userId: null,
      tenantId: null,
      cognitoIdToken: null,
      headerToken: null
    };
  }
}

/**
 * Check if a user is authenticated with valid session
 * @param {Request} request - The incoming request (optional)
 * @returns {boolean} Whether the user is authenticated
 */
export async function isAuthenticated(request = null) {
  const auth = await getAuth(request);
  return auth.isAuthenticated;
}

/**
 * Get the current tenant ID from cookies or request
 * @param {Request} request - The incoming request (optional)
 * @returns {string|null} Tenant ID if available
 */
export async function getTenantId(request = null) {
  const auth = await getAuth(request);
  return auth.tenantId;
}

/**
 * Get the user ID from the current session
 * @param {Request} request - The incoming request (optional)
 * @returns {string|null} User ID if available
 */
export async function getUserId(request = null) {
  const auth = await getAuth(request);
  return auth.userId;
} 