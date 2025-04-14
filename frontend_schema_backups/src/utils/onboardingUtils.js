import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { getRefreshedAccessToken, isTokenExpired } from '@/utils/auth';
import { jwtDecode } from 'jwt-decode';
import { fetchUserAttributes } from '@/config/amplifyUnified';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';
import { 
  getUserAttribute, 
  updateUserAttributes as updateAttributes,
  getAllUserAttributes  
} from '@/utils/cognitoAttributes';

export async function validateSession(providedTokens) {
  try {
    let tokens = providedTokens;

    // Server-side handling
    if (typeof window === 'undefined') {
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens provided for server-side operation');
      }
      
      // Check if token is expired
      if (isTokenExpired(tokens.accessToken)) {
        throw new Error('Token expired for server-side operation');
      }
      
      return { tokens };
    }

    // Client-side handling
    if (!tokens) {
      // Try to get tokens from AppCache
      const accessToken = getCacheValue('access_token');
      const idToken = getCacheValue('id_token');
      
      if (accessToken && idToken) {
        tokens = { accessToken, idToken };
        logger.debug('[OnboardingUtils] Using tokens from AppCache');
      }
    }

    // Check if tokens are expired or missing
    let needsRefresh = !tokens?.accessToken || !tokens?.idToken;
    
    if (tokens?.accessToken && !needsRefresh) {
      try {
        // Check if token is expired or about to expire (within 5 minutes)
        const decoded = jwtDecode(tokens.accessToken);
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesInSeconds = 5 * 60;
        
        if (decoded.exp && decoded.exp - now < fiveMinutesInSeconds) {
          logger.info('[OnboardingUtils] Token is expired or about to expire, refreshing');
          needsRefresh = true;
        }
      } catch (tokenError) {
        logger.warn('[OnboardingUtils] Error checking token expiration:', tokenError);
        needsRefresh = true;
      }
    }

    // If tokens need refresh, get fresh tokens
    if (needsRefresh) {
      logger.debug('[OnboardingUtils] Tokens need refresh, getting new tokens');
      
      // Try to use our specialized refresh function first
      try {
        const refreshedToken = await getRefreshedAccessToken();
        if (refreshedToken) {
          logger.info('[OnboardingUtils] Successfully refreshed token');
          
          // Get a fresh session to get both tokens
          const session = await fetchAuthSession();
          tokens = {
            accessToken: session.tokens.accessToken.toString(),
            idToken: session.tokens.idToken.toString()
          };
          
          // Update AppCache
          setCacheValue('access_token', tokens.accessToken);
          setCacheValue('id_token', tokens.idToken);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        logger.warn('[OnboardingUtils] Token refresh failed, falling back to fetchAuthSession:', refreshError);
        
        // Fallback to regular session fetch
        const session = await fetchAuthSession();
        tokens = {
          accessToken: session.tokens.accessToken.toString(),
          idToken: session.tokens.idToken.toString()
        };
        
        // Update AppCache
        setCacheValue('access_token', tokens.accessToken);
        setCacheValue('id_token', tokens.idToken);
      }
    }

    logger.debug('[OnboardingUtils] Session tokens:', {
      hasIdToken: !!tokens.idToken,
      hasAccessToken: !!tokens.accessToken,
      idTokenLength: tokens.idToken?.length,
      accessTokenLength: tokens.accessToken?.length
    });

    // Only get current user on client side
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No current user found');
    }

    return { tokens, user };
  } catch (error) {
    logger.error('[OnboardingUtils] Session validation failed:', error);
    throw error;
  }
}

