import { logger } from '@/utils/logger';

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

export default {
  getAccessToken,
  refreshAccessToken,
  isAuthenticated,
  hasPermissions,
  parseJwt
}; 