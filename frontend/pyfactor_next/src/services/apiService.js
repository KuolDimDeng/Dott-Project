import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTenantContext, extractTenantFromResponse } from '@/utils/tenantContext';
import { dataCache } from '@/utils/enhancedCache';

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
  const { fallbackData = null, showNotification = true, rethrow = false } = options;
  
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
  let userMessage = 'An error occurred while processing your request.';
  let errorType = 'error';
  
  if (error.response) {
    // Server responded with an error status
    if (error.response.status === 401 || error.response.status === 403) {
      userMessage = 'You do not have permission to access this resource.';
      errorType = 'permission';
    } else if (error.response.status === 404) {
      userMessage = 'The requested resource was not found.';
      errorType = 'not_found';
    } else if (error.response.status === 409) {
      userMessage = 'A conflict occurred with your request.';
      errorType = 'conflict';
    } else if (error.response.status >= 500) {
      userMessage = 'A server error occurred. Please try again later.';
      errorType = 'server';
    }
    
    // Use error message from response if available
    if (error.response.data && error.response.data.message) {
      userMessage = error.response.data.message;
    } else if (error.response.data && error.response.data.error) {
      userMessage = error.response.data.error;
    }
  } else if (error.request) {
    // Request was made but no response received
    userMessage = 'No response received from server. Please check your connection.';
    errorType = 'network';
  }
  
  // Show notification if enabled
  if (showNotification && typeof window !== 'undefined') {
    // Use a notification system if available
    if (window.notifyUser) {
      window.notifyUser(userMessage, 'error');
    } else {
      console.error(userMessage);
    }
  }
  
  // Create standardized error object
  const standardError = {
    message: userMessage,
    type: errorType,
    original: error,
    details: requestDetails
  };
  
  // Rethrow if requested
  if (rethrow) {
    throw standardError;
  }
  
  // Return fallback data or error object
  return fallbackData !== null ? fallbackData : standardError;
};

/**
 * Make a GET request with tenant context
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const fetchData = async (endpoint, options = {}) => {
  const {
    params = {},
    headers = {},
    useCache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    cacheKey = null,
    fallbackData = null,
    showErrorNotification = true,
    timeout = 8000
  } = options;
  
  // Generate cache key if caching is enabled
  const effectiveCacheKey = cacheKey || endpoint;
  
  // Try to get from cache first if enabled
  if (useCache) {
    const cachedData = dataCache.get(effectiveCacheKey, params);
    if (cachedData) {
      logger.debug(`[ApiService] Cache hit for ${endpoint}`);
      return cachedData;
    }
  }
  
  try {
    logger.debug(`[ApiService] Fetching ${endpoint}`, { params });
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.get(endpoint, {
      params,
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract tenant info from response if available
    extractTenantFromResponse(response);
    
    // Cache successful responses if enabled
    if (useCache && response.data) {
      dataCache.set(effectiveCacheKey, response.data, params, cacheTTL);
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: !fallbackData
    });
  }
};

/**
 * Make a POST request with tenant context
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const postData = async (endpoint, data = {}, options = {}) => {
  const {
    headers = {},
    invalidateCache = [],
    fallbackData = null,
    showErrorNotification = true,
    timeout = 15000
  } = options;
  
  try {
    logger.debug(`[ApiService] Posting to ${endpoint}`, { dataKeys: Object.keys(data) });
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.post(endpoint, data, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract tenant info from response if available
    extractTenantFromResponse(response);
    
    // Invalidate cache patterns if specified
    if (invalidateCache.length > 0) {
      invalidateCache.forEach(pattern => {
        dataCache.invalidatePattern(pattern);
      });
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: !fallbackData
    });
  }
};

/**
 * Make a PUT request with tenant context
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const putData = async (endpoint, data = {}, options = {}) => {
  const {
    headers = {},
    invalidateCache = [],
    fallbackData = null,
    showErrorNotification = true,
    timeout = 15000
  } = options;
  
  try {
    logger.debug(`[ApiService] Putting to ${endpoint}`, { dataKeys: Object.keys(data) });
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.put(endpoint, data, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract tenant info from response if available
    extractTenantFromResponse(response);
    
    // Invalidate cache patterns if specified
    if (invalidateCache.length > 0) {
      invalidateCache.forEach(pattern => {
        dataCache.invalidatePattern(pattern);
      });
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: !fallbackData
    });
  }
};

/**
 * Make a DELETE request with tenant context
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const deleteData = async (endpoint, options = {}) => {
  const {
    headers = {},
    params = {},
    invalidateCache = [],
    fallbackData = null,
    showErrorNotification = true,
    timeout = 15000
  } = options;
  
  try {
    logger.debug(`[ApiService] Deleting ${endpoint}`);
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.delete(endpoint, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      params,
      timeout
    });
    
    // Invalidate cache patterns if specified
    if (invalidateCache.length > 0) {
      invalidateCache.forEach(pattern => {
        dataCache.invalidatePattern(pattern);
      });
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      rethrow: !fallbackData
    });
  }
};

/**
 * Prefetch data for common endpoints
 * @param {Array} endpoints - Array of endpoints to prefetch
 */
