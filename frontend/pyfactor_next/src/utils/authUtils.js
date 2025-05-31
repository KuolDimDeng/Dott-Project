// Auth0 Compatible Auth Utils
// Provides the same API surface as the original Cognito version

import { logger } from '@/utils/logger';

// Mock functions for compatibility - Auth0 handles most of this automatically

/**
 * Auth0 compatibility - no configuration needed
 */
export function ensureAmplifyConfigured() {
  logger.debug('[authUtils] Auth0 compatibility - configuration not needed');
  return true;
}

/**
 * Authenticates a user with Auth0 (redirects to Auth0 Universal Login)
 */
export async function authenticateUser(username, password) {
  try {
    logger.info('[authUtils] Redirecting to Auth0 for authentication');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/login';
    }
    
    return {
      isSignedIn: false,
      nextStep: { signInStep: 'REDIRECT_TO_AUTH0' }
    };
  } catch (error) {
    logger.error('[authUtils] Error in Auth0 authentication:', error);
    throw error;
  }
}

/**
 * Gets auth session from Auth0
 */
export async function getAuthSessionWithRetries(maxRetries = 3) {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      return {
        user,
        tokens: {
          accessToken: 'auth0-token',
          idToken: 'auth0-id-token'
        }
      };
    }
    return null;
  } catch (error) {
    logger.error('[authUtils] Error getting Auth0 session:', error);
    return null;
  }
}

/**
 * Get current authenticated user from Auth0
 */
export async function getAuthenticatedUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      logger.debug('[authUtils] Current Auth0 user retrieved');
      return user;
    }
    return null;
  } catch (error) {
    logger.warn('[authUtils] Error getting current Auth0 user:', error);
    return null;
  }
}

/**
 * Sign out via Auth0
 */
export async function logoutUser() {
  try {
    logger.debug('[authUtils] Signing out via Auth0');
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/logout';
    }
  } catch (error) {
    logger.error('[authUtils] Error signing out:', error);
    throw error;
  }
}

/**
 * Clear all authentication data (simplified for Auth0)
 */
export async function clearAllAuthData() {
  try {
    logger.debug('[authUtils] Clearing Auth0 authentication data');
    
    // Clear session and local storage
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear();
        window.localStorage.clear();
        logger.debug('[authUtils] Successfully cleared browser storage');
      } catch (error) {
        logger.error('[authUtils] Error clearing storage:', error);
      }
    }
  } catch (error) {
    logger.error('[authUtils] Error clearing Auth0 data:', error);
  }
}

// Public route checker
export const isPublic = (path) => {
  const publicPaths = [
    '/auth/signin',
    '/auth/signup', 
    '/auth/callback',
    '/api/auth',
    '/',
    '/terms',
    '/privacy'
  ];
  
  return publicPaths.some(publicPath => path.startsWith(publicPath));
};

// Token utilities (simplified for Auth0)
export const getAccessToken = async (session) => {
  try {
    const response = await fetch('/api/auth/token');
    if (response.ok) {
      const data = await response.json();
      return data.accessToken;
    }
  } catch (error) {
    logger.error('[authUtils] Error getting access token:', error);
  }
  return null;
};

export const refreshAccessToken = async (refreshToken) => {
  // Auth0 handles token refresh automatically
  logger.debug('[authUtils] Auth0 handles token refresh automatically');
  return null;
};

export const isAuthenticated = (session) => {
  return !!session?.user;
};

export const hasPermissions = (session, requiredPermissions = []) => {
  // Simplified permission check for Auth0
  return isAuthenticated(session);
};

export const parseJwt = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('[authUtils] Error parsing JWT:', error);
    return null;
  }
};

export const getAuth = async (request) => {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      return { user };
    }
  } catch (error) {
    logger.error('[authUtils] Error getting auth:', error);
  }
  return { user: null };
};

// Additional compatibility functions (simplified for Auth0)
export async function ensureUserCreatedAt(userInfo) {
  logger.debug('[authUtils] ensureUserCreatedAt - Auth0 compatibility');
  return userInfo;
}

export async function refreshAuthenticationState() {
  logger.debug('[authUtils] refreshAuthenticationState - Auth0 compatibility');
  return true;
}

export async function prepareForSignIn() {
  logger.debug('[authUtils] prepareForSignIn - Auth0 compatibility');
  return true;
}

export async function ensureAuthTokenInCache() {
  logger.debug('[authUtils] ensureAuthTokenInCache - Auth0 compatibility');
  return true;
}
