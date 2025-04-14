/**
 * Utility functions for API requests
 */
import { logger } from './logger';
import axiosInstance from './axiosInstance';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

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
    // Include idToken if available from AppCache instead of localStorage
    const idToken = getCacheValue('id_token');
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
 * Handle API errors consistently and provide fallback behavior
 * @param {Error} error - The error from axios or API call
 * @param {string} method - HTTP method (GET, POST, etc)
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Request parameters
 * @returns {Object|Array} - Fallback data for GET requests or throws enhanced error
 */
const handleApiError = (error, method, endpoint, params = {}) => {
  // Check if the error is a specific type
  const isNetworkError = error.message?.includes('Network Error') || !error.response;
  const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
  const isAborted = error.message?.includes('aborted');
  
  // Log a meaningful error based on type
  if (isNetworkError) {
    console.error(`[ApiRequest] Network error in ${method} ${endpoint}:`, error.message);
  } else if (isTimeout) {
    console.error(`[ApiRequest] Request timeout in ${method} ${endpoint}:`, error.message);
  } else if (isAborted) {
    console.error(`[ApiRequest] Request aborted in ${method} ${endpoint}:`, error.message);
  } else {
    console.error(`[ApiRequest] Error in ${method} ${endpoint}:`, error);
  }
  
  // Format error message for UI
  const statusCode = error?.response?.status;
  const responseData = error?.response?.data;
  const errorMessage = responseData?.error || responseData?.message || error?.message;
  
  // Specific status code handling
  if (statusCode === 404) {
    console.log(`[ApiRequest] 404 Not Found: ${endpoint}`);
  }
  
  // Database connection errors should suggest restarting the server
  if (errorMessage?.includes('connect ECONNREFUSED') || errorMessage?.includes('Connection error')) {
    console.error('[ApiRequest] Database connection error. Server may need to be restarted.');
  }
  
  // For GET requests, return empty data instead of throwing
  if (method?.toLowerCase() === 'get') {
    console.log(`[ApiRequest] Returning empty data for failed GET request: ${endpoint}`);
    
    // Special handling for critical endpoints
    if (endpoint.includes('/api/products')) {
      // Return minimal mock product data for product endpoints
      console.log('[ApiRequest] Returning fallback mock products data');
      return [
        { id: 'offline-1', name: 'Fallback Product 1', price: 9.99, stock_quantity: 10, is_fallback: true },
        { id: 'offline-2', name: 'Fallback Product 2', price: 19.99, stock_quantity: 5, is_fallback: true }
      ];
    }
    else if (endpoint.includes('/api/services')) {
      // Return minimal mock service data
      console.log('[ApiRequest] Returning fallback mock services data');
      return [
        { id: 'offline-1', name: 'Fallback Service 1', price: 49.99, is_fallback: true },
        { id: 'offline-2', name: 'Fallback Service 2', price: 99.99, is_fallback: true }
      ];
    }
    else if (endpoint.includes('/api/customers')) {
      // Return minimal mock customer data
      console.log('[ApiRequest] Returning fallback mock customers data');
      return [
        { id: 'offline-1', name: 'Fallback Customer 1', email: 'customer1@example.com', is_fallback: true },
        { id: 'offline-2', name: 'Fallback Customer 2', email: 'customer2@example.com', is_fallback: true }
      ];
    }
    
    // Return appropriate empty data based on endpoint pattern for other endpoints
    if (endpoint.includes('list') || endpoint.includes('products') || 
        endpoint.includes('customers') || endpoint.includes('services') ||
        endpoint.includes('invoices') || endpoint.includes('estimates')) {
      return [];
    } else {
      return {};
    }
  }
  
  // For non-GET requests, enhance and throw the error
  const enhancedError = {
    ...error,
    endpoint,
    method,
    errorMessage: errorMessage || 'Unknown error',
    statusCode,
    params: JSON.stringify(params || {}).slice(0, 200), // Truncate for brevity
    isNetworkError,
    isTimeout,
    isAborted
  };
  
  throw enhancedError;
};

/**
 * Makes a standardized API request with proper headers and error handling
 */
