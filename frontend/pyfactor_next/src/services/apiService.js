'use client';

import { appCache } from '@/utils/appCache';


import { axiosInstance, retryRequest } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTenantContext, setTenantContext, extractTenantFromResponse } from '@/utils/tenantContext';
import { dataCache } from '@/utils/enhancedCache';
import { getTenantId, getSchemaName } from '@/utils/tenantUtils';

/**
 * ApiService - Centralized service for API requests with tenant awareness
 * This service provides a consistent interface for making API requests
 * with proper tenant context, error handling, and caching.
 */

/**
 * Standard error response for API errors
 * @param {Error} error - The error object
 * @param {Object} options - Error handling options
 * @returns {Object} Standardized error object
 */
export const handleApiError = (error, options = {}) => {
  const { fallbackData = null, showNotification = true, rethrow = false, customMessage = null } = options;
  
  // Extract request details
  const requestDetails = {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.message,
    tenantContext: getTenantContext()
  };
  
  // Add response data for more detailed debugging
  if (error.response?.data) {
    requestDetails.responseData = error.response.data;
  }
  
  // Log detailed error information
  logger.error('[ApiService] Request failed:', requestDetails);
  
  // Categorize errors for better user feedback
  let userMessage = customMessage || 'An error occurred while processing your request.';
  let errorType = 'error';
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    userMessage = customMessage || 'Request timed out. The server is taking too long to respond.';
    errorType = 'warning';
  } else if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response.status === 401 || error.response.status === 403) {
      userMessage = customMessage || 'Authentication error. Please login again.';
      errorType = 'warning';
    } else if (error.response.status === 404) {
      userMessage = customMessage || 'Resource not found.';
      errorType = 'info';
    } else if (error.response.status >= 500) {
      userMessage = customMessage || 'Server error. Please try again later.';
      errorType = 'error';
    }
  } else if (error.request) {
    // The request was made but no response was received
    userMessage = customMessage || 'No response received from server. Please check your connection.';
    errorType = 'warning';
  }
  
  // Show notification if enabled
  if (showNotification) {
    // Implementation of notification display depends on the notification system used
    // This could be calling a toast notification service, Redux action, etc.
    // For now, we just log it
    logger.warn(userMessage);
  }
  
  // If fallback data is provided, return it instead of throwing
  if (fallbackData !== null) {
    return fallbackData;
  }
  
  // Rethrow the error if requested
  if (rethrow) {
    throw error;
  }
  
  // Default return null
  return null;
};

// Removed normalizeEndpoint function - Django APPEND_SLASH=True handles trailing slashes automatically
// Adding trailing slashes causes unnecessary 308 redirects that can corrupt POST request bodies

/**
 * Generate a cache key from endpoint and parameters
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {string} - Cache key
 */
const generateCacheKey = (endpoint, params = {}) => {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  
  // Sort parameters to ensure consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
};

/**
 * Fetch data from an API endpoint with caching and tenant context
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const fetchData = async (endpoint, options = {}) => {
  const {
    useCache = true,
    cacheTTL = null,
    params = {},
    headers = {},
    fallbackData = null,
    showErrorNotification = true,
    timeout = 30000,
    forceRefresh = false,
    tenantOverride = null,
    customMessage,
    notify = true,
    skipAuthCheck = false,
    maxRetries = 2,
    enableRetry = true
  } = options;
  
  try {
    logger.debug(`[ApiService] Fetching ${endpoint}`, { 
      useCache, 
      forceRefresh,
      tenantOverride: tenantOverride ? 'custom' : 'default'
    });
    
    // Get data from cache first if allowed
    if (useCache && !forceRefresh) {
      const cacheKey = generateCacheKey(endpoint, params);
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        logger.debug(`[ApiService] Cache hit for ${cacheKey}`);
        return cachedData;
      }
      logger.debug(`[ApiService] Cache miss for ${cacheKey}`);
    }
    
    // Add tenant headers
    const tenantHeaders = tenantOverride 
      ? { 'X-Tenant-ID': tenantOverride }
      : getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.get(endpoint, {
      params,
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract and save tenant info from response headers if present
    extractTenantFromResponse(response);
    
    // Store in cache if caching is enabled
    if (useCache && response.data) {
      const cacheKey = generateCacheKey(endpoint, params);
      dataCache.set(cacheKey, response.data, cacheTTL);
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: false,
      customMessage
    });
  }
};

/**
 * Shorthand function for GET requests
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const fetch = (endpoint, options = {}) => {
  return fetchData(endpoint, options);
};

/**
 * Send data to an API endpoint (POST request)
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const postData = async (endpoint, data = {}, options = {}) => {
  const {
    headers = {},
    fallbackData = null,
    showErrorNotification = true,
    invalidateCache = true,
    timeout = 30000,
    tenantOverride = null,
    customMessage,
    maxRetries = 1,
    enableRetry = false
  } = options;
  
  try {
    logger.debug(`[ApiService] Posting to ${endpoint}`);
    
    // Add tenant headers
    const tenantHeaders = tenantOverride 
      ? { 'X-Tenant-ID': tenantOverride }
      : getRequestTenantHeaders();
    
    // Prepare request config
    const config = {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    };
    
    // Make the request with retry capability
    let response;
    if (enableRetry && maxRetries > 0) {
      response = await retryRequest(() => axiosInstance.post(endpoint, data, config), maxRetries);
    } else {
      response = await axiosInstance.post(endpoint, data, config);
    }
    
    // Extract and save tenant info from response headers if present
    extractTenantFromResponse(response);
    
    // Invalidate cache if requested
    if (invalidateCache) {
      dataCache.invalidateStartingWith(endpoint);
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: false,
      customMessage
    });
  }
};

/**
 * Shorthand function for POST requests
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const post = (endpoint, data = {}, options = {}) => {
  return postData(endpoint, data, options);
};

/**
 * Update data at an API endpoint (PUT request)
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const putData = async (endpoint, data = {}, options = {}) => {
  const {
    headers = {},
    fallbackData = null,
    showErrorNotification = true,
    invalidateCache = true,
    timeout = 30000,
    tenantOverride = null,
    customMessage
  } = options;
  
  try {
    logger.debug(`[ApiService] Putting to ${endpoint}`);
    
    // Add tenant headers
    const tenantHeaders = tenantOverride 
      ? { 'X-Tenant-ID': tenantOverride }
      : getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.put(endpoint, data, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract and save tenant info from response headers if present
    extractTenantFromResponse(response);
    
    // Invalidate cache if requested
    if (invalidateCache) {
      dataCache.invalidateStartingWith(endpoint);
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: false,
      customMessage
    });
  }
};

/**
 * Shorthand function for PUT requests
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const put = (endpoint, data = {}, options = {}) => {
  return putData(endpoint, data, options);
};

/**
 * Verify tenant context exists and set it
 * @returns {Promise<boolean>} - Whether tenant context verification succeeded
 */
