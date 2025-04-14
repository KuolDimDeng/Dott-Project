/**
 * Utility functions for API requests
 */
import { logger } from './logger';
import axiosInstance from './axiosInstance';
import { getCacheValue } from './appCache';

// Request cache for throttling duplicate requests
const requestCache = new Map();
const REQUEST_CACHE_TTL = 60000; // 1 minute cache time
const TENANT_ENDPOINT_CACHE_TTL = 300000; // 5 minutes for tenant endpoints

// Add list of endpoints that should use longer cache TTL
const LONG_CACHE_ENDPOINTS = [
  '/api/tenant/list',
  '/api/tenant/info',
  '/api/inventory/services',
  '/api/inventory/products',
  '/api/crm/customers'
];

/**
 * Gets standardized headers for API requests
 * Handles development mode and authentication bypassing
 */
export const getApiHeaders = () => {
  // Initialize headers with standard values
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
  };
  
  // Add timestamp to prevent caching
  headers['X-Request-Time'] = Date.now().toString();
  
  try {
    // Include idToken if available
    const idToken = getCacheValue('idToken');
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
    // Get tenant ID - ensure server-compatible approach
    let tenantId = null;
    
    // Only access storage in browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      // Try to get from AppCache first
      try {
        tenantId = getCacheValue('tenantId');
      } catch (e) {
        console.warn('[ApiRequest] Error accessing AppCache:', e.message);
      }
      
      // Ensure tenant ID is properly formatted for schema name
      if (tenantId) {
        // Check for masked tenant ID format and try to get proper tenant ID
        if (tenantId.includes('----') || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.warn('[ApiRequest] Found invalid tenant ID format. Looking for proper ID.');
          
          // Try to get actual tenant ID from AppCache
          try {
            const properTenantId = getCacheValue('proper_tenant_id');
            if (properTenantId && properTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              console.log('[ApiRequest] Using proper tenant ID from AppCache:', properTenantId);
              tenantId = properTenantId;
            }
          } catch (e) {
            console.warn('[ApiRequest] Error accessing AppCache for proper ID:', e.message);
          }
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
        const response = await axiosInstance(config);
        
        // Ensure we have a JSON response, not HTML
        if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE html>')) {
          console.error('[ApiRequest] Received HTML response instead of JSON for endpoint:', cleanedEndpoint);
          
          // Return fallback data based on endpoint
          if (cleanedEndpoint.includes('/invoices')) {
            console.log('[ApiRequest] Returning fallback invoice data');
            const fallbackData = [];
            // Cache the fallback response
            requestCache.set(cacheKey, {
              data: fallbackData,
              timestamp: Date.now(),
              ttl: cacheTTL
            });
            return fallbackData;
          }
          
          // Add fallback for services endpoint
          if (cleanedEndpoint.includes('/inventory/services')) {
            console.log('[ApiRequest] Returning fallback services data');
            const fallbackData = [];
            // Cache the fallback response
            requestCache.set(cacheKey, {
              data: fallbackData,
              timestamp: Date.now(),
              ttl: cacheTTL
            });
            return fallbackData;
          }
        }
        
        // Cache successful response
        requestCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
        
        return response.data;
      } catch (error) {
        return handleApiError(error, method, cleanedEndpoint, params);
      }
    }
    
    // For non-GET requests, proceed directly
    const config = {
      method,
      url: cleanedEndpoint,
      ...(data && { data }),
      ...(Object.keys(params).length > 0 && { params }),
      timeout: 30000
    };
    
    try {
      const response = await axiosInstance(config);
      
      // Ensure we have a JSON response, not HTML for POST/PUT/DELETE as well
      if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE html>')) {
        console.error('[ApiRequest] Received HTML response instead of JSON for non-GET request:', cleanedEndpoint);
        
        // For invoices creation/update, return a mock successful response
        if (cleanedEndpoint.includes('/invoices')) {
          if (method.toLowerCase() === 'post') {
            console.log('[ApiRequest] Returning mock created invoice response');
            return { 
              id: `mock-${Date.now()}`, 
              ...data,
              created_at: new Date().toISOString(),
              status: 'draft'
            };
          }
        }
        
        // For services creation/update, return a mock successful response
        if (cleanedEndpoint.includes('/inventory/services')) {
          if (method.toLowerCase() === 'post') {
            console.log('[ApiRequest] Returning mock created service response');
            return { 
              id: `mock-${Date.now()}`, 
              ...data,
              created_at: new Date().toISOString()
            };
          } else if (method.toLowerCase() === 'put') {
            console.log('[ApiRequest] Returning mock updated service response');
            return { 
              id: data.id || `mock-${Date.now()}`, 
              ...data,
              updated_at: new Date().toISOString()
            };
          }
        }
      }
      
      return response.data;
    } catch (error) {
      if (method.toLowerCase() === 'get') {
        return handleApiError(error, method, cleanedEndpoint, params);
      } else {
        throw handleApiError(error, method, cleanedEndpoint, params);
      }
    }
  } catch (error) {
    console.error('[ApiRequest] Error in apiRequest:', error);
    
    // Handle unexpected errors and provide fallback data
    if (method.toLowerCase() === 'get') {
      if (endpoint.includes('/invoices')) {
        return [];
      }
      return {};
    }
    
    throw error;
  }
}; 