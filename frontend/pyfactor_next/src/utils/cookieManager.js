import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

/**
 * Sets authentication cookies consistently across the application
 * @param {Object} tokens - The tokens object containing idToken and accessToken
 * @param {Object} userAttributes - Optional user attributes for onboarding status
 * @param {boolean} secure - Whether to set secure cookies (defaults to true in production)
 * @param {number} maxAge - Cookie expiration in seconds (defaults to 1 day)
 * @returns {boolean} - Success status of operation
 */
export const setAuthCookies = (tokens, userAttributes = null, secure = null, maxAge = null) => {
  try {
    if (!tokens || !tokens.idToken || !tokens.accessToken) {
      logger.error('[cookieManager] Missing required tokens for cookie setup');
      return false;
    }

    const idToken = tokens.idToken.toString();
    const accessToken = tokens.accessToken.toString();
    
    // Parse token to get expiration
    const tokenData = parseJwt(idToken);
    const exp = tokenData?.exp || 0;
    const now = Math.floor(Date.now() / 1000);
    const tokenLifetime = exp - now;
    
    logger.debug('[cookieManager] Setting auth cookies', {
      tokenLifetime: `${(tokenLifetime / 60).toFixed(1)} minutes`,
      hasAttributes: !!userAttributes
    });
    
    // Default to env-appropriate settings
    const isDev = process.env.NODE_ENV === 'development';
    const useSecure = secure !== null ? secure : !isDev;
    
    // Use token expiration or fallback to provided maxAge or default (1 day)
    const cookieMaxAge = maxAge || (tokenLifetime > 0 ? tokenLifetime : 24 * 60 * 60);
    
    // Use consistent options for all cookies
    const cookieOptions = `path=/; max-age=${cookieMaxAge}; ${useSecure ? 'secure; ' : ''}${isDev ? 'samesite=lax' : 'samesite=strict'}`;
    
    // Set auth tokens
    document.cookie = `idToken=${idToken}; ${cookieOptions}`;
    document.cookie = `authToken=${accessToken}; ${cookieOptions}`;
    
    // Set token expiration timestamp for refresh logic
    const expTime = new Date(exp * 1000).toISOString();
    document.cookie = `tokenExpires=${expTime}; ${cookieOptions}`;
    
    // Store in localStorage as backup
    try {
      localStorage.setItem('idToken', idToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('tokenExpires', expTime);
    } catch (storageErr) {
      logger.warn('[cookieManager] Could not store tokens in localStorage', {
        error: storageErr.message
      });
    }
    
    // If user attributes provided, set onboarding related cookies
    if (userAttributes) {
      setOnboardingCookies(userAttributes, cookieOptions);
    }
    
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting auth cookies:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Sets onboarding-related cookies based on user attributes
 * @param {Object} attributes - User attributes from Cognito or API
 * @param {string} cookieOptions - Cookie options string
 */
export const setOnboardingCookies = (attributes, cookieOptions = null) => {
  try {
    if (!attributes) {
      logger.warn('[cookieManager] No attributes provided for onboarding cookies');
      return false;
    }
    
    // Set up default cookie options if not provided
    const isDev = process.env.NODE_ENV === 'development';
    const defaultOptions = `path=/; max-age=${7 * 24 * 60 * 60}; ${!isDev ? 'secure; ' : ''}${isDev ? 'samesite=lax' : 'samesite=strict'}`;
    const options = cookieOptions || defaultOptions;
    
    logger.debug('[cookieManager] Setting onboarding cookies');
    
    // Extract onboarding status from attributes
    const onboardingStatus = 
      attributes['custom:onboarding'] || 
      attributes.onboarding || 
      'PENDING';
      
    // Set onboarding status cookie
    document.cookie = `onboardedStatus=${onboardingStatus}; ${options}`;
    
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
                         
    const setupDone = attributes['custom:setupdone'] === 'TRUE' || 
                       attributes.setupCompleted === 'true' || 
                       attributes.setupCompleted === true;
    
    // Set individual step cookies
    document.cookie = `businessInfoCompleted=${businessInfoDone ? 'true' : 'false'}; ${options}`;
    document.cookie = `subscriptionCompleted=${subscriptionDone ? 'true' : 'false'}; ${options}`;
    document.cookie = `paymentCompleted=${paymentDone ? 'true' : 'false'}; ${options}`;
    document.cookie = `setupCompleted=${setupDone ? 'true' : 'false'}; ${options}`;
    
    // Store tenant ID if available
    const tenantId = attributes['custom:tenant_id'] || attributes.tenantId;
    if (tenantId) {
      document.cookie = `tenantId=${tenantId}; ${options}`;
    }
    
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error setting onboarding cookies:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Gets the current authentication token from cookies
 * @returns {string|null} - The ID token or null if not found
 */
export const getAuthToken = () => {
  try {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('idToken='));
    
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
    
    // Try localStorage as fallback
    const localToken = localStorage.getItem('idToken');
    if (localToken) {
      return localToken;
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
 * Clears all authentication-related cookies
 */
export const clearAuthCookies = () => {
  try {
    const cookies = ['idToken', 'authToken', 'tokenExpires', 'onboardedStatus', 
                    'businessInfoCompleted', 'subscriptionCompleted', 
                    'paymentCompleted', 'setupCompleted', 'tokenExpired'];
    
    // Set expiry to past date to clear
    const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Clear all auth cookies
    cookies.forEach(name => {
      document.cookie = `${name}=; path=/; ${expiry}`;
    });
    
    // Clear localStorage
    try {
      localStorage.removeItem('idToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tokenTimestamp');
      localStorage.removeItem('tokenExpires');
    } catch (storageErr) {
      // Ignore localStorage errors
    }
    
    logger.debug('[cookieManager] Auth cookies cleared');
    return true;
  } catch (error) {
    logger.error('[cookieManager] Error clearing auth cookies:', {
      error: error.message
    });
    return false;
  }
};

/**
 * Sets a token expired flag to trigger automatic sign-out
 */
export const setTokenExpiredFlag = () => {
  try {
    // Set a flag cookie indicating token expiration
    document.cookie = `tokenExpired=true; path=/`;
    logger.debug('[cookieManager] Token expired flag set');
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
  
  const setupDone = attributes['custom:setupdone'] === 'TRUE' || 
                     attributes.setupCompleted === 'true' || 
                     attributes.setupCompleted === true;
  
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