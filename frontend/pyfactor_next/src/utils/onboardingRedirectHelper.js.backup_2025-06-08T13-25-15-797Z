/**
 * onboardingRedirectHelper.js
 * 
 * Helper functions for handling onboarding status during sign-in/sign-out redirects
 */

import onboardingService from '@/services/onboardingService';

/**
 * Check if user has completed onboarding based on URL parameters and localStorage
 * 
 * @param {Object} params - URL search parameters
 * @returns {Promise<{shouldRedirect: boolean, redirectPath: string}>} - Redirect info
 */
export const checkOnboardingRedirect = async (params) => {
  // Default - no redirect
  const result = {
    shouldRedirect: false,
    redirectPath: ''
  };

  try {
    // Case 1: Explicit preservation of onboarding status
    if (params.get('preserveOnboarding') === 'true' && params.get('tenantId')) {
      const tenantId = params.get('tenantId');
      result.shouldRedirect = true;
      result.redirectPath = `/${tenantId}/dashboard`;
      return result;
    }

    // Case 2: Check localStorage as fallback
    if (params.get('checkLocalStorage') === 'true' && params.get('tenantId')) {
      const tenantId = params.get('tenantId');
      
      // Try to get onboarding status from localStorage
      const isComplete = await onboardingService.isOnboardingComplete(tenantId);
      
      if (isComplete) {
        result.shouldRedirect = true;
        result.redirectPath = `/${tenantId}/dashboard`;
      }
      
      return result;
    }
  } catch (error) {
    console.error('Error checking onboarding redirect:', error);
  }

  return result;
};

export default {
  checkOnboardingRedirect
};