function parseCookies() {
  const cookies = {};
  if (typeof window !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

export async function updateOnboardingStep(step, additionalAttributes = {}, tokens = null) {
  try {
    // Validate session with provided tokens
    const { tokens: validTokens } = await validateSession(tokens);

    // Format attributes
    const formattedAttributes = {
      'custom:onboarding': String(step),
      'custom:updated_at': new Date().toISOString(),
      ...Object.entries(additionalAttributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key.startsWith('custom:') ? key : `custom:${key}`]: String(value)
      }), {})
    };

    logger.debug('[OnboardingUtils] Updating step:', {
      step,
      attributes: Object.keys(formattedAttributes)
    });

    // Server-side update using AWS SDK
    if (typeof window === 'undefined') {
      try {
        // Import AWS SDK v3 - must use dynamic import for server-side
        const { CognitoIdentityProviderClient, UpdateUserAttributesCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        
        // Configure the Cognito Identity Provider client
        const client = new CognitoIdentityProviderClient({
          region: 'us-east-1'
        });
        
        // Format attributes for AWS SDK
        const userAttributes = Object.entries(formattedAttributes).map(([key, value]) => ({
          Name: key,
          Value: value
        }));
        
        // Make the update request using the SDK
        const updateParams = {
          AccessToken: validTokens.accessToken,
          UserAttributes: userAttributes
        };
        
        const command = new UpdateUserAttributesCommand(updateParams);
        await client.send(command);
        logger.debug('[OnboardingUtils] Server-side attributes updated successfully');
      } catch (error) {
        logger.error('[OnboardingUtils] Server-side attribute update failed:', {
          error: error.message,
          code: error.code,
          statusCode: error.statusCode
        });
        throw new Error(`Failed to update attributes: ${error.message}`);
      }
    } else {
      // Client-side update using Amplify
      await updateUserAttributes({
        userAttributes: formattedAttributes
      });
    }

    logger.debug('[OnboardingUtils] Step updated successfully');
    return true;
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to update step:', {
      error: error.message,
      code: error.code,
      step
    });
    throw error;
  }
}

