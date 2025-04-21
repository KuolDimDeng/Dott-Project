/**
 * AWS Amplify Resiliency Utilities
 * 
 * Provides enhanced error handling and retries for AWS Amplify operations
 */

import { logger } from './logger';
import { 
  trackCognitoFailure, 
  trackCognitoSuccess, 
  shouldAttemptCognitoRequest, 
  getCognitoTimeout, 
  resetCognitoCircuit, 
  getCognitoCircuitState 
} from './networkMonitor';
import { getFallbackTenantId } from './tenantFallback';
import { updateUserAttributes } from '@/config/amplifyUnified';

// Cached values for fallback
const cachedValues = {
  userAttributes: null,
  tokens: null,
  timestamp: 0,
  session: null,
  memoizedResults: new Map(),
  memoExpiry: 60000 // 1 minute cache expiry for memoized results
};

// Cache user attributes if available
export const cacheUserAttributes = (attributes) => {
  if (attributes && Object.keys(attributes).length > 0) {
    cachedValues.userAttributes = { ...attributes };
    cachedValues.timestamp = Date.now();
    
    // Also cache in AppCache for cross-component resilience
    try {
      if (typeof window !== 'undefined') {
        // Only store in sessionStorage if allowed
        try {
          sessionStorage.setItem('amplify_cached_attributes', JSON.stringify({
            attributes: cachedValues.userAttributes,
            timestamp: cachedValues.timestamp
          }));
        } catch (e) {
          // Ignore storage errors
        }
        
        // Always store in APP_CACHE
        if (window.__APP_CACHE) {
          window.__APP_CACHE.user = window.__APP_CACHE.user || {};
          window.__APP_CACHE.user.attributes = { ...attributes };
          window.__APP_CACHE.user.timestamp = Date.now();
        }
      }
    } catch (e) {
      // Ignore storage errors
      logger.debug('[AmplifyResiliency] Error caching user attributes:', e);
    }
    
    return true;
  }
  return false;
};

// Cache tokens for later use
export const cacheTokens = (tokens) => {
  if (tokens) {
    cachedValues.tokens = tokens;
    cachedValues.timestamp = Date.now();
    return true;
  }
  return false;
};

// Cache session data
export const cacheSession = (session) => {
  if (session) {
    cachedValues.session = session;
    cachedValues.timestamp = Date.now();
    return true;
  }
  return false;
};

// Load cached attributes from multiple sources during initialization
if (typeof window !== 'undefined') {
  try {
    // Try to load from sessionStorage first
    const storedCache = sessionStorage.getItem('amplify_cached_attributes');
    if (storedCache) {
      const parsed = JSON.parse(storedCache);
      if (parsed.attributes && parsed.timestamp && 
          (Date.now() - parsed.timestamp < 3600000)) { // 1 hour max age
        cachedValues.userAttributes = parsed.attributes;
        cachedValues.timestamp = parsed.timestamp;
        logger.debug(`[AmplifyResiliency] Loaded cached user attributes from sessionStorage (${(Date.now() - parsed.timestamp) / 1000}s old)`);
      }
    }
    
    // Then check APP_CACHE as a backup
    if (window.__APP_CACHE && window.__APP_CACHE.user && window.__APP_CACHE.user.attributes) {
      const appCacheTimestamp = window.__APP_CACHE.user.timestamp || 0;
      
      // Use APP_CACHE if it's newer or if we don't have attributes yet
      if (!cachedValues.userAttributes || (appCacheTimestamp > cachedValues.timestamp)) {
        cachedValues.userAttributes = { ...window.__APP_CACHE.user.attributes };
        cachedValues.timestamp = appCacheTimestamp;
        logger.debug(`[AmplifyResiliency] Loaded cached user attributes from APP_CACHE (${(Date.now() - appCacheTimestamp) / 1000}s old)`);
      }
    }
  } catch (e) {
    // Ignore storage errors
    logger.debug('[AmplifyResiliency] Error loading cached attributes:', e);
  }
}

