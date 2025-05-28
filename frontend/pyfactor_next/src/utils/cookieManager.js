/**
 * cookieManager.js
 * 
 * Manages user authentication state and onboarding flow using AWS Cognito attributes.
 * This module determines the appropriate redirect path based on user's onboarding status.
 * 
 * CRITICAL: Always use CognitoAttributes utility for attribute access to ensure
 * consistent naming and prevent casing issues.
 * 
 * VERSION: Updated by Version0001_FixCognitoAttributesOnboarding script
 * LAST UPDATED: 2025-05-28
 */

import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';
import CognitoAttributes from '@/utils/CognitoAttributes';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

/**
 * Sets authentication data in Cognito user attributes
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
    
    logger.debug('[cookieManager] Setting auth data in Cognito', {
      tokenLifetime: `${(tokenLifetime / 60).toFixed(1)} minutes`,
      hasAttributes: !!userAttributes
    });
    
    // Set token expiration timestamp for refresh logic
    const expTime = new Date(exp * 1000).toISOString();
    
    // Store token expiration in Cognito for refresh handling
    try {
      const { updateUserAttributes } = await import('@/config/amplifyUnified');
      
      await updateUserAttributes({
        userAttributes: {
          'custom:token_expires': expTime
        }
      });
      
      logger.debug('[cookieManager] Token expiration stored in Cognito');
    } catch (cognitoErr) {
      logger.warn('[cookieManager] Could not store token expiration in Cognito', {
        error: cognitoErr.message
      });
    }
    
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
 * Sets onboarding-related attributes in Cognito using correct attribute names
 * @param {Object} attributes - User attributes from Cognito or API
 * @returns {Promise<boolean>} - Success status
 */
