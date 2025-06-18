import { logger } from '@/utils/logger';
import { getCurrentUser } from '@/services/userService';
import { getOnboardingStatus } from '@/utils/onboardingUtils_Auth0';

/**
 * Smart routing logic to determine where to send users based on their status
 * 🎯 NEW USER → /onboarding (simplified form)
 * 🎯 INCOMPLETE → /onboarding (simplified form)
 * 🎯 COMPLETE → /tenant/{tenantId}/dashboard
 */

export const ROUTE_TYPES = {
  NEW_USER: 'new_user',
  RESUME_ONBOARDING: 'resume_onboarding', 
  COMPLETE_USER: 'complete_user',
  FALLBACK: 'fallback'
};

export const ONBOARDING_ROUTES = {
  business_info: '/onboarding',
  subscription: '/onboarding',
  payment: '/onboarding', 
  setup: '/onboarding',
  complete: '/dashboard'
};

/**
 * Determine the appropriate route for a user based on their onboarding status
 * @param {Object} options - Optional parameters
 * @param {Object} options.user - Pre-fetched user data
 * @param {boolean} options.forceRefresh - Force refresh user data
 * @returns {Promise<Object>} Route information
 */
export async function determineUserRoute(options = {}) {
  try {
    logger.debug('[SmartRouting] Determining user route');
    
    // Get user data
    const user = options.user || await getCurrentUser();
    
    if (!user) {
      return {
        type: ROUTE_TYPES.NEW_USER,
        route: '/auth/signin',
        reason: 'No user found'
      };
    }
    
    logger.debug('[SmartRouting] User data:', {
      email: user.email,
      needsOnboarding: user.needsOnboarding,
      onboardingCompleted: user.onboardingCompleted,
      tenantId: user.tenantId
    });
    
    // 1. NEW USER - Needs onboarding
    if (user.needsOnboarding || !user.tenantId || !user.onboardingCompleted) {
      return {
        type: ROUTE_TYPES.NEW_USER,
        route: '/onboarding',
        reason: 'New user needs onboarding'
      };
    }
    
    // 2. Check detailed onboarding status
    const onboardingStatus = await getOnboardingStatus();
    
    if (onboardingStatus.status !== 'completed') {
      const currentStep = onboardingStatus.currentStep || 'business_info';
      const route = ONBOARDING_ROUTES[currentStep] || '/onboarding';
      
      return {
        type: ROUTE_TYPES.RESUME_ONBOARDING,
        route,
        reason: `Resume onboarding at step: ${currentStep}`,
        step: currentStep
      };
    }
    
    // 3. COMPLETE USER - Go to tenant dashboard
    if (user.tenantId && user.onboardingCompleted) {
      return {
        type: ROUTE_TYPES.COMPLETE_USER,
        route: `/${user.tenantId}/dashboard`,
        reason: 'User onboarding complete',
        tenantId: user.tenantId
      };
    }
    
    // Fallback
    return {
      type: ROUTE_TYPES.FALLBACK,
      route: '/dashboard',
      reason: 'Fallback route'
    };
    
  } catch (error) {
    logger.error('[SmartRouting] Error determining route:', error);
    return {
      type: ROUTE_TYPES.FALLBACK,
      route: '/dashboard',
      reason: 'Error determining route',
      error: error.message
    };
  }
}

/**
 * Check if a user should be allowed to access a specific route
 * @param {string} pathname - The route being accessed
 * @param {Object} user - User data
 * @returns {Promise<Object>} Access result
 */
export async function checkRouteAccess(pathname, user = null) {
  try {
    const userData = user || await getCurrentUser();
    
    if (!userData) {
      return {
        allowed: false,
        redirectTo: '/auth/signin',
        reason: 'Authentication required'
      };
    }
    
    // Allow access to onboarding routes if user needs onboarding
    if (pathname.startsWith('/onboarding')) {
      // If user has completed onboarding, redirect to dashboard
      if (userData.onboardingCompleted && userData.tenantId) {
        return {
          allowed: false,
          redirectTo: `/${userData.tenantId}/dashboard`,
          reason: 'Onboarding already completed'
        };
      }
      return { allowed: true };
    }
    
    // Check access to dashboard/tenant routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/tenant')) {
      // If user hasn't completed onboarding, redirect to onboarding
      if (userData.needsOnboarding || !userData.onboardingCompleted || !userData.tenantId) {
        return {
          allowed: false,
          redirectTo: '/onboarding',
          reason: 'Onboarding required'
        };
      }
      
      // If accessing generic dashboard but has tenant, redirect to tenant dashboard
      if (pathname === '/dashboard' && userData.tenantId) {
        return {
          allowed: false,
          redirectTo: `/${userData.tenantId}/dashboard`,
          reason: 'Redirect to tenant dashboard'
        };
      }
      
      return { allowed: true };
    }
    
    // Allow access to other routes
    return { allowed: true };
    
  } catch (error) {
    logger.error('[SmartRouting] Error checking route access:', error);
    return {
      allowed: false,
      redirectTo: '/auth/signin',
      reason: 'Error checking access'
    };
  }
}

/**
 * Navigate using smart routing logic
 * @param {Object} router - Next.js router instance
 * @param {Object} options - Navigation options
 */
export async function smartNavigate(router, options = {}) {
  try {
    const routeInfo = await determineUserRoute(options);
    
    logger.debug('[SmartRouting] Smart navigation:', {
      type: routeInfo.type,
      route: routeInfo.route,
      reason: routeInfo.reason
    });
    
    if (options.replace) {
      router.replace(routeInfo.route);
    } else {
      router.push(routeInfo.route);
    }
    
    return routeInfo;
    
  } catch (error) {
    logger.error('[SmartRouting] Error in smart navigation:', error);
    router.push('/dashboard');
    return {
      type: ROUTE_TYPES.FALLBACK,
      route: '/dashboard',
      error: error.message
    };
  }
}

/**
 * Get the appropriate dashboard route for a user
 * @param {Object} user - User data
 * @returns {string} Dashboard route
 */
export function getDashboardRoute(user) {
  if (user?.tenantId) {
    return `/${user.tenantId}/dashboard`;
  }
  return '/dashboard';
}

/**
 * Get the appropriate route after login
 * @param {string} returnTo - Intended return URL
 * @param {Object} user - User data
 * @returns {Promise<string>} Route to redirect to
 */
export async function getPostLoginRoute(returnTo = null, user = null) {
  // If there's a specific return URL and user is fully onboarded, honor it
  if (returnTo && user?.onboardingCompleted && user?.tenantId) {
    return returnTo;
  }
  
  // Otherwise use smart routing
  const routeInfo = await determineUserRoute({ user });
  return routeInfo.route;
}

export default {
  determineUserRoute,
  checkRouteAccess,
  smartNavigate,
  getDashboardRoute,
  getPostLoginRoute,
  ROUTE_TYPES,
  ONBOARDING_ROUTES
}; 