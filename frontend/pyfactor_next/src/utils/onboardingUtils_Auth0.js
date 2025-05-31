import { logger } from '@/utils/logger';
import { getCurrentUser } from '@/services/userService';
import { getOnboardingStatus as getOnboardingStatusAPI } from '@/services/api/onboarding';

// Onboarding status constants
export const ONBOARDING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

// Onboarding steps
export const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

/**
 * Get current onboarding status from backend
 * @returns {Promise<Object>} Onboarding status
 */
export async function getOnboardingStatus() {
  try {
    logger.debug('[OnboardingUtils] Getting onboarding status');
    
    // Try to get from API
    const status = await getOnboardingStatusAPI();
    
    if (status) {
      return {
        status: status.status || ONBOARDING_STATUS.NOT_STARTED,
        currentStep: status.current_step || ONBOARDING_STEPS.BUSINESS_INFO,
        tenantId: status.tenant_id,
        progress: status.progress
      };
    }
    
    // If no status from API, check user profile
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        status: ONBOARDING_STATUS.NOT_STARTED,
        currentStep: ONBOARDING_STEPS.BUSINESS_INFO
      };
    }
    
    if (user.needsOnboarding) {
      return {
        status: ONBOARDING_STATUS.NOT_STARTED,
        currentStep: ONBOARDING_STEPS.BUSINESS_INFO
      };
    }
    
    if (user.onboardingCompleted) {
      return {
        status: ONBOARDING_STATUS.COMPLETED,
        currentStep: ONBOARDING_STEPS.COMPLETE,
        tenantId: user.tenantId
      };
    }
    
    return {
      status: ONBOARDING_STATUS.IN_PROGRESS,
      currentStep: user.onboardingStep || ONBOARDING_STEPS.BUSINESS_INFO,
      tenantId: user.tenantId
    };
    
  } catch (error) {
    logger.error('[OnboardingUtils] Error getting onboarding status:', error);
    return {
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: ONBOARDING_STEPS.BUSINESS_INFO
    };
  }
}

/**
 * Determine the next onboarding step
 * @param {string} currentStep - Current step
 * @param {Object} data - Additional data (e.g., subscription plan)
 * @returns {string} Next step
 */
export function getNextOnboardingStep(currentStep, data = {}) {
  switch (currentStep) {
    case ONBOARDING_STEPS.BUSINESS_INFO:
      return ONBOARDING_STEPS.SUBSCRIPTION;
      
    case ONBOARDING_STEPS.SUBSCRIPTION:
      // Skip payment for free plan
      if (data.plan === 'free') {
        return ONBOARDING_STEPS.SETUP;
      }
      return ONBOARDING_STEPS.PAYMENT;
      
    case ONBOARDING_STEPS.PAYMENT:
      return ONBOARDING_STEPS.SETUP;
      
    case ONBOARDING_STEPS.SETUP:
      return ONBOARDING_STEPS.COMPLETE;
      
    default:
      return ONBOARDING_STEPS.COMPLETE;
  }
}

/**
 * Get the onboarding route for a given step
 * @param {string} step - Onboarding step
 * @returns {string} Route path
 */
export function getOnboardingRoute(step) {
  const routes = {
    [ONBOARDING_STEPS.BUSINESS_INFO]: '/onboarding/business-info',
    [ONBOARDING_STEPS.SUBSCRIPTION]: '/onboarding/subscription',
    [ONBOARDING_STEPS.PAYMENT]: '/onboarding/payment',
    [ONBOARDING_STEPS.SETUP]: '/onboarding/setup',
    [ONBOARDING_STEPS.COMPLETE]: '/dashboard'
  };
  
  return routes[step] || '/onboarding/business-info';
}

/**
 * Check if user needs onboarding
 * @returns {Promise<boolean>}
 */
export async function needsOnboarding() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return true;
    }
    
    return user.needsOnboarding || !user.onboardingCompleted || !user.tenantId;
    
  } catch (error) {
    logger.error('[OnboardingUtils] Error checking onboarding need:', error);
    return true;
  }
}

/**
 * Store onboarding data temporarily (for multi-step forms)
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
export function storeOnboardingData(key, data) {
  try {
    const storageKey = `onboarding_${key}`;
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    logger.debug(`[OnboardingUtils] Stored onboarding data for ${key}`);
  } catch (error) {
    logger.error('[OnboardingUtils] Error storing onboarding data:', error);
  }
}

/**
 * Retrieve onboarding data
 * @param {string} key - Storage key
 * @returns {any} Stored data
 */
export function getOnboardingData(key) {
  try {
    const storageKey = `onboarding_${key}`;
    const data = sessionStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('[OnboardingUtils] Error retrieving onboarding data:', error);
    return null;
  }
}

/**
 * Clear onboarding data
 * @param {string} key - Storage key (optional, clears all if not provided)
 */
export function clearOnboardingData(key) {
  try {
    if (key) {
      sessionStorage.removeItem(`onboarding_${key}`);
    } else {
      // Clear all onboarding data
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('onboarding_')) {
          sessionStorage.removeItem(k);
        }
      });
    }
    logger.debug('[OnboardingUtils] Cleared onboarding data');
  } catch (error) {
    logger.error('[OnboardingUtils] Error clearing onboarding data:', error);
  }
}

// Export all functions
export default {
  getOnboardingStatus,
  getNextOnboardingStep,
  getOnboardingRoute,
  needsOnboarding,
  storeOnboardingData,
  getOnboardingData,
  clearOnboardingData,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
};