export const setOnboardingAttributes = async (attributes) => {
  try {
    if (!attributes) {
      logger.warn('[cookieManager] No attributes provided for onboarding data');
      return false;
    }
    
    logger.debug('[cookieManager] Setting onboarding data in Cognito using correct attribute names');
    
    // Extract onboarding status from attributes using correct names
    const onboardingStatus = 
      CognitoAttributes.getValue(attributes, CognitoAttributes.ONBOARDING) || 
      attributes.onboarding || 
      'PENDING';
      
    // Extract setup completion status using correct attribute name
    const setupDone = CognitoAttributes.getValue(attributes, CognitoAttributes.SETUP_DONE, 'false').toLowerCase() === 'true';
    
    // Update Cognito attributes using correct names
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    await updateUserAttributes({
      userAttributes: {
        [CognitoAttributes.ONBOARDING]: onboardingStatus,
        [CognitoAttributes.SETUP_DONE]: setupDone ? 'true' : 'false'
      }
    });
    
    // Store tenant ID if available using correct attribute name
    const tenantId = CognitoAttributes.getTenantId(attributes);
    if (tenantId) {
      await updateUserAttributes({
        userAttributes: {
          [CognitoAttributes.TENANT_ID]: tenantId,
          [CognitoAttributes.BUSINESS_ID]: tenantId // Legacy support
        }
      });
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
 * Gets the current authentication token from Cognito
 * @returns {Promise<string|null>} - The ID token or null if not found
 */
export const getAuthToken = async () => {
  try {
    // Import auth utilities
    const { fetchAuthSession } = await import('@/config/amplifyUnified');
    
    // Get current session
    const session = await fetchAuthSession();
    
    if (session && session.tokens && session.tokens.idToken) {
      return session.tokens.idToken.toString();
    }
    
    logger.warn('[cookieManager] No auth token found in session');
    return null;
  } catch (error) {
    logger.error('[cookieManager] Error getting auth token:', {
      error: error.message
    });
    return null;
  }
};

/**
 * Clears all authentication data by signing out
 * @returns {Promise<boolean>} - Success status
 */
export const clearAuthCookies = async () => {
  try {
    // Import auth utilities
    const { signOut } = await import('@/config/amplifyUnified');
    
    // Sign out completely
    await signOut({ global: true });
    
    logger.debug('[cookieManager] Auth session cleared via signOut');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error clearing auth session:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Sets a token expired flag in Cognito using correct attribute names
 * @returns {Promise<boolean>} - Success status
 */
export const setTokenExpiredFlag = async () => {
  try {
    // Import auth utilities
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    // Set token expired flag in Cognito using proper attribute structure
    await updateUserAttributes({
      userAttributes: {
        'custom:token_expired': 'true',
        'custom:token_expired_at': new Date().toISOString()
      }
    });
    
    logger.debug('[cookieManager] Token expired flag set in Cognito');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting token expired flag:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Enhanced onboarding step determination with proper Cognito attribute usage
 * 
 * @param {Object} userAttributes - User attributes from Cognito
 * @returns {String} The next onboarding step or 'dashboard' if complete
 */
export function determineOnboardingStep(userAttributes) {
  console.log('🔍 [cookieManager] determineOnboardingStep called with attributes:', {
    hasAttributes: !!userAttributes,
    attributeKeys: userAttributes ? Object.keys(userAttributes) : [],
    onboarding: userAttributes ? CognitoAttributes.getValue(userAttributes, CognitoAttributes.ONBOARDING) : 'undefined',
    setupDone: userAttributes ? CognitoAttributes.getValue(userAttributes, CognitoAttributes.SETUP_DONE) : 'undefined',
    tenantId: userAttributes ? CognitoAttributes.getTenantId(userAttributes) : 'undefined',
    subPlan: userAttributes ? CognitoAttributes.getValue(userAttributes, CognitoAttributes.SUBSCRIPTION_PLAN) : 'undefined',
    payVerified: userAttributes ? CognitoAttributes.getValue(userAttributes, CognitoAttributes.PAYMENT_VERIFIED) : 'undefined'
  });

  // Validate input
  if (!userAttributes || typeof userAttributes !== 'object') {
    console.warn('⚠️ [cookieManager] Invalid or missing userAttributes, defaulting to business-info');
    return 'business-info';
  }

  // Get all relevant attributes using CognitoAttributes utility
  const onboardingStatus = CognitoAttributes.getOnboardingStatus(userAttributes);
  const isSetupDone = CognitoAttributes.isSetupDone(userAttributes);
  const tenantId = CognitoAttributes.getTenantId(userAttributes);
  const subscriptionPlan = CognitoAttributes.getSubscriptionPlan(userAttributes);
  const isPaymentVerified = CognitoAttributes.isPaymentVerified(userAttributes);

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
 * Updates onboarding status in Cognito attributes using correct attribute names
 * @param {string} status - Onboarding status to set
 * @returns {Promise<boolean>} - Success status
 */
export const updateOnboardingStatus = async (status) => {
  try {
    if (!status) {
      console.warn('[cookieManager] No status provided for onboarding update');
      return false;
    }
    
    // Import auth utilities
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    // Update onboarding status in Cognito using correct attribute names
    await updateUserAttributes({
      userAttributes: {
        [CognitoAttributes.ONBOARDING]: status,
        [CognitoAttributes.UPDATED_AT]: new Date().toISOString()
      }
    });
    
    console.log(`[cookieManager] Onboarding status updated to: ${status}`);
    return true;
  } catch (error) {
    console.error('[cookieManager] Error updating onboarding status:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Gets user attributes from Cognito
 * @returns {Promise<Object|null>} - User attributes or null if not found
 */
export const getUserAttributes = async () => {
  try {
    // Import auth utilities
    const { fetchUserAttributes } = await import('@/config/amplifyUnified');
    
    // Get user attributes
    const attributes = await fetchUserAttributes();
    return attributes || null;
  } catch (error) {
    console.error('[cookieManager] Error getting user attributes:', {
      error: error.message
    });
    return null;
  }
}; 