// Function to memoize expensive Amplify operations
export const memoizeAmplifyOperation = (operationKey, operation, ttlMs = cachedValues.memoExpiry) => {
  // Check if we have a cached result
  const cached = cachedValues.memoizedResults.get(operationKey);
  
  if (cached && (Date.now() - cached.timestamp < ttlMs)) {
    logger.debug(`[AmplifyResiliency] Using memoized result for ${operationKey} (${(Date.now() - cached.timestamp) / 1000}s old)`);
    return Promise.resolve(cached.result);
  }
  
  // Execute operation and cache result
  return operation().then(result => {
    cachedValues.memoizedResults.set(operationKey, {
      result,
      timestamp: Date.now()
    });
    return result;
  });
};

/**
 * List of attributes users are allowed to update directly
 * This prevents the "A client attempted to write unauthorized attribute" error
 */
const ALLOWED_USER_ATTRIBUTES = [
  'name',
  'given_name',
  'family_name',
  'preferred_username',
  'email',
  'phone_number',
  'address',
  'birthdate',
  'gender',
  'locale',
  'picture',
  'website',
  'zoneinfo',
  // Tenant ID variants (case sensitive in Cognito)
  'custom:tenant_ID',  // Uppercase ID (primary)
  'custom:tenant_Id',  // Mixed case Id
  'custom:tenant_id',  // Lowercase id
  'custom:tenantID',   // Camel case with uppercase ID
  'custom:tenantId',   // Camel case with mixed Id
  'custom:tenantid',   // Lowercase
  // Business ID variants
  'custom:businessid',
  'custom:businessId',
  'custom:business_id',
  'custom:business_ID',
  // Onboarding attributes
  'custom:onboarding',
  'custom:setupdone',
  'custom:setup_done',
  // Plan attributes
  'custom:plan',
  'custom:subplan',
  'custom:subscription_plan',
  // Timestamps
  'custom:created_at',
  'custom:updated_at',
  'custom:last_login',
  // Preferences
  'custom:theme',
  'custom:language',
  'custom:timezone',
  'custom:preferences'
];

/**
 * Filters attributes to only include those that are allowed for update
 * @param {Object} attributes - User attributes to filter
 * @returns {Object} Filtered attributes object
 */
const filterAllowedAttributes = (attributes) => {
  const filtered = {};
  let hasDropped = false;
  const dropped = [];

  Object.entries(attributes).forEach(([key, value]) => {
    if (ALLOWED_USER_ATTRIBUTES.includes(key)) {
      filtered[key] = value;
    } else {
      hasDropped = true;
      dropped.push(key);
    }
  });

  if (hasDropped) {
    logger.warn('[Amplify] Dropped unauthorized attributes:', dropped);
  }

  return filtered;
};

/**
 * Resilient wrapper for fetchUserAttributes
 * Includes timeouts, retries, and fallbacks to cached data
 * 
 * @param {Function} fetchUserAttributesFn - The Amplify fetchUserAttributes function to call
 * @param {Object} options - Options for the request
 * @returns {Promise<Object>} User attributes or cached fallback
 */