export async function completeOnboarding() {
  try {
    // Track performance and attempt status
    const startTime = performance.now();
    let attributeUpdateSuccess = false;
    const requestId = crypto.randomUUID();
    
    logger.debug('[OnboardingUtils] Starting onboarding completion', {
      requestId,
      timestamp: new Date().toISOString()
    });
    
    // Define attributes to update
    const userAttributes = {
      'custom:onboarding': 'complete',
      'custom:setupdone': 'true',
      'custom:updated_at': new Date().toISOString(),
      'custom:onboardingCompletedAt': new Date().toISOString()
    };
    
    try {
      // First attempt: Use Amplify updateUserAttributes
      await updateUserAttributes({ userAttributes });
      attributeUpdateSuccess = true;
      
      logger.debug('[OnboardingUtils] Attributes updated via Amplify', {
        requestId,
        method: 'direct_amplify',
        elapsedMs: performance.now() - startTime
      });
    } catch (updateError) {
      logger.error('[OnboardingUtils] Amplify update failed', {
        requestId,
        error: updateError.message,
        code: updateError.code,
        elapsedMs: performance.now() - startTime
      });
      
      // If Amplify update fails, try the direct API call as a backup
      try {
        // Get current session for authentication
        const { tokens } = await fetchAuthSession();
        
        // Make direct API call to update attributes
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`,
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            attributes: userAttributes,
            forceUpdate: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          attributeUpdateSuccess = true;
          
          logger.debug('[OnboardingUtils] Attributes updated via API call', {
            requestId,
            method: 'api_call',
            result,
            elapsedMs: performance.now() - startTime
          });
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (apiError) {
        logger.error('[OnboardingUtils] API update failed', {
          requestId,
          error: apiError.message,
          elapsedMs: performance.now() - startTime
        });
        
        // Final attempt: Try using the onboarding complete endpoint
        try {
          const completeResponse = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId
            }
          });
          
          if (completeResponse.ok) {
            attributeUpdateSuccess = true;
            
            logger.debug('[OnboardingUtils] Completion via dedicated endpoint succeeded', {
              requestId,
              method: 'complete_endpoint',
              elapsedMs: performance.now() - startTime
            });
          } else {
            throw new Error(`Complete endpoint returned status ${completeResponse.status}`);
          }
        } catch (completeError) {
          logger.error('[OnboardingUtils] All update methods failed', {
            requestId,
            completeError: completeError.message,
            elapsedMs: performance.now() - startTime
          });
          throw new Error('Failed to complete onboarding after multiple attempts');
        }
      }
    }
    
    // Set AppCache for immediate client-side status update
    if (attributeUpdateSuccess) {
      setCacheValue('user_pref_custom:onboarding_step', 'complete', { ttl: 7 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:onboarding', 'complete', { ttl: 7 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:setup_completed', 'true', { ttl: 7 * 24 * 60 * 60 * 1000 });
      
      logger.debug('[OnboardingUtils] Updated AppCache for immediate status change', {
        requestId,
        elapsedMs: performance.now() - startTime
      });
    }
    
    logger.debug('[OnboardingUtils] Onboarding completion process finished', {
      requestId,
      success: attributeUpdateSuccess,
      elapsedMs: performance.now() - startTime
    });
    
    return attributeUpdateSuccess;
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to complete onboarding:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Gets the onboarding status from multiple sources and ensures they are in sync
 * Prioritizes the Cognito attributes as the source of truth
 * 
 * @returns {Promise<Object>} The onboarding status data
 */
export async function getOnboardingStatus() {
  try {
    const logger = console;
    logger.debug('[getOnboardingStatus] Checking onboarding status from multiple sources');
    
    let statusData = {
      status: null,
      step: null,
      setupDone: false,
      nextStep: null,
      sourcesPriority: []
    };
    
    // Get status from Cognito attributes (highest priority)
    try {
      const userAttributes = await getAllUserAttributes();
      if (userAttributes) {
        statusData.cognitoStatus = userAttributes['custom:onboarding'];
        statusData.cognitoSetupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
        statusData.sourcesPriority.push('cognito');
        
        // Cognito is the source of truth, so set the status from here if available
        if (statusData.cognitoStatus) {
          statusData.status = statusData.cognitoStatus;
          statusData.setupDone = statusData.cognitoSetupDone;
        }
        
        logger.debug('[getOnboardingStatus] Retrieved from Cognito:', {
          status: statusData.cognitoStatus,
          setupDone: statusData.cognitoSetupDone
        });
      }
    } catch (cognitoError) {
      logger.warn('[getOnboardingStatus] Error getting status from Cognito:', cognitoError);
    }
    
    // Check AppCache (medium priority)
    try {
      statusData.appCacheStatus = getCacheValue('user_pref_custom:onboarding');
      statusData.appCacheStep = getCacheValue('user_pref_custom:onboarding_step');
      statusData.sourcesPriority.push('appCache');
      
      // If we don't have Cognito data, use AppCache data
      if (!statusData.status && statusData.appCacheStatus) {
        statusData.status = statusData.appCacheStatus;
        statusData.step = statusData.appCacheStep;
      }
      
      logger.debug('[getOnboardingStatus] Retrieved from AppCache:', {
        status: statusData.appCacheStatus,
        step: statusData.appCacheStep
      });
    } catch (cacheError) {
      logger.warn('[getOnboardingStatus] Error getting status from AppCache:', cacheError);
    }
    
    // Determine if there's inconsistency between sources
    const inconsistent = (
      (statusData.cognitoStatus && statusData.appCacheStatus && statusData.cognitoStatus !== statusData.appCacheStatus)
    );
    
    // If we detect inconsistency, synchronize AppCache to match Cognito (source of truth)
    if (inconsistent && statusData.cognitoStatus) {
      logger.info('[getOnboardingStatus] Detected inconsistent status, synchronizing to Cognito:', {
        cognito: statusData.cognitoStatus,
        appCache: statusData.appCacheStatus
      });
      
      await synchronizeOnboardingStatus(statusData.cognitoStatus, statusData.cognitoSetupDone);
      
      // Update our return values to reflect the synchronized state
      statusData.status = statusData.cognitoStatus;
      statusData.appCacheStatus = statusData.cognitoStatus;
    }
    
    // Set step based on status
    if (statusData.status) {
      // Normalize to lowercase
      const statusLower = statusData.status.toLowerCase();
      
      switch (statusLower) {
        case 'not_started':
        case 'not-started':
          statusData.step = 'business-info';
          break;
        case 'business_info':
        case 'business-info':
          statusData.step = 'subscription';
          break;
        case 'subscription':
          statusData.step = 'payment';
          break;
        case 'payment':
          statusData.step = 'setup';
          break;
        case 'setup':
        case 'complete':
          statusData.step = 'dashboard';
          break;
        default:
          statusData.step = 'business-info';
      }
    }
    
    // Set default values if nothing was found
    if (!statusData.status) {
      statusData.status = 'NOT_STARTED';
      statusData.step = 'business-info';
    }
    
    return statusData;
  } catch (error) {
    console.error('[getOnboardingStatus] Error retrieving onboarding status:', error);
    // Return a default status in case of error
    return {
      status: 'NOT_STARTED',
      step: 'business-info',
      setupDone: false,
      sourcesPriority: ['default']
    };
  }
}

/**
 * Synchronizes onboarding status across all storage mechanisms
 * 
 * @param {string} status - The status to set
 * @param {boolean} setupDone - Whether setup is done
 * @returns {Promise<void>}
 */
async function synchronizeOnboardingStatus(status, setupDone) {
  try {
    // Update AppCache
    const statusLower = (status || 'not_started').toLowerCase();
    
    setCacheValue('user_pref_custom:onboarding', statusLower, { ttl: 7 * 24 * 60 * 60 * 1000 });
    setCacheValue('user_pref_custom:onboarding_step', getStepFromStatus(statusLower), { ttl: 7 * 24 * 60 * 60 * 1000 });
    setCacheValue('user_pref_custom:setup_completed', setupDone ? 'true' : 'false', { ttl: 7 * 24 * 60 * 60 * 1000 });
    
    return true;
  } catch (error) {
    console.error('[synchronizeOnboardingStatus] Error:', error);
    return false;
  }
}

// Helper function to get step from status
function getStepFromStatus(status) {
  switch (status) {
    case 'not_started':
    case 'not-started':
      return 'business-info';
    case 'business_info':
    case 'business-info':
      return 'subscription';
    case 'subscription':
      return 'payment';
    case 'payment':
      return 'setup';
    case 'setup':
    case 'complete':
      return 'dashboard';
    default:
      return 'business-info';
  }
}

export async function validateBusinessInfo(data) {
  logger.debug('[OnboardingUtils] Validating business info:', data);

  const {
    businessName,
    businessType,
    businessSubtypes = '',
    country,
    businessState = '',
    legalStructure,
    dateFounded,
    businessId = crypto.randomUUID()
  } = data;

  const errors = [];

  if (!businessName || businessName.trim().length < 2) {
    errors.push({ field: 'businessName', message: 'Business name must be at least 2 characters' });
  }

  if (!businessType) {
    errors.push({ field: 'businessType', message: 'Business type is required' });
  }

  if (!legalStructure) {
    errors.push({ field: 'legalStructure', message: 'Legal structure is required' });
  }

  if (!dateFounded) {
    errors.push({ field: 'dateFounded', message: 'Date founded is required' });
  }

  if (!country) {
    errors.push({ field: 'country', message: 'Country is required' });
  }

  if (errors.length > 0) {
    logger.error('[OnboardingUtils] Business info validation failed:', {
      errors,
      data
    });
    const error = new Error('Validation failed');
    error.fields = errors;
    throw error;
  }

  logger.debug('[OnboardingUtils] Business info validation successful:', {
    businessId,
    businessName,
    businessType
  });

  // Generate a properly formatted version string (v1.0.0)
  const attrVersion = 'v1.0.0';
  logger.debug('[OnboardingUtils] Setting attribute version:', { attrVersion });

  // Format attributes for Cognito
  return {
    'custom:businessid': businessId,
    'custom:businessname': businessName,
    'custom:businesstype': businessType,
    'custom:businesssubtypes': businessSubtypes,
    'custom:businesscountry': country,
    'custom:businessstate': businessState,
    'custom:legalstructure': legalStructure,
    'custom:datefounded': dateFounded,
    'custom:onboarding': 'BUSINESS_INFO',
    'custom:updated_at': new Date().toISOString(),
    'custom:acctstatus': 'ACTIVE',
    'custom:attrversion': attrVersion // Using semantic versioning format
  };
}

export async function validateSubscription(data) {
  const validPlans = ['FREE', 'PROFESSIONAL', 'ENTERPRISE'];
  const validIntervals = ['MONTHLY', 'YEARLY'];

  logger.debug('[Subscription] Values before validation:', {
    rawPlan: data.plan,
    rawInterval: data.interval,
    convertedPlan: data.plan?.toUpperCase(),
    convertedInterval: data.interval?.toUpperCase(),
    validPlans: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
    validIntervals: ['MONTHLY', 'YEARLY']
  });

  // Case-insensitive validation
  const plan = data.plan?.toUpperCase();
  const interval = data.interval?.toUpperCase();

  if (!validPlans.includes(plan)) {
    throw new Error(`Invalid subscription plan. Must be one of: ${validPlans.join(', ')}`);
  }

  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid subscription interval. Must be one of: ${validIntervals.join(', ')}`);
  }

  // Format subscription info for Cognito attributes
  const formattedAttributes = {
    'custom:subplan': String(data.plan),
    'custom:subscriptioninterval': String(data.interval)
  };

  return formattedAttributes;
}

export async function validatePayment(data) {
  if (!data.paymentId) {
    throw new Error('Payment ID is required');
  }

  if (typeof data.verified !== 'boolean') {
    throw new Error('Payment verification status is required');
  }

  // Format payment info for Cognito attributes
  const formattedAttributes = {
    'custom:paymentid': String(data.paymentId),
    'custom:payverified': data.verified ? 'TRUE' : 'FALSE'
  };

  return formattedAttributes;
}

/**
 * @deprecated Use getAttributeValue instead which uses Cognito and AppCache
 * Gets a cookie value by name
 * @param {string} name - The cookie name
 * @returns {string|null} The cookie value or null if not found
 */
export const getCookie = (name) => {
  logger.warn('[DEPRECATED] getCookie is deprecated. Use getAttributeValue or getCacheValue instead');
  
  // Forward to AppCache
  return getCacheValue(name);
};

/**
 * @deprecated Use setAttributeValue instead which uses Cognito and AppCache
 * Sets a cookie with the specified name and value
 * @param {string} name - The cookie name
 * @param {string} value - The cookie value
 * @param {number} maxAge - Cookie max age in seconds (default 30 days)
 */
export const setCookie = (name, value, maxAge = 60 * 60 * 24 * 30) => {
  logger.warn('[DEPRECATED] setCookie is deprecated. Use setAttributeValue or setCacheValue instead');
  
  // Forward to AppCache
  setCacheValue(name, value, { ttl: maxAge * 1000 });
};

/**
 * Get a value from AppCache (replacement for getLocalStorage)
 * 
 * @param {string} key - The cache key
 * @returns {*} The cached value or null
 */
export const getLocalStorage = (key) => {
  return getCacheValue(`app_${key}`);
};

/**
 * Set a value in AppCache (replacement for setLocalStorage)
 * 
 * @param {string} key - The cache key
 * @param {*} value - The value to cache
 * @returns {boolean} True if successful
 */
export const setLocalStorage = (key, value) => {
  return setCacheValue(`app_${key}`, value, { ttl: 30 * 24 * 60 * 60 * 1000 });
};

/**
 * Updates the onboarding status across all storage mechanisms (Cognito, cookies, AppCache)
 * @param {string} status - The new onboarding status, use ONBOARDING_STATUS constants
 * @param {Object} options - Additional options
 * @param {boolean} options.updateCognito - Whether to update Cognito attributes (default true)
 * @param {boolean} options.wait - Whether to wait for Cognito update to complete (default false)
 * @returns {Promise<boolean>} True if successful
 */
export const updateOnboardingStatus = async (status, options = {}) => {
  try {
    const { setupDone = false, step = null } = options;
    
    // Normalize status
    const statusLower = (status || 'not_started').toLowerCase();
    
    // Create a collection of attributes to update
    const attributes = {
      'onboarding': statusLower,
      'setup_completed': setupDone ? 'true' : 'false'
    };
    
    // Add step if provided, otherwise derive from status
    if (step) {
      attributes['onboarding_step'] = step;
    } else {
      attributes['onboarding_step'] = getStepFromStatus(statusLower);
    }
    
    // Update Cognito attributes
    await updateAttributes(attributes);
    
    // Update AppCache for immediate access
    setCacheValue('user_pref_custom:onboarding', statusLower, { ttl: 30 * 24 * 60 * 60 * 1000 });
    setCacheValue('user_pref_custom:onboarding_step', attributes['onboarding_step'], { ttl: 30 * 24 * 60 * 60 * 1000 });
    setCacheValue('user_pref_custom:setup_completed', setupDone ? 'true' : 'false', { ttl: 30 * 24 * 60 * 60 * 1000 });
    
    return true;
  } catch (error) {
    console.error('[updateOnboardingStatus] Error:', error);
    return false;
  }
};

/**
 * Gets a value from Cognito attributes with AppCache fallback
 * @param {string} name - The attribute name
 * @returns {Promise<string|null>} The attribute value or null if not found
 */
export const getAttributeValue = async (name) => {
  try {
    return await getUserAttribute(name);
  } catch (error) {
    console.error(`[getAttributeValue] Error getting attribute ${name}:`, error);
    return null;
  }
};

/**
 * Sets a value in Cognito attributes and AppCache
 * @param {string} name - The attribute name
 * @param {string} value - The value to set
 * @param {Object} options - Options
 * @param {boolean} options.updateCognito - Whether to update Cognito (default true)
 * @returns {Promise<boolean>} True if successful
 */
export const setAttributeValue = async (name, value, options = { updateCognito: true }) => {
  try {
    const attributes = {
      [name]: value
    };
    
    return await updateAttributes(attributes);
  } catch (error) {
    console.error(`[setAttributeValue] Error setting attribute ${name}:`, error);
    return false;
  }
};

/**
 * Checks if the user has completed onboarding by examining all sources
 * @returns {Promise<boolean>} True if onboarding is complete
 */
export const isOnboardingComplete = async () => {
  try {
    // Check AppCache first for performance
    const appCacheStatus = getCacheValue(STORAGE_KEYS.ONBOARDING_STATUS)?.toLowerCase();
    const appCacheSetupCompleted = getCacheValue(STORAGE_KEYS.SETUP_COMPLETED)?.toLowerCase();
    
    // Return true if AppCache indicates completion
    if (appCacheStatus === 'complete' || appCacheSetupCompleted === 'true') {
      return true;
    }
    
    // Then check Cognito attributes
    try {
      const attributes = await fetchUserAttributes().catch(() => ({}));
      const cognitoOnboarding = (attributes['custom:onboarding'] || '').toLowerCase();
      const cognitoSetupDone = (attributes['custom:setupdone'] || '').toLowerCase();
      
      // Cache the results for future fast access
      if (cognitoOnboarding === 'complete' || cognitoSetupDone === 'true') {
        setCacheValue(STORAGE_KEYS.ONBOARDING_STATUS, 'complete');
        setCacheValue(STORAGE_KEYS.SETUP_COMPLETED, 'true');
        return true;
      }
    } catch (cognitoError) {
      logger.warn('[onboardingUtils] Error checking Cognito attributes:', cognitoError);
      // Continue checking other sources
    }
    
    return false;
  } catch (error) {
    logger.error('[onboardingUtils] Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Gets the current onboarding step (for routing)
 * @returns {Promise<string>} The current onboarding step path
 */
export const getCurrentOnboardingStep = async () => {
  // Check AppCache first
  const cachedStep = getCacheValue(STORAGE_KEYS.ONBOARDING_STEP);
  if (cachedStep) {
    return cachedStep;
  }
  
  // Then check Cognito
  try {
    const attributes = await fetchUserAttributes().catch(() => ({}));
    const onboardingStatus = (attributes['custom:onboarding'] || '').toLowerCase();
    
    // Map onboarding status to step
    switch (onboardingStatus) {
      case 'business_info':
        return ONBOARDING_STEPS.BUSINESS_INFO;
      case 'subscription':
        return ONBOARDING_STEPS.SUBSCRIPTION;
      case 'payment':
        return ONBOARDING_STEPS.PAYMENT;
      case 'setup':
        return ONBOARDING_STEPS.SETUP;
      case 'complete':
        return ONBOARDING_STEPS.COMPLETE;
      default:
        // If no specific step found but setup is complete, return complete
        if (attributes['custom:setupdone']?.toLowerCase() === 'true') {
          return ONBOARDING_STEPS.COMPLETE;
        }
    }
  } catch (error) {
    logger.warn('[onboardingUtils] Error fetching Cognito attributes:', error);
  }
  
  // If onboarding is complete based on AppCache, return complete
  if (getCacheValue(STORAGE_KEYS.ONBOARDING_STATUS) === 'complete') {
    return ONBOARDING_STEPS.COMPLETE;
  }
  
  // Default to first step
  return ONBOARDING_STEPS.BUSINESS_INFO;
};