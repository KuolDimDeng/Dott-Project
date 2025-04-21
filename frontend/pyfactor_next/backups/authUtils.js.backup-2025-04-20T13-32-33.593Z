'use client';

import { fetchAuthSession, signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { logger } from './logger';
import { jwtDecode } from 'jwt-decode';

/**
 * Checks if a route is public (doesn't require authentication)
 * @param {string} path - The route path to check
 * @returns {boolean} - True if the route is public, false otherwise
 */
export const isPublic = (path) => {
  if (!path) return false;
  
  // Normalize the path
  const normalizedPath = path.toLowerCase();
  
  // These routes are always public
  const publicRoutes = [
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/forgot-password',
    '/auth/verify-email',
    '/auth/callback',
    '/auth/error',
    // Add landing/marketing pages
    '/',
    '/pricing',
    '/features',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/help',
    '/faq'
  ];
  
  // Check exact matches first
  if (publicRoutes.includes(normalizedPath)) {
    logger.debug(`[authUtils] Route ${path} is public (exact match)`);
    return true;
  }
  
  // Check prefixes (for nested routes)
  const publicPrefixes = [
    '/api/public/',
    '/static/',
    '/assets/',
    '/images/',
    '/auth/verify-',
  ];
  
  // Check if any public prefix matches
  for (const prefix of publicPrefixes) {
    if (normalizedPath.startsWith(prefix)) {
      logger.debug(`[authUtils] Route ${path} is public (prefix match: ${prefix})`);
      return true;
    }
  }
  
  // Check for API routes that should be public
  if (normalizedPath.startsWith('/api/')) {
    const publicApiRoutes = [
      '/api/auth/',
      '/api/public/',
      '/api/status',
      '/api/health',
      '/api/version',
    ];
    
    for (const apiRoute of publicApiRoutes) {
      if (normalizedPath.startsWith(apiRoute)) {
        logger.debug(`[authUtils] API route ${path} is public`);
        return true;
      }
    }
  }
  
  // For all other routes, they're private
  logger.debug(`[authUtils] Route ${path} is private (prefix match)`);
  return false;
};

/**
 * Extracts an access token from a session object
 * @param {Object} session - The session object from NextAuth
 * @returns {string|null} - The access token or null if not found
 */
export const getAccessToken = async (session) => {
  try {
    if (!session) {
      logger.warn('No session provided to getAccessToken');
      return null;
    }

    // Check if token exists directly on session
    if (session.accessToken) {
      return session.accessToken;
    }

    // Some session implementations store tokens in user object
    if (session.user?.accessToken) {
      return session.user.accessToken;
    }

    // Check if token exists in a token property
    if (session.token?.accessToken) {
      return session.token.accessToken;
    }

    logger.warn('No access token found in session');
    return null;
  } catch (error) {
    logger.error('Error extracting access token:', error);
    return null;
  }
};

/**
 * Refreshes an expired access token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<string|null>} - New access token or null if refresh failed
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    if (!refreshToken) {
      logger.warn('No refresh token provided');
      return null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      logger.error('Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    logger.error('Error refreshing access token:', error);
    return null;
  }
};

/**
 * Verifies if a user is authenticated
 * @param {Object} session - The session object
 * @returns {boolean} - True if authenticated
 */
export const isAuthenticated = (session) => {
  return !!session && (!!session.accessToken || !!session.user?.accessToken);
};

/**
 * Checks if the user has specific permissions
 * @param {Object} session - The session object
 * @param {string[]} requiredPermissions - List of required permissions
 * @returns {boolean} - True if user has all required permissions
 */
export const hasPermissions = (session, requiredPermissions = []) => {
  if (!isAuthenticated(session) || !requiredPermissions.length) {
    return false;
  }

  const userPermissions = session.user?.permissions || [];
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

/**
 * Parses JWT token and returns payload
 * @param {string} token - JWT token to parse
 * @returns {Object|null} - Token payload or null if invalid
 */
export const parseJwt = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Error parsing JWT:', error);
    return null;
  }
};

/**
 * Server-side auth helper for API routes
 * Used to authenticate requests and extract tenant information
 * @param {Object} request - The incoming request object
 * @returns {Object} Auth information including userId, tenantId, and authentication status
 */
