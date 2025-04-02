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