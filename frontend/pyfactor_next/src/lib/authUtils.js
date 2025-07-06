import { fetchAuthSession  } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
/**
 * Generate a unique request ID for tracking API calls
 * @returns {string} A unique ID
 */
export const generateRequestId = () => {
  return 'req_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Parse a JWT token into its payload
 * @param {string} token - The JWT token to parse
 * @returns {Object} The decoded token payload
 */
export const parseJwt = (token) => {
  try {
    // Split the token into its parts
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      throw new Error('Invalid token format');
    }
    
    // Replace characters for base64 decoding
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 string
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('[authUtils] Failed to parse JWT:', error);
    return {};
  }
};

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',  // Root landing page - NEVER requires authentication
  '/index',
  '/home',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/verify-email',
  '/auth/email-signin',  // Add email-signin to prevent redirect loops
  '/about',
  '/privacy',
  '/terms',
  '/status',  // Public status page
  // Add new public routes to break redirect loops
  '/auth/reset',
  '/auth/reset/confirm',
  '/auth/callback',
  '/auth/session-bridge',  // Add session-bridge as public route
  '/api/health',
  '/api/public',
  '/api/login',
  '/api/signup',
  '/login',
  '/signup',
  '/reset-password',
  // Add onboarding routes as semi-public (they'll use cookie-based auth)
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/onboarding/payment',
  '/onboarding/setup'
];

/**
 * Checks if a given route is public
 * @param {string} pathname - The route path to check
 * @returns {boolean} True if the route is public
 */
export const isPublicRoute = (pathname) => {
  // Special case for root path
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    logger.debug(`[authUtils] Route ${pathname} is public (root path)`);
    return true;
  }
  
  // Special case for onboarding paths - allow them through but will use cookie-based auth
  if (pathname.startsWith('/onboarding/')) {
    logger.debug(`[authUtils] Route ${pathname} is treated as public for redirection purposes`);
    return true;
  }
  
  // Normalize the pathname by removing trailing slashes and handling exact matches
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  
  // Add debug logging
  logger.debug(`[authUtils] Checking if route is public: ${pathname} (normalized: ${normalizedPath})`);
  
  // Check for exact matches
  if (PUBLIC_ROUTES.includes(normalizedPath)) {
    logger.debug(`[authUtils] Route ${pathname} is public (exact match)`);
    return true;
  }
  
  // Check for path prefixes (e.g., /about/team should match /about)
  const isPublic = PUBLIC_ROUTES.some(route =>
    normalizedPath === route ||
    (normalizedPath.startsWith(route + '/') && route !== '/')
  );
  
  logger.debug(`[authUtils] Route ${pathname} is ${isPublic ? 'public' : 'private'} (prefix match)`);
  return isPublic;
};

/**
 * Attempts to refresh the authentication session
 * @returns {Promise<boolean>} True if session was successfully refreshed
 */
export const refreshSession = async () => {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    
    if (!session.tokens) {
      logger.warn('[authUtils] No tokens found in session');
      return false;
    }

    // Check if tokens are expired
    const accessToken = session.tokens.accessToken;
    if (accessToken && accessToken.payload.exp * 1000 < Date.now()) {
      logger.debug('[authUtils] Access token expired, attempting refresh');
      await amplifyRefreshSession();
      return true;
    }

    return true;
  } catch (error) {
    logger.error('[authUtils] Failed to refresh session:', error);
    return false;
  }
};
