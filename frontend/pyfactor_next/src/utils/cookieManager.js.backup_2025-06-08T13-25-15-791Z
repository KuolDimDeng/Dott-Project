/**
 * Cookie Manager for authentication
 * Handles user authentication state management
 * 
 * VERSION: Updated for Auth0 Migration
 * LAST UPDATED: 2025-05-31
 */

import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

// Auth0-compatible attribute helpers
const Auth0Attributes = {
  getValue: (attributes, key, defaultValue = null) => {
    if (!attributes || typeof attributes !== 'object') return defaultValue;
    return attributes[key] || defaultValue;
  },
  
  getTenantId: (attributes) => {
    if (!attributes) return null;
    return attributes.tenant_id || attributes.business_id || attributes.tenantId || null;
  },
  
  getOnboardingStatus: (attributes) => {
    if (!attributes) return 'PENDING';
    return attributes.onboarding || attributes.onboarding_status || 'PENDING';
  },
  
  isSetupDone: (attributes) => {
    if (!attributes) return false;
    const setupDone = attributes.setup_done || attributes.setupDone || 'false';
    return setupDone === 'true' || setupDone === true;
  },
  
  getSubscriptionPlan: (attributes) => {
    if (!attributes) return null;
    return attributes.subscription_plan || attributes.subscriptionPlan || null;
  },
  
  isPaymentVerified: (attributes) => {
    if (!attributes) return false;
    const paymentVerified = attributes.payment_verified || attributes.paymentVerified || 'false';
    return paymentVerified === 'true' || paymentVerified === true;
  }
};

/**
 * Sets authentication data using Auth0
 * @param {Object} tokens - The tokens object containing idToken and accessToken
 * @param {Object} userAttributes - Optional user attributes for onboarding status
 * @returns {Promise<boolean>} - Success status of operation
 */
