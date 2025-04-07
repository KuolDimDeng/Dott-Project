/**
 * Utility functions for API requests
 */
import { logger } from './logger';
import axiosInstance from './axiosInstance';

// Request cache for throttling duplicate requests
const requestCache = new Map();
const REQUEST_CACHE_TTL = 60000; // 1 minute cache time
const TENANT_ENDPOINT_CACHE_TTL = 300000; // 5 minutes for tenant endpoints

// Add list of endpoints that should use longer cache TTL
const LONG_CACHE_ENDPOINTS = [
  '/api/tenant/list',
  '/api/tenant/info',
  '/api/services',
  '/api/products',
  '/api/customers'
];

/**
 * Gets standardized headers for API requests
 * Handles development mode and authentication bypassing
 */
export const getApiHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  };
  
  // Add timestamp to prevent caching
  headers['X-Request-Time'] = Date.now().toString();
  
  try {
    // Include idToken if available
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
  } catch (error) {
    // Fall back to basic headers if there's an error
    logger.warn('[apiHelpers] Error adding auth headers', error);
  }
  
  return headers;
};

/**
 * Get a cached response for a request if available
 * @param {string} cacheKey - The cache key for the request
 * @returns {Object|null} - The cached response or null
 */
const getCachedResponse = (cacheKey) => {
  if (!cacheKey) return null;
  
  const cached = requestCache.get(cacheKey);
  if (!cached) return null;
  
  const { data, timestamp, ttl } = cached;
  const now = Date.now();
  
  // Check if the cache is still valid
  if (now - timestamp < ttl) {
    logger.debug(`[ApiRequest] Using cached response for ${cacheKey}`);
    return data;
  }
  
  // Cache expired, remove it
  requestCache.delete(cacheKey);
  return null;
};

/**
 * Makes a standardized API request with proper headers and error handling
 */
