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
      const cookieTokens = parseCookies();
      if (cookieTokens.accessToken && cookieTokens.idToken) {
        tokens = {
          accessToken: cookieTokens.accessToken,
          idToken: cookieTokens.idToken
        };
        logger.debug('[OnboardingUtils] Using tokens from client cookies');
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
          
          // Update cookies
          document.cookie = `idToken=${tokens.idToken}; path=/`;
          document.cookie = `accessToken=${tokens.accessToken}; path=/`;
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
        
        // Update cookies
        document.cookie = `idToken=${tokens.idToken}; path=/`;
        document.cookie = `accessToken=${tokens.accessToken}; path=/`;
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

    // Format attributes - ensure step is lowercase for consistency
    const stepValue = step || 'business_info';
    
    const formattedAttributes = {
      'custom:onboarding': String(stepValue),
      'custom:updated_at': new Date().toISOString(),
      ...Object.entries(additionalAttributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key.startsWith('custom:') ? key : `custom:${key}`]: String(value)
      }), {})
    };

    logger.debug('[OnboardingUtils] Updating step:', {
      step: stepValue,
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
    
    // Define attributes to update - using lowercase values
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
    
    // Set cookies for immediate client-side status update
    if (attributeUpdateSuccess) {
      document.cookie = `onboardingStep=complete; path=/; max-age=${60*60*24*7}`;
      document.cookie = `onboardedStatus=complete; path=/; max-age=${60*60*24*7}`;
      document.cookie = `setupCompleted=true; path=/; max-age=${60*60*24*7}`;
      
      logger.debug('[OnboardingUtils] Updated cookies for immediate status change', {
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
      const userAttributes = await fetchUserAttributes();
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
    
    // Get status from cookies (medium priority)
    try {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      statusData.cookieStatus = getCookie('onboardedStatus');
      statusData.cookieStep = getCookie('onboardingStep');
      statusData.sourcesPriority.push('cookies');
      
      // If we don't have Cognito data, use cookie data
      if (!statusData.status && statusData.cookieStatus) {
        statusData.status = statusData.cookieStatus;
        statusData.step = statusData.cookieStep;
      }
      
      logger.debug('[getOnboardingStatus] Retrieved from cookies:', {
        status: statusData.cookieStatus,
        step: statusData.cookieStep
      });
    } catch (cookieError) {
      logger.warn('[getOnboardingStatus] Error getting status from cookies:', cookieError);
    }
    
    // Check local storage as last resort (lowest priority)
    try {
      statusData.localStorageStatus = localStorage.getItem('onboardedStatus');
      statusData.localStorageStep = localStorage.getItem('onboardingStep');
      statusData.sourcesPriority.push('localStorage');
      
      // Only use localStorage if we have no other data
      if (!statusData.status && statusData.localStorageStatus) {
        statusData.status = statusData.localStorageStatus;
        statusData.step = statusData.localStorageStep;
      }
      
      logger.debug('[getOnboardingStatus] Retrieved from localStorage:', {
        status: statusData.localStorageStatus,
        step: statusData.localStorageStep
      });
    } catch (storageError) {
      logger.warn('[getOnboardingStatus] Error getting status from localStorage:', storageError);
    }
    
    // Determine if there's inconsistency between sources
    const inconsistent = (
      (statusData.cognitoStatus && statusData.cookieStatus && statusData.cognitoStatus !== statusData.cookieStatus) ||
      (statusData.cognitoStatus && statusData.localStorageStatus && statusData.cognitoStatus !== statusData.localStorageStatus) ||
      (statusData.cookieStatus && statusData.localStorageStatus && statusData.cookieStatus !== statusData.localStorageStatus)
    );
    
    // If we detect inconsistency, synchronize all sources to match Cognito (source of truth)
    if (inconsistent && statusData.cognitoStatus) {
      logger.info('[getOnboardingStatus] Detected inconsistent status, synchronizing to Cognito:', {
        cognito: statusData.cognitoStatus,
        cookie: statusData.cookieStatus,
        localStorage: statusData.localStorageStatus
      });
      
      await synchronizeOnboardingStatus(statusData.cognitoStatus, statusData.cognitoSetupDone);
      
      // Update our return values to reflect the synchronized state
      statusData.status = statusData.cognitoStatus;
      statusData.cookieStatus = statusData.cognitoStatus;
      statusData.localStorageStatus = statusData.cognitoStatus;
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
      statusData.status = 'not_started';
      statusData.step = 'business-info';
    }
    
    return statusData;
  } catch (error) {
    console.error('[getOnboardingStatus] Error retrieving onboarding status:', error);
    // Return a default status in case of error
    return {
      status: 'not_started',
      step: 'business-info',
      setupDone: false,
      error: error.message
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
    const logger = console;
    logger.debug('[synchronizeOnboardingStatus] Synchronizing status to:', status);
    
    // Determine the appropriate step for the status
    let step = 'business-info';
    
    // Normalize status to lowercase
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case 'business_info':
      case 'business-info':
        step = 'subscription';
        break;
      case 'subscription':
        step = 'payment';
        break;
      case 'payment':
        step = 'setup';
        break;
      case 'setup':
      case 'complete':
        step = 'dashboard';
        break;
      default:
        step = 'business-info';
    }
    
    // Update cookies with normalized case
    try {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30); // 30 days
      document.cookie = `onboardedStatus=${statusLower || 'not_started'}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
      document.cookie = `onboardingStep=${step}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
      logger.debug('[synchronizeOnboardingStatus] Updated cookies');
    } catch (cookieError) {
      logger.warn('[synchronizeOnboardingStatus] Error updating cookies:', cookieError);
    }
    
    // Update localStorage with normalized case
    try {
      localStorage.setItem('onboardedStatus', statusLower || 'not_started');
      localStorage.setItem('onboardingStep', step);
      localStorage.setItem('cognitoOnboardingStatus', statusLower || 'not_started');
      localStorage.setItem('cognitoSetupDone', setupDone ? 'true' : 'false');
      logger.debug('[synchronizeOnboardingStatus] Updated localStorage');
    } catch (storageError) {
      logger.warn('[synchronizeOnboardingStatus] Error updating localStorage:', storageError);
    }
    
    // Attempt to update Cognito via server endpoint if our status is different
    try {
      const userAttributes = await fetchUserAttributes();
      if (userAttributes && userAttributes['custom:onboarding'] !== status) {
        logger.info('[synchronizeOnboardingStatus] Updating Cognito attributes via API');
        
        // Try server-side update
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            attributes: {
              'custom:onboarding': status,
              'custom:setupdone': setupDone ? 'true' : 'false'
            }
          })
        });
        
        if (response.ok) {
          logger.info('[synchronizeOnboardingStatus] Server-side attribute update successful');
        } else {
          logger.warn('[synchronizeOnboardingStatus] Server-side attribute update failed');
        }
      }
    } catch (serverError) {
      logger.warn('[synchronizeOnboardingStatus] Error updating Cognito via API:', serverError);
    }
    
    // Dispatch an event for components to listen to
    try {
      window.dispatchEvent(new CustomEvent('onboardingStatusUpdated', {
        detail: {
          status,
          step,
          setupDone,
          source: 'synchronizeOnboardingStatus'
        }
      }));
      logger.debug('[synchronizeOnboardingStatus] Dispatched status update event');
    } catch (eventError) {
      logger.warn('[synchronizeOnboardingStatus] Error dispatching status update event:', eventError);
    }
  } catch (error) {
    console.error('[synchronizeOnboardingStatus] Error synchronizing onboarding status:', error);
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
    'custom:onboarding': 'business_info',
    'custom:updated_at': new Date().toISOString(),
    'custom:acctstatus': 'active',
    'custom:attrversion': attrVersion // Using semantic versioning format
  };
}

