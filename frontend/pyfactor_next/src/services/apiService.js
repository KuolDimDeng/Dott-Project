import { axiosInstance, retryRequest } from '@/lib/axiosConfig';
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

/**
 * Ensure endpoint has a trailing slash for Django
 * @param {string} endpoint - API endpoint
 * @returns {string} - Endpoint with trailing slash
 */
const normalizeEndpoint = (endpoint) => {
  // Don't add trailing slash to URLs with file extensions, download or print URLs
  const skipTrailingSlash = endpoint.includes('.') || 
                          endpoint.includes('download') || 
                          endpoint.includes('print');
  
  if (skipTrailingSlash || endpoint.endsWith('/')) {
    return endpoint;
  }
  
  return `${endpoint}/`;
};

// Helper function to check if the current path is an onboarding route that should use lenient access
const isLenientAccessRoute = (pathname) => {
  if (!pathname) return false;
  
  // Onboarding routes should have lenient access
  if (pathname.startsWith('/onboarding/')) {
    return true;
  }
  
  // Verification routes should also have lenient access
  if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
    return true;
  }
  
  return false;
};

// Helper to check if an API endpoint is a profile or lenient endpoint
const isLenientEndpoint = (endpoint) => {
  if (!endpoint) return false;
  
  // User profile endpoint should have lenient access
  if (endpoint.includes('/api/user/profile')) {
    return true;
  }
  
  // Onboarding endpoints should have lenient access
  if (endpoint.includes('/api/onboarding/')) {
    return true;
  }
  
  return false;
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
    // Ensure endpoint ends with trailing slash for Django
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    
    logger.debug(`[ApiService] Fetching ${normalizedEndpoint}`, { 
      useCache, 
      forceRefresh,
      tenantOverride: tenantOverride ? 'custom' : 'default'
    });
    
    // Get data from cache first if allowed
    if (useCache && !forceRefresh) {
      const cachedData = dataCache.get(normalizedEndpoint, params);
      if (cachedData) {
        logger.debug(`[ApiService] Cache hit for ${normalizedEndpoint}`);
        return cachedData;
      }
      logger.debug(`[ApiService] Cache miss for ${normalizedEndpoint}`);
    }
    
    // Check if this is a lenient access route or endpoint
    const isLenientRoute = typeof window !== 'undefined' && isLenientAccessRoute(window.location.pathname);
    const isLenientApiEndpoint = isLenientEndpoint(normalizedEndpoint);
    const shouldUseLenientAccess = isLenientRoute || isLenientApiEndpoint || skipAuthCheck;
    
    // Add tenant headers
    const tenantHeaders = tenantOverride 
      ? { 'X-Tenant-ID': tenantOverride }
      : getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.get(normalizedEndpoint, {
      params,
      headers: {
        ...tenantHeaders,
        ...headers,
        // Add a header to indicate this is a lenient route request
        ...(shouldUseLenientAccess ? { 
          'X-Lenient-Access': 'true',
          'X-Allow-Partial': 'true'
        } : {})
      },
      timeout: timeout || 30000
    });
    
    // Extract tenant info from response
    extractTenantFromResponse(response);
    
    // Cache the data if needed
    if (useCache) {
      dataCache.set(normalizedEndpoint, params, response.data, cacheTTL);
    }
    
    return response.data;
  } catch (error) {
    // Get tenant headers for potential retry (need to define here since it may not be available in the try block scope)
    const tenantHeaders = tenantOverride 
      ? { 'X-Tenant-ID': tenantOverride }
      : getRequestTenantHeaders();
    
    // Check if it's a timeout error and we should retry
    if (enableRetry && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
      try {
        logger.warn(`[ApiService] Request timed out for ${endpoint}, attempting retry...`);
        
        // Create retry config based on the original request
        const retryConfig = {
          url: normalizeEndpoint(endpoint),
          method: 'get',
          params,
          headers: {
            ...tenantHeaders,
            ...headers,
            ...(shouldUseLenientAccess ? { 
              'X-Lenient-Access': 'true',
              'X-Allow-Partial': 'true'
            } : {})
          },
          timeout,
          maxRetries
        };
        
        // Attempt to retry the request
        const retryResponse = await retryRequest(retryConfig);
        
        // Update cache if needed
        if (useCache && cacheTTL !== null && retryResponse.data) {
          dataCache.set(normalizedEndpoint, params, retryResponse.data, cacheTTL);
        }
        
        // Extract tenant info if present
        const extractedTenant = extractTenantFromResponse(retryResponse);
        if (extractedTenant) {
          logger.debug('[ApiService] Extracted tenant from retry response:', extractedTenant);
        }
        
        return retryResponse.data;
      } catch (retryError) {
        logger.error('[ApiService] All retry attempts failed:', { 
          url: endpoint, 
          error: retryError.message 
        });
        // Fall through to normal error handling
      }
    }
    
    return handleApiError(error, {
      fallbackData,
      showNotification: showErrorNotification,
      customMessage
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
    timeout = 30000,
    maxRetries = 2,
    enableRetry = true
  } = options;
  
  try {
    // Ensure endpoint ends with trailing slash for Django
    const originalEndpoint = endpoint;
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    
    logger.debug(`[ApiService] Posting to ${normalizedEndpoint}`, { 
      originalUrl: originalEndpoint,
      normalizedUrl: normalizedEndpoint,
      dataKeys: Object.keys(data),
      endpointLength: endpoint.length,
      normalizedLength: normalizedEndpoint.length,
      endsWithSlash: endpoint.endsWith('/')
    });
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.post(normalizedEndpoint, data, {
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
    // Get tenant headers for potential retry
    const tenantHeaders = getRequestTenantHeaders();
    
    // Check if it's a timeout error and we should retry
    if (enableRetry && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
      try {
        logger.warn(`[ApiService] POST request timed out for ${endpoint}, attempting retry...`);
        
        // Create retry config based on the original request
        const retryConfig = {
          url: normalizeEndpoint(endpoint),
          method: 'post',
          data,
          params: {},
          headers: {
            ...tenantHeaders,
            ...headers,
          },
          timeout,
          maxRetries
        };
        
        // Attempt to retry the request
        const retryResponse = await retryRequest(retryConfig);
        
        // Extract tenant info if present
        const extractedTenant = extractTenantFromResponse(retryResponse);
        if (extractedTenant) {
          logger.debug('[ApiService] Extracted tenant from retry response:', extractedTenant);
        }
        
        return retryResponse.data;
      } catch (retryError) {
        logger.error('[ApiService] All retry attempts failed:', { 
          url: endpoint, 
          error: retryError.message 
        });
        // Fall through to normal error handling
      }
    }
    
    logger.error('[ApiService] POST request failed:', {
      endpoint,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
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
    timeout = 30000,
    maxRetries = 2,
    enableRetry = true
  } = options;
  
  try {
    // Ensure endpoint ends with trailing slash for Django
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    
    logger.debug(`[ApiService] Putting to ${normalizedEndpoint}`, { dataKeys: Object.keys(data) });
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.put(normalizedEndpoint, data, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract tenant info from response if available
    extractTenantFromResponse(response);
    
    // Invalidate cache if specified
    if (invalidateCache.length > 0) {
      invalidateCache.forEach(pattern => {
        dataCache.invalidatePattern(pattern);
      });
    }
    
    return response.data;
  } catch (error) {
    // Get tenant headers for potential retry
    const tenantHeaders = getRequestTenantHeaders();
    
    // Check if it's a timeout error and we should retry
    if (enableRetry && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
      try {
        logger.warn(`[ApiService] PUT request timed out for ${endpoint}, attempting retry...`);
        
        // Create retry config based on the original request
        const retryConfig = {
          url: normalizeEndpoint(endpoint),
          method: 'put',
          data,
          headers: {
            ...tenantHeaders,
            ...headers,
          },
          timeout,
          maxRetries
        };
        
        // Attempt to retry the request
        const retryResponse = await retryRequest(retryConfig);
        
        // Extract tenant info if present
        const extractedTenant = extractTenantFromResponse(retryResponse);
        if (extractedTenant) {
          logger.debug('[ApiService] Extracted tenant from retry response:', extractedTenant);
        }
        
        return retryResponse.data;
      } catch (retryError) {
        logger.error('[ApiService] All retry attempts failed:', { 
          url: endpoint, 
          error: retryError.message 
        });
        // Fall through to normal error handling
      }
    }
    
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
    invalidateCache = [],
    fallbackData = null,
    showErrorNotification = true,
    timeout = 30000,
    maxRetries = 2,
    enableRetry = true
  } = options;
  
  try {
    // Ensure endpoint ends with trailing slash for Django
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    
    logger.debug(`[ApiService] Deleting ${normalizedEndpoint}`);
    
    // Add tenant headers
    const tenantHeaders = getRequestTenantHeaders();
    
    // Make the request
    const response = await axiosInstance.delete(normalizedEndpoint, {
      headers: {
        ...tenantHeaders,
        ...headers
      },
      timeout
    });
    
    // Extract tenant info from response if available
    extractTenantFromResponse(response);
    
    // Invalidate cache if specified
    if (invalidateCache.length > 0) {
      invalidateCache.forEach(pattern => {
        dataCache.invalidatePattern(pattern);
      });
    }
    
    return response.data;
  } catch (error) {
    // Get tenant headers for potential retry
    const tenantHeaders = getRequestTenantHeaders();
    
    // Check if it's a timeout error and we should retry
    if (enableRetry && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
      try {
        logger.warn(`[ApiService] DELETE request timed out for ${endpoint}, attempting retry...`);
        
        // Create retry config based on the original request
        const retryConfig = {
          url: normalizeEndpoint(endpoint),
          method: 'delete',
          headers: {
            ...tenantHeaders,
            ...headers,
          },
          timeout,
          maxRetries
        };
        
        // Attempt to retry the request
        const retryResponse = await retryRequest(retryConfig);
        
        // Extract tenant info if present
        const extractedTenant = extractTenantFromResponse(retryResponse);
        if (extractedTenant) {
          logger.debug('[ApiService] Extracted tenant from retry response:', extractedTenant);
        }
        
        return retryResponse.data;
      } catch (retryError) {
        logger.error('[ApiService] All retry attempts failed:', { 
          url: endpoint, 
          error: retryError.message 
        });
        // Fall through to normal error handling
      }
    }
    
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
    // First try to get from explicit context
    const context = getTenantContext();
    let { tenantId, schemaName } = context;
    
    // If not found in context, try localStorage
    if (!tenantId && typeof window !== 'undefined') {
      tenantId = localStorage.getItem('tenantId');
      logger.debug('[ApiService] Found tenant ID in localStorage:', tenantId);
    }
    
    // If not found in localStorage, try cookies
    if (!tenantId && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find(cookie => cookie.trim().startsWith('tenantId='));
      if (tenantCookie) {
        tenantId = tenantCookie.split('=')[1].trim();
        logger.debug('[ApiService] Found tenant ID in cookie:', tenantId);
      }
    }
    
    // Generate schema name if we have tenant ID but no schema name
    if (tenantId && !schemaName) {
      schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      logger.debug('[ApiService] Generated schema name from tenant ID:', schemaName);
    }
    
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
    
    // Also add business ID header for compatibility
    if (tenantId) {
      headers['X-Business-ID'] = tenantId;
    }
    
    return headers;
  } catch (error) {
    logger.error('[ApiService] Error getting tenant headers:', error);
    
    // Fallback approach - try to get from localStorage directly
    try {
      if (typeof window !== 'undefined') {
        const tenantId = localStorage.getItem('tenantId');
        if (tenantId) {
          const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
          logger.debug('[ApiService] Fallback: Using tenant ID from localStorage:', tenantId);
          
          return {
            'X-Tenant-ID': tenantId,
            'X-Schema-Name': schemaName,
            'X-Business-ID': tenantId
          };
        }
      }
    } catch (e) {
      logger.error('[ApiService] Fallback tenant header retrieval failed:', e);
    }
    
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

/**
 * Get current authentication tokens
 * @returns {Object|null} Object containing accessToken and idToken, or null if not available
 */
export const getAuthTokens = async () => {
  try {
    // First try to get tokens from localStorage
    let accessToken = null;
    let idToken = null;
    
    if (typeof window !== 'undefined') {
      // Try different possible storage keys
      accessToken = localStorage.getItem('accessToken') || 
                    localStorage.getItem('pyfactor_access_token') || 
                    localStorage.getItem('access_token');
                    
      idToken = localStorage.getItem('idToken') || 
                localStorage.getItem('pyfactor_id_token') || 
                localStorage.getItem('id_token');
      
      // Log what we found (without revealing the full tokens)
      if (accessToken) {
        logger.debug('[ApiService] Found access token in localStorage');
      }
      
      if (idToken) {
        logger.debug('[ApiService] Found ID token in localStorage');
      }
    }
    
    // If not in localStorage, try cookies
    if ((!accessToken || !idToken) && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'accessToken' || name === 'pyfactor_access_token' || name === 'access_token') {
          accessToken = value;
          logger.debug('[ApiService] Found access token in cookies');
        } else if (name === 'idToken' || name === 'pyfactor_id_token' || name === 'id_token') {
          idToken = value;
          logger.debug('[ApiService] Found ID token in cookies');
        }
      }
    }
    
    // Return tokens if we found them
    if (accessToken) {
      return {
        accessToken,
        idToken
      };
    }
    
    // Last resort: try to refresh tokens
    try {
      // Assuming there's a refresh function already implemented
      if (typeof refreshTokens === 'function') {
        logger.debug('[ApiService] Attempting to refresh tokens');
        await refreshTokens();
        
        // Try again after refresh
        return await getAuthTokens();
      }
    } catch (refreshError) {
      logger.error('[ApiService] Error refreshing tokens:', refreshError);
    }
    
    logger.warn('[ApiService] No authentication tokens found');
    return null;
  } catch (error) {
    logger.error('[ApiService] Error getting auth tokens:', error);
    return null;
  }
};

/**
 * Get current tenant for the authenticated user
 * @returns {Promise<Object>} Current tenant information
 */
export const getCurrentTenant = async () => {
  try {
    logger.debug('[ApiService] Getting current tenant for user');
    
    const response = await axiosInstance.get('/api/tenant/current/');
    logger.debug('[ApiService] Retrieved current tenant:', {
      id: response.data?.id,
      hasSchema: !!response.data?.schema_name
    });
    
    return response.data;
  } catch (error) {
    logger.error('[ApiService] Error getting current tenant:', error);
    return null;
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
  setTenantId,
  getAuthTokens,
  getCurrentTenant
};

export default apiService;