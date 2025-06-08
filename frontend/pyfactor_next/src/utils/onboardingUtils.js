import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';
import { 
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import {
  saveOnboardingStatus, 
  getOnboardingStatus as getUserOnboardingStatus,
  saveOnboardingStep,
  getOnboardingStep,
  saveUserPreference,
  PREF_KEYS,
  updateOnboardingData
} from '@/utils/userPreferences';

/**
 * Onboarding Utilities - Updated for Auth0-only approach
 * 
 * This utility now uses Auth0 session management instead of AWS Amplify/Cognito.
 * Session validation and user data management is handled via Auth0 APIs.
 */

/**
 * Validate Auth0 session
 * @param {Object} options - Options for session validation
 * @returns {Promise<Object>} Validation result
 */
export async function validateSession(options = {}) {
  try {
    logger.debug('[OnboardingUtils] Validating Auth0 session');
    
    // Check Auth0 session via API
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      logger.debug('[OnboardingUtils] Auth0 session is valid');
      
      // Store user data in AppCache for quick access
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.get('auth')) appCache.set('auth', {});
        appCache.set('auth.user', userData);
        appCache.set('auth.lastValidated', Date.now());
      }
      
      return {
        isValid: true,
        user: userData,
        sessionData: userData,
        tokens: {
          accessToken: 'auth0-session', // Placeholder since Auth0 handles tokens internally
          idToken: 'auth0-session'
        }
      };
    } else if (response.status === 401) {
      logger.warn('[OnboardingUtils] Auth0 session is invalid or expired');
      return {
        isValid: false,
        error: 'Session expired or invalid',
        needsLogin: true
      };
    } else {
      throw new Error(`Session validation failed: ${response.status}`);
    }
  } catch (error) {
    logger.error('[OnboardingUtils] Error validating session:', error);
    
    // Check for cached session data as fallback
    if (typeof window !== 'undefined') {
      const cachedUser = appCache.get('auth.user');
      const lastValidated = appCache.get('auth.lastValidated');
      
      // If we have cached data and it's less than 5 minutes old, use it
      if (cachedUser && lastValidated && (Date.now() - lastValidated < 5 * 60 * 1000)) {
        logger.info('[OnboardingUtils] Using cached session data');
        return {
          isValid: true,
          user: cachedUser,
          sessionData: cachedUser,
          cached: true
        };
      }
    }
    
    return {
      isValid: false,
      error: error.message,
      needsLogin: true
    };
  }
}

/**
 * Get current user from Auth0 session
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      return userData;
    } else {
      return null;
    }
  } catch (error) {
    logger.error('[OnboardingUtils] Error getting current user:', error);
    return null;
  }
}

/**
 * Update user attributes via Auth0 session
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<Object>} Update result
 */
export async function updateUserAttributes(attributes) {
  try {
    const response = await fetch('/api/auth/update-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ attributes })
    });
    
    if (response.ok) {
      const result = await response.json();
      logger.info('[OnboardingUtils] Successfully updated user attributes');
      return result;
    } else {
      throw new Error(`Failed to update user attributes: ${response.status}`);
    }
  } catch (error) {
    logger.error('[OnboardingUtils] Error updating user attributes:', error);
    throw error;
  }
}

/**
 * Get user attributes from Auth0 session
 * @returns {Promise<Object>} User attributes
 */
export async function fetchUserAttributes() {
  try {
    const user = await getCurrentUser();
    if (user) {
      // Convert user data to attributes format
      return {
        name: user.name,
        given_name: user.given_name,
        family_name: user.family_name,
        email: user.email,
        picture: user.picture,
        tenant_id: user.tenant_id || user.tenantId,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        onboardingCompleted: user.onboardingCompleted,
        needsOnboarding: user.needsOnboarding
      };
    }
    return {};
  } catch (error) {
    logger.error('[OnboardingUtils] Error fetching user attributes:', error);
    return {};
  }
}

/**
 * Update tenant ID in user session
 * @param {string} tenantId - Tenant ID to update
 * @returns {Promise<Object>} Update result
 */
