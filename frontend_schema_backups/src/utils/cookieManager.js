import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';

/**
 * Sets authentication data consistently across the application using AppCache
 * @param {Object} tokens - The tokens object containing idToken and accessToken
 * @param {Object} userAttributes - Optional user attributes for onboarding status
 * @param {boolean} secure - DEPRECATED parameter, kept for backward compatibility
 * @param {number} maxAge - Cache TTL in seconds (defaults to 1 day)
 * @returns {boolean} - Success status of operation
 */
export const setAuthCookies = (tokens, userAttributes = null, secure = null, maxAge = null) => {
  try {
    if (!tokens || !tokens.idToken || !tokens.accessToken) {
      logger.error('[cookieManager] Missing required tokens for setup');
      return false;
    }

    const idToken = tokens.idToken.toString();
    const accessToken = tokens.accessToken.toString();
    
    // Parse token to get expiration
    const tokenData = parseJwt(idToken);
    const exp = tokenData?.exp || 0;
    const now = Math.floor(Date.now() / 1000);
    const tokenLifetime = exp - now;
    
    logger.debug('[cookieManager] Setting auth data in AppCache', {
      tokenLifetime: `${(tokenLifetime / 60).toFixed(1)} minutes`,
      hasAttributes: !!userAttributes
    });
    
    // Use token expiration or fallback to provided maxAge or default (1 day)
    const cacheTTL = maxAge || (tokenLifetime > 0 ? tokenLifetime * 1000 : 24 * 60 * 60 * 1000);
    
    // Store in AppCache
    setCacheValue('id_token', idToken, { ttl: cacheTTL });
    setCacheValue('access_token', accessToken, { ttl: cacheTTL });
    setCacheValue('token_timestamp', Date.now().toString(), { ttl: cacheTTL });
    setCacheValue('token_expires', new Date(exp * 1000).toISOString(), { ttl: cacheTTL });
    
    // If user attributes provided, set onboarding related data
    if (userAttributes) {
      setOnboardingCookies(userAttributes, cacheTTL);
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
 * Sets onboarding-related data based on user attributes using AppCache
 * @param {Object} attributes - User attributes from Cognito or API
 * @param {number} ttl - Cache TTL in milliseconds
 */
export const setOnboardingCookies = (attributes, ttl = null) => {
  try {
    if (!attributes) {
      logger.warn('[cookieManager] No attributes provided for onboarding data');
      return false;
    }
    
    // Set up default TTL if not provided (7 days)
    const defaultTTL = 7 * 24 * 60 * 60 * 1000;
    const cacheTTL = typeof ttl === 'number' ? ttl : defaultTTL;
    
    logger.debug('[cookieManager] Setting onboarding data in AppCache');
    
    // Extract onboarding status from attributes
    const onboardingStatus = 
      attributes['custom:onboarding'] || 
      attributes.onboarding || 
      'PENDING';
      
    // Set onboarding status in AppCache
    setCacheValue('onboarded_status', onboardingStatus, { ttl: cacheTTL });
    
    // Set step completion flags
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
    
    // Set individual step data in AppCache
    setCacheValue('business_info_completed', businessInfoDone ? 'true' : 'false', { ttl: cacheTTL });
    setCacheValue('subscription_completed', subscriptionDone ? 'true' : 'false', { ttl: cacheTTL });
    setCacheValue('payment_completed', paymentDone ? 'true' : 'false', { ttl: cacheTTL });
    setCacheValue('setup_completed', setupDone ? 'true' : 'false', { ttl: cacheTTL });
    
    // Store tenant ID if available
    const tenantId = attributes['custom:tenant_ID'] || attributes.tenantId;
    if (tenantId) {
      setCacheValue('tenantId', tenantId, { ttl: cacheTTL });
    }
    
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting onboarding data:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Gets the current authentication token from AppCache
 * @returns {string|null} - The ID token or null if not found
 */
export const getAuthToken = () => {
  try {
    // Try AppCache first
    const cacheToken = getCacheValue('id_token');
    if (cacheToken) {
      return cacheToken;
    }
    
    // For backward compatibility, fall back to old key
    const legacyToken = getCacheValue('idToken');
    if (legacyToken) {
      // Migrate old key format to new format
      setCacheValue('id_token', legacyToken);
      return legacyToken;
    }
    
    return null;
  } catch (error) {
    logger.error('[cookieManager] Error getting auth token:', {
      error: error.message
    });
    return null;
  }
};

/**
 * Clears all authentication-related data from AppCache
 */
export const clearAuthCookies = () => {
  try {
    const cacheKeys = [
      'id_token', 
      'access_token', 
      'token_timestamp', 
      'token_expires', 
      'onboarded_status',
      'business_info_completed', 
      'subscription_completed', 
      'payment_completed', 
      'setup_completed', 
      'token_expired',
      // Legacy keys for backward compatibility
      'idToken',
      'accessToken',
      'tokenTimestamp',
      'tokenExpires'
    ];
    
    // Clear all auth data from AppCache
    cacheKeys.forEach(key => {
      removeCacheValue(key);
    });
    
    logger.debug('[cookieManager] Auth data cleared from AppCache');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error clearing auth data:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Sets a token expired flag in AppCache to trigger automatic sign-out
 */
export const setTokenExpiredFlag = () => {
  try {
    // Set a flag in AppCache indicating token expiration
    setCacheValue('token_expired', 'true');
    logger.debug('[cookieManager] Token expired flag set in AppCache');
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
    return 'dashboard';
  }
}; 