export const prefetchCommonData = async (endpoints = []) => {
  if (!endpoints.length) {
    endpoints = [
      '/api/user/profile',
      '/api/settings'
    ];
  }
  
  logger.debug('[ApiService] Prefetching common data');
  
  // Use Promise.allSettled to fetch all endpoints in parallel
  // and continue even if some fail
  await Promise.allSettled(
    endpoints.map(endpoint => 
      fetchData(endpoint, {
        showErrorNotification: false,
        cacheTTL: 10 * 60 * 1000 // 10 minutes
      })
    )
  );
};

/**
 * Check the status of a background task
 * @param {string} taskId - The ID of the task to check
 * @param {Object} options - Request options
 * @returns {Promise<any>} Task status data
 */
export const checkTaskStatus = async (taskId, options = {}) => {
  if (!taskId) {
    logger.error('[ApiService] Task ID is required for status check');
    return { status: 'error', message: 'Task ID is required' };
  }
  
  const {
    showErrorNotification = false,
    pollInterval = 0, // If > 0, will poll until task completes or fails
    maxPolls = 10,    // Maximum number of polling attempts
    onProgress = null // Optional callback for progress updates
  } = options;
  
  // Function to perform a single status check
  const checkOnce = async () => {
    try {
      const endpoint = `/api/onboarding/setup-status/${taskId}/`;
      logger.debug(`[ApiService] Checking task status: ${taskId}`);
      
      const response = await fetchData(endpoint, {
        useCache: false, // Always get fresh status
        showErrorNotification,
        timeout: 5000 // Short timeout for status checks
      });
      
      // Call progress callback if provided
      if (onProgress && typeof onProgress === 'function') {
        onProgress(response);
      }
      
      return response;
    } catch (error) {
      return handleApiError(error, {
        fallbackData: { status: 'error', message: 'Failed to check task status' },
        showNotification: showErrorNotification,
        rethrow: false
      });
    }
  };
  
  // If polling is not requested, just check once
  if (!pollInterval || pollInterval <= 0) {
    return checkOnce();
  }
  
  // Polling implementation
  let pollCount = 0;
  let lastStatus = null;
  
  while (pollCount < maxPolls) {
    const statusData = await checkOnce();
    lastStatus = statusData;
    
    // If task is complete or failed, stop polling
    if (['complete', 'success', 'failed', 'error'].includes(statusData.status)) {
      break;
    }
    
    // Wait for the specified interval before checking again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    pollCount++;
  }
  
  return lastStatus;
};

/**
 * Get the tenant headers (internal helper function)
 * @returns {Object} The tenant headers
 */
const getRequestTenantHeaders = () => {
  // Get tenant context directly
  try {
    const context = getTenantContext();
    const { tenantId, schemaName } = context;
    
    logger.debug('[ApiService] Getting tenant headers:', { 
      tenantId: tenantId || 'null', 
      schemaName: schemaName || 'null' 
    });
    
    const headers = {};
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    if (schemaName) {
      headers['X-Schema-Name'] = schemaName;
    }
    
    return headers;
  } catch (error) {
    logger.error('[ApiService] Error getting tenant headers:', error);
    return {};
  }
};