export const setAuthCookies = async (tokens, userAttributes = null) => {
  try {
    if (!tokens || !tokens.idToken || !tokens.accessToken) {
      logger.error('[cookieManager] Missing required tokens for auth setup');
      return false;
    }

    const idToken = tokens.idToken.toString();
    const accessToken = tokens.accessToken.toString();
    
    // Parse token to get expiration
    const tokenData = parseJwt(idToken);
    const exp = tokenData?.exp || 0;
    const now = Math.floor(Date.now() / 1000);
    const tokenLifetime = exp - now;
    
    logger.debug('[cookieManager] Setting auth data with Auth0', {
      tokenLifetime: `${(tokenLifetime / 60).toFixed(1)} minutes`,
      hasAttributes: !!userAttributes
    });
    
    // If user attributes provided, set onboarding related attributes
    if (userAttributes) {
      await setOnboardingAttributes(userAttributes);
    }
    
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting auth data:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Sets onboarding-related attributes (Auth0 compatibility)
 * @param {Object} attributes - User attributes
 * @returns {Promise<boolean>} - Success status
 */
export const setOnboardingAttributes = async (attributes) => {
  try {
    if (!attributes) {
      logger.warn('[cookieManager] No attributes provided for onboarding data');
      return false;
    }
    
    logger.debug('[cookieManager] Setting onboarding data (Auth0 compatibility mode)');
    
    // Extract onboarding status from attributes
    const onboardingStatus = 
      Auth0Attributes.getValue(attributes, 'onboarding') || 
      attributes.onboarding || 
      'PENDING';
      
    // Extract setup completion status
    const setupDone = Auth0Attributes.getValue(attributes, 'setup_done', 'false').toLowerCase() === 'true';
    
    // Store in localStorage for Auth0 compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_status', onboardingStatus);
      localStorage.setItem('setup_done', setupDone ? 'true' : 'false');
      
      // Store tenant ID if available
      const tenantId = Auth0Attributes.getTenantId(attributes);
      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
        localStorage.setItem('business_id', tenantId); // Legacy support
      }
    }
    
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting onboarding attributes:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Gets the current authentication token from Auth0
 * @returns {Promise<string|null>} - The ID token or null if not found
 */
export const getAuthToken = async () => {
  try {
    // Get current session from Auth0
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      logger.debug('[cookieManager] Auth token retrieved from Auth0');
      return 'auth0-token'; // Auth0 handles tokens differently
    }
    
    logger.warn('[cookieManager] No auth token found in Auth0 session');
    return null;
  } catch (error) {
    logger.error('[cookieManager] Error getting auth token:', {
      error: error.message
    });
    return null;
  }
};

/**
 * Clears all authentication data by redirecting to Auth0 logout
 * @returns {Promise<boolean>} - Success status
 */
export const clearAuthCookies = async () => {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_status');
      localStorage.removeItem('setup_done');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('business_id');
      
      // Redirect to Auth0 logout
      window.location.href = '/api/auth/logout';
    }
    
    logger.debug('[cookieManager] Auth session cleared via Auth0 logout');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error clearing auth session:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Sets a token expired flag (Auth0 compatibility)
 * @returns {Promise<boolean>} - Success status
 */
export const setTokenExpiredFlag = async () => {
  try {
    // Store in localStorage for Auth0 compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem('token_expired', 'true');
      localStorage.setItem('token_expired_at', new Date().toISOString());
    }
    
    logger.debug('[cookieManager] Token expired flag set (Auth0 compatibility)');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting token expired flag:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Enhanced onboarding step determination with Auth0 compatibility
 * 
 * @param {Object} userAttributes - User attributes from Auth0
 * @returns {String} The next onboarding step or 'dashboard' if complete
 */
export function determineOnboardingStep(userAttributes) {
  console.log('🔍 [cookieManager] determineOnboardingStep called with attributes:', {
    hasAttributes: !!userAttributes,
    attributeKeys: userAttributes ? Object.keys(userAttributes) : [],
    onboarding: userAttributes ? Auth0Attributes.getValue(userAttributes, 'onboarding') : 'undefined',
    setupDone: userAttributes ? Auth0Attributes.getValue(userAttributes, 'setup_done') : 'undefined',
    tenantId: userAttributes ? Auth0Attributes.getTenantId(userAttributes) : 'undefined',
    subPlan: userAttributes ? Auth0Attributes.getValue(userAttributes, 'subscription_plan') : 'undefined',
    payVerified: userAttributes ? Auth0Attributes.getValue(userAttributes, 'payment_verified') : 'undefined'
  });

  // Validate input
  if (!userAttributes || typeof userAttributes !== 'object') {
    console.warn('⚠️ [cookieManager] Invalid or missing userAttributes, defaulting to business-info');
    return 'business-info';
  }

  // Get all relevant attributes using Auth0Attributes utility
  const onboardingStatus = Auth0Attributes.getOnboardingStatus(userAttributes);
  const isSetupDone = Auth0Attributes.isSetupDone(userAttributes);
  const tenantId = Auth0Attributes.getTenantId(userAttributes);
  const subscriptionPlan = Auth0Attributes.getSubscriptionPlan(userAttributes);
  const isPaymentVerified = Auth0Attributes.isPaymentVerified(userAttributes);

  console.log('📊 [cookieManager] Extracted onboarding data:', {
    onboardingStatus: onboardingStatus || 'null',
    isSetupDone,
    tenantId: tenantId || 'null',
    subscriptionPlan: subscriptionPlan || 'null',
    isPaymentVerified
  });

  // Check if user has completed all onboarding steps
  if (isSetupDone && tenantId && subscriptionPlan && isPaymentVerified) {
    console.log('✅ [cookieManager] User has completed all onboarding steps → dashboard');
    return 'dashboard';
  }

  // Determine next step based on onboarding status
  switch (onboardingStatus) {
    case 'business-info':
    case 'business_info':
      if (!tenantId) {
        console.log('📝 [cookieManager] Business info not complete → business-info');
        return 'business-info';
      }
      // Fall through to next step
      
    case 'subscription':
      if (!subscriptionPlan) {
        console.log('💳 [cookieManager] Subscription not selected → subscription');
        return 'subscription';
      }
      // Fall through to next step
      
    case 'payment':
      if (!isPaymentVerified) {
        console.log('💰 [cookieManager] Payment not verified → payment');
        return 'payment';
      }
      // Fall through to next step
      
    case 'setup':
      if (!isSetupDone) {
        console.log('⚙️ [cookieManager] Setup not complete → setup');
        return 'setup';
      }
      break;
      
    case 'complete':
    case 'completed':
      console.log('✅ [cookieManager] Onboarding marked as complete → dashboard');
      return 'dashboard';
      
    default:
      // If no onboarding status is set, start from the beginning
      console.log('🆕 [cookieManager] No onboarding status found → business-info');
      return 'business-info';
  }

  // Final check - if we reach here, user should be complete
  if (tenantId && subscriptionPlan && isPaymentVerified && isSetupDone) {
    console.log('✅ [cookieManager] All steps verified complete → dashboard');
    return 'dashboard';
  }

  // Default fallback
  console.log('⚠️ [cookieManager] Fallback to business-info');
  return 'business-info';
}

/**
 * Updates onboarding status (Auth0 compatibility)
 * @param {string} status - Onboarding status to set
 * @returns {Promise<boolean>} - Success status
 */
export const updateOnboardingStatus = async (status) => {
  try {
    if (!status) {
      console.warn('[cookieManager] No status provided for onboarding update');
      return false;
    }
    
    // Store in localStorage for Auth0 compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_status', status);
      localStorage.setItem('updated_at', new Date().toISOString());
    }
    
    console.log(`[cookieManager] Onboarding status updated to: ${status} (Auth0 compatibility)`);
    return true;
  } catch (error) {
    console.error('[cookieManager] Error updating onboarding status:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Gets user attributes (Auth0 compatibility)
 * @returns {Promise<Object|null>} - User attributes or null if not found
 */
export const getUserAttributes = async () => {
  try {
    // Get current user from Auth0
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      
      // Return in Cognito-compatible format
      return {
        email: user.email,
        email_verified: user.email_verified ? 'true' : 'false',
        sub: user.sub,
        name: user.name,
        picture: user.picture,
        // Include localStorage data for onboarding
        onboarding: typeof window !== 'undefined' ? localStorage.getItem('onboarding_status') || 'PENDING' : 'PENDING',
        setup_done: typeof window !== 'undefined' ? localStorage.getItem('setup_done') || 'false' : 'false',
        tenant_id: typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '' : '',
        business_id: typeof window !== 'undefined' ? localStorage.getItem('business_id') || '' : ''
      };
    }
    return null;
  } catch (error) {
    console.error('[cookieManager] Error getting user attributes:', {
      error: error.message
    });
    return null;
  }
}; 