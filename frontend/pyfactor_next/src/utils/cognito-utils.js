/**
 * Cognito utility functions for managing user attributes and onboarding state
 */

// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

export const ONBOARDING_STATES = {
  NOT_STARTED: 'not_started',
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

/**
 * Gets the onboarding state from Cognito attributes
 * @param {Object} user - Cognito user object (optional, will fetch current user if not provided)
 * @returns {Promise<Object>} The onboarding state
 */
export async function getOnboardingState(user = null) {
  try {
    // Check AppCache first for better performance
    const cachedState = getCacheValue('onboarding_status');
    if (cachedState) {
      logger.debug('[cognito-utils] Using cached onboarding state');
      return cachedState;
    }
    
    // Get user attributes from Cognito
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    // Parse onboarding status
    const status = (attributes['custom:onboarding'] || '').toLowerCase();
    const setupCompleted = attributes['custom:setupdone']?.toLowerCase() === 'true';
    
    // Check if business info is completed
    const businessInfoCompleted = Boolean(attributes['custom:businessid'] && 
                                        attributes['custom:businessname']);
    
    // Check if subscription is completed
    const subscriptionCompleted = Boolean(attributes['custom:subplan']);
    
    // Check if account requires payment
    const requiresPayment = attributes['custom:requirespayment']?.toLowerCase() === 'true';
    
    // Check if payment is verified
    const paymentVerified = attributes['custom:payverified']?.toLowerCase() === 'true';
    
    // Check for active subscription status
    const subscriptionActive = attributes['custom:subscriptionstatus']?.toLowerCase() === 'active';
    
    // Build onboarding state object
    const state = {
      status,
      completed: setupCompleted,
      businessInfoCompleted,
      subscriptionCompleted,
      subscriptionActive,
      requiresPayment,
      paymentVerified,
      currentStep: getCurrentStep(attributes)
    };
    
    // Cache the state for future use
    setCacheValue('onboarding_status', state, { ttl: 300000 }); // 5 minutes
    
    return state;
  } catch (error) {
    logger.error('[cognito-utils] Error getting onboarding state:', error);
    
    // Return default state on error
    return {
      status: 'not_started',
      completed: false,
      businessInfoCompleted: false,
      subscriptionCompleted: false,
      subscriptionActive: false,
      requiresPayment: false,
      paymentVerified: false,
      currentStep: 'business_info'
    };
  }
}

/**
 * Determines the current onboarding step based on attributes
 * @param {Object} attributes - User attributes from Cognito
 * @returns {string} The current onboarding step
 */
function getCurrentStep(attributes) {
  const status = (attributes['custom:onboarding'] || '').toLowerCase();
  const setupCompleted = attributes['custom:setupdone']?.toLowerCase() === 'true';
  
  // If setup is completed or status is complete, return complete
  if (setupCompleted || status === 'complete') {
    return 'complete';
  }
  
  // Check for business info
  if (!attributes['custom:businessid'] || !attributes['custom:businessname']) {
    return 'business_info';
  }
  
  // Check for subscription
  if (!attributes['custom:subplan']) {
    return 'subscription';
  }
  
  // Check for payment if required
  const requiresPayment = attributes['custom:requirespayment']?.toLowerCase() === 'true';
  const paymentVerified = attributes['custom:payverified']?.toLowerCase() === 'true';
  
  if (requiresPayment && !paymentVerified) {
    return 'payment';
  }
  
  // Otherwise return the current status, defaulting to business_info
  return status || 'business_info';
}

/**
 * Gets all user attributes from Cognito
 * @returns {Promise<Object>} All user attributes
 */
export async function getAllUserAttributes() {
  try {
    const userAttributes = {}; // Removed Amplify - using Auth0
  } catch (error) {
    logger.error('[cognito-utils] Error fetching user attributes:', error);
    return {};
  }
} 