export const getAuth = async (request) => {
  try {
    // Get the token from either the Authorization header or cookies
    let token = null;
    const authHeader = request?.headers?.get('Authorization') || 
                       request?.headers?.Authorization || 
                       '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Check in cookies using document.cookie for client components
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        token = cookies['accessToken'];
      }
    }
    
    if (!token) {
      logger.warn('[authUtils] No authentication token found in request');
      return { 
        authenticated: false, 
        userId: null, 
        tenantId: null,
        message: 'No authentication token found'
      };
    }
    
    // Decode the token to get user information
    const decoded = jwtDecode(token);
    
    if (!decoded || !decoded.sub) {
      logger.warn('[authUtils] Invalid token payload', decoded);
      return { 
        authenticated: false, 
        userId: null, 
        tenantId: null,
        message: 'Invalid token payload'
      };
    }
    
    // Extract user ID from token
    const userId = decoded.sub;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      logger.warn(`[authUtils] Token expired for user ${userId}`);
      return { 
        authenticated: false, 
        userId,
        tenantId: null, 
        message: 'Token expired'
      };
    }
    
    // Extract tenant ID from various sources
    let tenantId = null;
    
    // 1. Check the token claims first
    if (decoded.tenant_id) {
      tenantId = decoded.tenant_id;
    } else if (decoded.businessId) {
      tenantId = decoded.businessId;
    }
    
    // 2. Check request headers
    if (!tenantId && request?.headers) {
      tenantId = request.headers.get?.('x-tenant-id') || 
                request.headers.get?.('x-business-id') ||
                request.headers['x-tenant-id'] ||
                request.headers['x-business-id'];
    }
    
    // 3. Check cookies as fallback
    if (!tenantId && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      tenantId = cookies['tenantId'] || cookies['businessid'];
    }
    
    logger.info(`[authUtils] Authenticated user: ${userId}, tenant: ${tenantId || 'none'}`);
    
    return {
      authenticated: true,
      userId,
      tenantId,
      roles: decoded.roles || [],
      email: decoded.email,
      exp: decoded.exp
    };
  } catch (error) {
    logger.error('[authUtils] Authentication error:', error);
    return { 
      authenticated: false, 
      userId: null, 
      tenantId: null,
      message: 'Authentication error'
    };
  }
};

/**
 * Ensures Amplify is configured before making authentication calls
 * This helps prevent "UserPool not configured" errors
 */