export async function validateSubscription(data) {
  const validPlans = ['free', 'professional', 'enterprise'];
  const validIntervals = ['monthly', 'yearly'];

  logger.debug('[Subscription] Values before validation:', {
    rawPlan: data.plan,
    rawInterval: data.interval,
    convertedPlan: data.plan?.toLowerCase(),
    convertedInterval: data.interval?.toLowerCase(),
    validPlans: ['free', 'professional', 'enterprise'],
    validIntervals: ['monthly', 'yearly']
  });

  // Case-insensitive validation
  const plan = data.plan?.toLowerCase();
  const interval = data.interval?.toLowerCase();

  if (!validPlans.includes(plan)) {
    throw new Error(`Invalid subscription plan. Must be one of: ${validPlans.join(', ')}`);
  }

  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid subscription interval. Must be one of: ${validIntervals.join(', ')}`);
  }

  // Format subscription info for Cognito attributes
  const formattedAttributes = {
    'custom:subplan': String(data.plan).toLowerCase(),
    'custom:subscriptioninterval': String(data.interval).toLowerCase()
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
    'custom:payverified': data.verified ? 'true' : 'false'
  };

  return formattedAttributes;
}

/**
 * Gets a cookie value by name
 * @param {string} name - The cookie name
 * @returns {string|null} The cookie value or null if not found
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

/**
 * Sets a cookie with the specified name and value
 * @param {string} name - The cookie name
 * @param {string} value - The cookie value
 * @param {number} maxAge - Cookie max age in seconds (default 30 days)
 */
export const setCookie = (name, value, maxAge = 60 * 60 * 24 * 30) => {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
};

/**
 * Gets an item from localStorage with error handling
 * @param {string} key - The localStorage key
 * @returns {string|null} The value or null if not found or error occurs
 */
export const getLocalStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    logger.warn('[onboardingUtils] Error reading from localStorage:', e);
    return null;
  }
};

/**
 * Sets an item in localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {string} value - The value to store
 * @returns {boolean} True if successful, false otherwise
 */
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    logger.warn('[onboardingUtils] Error writing to localStorage:', e);
    return false;
  }
};

/**
 * Updates the onboarding status across all storage mechanisms (Cognito, cookies, localStorage)
 * @param {string} status - The new onboarding status, use ONBOARDING_STATUS constants
 * @param {Object} options - Additional options
 * @param {boolean} options.updateCognito - Whether to update Cognito attributes (default true)
 * @param {boolean} options.wait - Whether to wait for Cognito update to complete (default false)
 * @returns {Promise<boolean>} True if successful
 */
export const updateOnboardingStatus = async (status, options = {}) => {
  const { updateCognito = true, wait = false } = options;
  
  try {
    // Always update cookies and localStorage as fallbacks
    setCookie(COOKIE_NAMES.ONBOARDING_STATUS, status);
    setLocalStorage(STORAGE_KEYS.ONBOARDING_STATUS, status);
    
    // Set additional cookies/storage based on status
    if (status === ONBOARDING_STATUS.COMPLETE) {
      setCookie(COOKIE_NAMES.SETUP_COMPLETED, 'true');
      setCookie(COOKIE_NAMES.ONBOARDING_STEP, ONBOARDING_STEPS.COMPLETE);
      setLocalStorage(STORAGE_KEYS.SETUP_COMPLETED, 'true');
    }
    
    // Update Cognito if requested
    if (updateCognito) {
      const updateAttributes = async () => {
        try {
          // Prepare attributes to update
          const userAttributes = {
            [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: status
          };
          
          // Add extra attributes for complete status
          if (status === ONBOARDING_STATUS.COMPLETE) {
            userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED] = 'true';
          }
          
          // Update attributes
          await updateUserAttributes({
            userAttributes 
          });
          
          logger.debug('[onboardingUtils] Cognito attributes updated successfully:', { status });
          return true;
        } catch (error) {
          logger.warn('[onboardingUtils] Error updating Cognito attributes:', error);
          return false;
        }
      };
      
      // Either wait for update or do it in background
      if (wait) {
        const success = await updateAttributes();
        return success;
      } else {
        // Fire and forget
        updateAttributes().catch(error => {
          logger.error('[onboardingUtils] Background Cognito update failed:', error);
        });
      }
    }
    
    return true;
  } catch (error) {
    logger.error('[onboardingUtils] Failed to update onboarding status:', error);
    return false;
  }
};

/**
 * Checks if the user has completed onboarding by examining all sources
 * @returns {boolean} True if onboarding is complete
 */
export const isOnboardingComplete = () => {
  try {
    // Check cookies first (most reliable client-side indicator)
    const cookieStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS)?.toLowerCase();
    const cookieSetupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED)?.toLowerCase();
    const cookieOnboardingStep = getCookie(COOKIE_NAMES.ONBOARDING_STEP)?.toLowerCase();
    
    // Check localStorage as backup
    const localStorageStatus = getLocalStorage(STORAGE_KEYS.ONBOARDING_STATUS)?.toLowerCase();
    const localStorageSetupCompleted = getLocalStorage(STORAGE_KEYS.SETUP_COMPLETED)?.toLowerCase();
    
    // Return true if ANY source indicates completion (using case-insensitive comparison)
    return (
      cookieStatus === 'complete' ||
      cookieSetupCompleted === 'true' ||
      cookieOnboardingStep === 'complete' ||
      localStorageStatus === 'complete' ||
      localStorageSetupCompleted === 'true'
    );
  } catch (error) {
    logger.error('[onboardingUtils] Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Gets the current onboarding step (for routing)
 * @returns {string} The current onboarding step path
 */
export const getCurrentOnboardingStep = () => {
  // Get from cookie first, fallback to localStorage
  const cookieStep = getCookie(COOKIE_NAMES.ONBOARDING_STEP);
  
  if (cookieStep) {
    return cookieStep;
  }
  
  // If no specific step found but onboarding is complete, return complete
  if (isOnboardingComplete()) {
    return ONBOARDING_STEPS.COMPLETE;
  }
  
  // Default to first step
  return ONBOARDING_STEPS.BUSINESS_INFO;
};