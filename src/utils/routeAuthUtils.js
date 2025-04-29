/**
 * Route Authentication Utilities - Created by fix script Version0001
 */

import { logger } from './logger';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/callback',
  '/api/auth/callback',
  '/api/onboarding/verify-state',
  '/api/onboarding/state',
  '/api/user/update-attributes',
];

// Onboarding routes - also treated as public but with special handling
const ONBOARDING_ROUTES = [
  '/onboarding',
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/onboarding/payment',
  '/onboarding/setup',
  '/onboarding/complete',
];

/**
 * Check if a route is an onboarding route
 * @param {string} route - The route to check
 * @returns {boolean} - True if the route is an onboarding route
 */
export function isOnboardingRoute(route) {
  if (!route || typeof route !== 'string') return false;
  
  // Check if the route starts with /onboarding
  if (route.startsWith('/onboarding')) {
    logger.debug(`[authUtils] Route ${route} is an onboarding route`);
    return true;
  }
  
  // Check if the route exactly matches one of our onboarding routes
  return ONBOARDING_ROUTES.some(publicRoute => route === publicRoute);
}

/**
 * Check if a route is public (does not require authentication)
 * @param {string} route - The route to check
 * @returns {boolean} - True if the route is public
 */
export function isRoutePublic(route) {
  if (!route || typeof route !== 'string') return false;
  
  // Onboarding routes are always treated as public for authentication purposes
  if (isOnboardingRoute(route)) {
    logger.debug(`[authUtils] Route ${route} is treated as public for redirection purposes`);
    return true;
  }
  
  // Check if the route exactly matches one of our public routes
  const exactMatch = PUBLIC_ROUTES.some(publicRoute => route === publicRoute);
  if (exactMatch) {
    logger.debug(`[authUtils] Route ${route} is public (exact match)`);
    return true;
  }
  
  // Check if the route starts with one of our public route prefixes
  const prefixMatch = PUBLIC_ROUTES.some(publicRoute => 
    publicRoute.endsWith('/') && route.startsWith(publicRoute));
  
  if (prefixMatch) {
    logger.debug(`[authUtils] Route ${route} is public (prefix match)`);
    return true;
  }
  
  logger.debug(`[authUtils] Route ${route} is NOT public`);
  return false;
}

// Export the utility
if (typeof window !== 'undefined') {
  // Make utilities available globally for client-side patching
  window.authUtils = {
    isRoutePublic,
    isOnboardingRoute
  };
}