/**
 * Get the tenant headers for external use (exported for diagnostics)
 * @returns {Object} The tenant headers
 */
export const getDebugTenantHeaders = () => {
  return getRequestTenantHeaders();
};

/**
 * Check if tenant context is properly set up
 * @returns {Object} Tenant verification result
 */
export const verifyTenantContext = async () => {
  try {
    // Try to get from auth store
    const { getTenantContext } = await import('@/utils/tenantContext');
    const { tenantId, schemaName } = getTenantContext();
    
    // Try to get from tenantUtils as fallback
    let fallbackTenantId = null;
    let fallbackSchema = null;
    
    try {
      const { getTenantId, getSchemaName } = await import('@/utils/tenantUtils');
      fallbackTenantId = getTenantId();
      fallbackSchema = getSchemaName();
    } catch (e) {
      logger.error('[ApiService] Error getting fallback tenant info:', e);
    }
    
    // Check localStorage directly
    let localStorageTenantId = null;
    if (typeof window !== 'undefined') {
      localStorageTenantId = localStorage.getItem('tenantId');
    }
    
    // Check cookie directly
    let cookieTenantId = null;
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find(cookie => cookie.trim().startsWith('tenantId='));
      if (tenantCookie) {
        cookieTenantId = tenantCookie.split('=')[1].trim();
      }
    }
    
    const result = {
      fromContext: { tenantId, schemaName },
      fromFallback: { tenantId: fallbackTenantId, schemaName: fallbackSchema },
      fromLocalStorage: localStorageTenantId,
      fromCookie: cookieTenantId,
      isValid: !!tenantId || !!fallbackTenantId || !!localStorageTenantId || !!cookieTenantId
    };
    
    logger.debug('[ApiService] Tenant verification result:', result);
    return result;
  } catch (error) {
    logger.error('[ApiService] Error verifying tenant context:', error);
    return { isValid: false, error: error.message };
  }
};

/**
 * Set the tenant ID explicitly across all storage mechanisms
 * @param {string} tenantId - The tenant ID to set
 * @returns {boolean} Whether the operation was successful
 */
export const setTenantId = async (tenantId) => {
  if (!tenantId) {
    logger.error('[ApiService] Cannot set empty tenant ID');
    return false;
  }
  
  logger.debug(`[ApiService] Setting tenant ID to: ${tenantId}`);
  
  try {
    // 1. Set in auth store via tenantContext
    try {
      const { setTenantContext } = await import('@/utils/tenantContext');
      setTenantContext(tenantId);
      logger.debug('[ApiService] Set tenant ID in auth store');
    } catch (e) {
      logger.error('[ApiService] Error setting tenant in context:', e);
    }
    
    // 2. Set in localStorage directly
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
      logger.debug('[ApiService] Set tenant ID in localStorage');
    }
    
    // 3. Set in cookie directly
    if (typeof document !== 'undefined') {
      document.cookie = `tenantId=${tenantId}; path=/; max-age=31536000`; // 1 year
      logger.debug('[ApiService] Set tenant ID in cookie');
    }
    
    // 4. Set in userData if it exists
    if (typeof localStorage !== 'undefined') {
      try {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData) {
            userData['custom:businessid'] = tenantId;
            localStorage.setItem('userData', JSON.stringify(userData));
            logger.debug('[ApiService] Updated tenant ID in userData');
          }
        }
      } catch (error) {
        logger.error('[ApiService] Error updating userData with tenant ID:', error);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('[ApiService] Error setting tenant ID:', error);
    return false;
  }
};

// Export a default object with all methods
export const apiService = {
  fetch: fetchData,
  post: postData,
  put: putData,
  delete: deleteData,
  handleError: handleApiError,
  prefetchCommonData,
  checkTaskStatus,
  getTenantHeaders: getDebugTenantHeaders, // Use the renamed function
  verifyTenantContext,
  setTenantId
};

export default apiService;