export const resilientFetchUserAttributes = async (fetchUserAttributesFn, options = {}) => {
  // Check if we should use memoized result first (quick path)
  if (options.useMemoized !== false) {
    try {
      return await memoizeAmplifyOperation('fetchUserAttributes', async () => {
        return await resilientFetchUserAttributes(fetchUserAttributesFn, { ...options, useMemoized: false });
      });
    } catch (e) {
      // If memoization fails, continue with normal operation
      logger.warn('[AmplifyResiliency] Memoization failed, falling back to normal operation');
    }
  }
  
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, using cached attributes');
    
    // Use cached attributes if available
    if (options.fallbackToCache !== false && cachedValues.userAttributes) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(`[AmplifyResiliency] Using cached user attributes (${age / 1000}s old)`);
      return cachedValues.userAttributes;
    }
    
    // Try fallback tenant ID if no cached attributes
    const tenantId = getFallbackTenantId();
    if (tenantId) {
      logger.info('[AmplifyResiliency] Using emergency fallback user attributes with tenant ID:', tenantId);
      return {
        'custom:tenant_ID': tenantId,
        'custom:tenantId': tenantId
      };
    }
    
    throw new Error('Circuit breaker is open and no fallback data available');
  }

  const {
    maxRetries = 2,
    timeoutOverride,
    fallbackToCache = true
  } = options;
  
  // Get recommended timeout
  const timeout = timeoutOverride || getCognitoTimeout();
  let attempts = 0;
  let lastError = null;
  
  // Get the AbortController for the timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // First try with normal timeout
    while (attempts <= maxRetries) {
      try {
        logger.debug(`[AmplifyResiliency] Attempting to fetch user attributes (attempt ${attempts + 1}/${maxRetries + 1})`);
        
        // Create a timeout for this specific attempt
        const startTime = Date.now();
        
        // Call the actual Amplify function with the signal
        const attributes = await fetchUserAttributesFn();
        
        // If successful, clear timeout and cache the result
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        // Log performance info
        logger.debug(`[AmplifyResiliency] Successfully fetched user attributes in ${duration}ms`);
        
        // Track success for circuit breaker
        trackCognitoSuccess();
        
        // Cache for potential future fallback
        cacheUserAttributes(attributes);
        
        // If we had previous failures but now succeeded, reset failure count
        if (attempts > 0) {
          resetCognitoCircuit();
        }
        
        return attributes;
      } catch (error) {
        attempts++;
        lastError = error;
        
        // Handle different error types
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          logger.warn(`[AmplifyResiliency] Timeout fetching user attributes (attempt ${attempts}/${maxRetries + 1})`);
        } else if (error.name === 'NetworkError') {
          logger.warn(`[AmplifyResiliency] Network error fetching user attributes (attempt ${attempts}/${maxRetries + 1}):`, error);
        } else {
          // Other errors (auth errors, etc.)
          logger.warn(`[AmplifyResiliency] Error fetching user attributes (attempt ${attempts}/${maxRetries + 1}):`, error);
          
          // For auth errors, don't retry
          if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
            break;
          }
        }
        
        // Track this failure for future reference
        trackCognitoFailure(error);
        
        // If we've exceeded max retries, break out
        if (attempts > maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.min(2 ** attempts * 500, 3000); // Max 3-second delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we couldn't get the attributes after retries, try fallbacks
    if (fallbackToCache && cachedValues.userAttributes) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(`[AmplifyResiliency] Using cached user attributes (${age / 1000}s old)`);
      return cachedValues.userAttributes;
    }
    
    // Final fallback - try to create minimal user attributes with tenant ID
    const tenantId = getFallbackTenantId();
    if (tenantId) {
      logger.info('[AmplifyResiliency] Using emergency fallback user attributes with tenant ID:', tenantId);
      return {
        'custom:tenant_ID': tenantId,
        'custom:tenantId': tenantId
      };
    }
    
    // Re-throw the last error if all fallbacks fail
    throw lastError;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Resilient wrapper for getCurrentUser
 * Includes timeouts, retries, and fallbacks
 * 
 * @param {Function} getCurrentUserFn - The Amplify getCurrentUser function to call
 * @param {Object} options - Options for the request
 * @returns {Promise<Object>} User info or fallback
 */