export const apiRequest = async (method, endpoint, data = null, params = {}) => {
  try {
    // Get tenant ID from localStorage or use default
    let tenantId = localStorage.getItem('tenantId') || 'default';
    
    // Ensure tenant ID is properly formatted for schema name
    if (tenantId) {
      // Check for masked tenant ID format and try to get proper tenant ID
      if (tenantId.includes('----') || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.warn('[ApiRequest] Found invalid tenant ID format. Using proper ID from localStorage if available.');
        
        // Try to get actual tenant ID from localStorage proper_tenant_id
        const properTenantId = localStorage.getItem('proper_tenant_id');
        if (properTenantId && properTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log('[ApiRequest] Using proper tenant ID from storage:', properTenantId);
          tenantId = properTenantId;
          
          // Update the main tenantId in localStorage
          localStorage.setItem('tenantId', tenantId);
        } else {
          // If no proper ID available, just use the schema without tenant ID validation
          // The server endpoints will handle this by using a default schema
          console.warn('[ApiRequest] No proper tenant ID found, continuing with existing ID');
        }
      }
    }
    
    // Format schema name - ensure it uses underscores instead of dashes
    const schemaName = tenantId ? `tenant_${tenantId.replace(/-/g, '_')}` : 'public';
    
    // Add schema parameter if not already in params
    if (!params.schema) {
      params.schema = schemaName;
    }
    
    // Add tenant ID to params for server-side RLS policies
    if (!params.tenantId && tenantId) {
      params.tenantId = tenantId;
    }
    
    // For GET requests, check the cache first
    if (method.toLowerCase() === 'get') {
      // Create a cache key based on endpoint and params
      const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
      
      // Determine TTL based on endpoint
      const isTenantEndpoint = LONG_CACHE_ENDPOINTS.some(e => endpoint.includes(e));
      const cacheTTL = isTenantEndpoint ? TENANT_ENDPOINT_CACHE_TTL : REQUEST_CACHE_TTL;
      
      // Check if we have a cached response
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // No cache, proceed with the request
      const config = {
        method,
        url: endpoint,
        ...(Object.keys(params).length > 0 && { params }),
        timeout: 30000
      };
      
      console.log(`[ApiRequest] ${method} ${endpoint} with schema: ${params.schema}`);
      const response = await axiosInstance(config);
      
      // Cache the response for future requests
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
      
      return response.data;
    }
    
    // For non-GET requests, proceed normally without caching
    const config = {
      method,
      url: endpoint,
      ...(data && { data }),
      ...(Object.keys(params).length > 0 && { params }),
      timeout: 30000
    };
    
    try {
      console.log(`[ApiRequest] ${method} ${endpoint} with schema: ${params.schema}`);
      const response = await axiosInstance(config);
      
      // For mutation operations, invalidate related caches
      if (method.toLowerCase() !== 'get') {
        // Extract base endpoint without ID
        const baseEndpoint = endpoint.replace(/\/[^\/]+$/, '');
        
        // Invalidate all cached requests for this endpoint
        for (const [key, _] of requestCache.entries()) {
          if (key.startsWith(baseEndpoint)) {
            requestCache.delete(key);
            logger.debug(`[ApiRequest] Invalidated cache for ${key}`);
          }
        }
      }
      
      return response.data;
    } catch (apiError) {
      console.log(`[ApiRequest] Error details:`, {
        status: apiError?.response?.status,
        statusText: apiError?.response?.statusText,
        data: apiError?.response?.data,
        message: apiError?.message
      });
      
      // Check for various error types
      const errorMessage = apiError?.response?.data?.message || 
                            apiError?.response?.data?.error || 
                            '';
                            
      // Table doesn't exist error
      const isTableNotExistError = 
        (typeof errorMessage === 'string' && 
          (errorMessage.includes('relation') && errorMessage.includes('does not exist'))) ||
        (apiError?.response?.data?.code === '42P01');
      
      // Connection error to database
      const isConnectionError = 
        apiError?.message?.includes('connect') || 
        errorMessage?.includes('connect') ||
        apiError?.code === 'ECONNREFUSED' ||
        apiError?.code === 'ETIMEDOUT';
      
      // Handle timeout error
      const isTimeoutError = 
        apiError?.message?.includes('timeout') || 
        apiError?.code === 'ECONNABORTED';
      
      // Handle timeout errors - retry with double timeout for critical operations
      if (isTimeoutError && method.toLowerCase() !== 'get') {
        console.log(`[ApiRequest] Request timed out. Retrying with longer timeout for ${endpoint}`);
        try {
          // Retry with longer timeout for important operations (60 seconds)
          const retryConfig = { ...config, timeout: 60000 };
          const retryResponse = await axiosInstance(retryConfig);
          return retryResponse.data;
        } catch (retryError) {
          console.error(`[ApiRequest] Retry also failed:`, retryError);
          throw retryError;
        }
      }
      
      // Handle table doesn't exist error
      if (isTableNotExistError) {
        console.log(`[ApiRequest] Detected missing table in ${endpoint}. Attempting to initialize schema.`);
        
        // For GET requests, we can just return an empty array/object
        if (method.toLowerCase() === 'get') {
          console.log(`[ApiRequest] This is a GET request. Returning empty data.`);
          
          // Try to initialize schema in the background
          try {
            await axiosInstance.post('/api/tenant/initialize-schema', { tenantId });
            console.log(`[ApiRequest] Schema initialization triggered in the background.`);
          } catch (initError) {
            console.error(`[ApiRequest] Failed to initialize schema:`, initError);
          }
          
          // Return empty array or object based on endpoint
          return endpoint.includes('list') ? [] : {};
        }
        
        // For other methods, we need to initialize the schema first, then retry
        try {
          console.log(`[ApiRequest] Initializing schema for tenant ${tenantId}...`);
          await axiosInstance.post('/api/tenant/initialize-schema', { tenantId });
          console.log(`[ApiRequest] Schema initialized. Retrying original request.`);
          
          // Retry the original request after schema initialization
          const retryResponse = await axiosInstance(config);
          return retryResponse.data;
        } catch (initError) {
          console.error(`[ApiRequest] Failed to initialize schema:`, initError);
          throw initError;
        }
      }
      
      // Handle connection errors gracefully
      if (isConnectionError) {
        console.error(`[ApiRequest] Database connection error. AWS RDS may be unavailable.`);
        
        // For GET requests, return empty data
        if (method.toLowerCase() === 'get') {
          return endpoint.includes('list') ? [] : {};
        } else {
          throw {
            error: true,
            message: 'Database connection failed. Please try again later.',
            originalError: apiError
          };
        }
      }
      
      // Re-throw other errors
      throw apiError;
    }
  } catch (error) {
    console.error(`[ApiRequest] Error in ${method} ${endpoint}:`, error);
    
    // Format error message for UI
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      errorMessage = error.response.data?.message || error.response.data?.error || `Error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response received from server. Please check your connection.';
    } else {
      errorMessage = error.message;
    }
    
    // For GET requests, return empty data instead of throwing
    if (method?.toLowerCase() === 'get') {
      console.log(`[ApiRequest] Returning empty data for failed GET request`);
      return endpoint.includes('list') ? [] : {};
    }
    
    throw {
      error: true,
      message: errorMessage,
      originalError: error,
      status: error.response?.status
    };
  }
}; 