export const verifyTenantContext = async () => {
  const tenantContext = getTenantContext();
  
  if (tenantContext && tenantContext.tenantId) {
    logger.debug(`[ApiService] Tenant context verified: ${tenantContext.tenantId}`);
    return true;
  }
  
  // No tenant context, attempt to get from saved preferences
  const savedTenantId = getTenantId();
  
  if (savedTenantId) {
    logger.debug(`[ApiService] Setting tenant ID from saved preferences: ${savedTenantId}`);
    await setTenantId(savedTenantId);
    return true;
  }
  
  logger.warn('[ApiService] No tenant context available');
  return false;
};

/**
 * Set tenant ID for future requests
 * @param {string} tenantId - The tenant ID to set
 */
export const setTenantId = async (tenantId) => {
  if (!tenantId) {
    logger.warn('[ApiService] Attempted to set empty tenant ID');
    return;
  }
  
  // Set in the tenant context
  setTenantContext({
    tenantId,
    schemaName: getSchemaName(tenantId)
  });
  
  logger.debug(`[ApiService] Tenant ID set: ${tenantId}`);
};

/**
 * Get tenant headers for requests
 * @returns {Object} - Headers object with tenant information
 */
export const getRequestTenantHeaders = () => {
  return {};
};

/**
 * Get the current tenant from the API
 * @returns {Promise<Object>} Current tenant data
 */
export const getCurrentTenant = async () => {
  try {
    const response = await axiosInstance.get('/api/tenant/current/');
    return response.data;
  } catch (error) {
    logger.error('[ApiService] Error getting current tenant:', error);
    return null;
  }
};

/**
 * Get authentication tokens
 * @returns {Promise<Object>} Authentication tokens
 */
export const getAuthTokens = async () => {
  try {
    // Initialize global cache if needed
    if (typeof window !== 'undefined') {
      if (!appCache.getAll()) appCache.init();
      if (!appCache.get('auth')) appCache.set('auth', {});
      
      // Get tokens from AppCache only
      const { accessToken, idToken } = appCache.getAll().auth;
      
      if (accessToken && idToken) {
        return { accessToken, idToken };
      }
    }
    
    return null;
  } catch (error) {
    logger.error('[ApiService] Error getting auth tokens:', error);
    return null;
  }
};

/**
 * Log out the user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await axiosInstance.post('/api/auth/logout/');
    
    // Clear auth tokens from AppCache
    if (typeof window !== 'undefined') {
      if (!appCache.getAll()) appCache.init();
      if (!appCache.get('auth')) appCache.set('auth', {});
      appCache.set('auth.accessToken', null);
      appCache.set('auth.idToken', null);
      appCache.set('auth.refreshToken', null);
    }
  } catch (error) {
    logger.error('[ApiService] Error logging out:', error);
    throw error;
  }
};

// Create a default export with all service methods
const apiService = {
  handleApiError,
  fetchData,
  fetch,
  postData,
  post,
  putData,
  put,
  verifyTenantContext,
  setTenantId,
  getRequestTenantHeaders,
  getCurrentTenant,
  getAuthTokens,
  logout
};

// Export as default for imports like: import apiService from './apiService'
export default apiService;