export const resilientGetCurrentUser = async (getCurrentUserFn, options = {}) => {
  // Check if we should use memoized result first (quick path)
  if (options.useMemoized !== false) {
    try {
      return await memoizeAmplifyOperation('getCurrentUser', async () => {
        return await resilientGetCurrentUser(getCurrentUserFn, { ...options, useMemoized: false });
      });
    } catch (e) {
      // If memoization fails, continue with normal operation
      logger.warn('[AmplifyResiliency] Memoization failed, falling back to normal operation');
    }
  }
  
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, skipping getCurrentUser request');
    throw new Error('Circuit breaker is open, request blocked to prevent cascading failures');
  }

  const {
    maxRetries = 1,
    timeoutOverride,
    fallbackToCache = true
  } = options;
  
  // Get recommended timeout
  const timeout = timeoutOverride || getCognitoTimeout();
  let attempts = 0;
  let lastError = null;
  
  try {
    // First try with normal timeout
    while (attempts <= maxRetries) {
      try {
        logger.debug(`[AmplifyResiliency] Attempting to get current user (attempt ${attempts + 1}/${maxRetries + 1})`);
        
        // Create a timeout for this specific attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const startTime = Date.now();
        
        try {
          // Call the actual Amplify function
          const user = await getCurrentUserFn();
          
          // If successful, clear timeout
          clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          
          // Log performance info
          logger.debug(`[AmplifyResiliency] Successfully got current user in ${duration}ms`);
          
          // Track success for circuit breaker
          trackCognitoSuccess();
          
          return user;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        attempts++;
        lastError = error;
        
        // Handle different error types
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          logger.warn(`[AmplifyResiliency] Timeout getting current user (attempt ${attempts}/${maxRetries + 1})`);
        } else if (error.name === 'NetworkError') {
          logger.warn(`[AmplifyResiliency] Network error getting current user (attempt ${attempts}/${maxRetries + 1}):`, error);
        } else {
          // Other errors (auth errors, etc.)
          logger.warn(`[AmplifyResiliency] Error getting current user (attempt ${attempts}/${maxRetries + 1}):`, error);
          
          // For auth errors, don't retry
          if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
            break;
          }
        }
        
        // Track this failure for future reference
        trackCognitoFailure(error);
        
        // If we've exceeded max retries, break out
        if (attempts > maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.min(2 ** attempts * 500, 2000); // Max 2-second delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If all retries failed, throw the last error
    throw lastError;
  } catch (error) {
    logger.error('[AmplifyResiliency] All attempts to get current user failed:', error);
    throw error;
  }
};

/**
 * Resilient wrapper for fetchAuthSession
 * Includes timeouts, retries, and fallbacks to cached data
 * 
 * @param {Function} fetchAuthSessionFn - The Amplify fetchAuthSession function to call
 * @param {Object} options - Options for the request
 * @returns {Promise<Object>} Auth session or cached fallback
 */
export const resilientFetchAuthSession = async (fetchAuthSessionFn, options = {}) => {
  // Check if we should use memoized result first (quick path)
  if (options.useMemoized !== false && !options.forceRefresh) {
    try {
      return await memoizeAmplifyOperation('fetchAuthSession', async () => {
        return await resilientFetchAuthSession(fetchAuthSessionFn, { ...options, useMemoized: false });
      });
    } catch (e) {
      // If memoization fails, continue with normal operation
      logger.warn('[AmplifyResiliency] Memoization failed, falling back to normal operation');
    }
  }
  
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, using cached session if available');
    
    // Return cached session if available
    if (cachedValues.session) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(`[AmplifyResiliency] Using cached session (${age / 1000}s old)`);
      return cachedValues.session;
    }
    
    throw new Error('Circuit breaker is open and no cached session available');
  }

  const {
    maxRetries = 1,
    timeoutOverride,
    fallbackToCache = true,
    forceRefresh = false
  } = options;
  
  // Get recommended timeout
  const timeout = timeoutOverride || getCognitoTimeout();
  let attempts = 0;
  let lastError = null;
  
  try {
    // First try with normal timeout
    while (attempts <= maxRetries) {
      try {
        logger.debug(`[AmplifyResiliency] Attempting to fetch auth session (attempt ${attempts + 1}/${maxRetries + 1})`);
        
        // Create a timeout for this specific attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const startTime = Date.now();
        
        try {
          // Call the actual Amplify function
          const session = await fetchAuthSessionFn({ forceRefresh });
          
          // If successful, clear timeout
          clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          
          // Log performance info
          logger.debug(`[AmplifyResiliency] Successfully fetched auth session in ${duration}ms`);
          
          // Cache for potential future fallback
          cacheSession(session);
          
          // Track success for circuit breaker
          trackCognitoSuccess();
          
          return session;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        attempts++;
        lastError = error;
        
        // Handle different error types
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          logger.warn(`[AmplifyResiliency] Timeout fetching auth session (attempt ${attempts}/${maxRetries + 1})`);
        } else if (error.name === 'NetworkError') {
          logger.warn(`[AmplifyResiliency] Network error fetching auth session (attempt ${attempts}/${maxRetries + 1}):`, error);
        } else {
          // Other errors (auth errors, etc.)
          logger.warn(`[AmplifyResiliency] Error fetching auth session (attempt ${attempts}/${maxRetries + 1}):`, error);
          
          // For auth errors, don't retry
          if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
            break;
          }
        }
        
        // Track this failure for future reference
        trackCognitoFailure(error);
        
        // If we've exceeded max retries, break out
        if (attempts > maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.min(2 ** attempts * 500, 2000); // Max 2-second delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we couldn't get the session after retries, try fallbacks
    if (fallbackToCache && cachedValues.session) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(`[AmplifyResiliency] Using cached auth session (${age / 1000}s old)`);
      return cachedValues.session;
    }
    
    // Re-throw the last error if all fallbacks fail
    throw lastError;
  } catch (error) {
    logger.error('[AmplifyResiliency] All attempts to fetch auth session failed:', error);
    throw error;
  }
};