export const apiRequest = async (method, endpoint, data = null, params = {}) => {
  try {
    // Get tenant ID from AppCache instead of localStorage
    let tenantId = getCacheValue('tenantId') || 'default';
    
    // Ensure tenant ID is properly formatted for schema name
    if (tenantId) {
      // Check for masked tenant ID format and try to get proper tenant ID
      if (tenantId.includes('----') || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.warn('[ApiRequest] Found invalid tenant ID format. Using proper ID from AppCache if available.');
        
        // Try to get actual tenant ID from AppCache proper_tenant_id
        const properTenantId = getCacheValue('proper_tenant_id');
        if (properTenantId && properTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log('[ApiRequest] Using proper tenant ID from AppCache:', properTenantId);
          tenantId = properTenantId;
          
          // Update the main tenantId in AppCache
          setCacheValue('tenantId', tenantId);
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
    
    // Make sure the endpoint doesn't have a redundant /api prefix
    let cleanedEndpoint = endpoint;
    if (endpoint.startsWith('/api/api/')) {
      // Remove the duplicate /api/ prefix
      cleanedEndpoint = endpoint.replace('/api/api/', '/api/');
      console.log(`[ApiRequest] Fixed redundant API path: ${endpoint} → ${cleanedEndpoint}`);
    } else if (!endpoint.startsWith('/api/')) {
      // If it doesn't start with /api/, add the prefix
      cleanedEndpoint = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;
      console.log(`[ApiRequest] Added API prefix: ${endpoint} → ${cleanedEndpoint}`);
    } else {
      // It already has the correct /api/ prefix
      cleanedEndpoint = endpoint;
    }
    
    // For GET requests, check the cache first
    if (method.toLowerCase() === 'get') {
      // Create a cache key based on endpoint and params
      const cacheKey = `${cleanedEndpoint}:${JSON.stringify(params)}`;
      
      // Determine TTL based on endpoint
      const isTenantEndpoint = LONG_CACHE_ENDPOINTS.some(e => cleanedEndpoint.includes(e));
      const cacheTTL = isTenantEndpoint ? TENANT_ENDPOINT_CACHE_TTL : REQUEST_CACHE_TTL;
      
      // Check if we have a cached response
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // No cache, proceed with the request
      const config = {
        method,
        url: cleanedEndpoint,
        ...(Object.keys(params).length > 0 && { params }),
        timeout: 30000
      };
      
      try {
        console.log(`[ApiRequest] ${method} ${cleanedEndpoint} with schema: ${params.schema}`);
        const response = await axiosInstance(config);
        
        // Handle potential non-JSON responses
        let responseData;
        try {
          // If response.data is already an object, it's already parsed
          responseData = typeof response.data === 'string' 
            ? JSON.parse(response.data) 
            : response.data;
        } catch (parseError) {
          console.error(`[ApiRequest] Error parsing JSON response:`, parseError);
          // Return empty data with error info
          responseData = { 
            error: true, 
            message: 'Invalid JSON response', 
            rawData: response.data?.slice?.(0, 100) // First 100 chars for debugging
          };
        }
        
        // Cache the response for future requests
        requestCache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
        
        return responseData;
      } catch (apiError) {
        return handleApiError(apiError, method, cleanedEndpoint, params);
      }
    }
    
    // For non-GET requests, proceed normally without caching
    const config = {
      method,
      url: cleanedEndpoint,
      ...(data && { data }),
      ...(Object.keys(params).length > 0 && { params }),
      timeout: 30000
    };
    
    try {
      console.log(`[ApiRequest] ${method} ${cleanedEndpoint} with schema: ${params.schema}`);
      const response = await axiosInstance(config);
      
      // Handle potential non-JSON responses for non-GET requests too
      let responseData;
      try {
        // If response.data is already an object, it's already parsed
        responseData = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
      } catch (parseError) {
        console.error(`[ApiRequest] Error parsing JSON response:`, parseError);
        // Return empty data with error info
        responseData = { 
          error: true, 
          message: 'Invalid JSON response', 
          rawData: response.data?.slice?.(0, 100) // First 100 chars for debugging
        };
      }
      
      // For mutation operations, invalidate related caches
      if (method.toLowerCase() !== 'get') {
        // Extract base endpoint without ID
        const baseEndpoint = cleanedEndpoint.replace(/\/[^\/]+$/, '');
        
        // Invalidate all cached requests for this endpoint
        for (const [key, _] of requestCache.entries()) {
          if (key.startsWith(baseEndpoint)) {
            requestCache.delete(key);
            logger.debug(`[ApiRequest] Invalidated cache for ${key}`);
          }
        }
      }
      
      return responseData;
    } catch (apiError) {
      return handleApiError(apiError, method, cleanedEndpoint, params);
    }
  } catch (error) {
    // This catches errors not related to API calls, like localStorage issues
    console.error(`[ApiRequest] Unexpected error:`, error);
    
    // If this is a GET request, return appropriate empty data
    if (method?.toLowerCase() === 'get') {
      if (endpoint.includes('list') || endpoint.includes('products') || 
          endpoint.includes('customers') || endpoint.includes('services') ||
          endpoint.includes('invoices') || endpoint.includes('estimates')) {
        return [];
      } else {
        return {};
      }
    }
    
    // Rethrow the error for non-GET requests
    throw error;
  }
}; 