export async function updateTenantIdInSession(tenantId) {
  try {
    return await updateUserAttributes({
      tenant_id: tenantId,
      tenantId: tenantId
    });
  } catch (error) {
    logger.error('[OnboardingUtils] Error updating tenant ID:', error);
    throw error;
  }
}

/**
 * Get tenant ID from user session
 * @returns {Promise<string|null>} Tenant ID or null
 */
export async function getTenantIdFromSession() {
  try {
    const user = await getCurrentUser();
    return user?.tenant_id || user?.tenantId || null;
  } catch (error) {
    logger.error('[OnboardingUtils] Error getting tenant ID:', error);
    return null;
  }
}

/**
 * Check if user needs onboarding
 * @returns {Promise<boolean>} True if user needs onboarding
 */
export async function userNeedsOnboarding() {
  try {
    const user = await getCurrentUser();
    return user?.needsOnboarding !== false || user?.onboardingCompleted !== true;
  } catch (error) {
    logger.error('[OnboardingUtils] Error checking onboarding status:', error);
    return true; // Default to needing onboarding if we can't determine
  }
}

/**
 * Mark onboarding as completed
 * @returns {Promise<Object>} Update result
 */
export async function markOnboardingCompleted() {
  try {
    return await updateUserAttributes({
      needsOnboarding: false,
      onboardingCompleted: true,
      onboarding_completed: true,
      currentStep: 'completed',
      onboardingCompletedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[OnboardingUtils] Error marking onboarding completed:', error);
    throw error;
  }
}

/**
 * Update onboarding step
 * @param {string} step - Current onboarding step
 * @returns {Promise<Object>} Update result
 */
export async function updateOnboardingStep(step) {
  try {
    return await updateUserAttributes({
      currentStep: step,
      current_onboarding_step: step,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[OnboardingUtils] Error updating onboarding step:', error);
    throw error;
  }
}

/**
 * Get current onboarding step
 * @returns {Promise<string>} Current step
 */
export async function getCurrentOnboardingStep() {
  try {
    const user = await getCurrentUser();
    return user?.currentStep || user?.current_onboarding_step || 'business_info';
  } catch (error) {
    logger.error('[OnboardingUtils] Error getting current step:', error);
    return 'business_info';
  }
}

/**
 * Clear onboarding state (for testing/debugging)
 * @returns {Promise<void>}
 */
export async function clearOnboardingState() {
  try {
    await updateUserAttributes({
      needsOnboarding: true,
      onboardingCompleted: false,
      currentStep: 'business_info',
      tenant_id: null,
      businessName: null,
      subscriptionPlan: null
    });
    
    // Clear AppCache
    if (typeof window !== 'undefined') {
      appCache.clear();
    }
    
    logger.info('[OnboardingUtils] Cleared onboarding state');
  } catch (error) {
    logger.error('[OnboardingUtils] Error clearing onboarding state:', error);
    throw error;
  }
}

/**
 * Get onboarding progress
 * @returns {Promise<Object>} Progress information
 */
export async function getOnboardingProgress() {
  try {
    const user = await getCurrentUser();
    
    const steps = ['business_info', 'subscription', 'payment', 'setup', 'completed'];
    const currentStep = user?.currentStep || 'business_info';
    const currentIndex = steps.indexOf(currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex / (steps.length - 1)) * 100) : 0;
    
    return {
      currentStep,
      progress: Math.round(progress),
      totalSteps: steps.length,
      completedSteps: currentIndex + 1,
      isCompleted: user?.onboardingCompleted === true
    };
  } catch (error) {
    logger.error('[OnboardingUtils] Error getting onboarding progress:', error);
    return {
      currentStep: 'business_info',
      progress: 0,
      totalSteps: 5,
      completedSteps: 0,
      isCompleted: false
    };
  }
}

// Export legacy function names for compatibility
export const fetchAuthSession = validateSession;
export const updateTenantIdInCognito = updateTenantIdInSession;
export const getTenantIdFromCognito = getTenantIdFromSession;