/**
 * Resilient implementation of updateUserAttributes that handles retries
 * This is used internally by the tenant utilities
 * 
 * @param {Object} params - Parameters object with userAttributes
 */
export async function resilientUpdateUserAttributes(params) {
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let success = false;
  let error = null;
  const startTime = performance.now();

  // First, filter attributes to only include allowed ones
  const filteredAttributes = filterAllowedAttributes(params.userAttributes);
  
  // Skip the update if all attributes were filtered out
  if (Object.keys(filteredAttributes).length === 0) {
    logger.warn('[Amplify] No allowed attributes to update');
    return;
  }

  // Create a new params object with filtered attributes
  const filteredParams = {
    ...params,
    userAttributes: filteredAttributes
  };
  
  // Try up to MAX_RETRIES times to update attributes
  while (retryCount <= MAX_RETRIES && !success) {
    try {
      retryCount++;
      
      if (retryCount > 1) {
        logger.info('[Amplify] Retrying updateUserAttributes, attempt:', retryCount);
      }
      
      // Import on-demand to avoid SSR issues
      const { updateUserAttributes } = await import('aws-amplify/auth');
      
      // Call the actual updateUserAttributes function
      await updateUserAttributes(filteredParams);
      
      // If we get here, it succeeded
      success = true;
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (retryCount > 1) {
        logger.info('[Amplify] updateUserAttributes succeeded after retries', {
          attempts: retryCount,
          duration
        });
      }
    } catch (e) {
      error = e;
      
      logger.warn('[Amplify] updateUserAttributes error on attempt ' + retryCount, {
        error: e.message,
        code: e.code,
        name: e.name
      });
      
      // Wait before retrying (simple exponential backoff)
      if (retryCount <= MAX_RETRIES) {
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  // If we've exhausted retries, log a final error and throw
  if (!success) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logger.error('[Amplify] updateUserAttributes failed after all retries', {
      duration,
      retries: retryCount,
      error: error.message,
      code: error.code
    });
    
    throw error;
  }
}

/**
 * Unified function to get AWS AppCache value with fallback to Cognito
 * This provides a resilient data access pattern when Cognito may be unreliable
 * 
 * @param {string} key - The cache key to retrieve
 * @param {Function} cognitoFetchFn - Function to fetch from Cognito if cache misses
 * @param {Object} options - Options including fallback value
 * @returns {Promise<any>} The value from cache, Cognito, or fallback
 */
export const getResiliantCacheValue = async (key, cognitoFetchFn, options = {}) => {
  const { 
    fallbackValue = null,
    cacheTTL = 3600000, // 1 hour default
    logPrefix = '[AppCache]'
  } = options;
  
  try {
    // First try AppCache if available
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      const cachedValue = window.__APP_CACHE[key];
      const cachedTime = window.__APP_CACHE[key + '_timestamp'];
      
      // If we have a valid cached value and it's not expired
      if (cachedValue && cachedTime && (Date.now() - cachedTime < cacheTTL)) {
        logger.debug(`${logPrefix} Using cached value for ${key} (${(Date.now() - cachedTime) / 1000}s old)`);
        return cachedValue;
      }
    }
    
    // Check circuit breaker before trying Cognito
    if (!shouldAttemptCognitoRequest()) {
      logger.warn(`${logPrefix} Circuit breaker is OPEN, using fallback value for ${key}`);
      return fallbackValue;
    }
    
    // No cache hit, try Cognito
    logger.debug(`${logPrefix} Cache miss for ${key}, fetching from Cognito`);
    const value = await cognitoFetchFn();
    
    // Save to AppCache for future use
    if (typeof window !== 'undefined') {
      if (!window.__APP_CACHE) window.__APP_CACHE = {};
      window.__APP_CACHE[key] = value;
      window.__APP_CACHE[key + '_timestamp'] = Date.now();
    }
    
    // Track success for circuit breaker
    trackCognitoSuccess();
    
    return value;
  } catch (error) {
    logger.error(`${logPrefix} Error fetching ${key}:`, error);
    
    // Track failure for circuit breaker
    trackCognitoFailure(error);
    
    // Return fallback
    return fallbackValue;
  }
};
