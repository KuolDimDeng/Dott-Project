import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

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
 * Sets onboarding-related attributes in Cognito
 * @param {Object} attributes - User attributes from Cognito or API
 * @returns {Promise<boolean>} - Success status
 */
export const setOnboardingAttributes = async (attributes) => {
  try {
    if (!attributes) {
      logger.warn('[cookieManager] No attributes provided for onboarding data');
      return false;
    }
    
    logger.debug('[cookieManager] Setting onboarding data in Cognito');
    
    // Extract onboarding status from attributes
    const onboardingStatus = 
      attributes['custom:onboarding'] || 
      attributes.onboarding || 
      'PENDING';
      
    // Extract step completion flags
    const businessInfoDone = attributes['custom:business_info_done'] === 'TRUE' || 
                             attributes.businessInfoDone === 'true' || 
                             attributes.businessInfoDone === true;
                             
    const subscriptionDone = attributes['custom:subscription_done'] === 'TRUE' || 
                             attributes.subscriptionDone === 'true' || 
                             attributes.subscriptionDone === true;
                             
    const paymentDone = attributes['custom:payment_done'] === 'TRUE' || 
                         attributes.paymentDone === 'true' || 
                         attributes.paymentDone === true;
                         
    const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true' ||
                    (attributes['custom:onboarding'] || '').toLowerCase() === 'complete';
    
    // Update Cognito attributes
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': onboardingStatus,
        'custom:business_info_done': businessInfoDone ? 'TRUE' : 'FALSE',
        'custom:subscription_done': subscriptionDone ? 'TRUE' : 'FALSE',
        'custom:payment_done': paymentDone ? 'TRUE' : 'FALSE',
        'custom:setupdone': setupDone ? 'true' : 'false'
      }
    });
    
    // Store tenant ID if available
    const tenantId = attributes['custom:tenant_ID'] || attributes.tenantId;
    if (tenantId) {
      await updateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:tenant_ID': tenantId, // Uppercase version for consistency
          'custom:businessid': tenantId // Legacy attribute
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
 * Sets a token expired flag in Cognito
 * @returns {Promise<boolean>} - Success status
 */
export const setTokenExpiredFlag = async () => {
  try {
    // Import auth utilities
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    // Set token expired flag in Cognito
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
 * Determines the next onboarding step based on user attributes
 * @param {Object} attributes - User attributes
 * @returns {string} - The next onboarding step
 */
export const determineOnboardingStep = (attributes) => {
  if (!attributes) return 'business-info';
  
  const businessInfoDone = attributes['custom:business_info_done'] === 'TRUE' || 
                           attributes.businessInfoDone === 'true' || 
                           attributes.businessInfoDone === true;
  
  const subscriptionDone = attributes['custom:subscription_done'] === 'TRUE' || 
                           attributes.subscriptionDone === 'true' || 
                           attributes.subscriptionDone === true;
  
  const paymentDone = attributes['custom:payment_done'] === 'TRUE' || 
                       attributes.paymentDone === 'true' || 
                       attributes.paymentDone === true;
  
  const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true' ||
                    (attributes['custom:onboarding'] || '').toLowerCase() === 'complete';
  
  if (!businessInfoDone) {
    return 'business-info';
  } else if (!subscriptionDone) {
    return 'subscription';
  } else if (!paymentDone) {
    return 'payment';
  } else if (!setupDone) {
    return 'setup';
  } else {
    return 'complete';
  }
};

/**
 * Updates onboarding status in Cognito attributes
 * @param {string} status - Onboarding status to set
 * @returns {Promise<boolean>} - Success status
 */
export const updateOnboardingStatus = async (status) => {
  try {
    if (!status) {
      logger.warn('[cookieManager] No status provided for onboarding update');
      return false;
    }
    
    // Import auth utilities
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    // Update onboarding status in Cognito
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': status,
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    logger.debug(`[cookieManager] Onboarding status updated to: ${status}`);
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error updating onboarding status:', {
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
    logger.error('[cookieManager] Error getting user attributes:', {
      error: error.message
    });
    return null;
  }
}; 