export function ensureAmplifyConfigured() {
  try {
    // Import Amplify configuration directly - this will run synchronously
    const amplifyConfig = require('@/lib/amplifyConfig').default;
    
    // Log success
    logger.debug('[authUtils] Amplify configuration loaded successfully');
    return true;
  } catch (error) {
    logger.error('[authUtils] Error in ensureAmplifyConfigured:', error);
    
    // Apply fallback configuration inline
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
            userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-east-1_JPL8vGfb6',
            userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b',
          }
        }
      });
      logger.debug('[authUtils] Applied fallback Amplify configuration');
      return true;
    } catch (fallbackError) {
      logger.error('[authUtils] Fallback configuration also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Authenticates a user with the provided credentials
 * Includes special handling for admin users (override)
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>} Authentication result
 */
export async function authenticateUser(username, password) {
  try {
    // Ensure Amplify is configured
    ensureAmplifyConfigured();
    
    // Apply special case for admin/testing users
    if (username === 'admin@example.com' && password === 'Password123!') {
      logger.info('[authUtils] ADMIN OVERRIDE - Special authentication case for testing');
      return {
        isSignedIn: true,
        userId: 'admin-override-uid',
        username: 'admin@example.com'
      };
    }
    
    // Regular authentication flow
    logger.debug(`[authUtils] Attempting to sign in user: ${username}`);
    const { isSignedIn, nextStep } = await signIn({ username, password });
    
    if (nextStep && nextStep.signInStep !== 'DONE') {
      logger.info(`[authUtils] Sign-in requires additional steps: ${nextStep.signInStep}`);
      return { isSignedIn: false, nextStep };
    }
    
    logger.info(`[authUtils] User signed in successfully: ${username}`);
    return { isSignedIn, nextStep };
  } catch (error) {
    logger.error('[authUtils] Error authenticating user:', error);
    throw error;
  }
}

/**
 * Gets auth session with retry capability to handle race conditions
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Auth session
 */
export async function getAuthSessionWithRetries(maxRetries = 3) {
  let retries = 0;
  let lastError = null;
  
  while (retries <= maxRetries) {
    try {
      // Ensure Amplify is configured
      ensureAmplifyConfigured();
      
      // Wait a bit on retries to let configuration settle
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retries * 300));
      }
      
      logger.debug(`[authUtils] Attempting to get auth session (attempt ${retries + 1}/${maxRetries + 1})`);
      const session = await fetchAuthSession();
      logger.debug('[authUtils] Successfully retrieved auth session');
      return session;
    } catch (error) {
      lastError = error;
      logger.warn(`[authUtils] Error getting auth session (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      retries++;
    }
  }
  
  logger.error(`[authUtils] Failed to get auth session after ${maxRetries} retries:`, lastError);
  throw lastError;
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - User object if authenticated
 */
export async function getAuthenticatedUser() {
  try {
    // Ensure Amplify is configured
    ensureAmplifyConfigured();
    
    // Get current user
    const user = await getCurrentUser();
    logger.debug('[authUtils] Current user retrieved successfully');
    return user;
  } catch (error) {
    logger.warn('[authUtils] Error getting current user:', error);
    return null;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    // Ensure Amplify is configured
    ensureAmplifyConfigured();
    
    // Sign out
    await signOut();
    logger.debug('[authUtils] User signed out successfully');
  } catch (error) {
    logger.error('[authUtils] Error signing out:', error);
    throw error;
  }
}

/**
 * Clears all authentication-related data from browser
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllAuthData() {
  try {
    logger.debug('[authUtils] Clearing all authentication data');
    
    // Import required functions
    const { signOut } = await import('aws-amplify/auth');
    const { clearCache, removeCacheValue } = await import('@/utils/appCache');
    
    // 1. Try to sign out with Amplify API first
    try {
      await signOut();
      logger.debug('[authUtils] Successfully signed out from Amplify');
    } catch (signOutError) {
      logger.warn('[authUtils] Error signing out from Amplify:', signOutError);
      // Continue with cleanup even if signOut fails
    }
    
    // 2. Clear appCache - our primary client-side storage now
    try {
      // Clear all app cache
      clearCache();
      
      // Ensure specific auth keys are cleared from appCache
      const appKeys = [
        'unconfirmedEmail',
        'pendingVerificationEmail',
        'verificationEmail',
        'pyfactor_email',
        'needs_verification',
        'returnToOnboarding',
        'onboardingStep',
        'userEmail',
        'tempPassword',
        'businessInfo',
        'businessName',
        'businessType', 
        'country',
        'legalStructure',
        'onboardingInProgress',
        'onboardedStatus',
        'tokenExpired',
        // Additional auth-related cache keys
        'auth_id_token',
        'auth_access_token',
        'auth_refresh_token',
        'id_token',
        'access_token',
        'refresh_token'
      ];
      
      appKeys.forEach(key => removeCacheValue(key));
      logger.debug('[authUtils] Successfully cleared cache items');
    } catch (storageError) {
      logger.error('[authUtils] Error clearing cache:', storageError);
    }
    
    // 3. Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
        logger.debug('[authUtils] Successfully cleared sessionStorage');
      } catch (sessionError) {
        logger.error('[authUtils] Error clearing sessionStorage:', sessionError);
      }
    }
    
    // 4. Try to clear IndexedDB if browser supports it
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        // Get list of all databases
        const databases = await window.indexedDB.databases();
        
        // Delete each database
        for (const db of databases) {
          if (db.name) {
            await window.indexedDB.deleteDatabase(db.name);
          }
        }
        
        logger.debug('[authUtils] Successfully cleared IndexedDB databases');
      } catch (indexedDBError) {
        logger.error('[authUtils] Error clearing IndexedDB:', indexedDBError);
      }
    }
    
    logger.debug('[authUtils] Successfully cleared all authentication data');
    return true;
  } catch (error) {
    logger.error('[authUtils] Error clearing authentication data:', error);
    return false;
  }
}

/**
 * Ensures the user has a created_at attribute in Cognito
 * This is important for tracking user lifetime and activity
 */
export async function ensureUserCreatedAt(userInfo) {
  try {
    // Import required functions
    const { getCurrentUser, updateUserAttributes } = await import('aws-amplify/auth');
    
    // Get current user
    const currentUser = await getCurrentUser();
    
    // Get user attributes
    const { userAttributes } = currentUser;
    
    // Check if created_at attribute exists
    const hasCreatedAt = userAttributes && userAttributes['custom:created_at'];
    
    if (!hasCreatedAt) {
      const timestamp = new Date().toISOString();
      
      // Add created_at attribute
      await updateUserAttributes({
        userAttributes: {
          'custom:created_at': timestamp
        }
      });
      
      logger.info('Added created_at attribute for user', {
        userId: userInfo?.username,
        timestamp
      });
    }
  } catch (error) {
    // Handle chunk loading errors gracefully
    logger.warn('Error ensuring user created_at attribute:', error.message || error);
    // Continue without blocking the authentication flow
  }
}

// Initialize Amplify right away
ensureAmplifyConfigured();

export default {
  getAccessToken,
  refreshAccessToken,
  isAuthenticated,
  hasPermissions,
  parseJwt,
  getAuth
}; 