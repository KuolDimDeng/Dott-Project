/**
 * Utility functions for API requests
 */
import { appCache } from '../utils/appCache';
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
  '/api/inventory/services',
  '/api/inventory/products',
  '/api/crm/customers'
];

/**
 * Gets standardized headers for API requests
 * Handles development mode and authentication bypassing
 */
export const getApiHeaders = async () => {
  // Initialize headers with standard values
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
  };
  
  // Add timestamp to prevent caching
  headers['X-Request-Time'] = Date.now().toString();
  
  try {
    // Try getting tokens directly from Cognito first
    let idToken = null;
    let tenantId = null;
    
    // Only try to get from Cognito in browser environment
    if (typeof window !== 'undefined') {
      try {
        // Dynamically import to avoid server-side errors
        const { fetchAuthSession } = await import('@/config/amplifyUnified');
        const session = await fetchAuthSession();
        
        if (session?.tokens?.idToken) {
          idToken = session.tokens.idToken.toString();
          
          // Store in AppCache for future use
          if (appCache.getAll()) {
            if (!appCache.get('auth')) appCache.set('auth', {});
            appCache.set('auth.idToken', idToken);
          }
          
          // Also try to extract tenant ID from token
          try {
            const payload = JSON.parse(
              Buffer.from(idToken.split('.')[1], 'base64').toString()
            );
            
            tenantId = payload['custom:businessid'] || payload['custom:tenant_ID'];
            
            if (tenantId && appCache.getAll()) {
              if (!appCache.get('tenant')) appCache.set('tenant', {});
              appCache.set('tenant.id', tenantId);
            }
          } catch (e) {
            logger.warn('[apiHelpers] Error extracting tenant ID from token:', e);
          }
        }
      } catch (e) {
        logger.warn('[apiHelpers] Error getting session from Cognito:', e);
      }
      
      // Fall back to AppCache if Cognito failed
      if (!idToken && appCache.getAll()) {
        idToken = appCache.get('auth.idToken');
        logger.debug('[apiHelpers] Using cached idToken from AppCache');
      }
      
      // Fall back to getCacheValue if needed
      if (!idToken) {
        idToken = getCacheValue('idToken');
        logger.debug('[apiHelpers] Using cached idToken from getCacheValue');
      }
      
      // Do the same for tenant ID
      if (!tenantId && appCache.getAll()) {
        tenantId = appCache.get('tenant.id');
      }
      
      if (!tenantId) {
        tenantId = getCacheValue('tenantId');
      }
    }
    
    // Add authentication token if available
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
      logger.debug('[apiHelpers] Added Authorization header');
    }
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
      headers['X-Business-ID'] = tenantId;
      logger.debug('[apiHelpers] Added tenant headers');
    }
  } catch (error) {
    // Fall back to basic headers if there's an error
    logger.warn('[apiHelpers] Error adding auth headers:', error);
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
    else if (endpoint.includes('/api/inventory/services')) {
      // Return mock service data that matches the structure expected by ServiceManagement.js
      console.log('[ApiRequest] Returning fallback mock services data for inventory API');
      return [
        { 
          id: 'mock-1', 
          name: 'Sample Service 1', 
          description: 'This is a sample service for demonstration',
          price: 99.99, 
          is_for_sale: true, 
          is_recurring: false,
          salestax: 5,
          duration: '1 hour',
          billing_cycle: 'monthly',
          unit: 'hour',
          created_at: new Date().toISOString(),
          is_fallback: true
        },
        { 
          id: 'mock-2', 
          name: 'Sample Service 2', 
          description: 'Another sample service for demonstration',
          price: 149.99, 
          is_for_sale: true, 
          is_recurring: true,
          salestax: 7,
          duration: '30 min',
          billing_cycle: 'monthly',
          unit: 'session',
          created_at: new Date().toISOString(),
          is_fallback: true
        }
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
 * Main API request function that handles all HTTP methods
 */
export const apiRequest = async (method, endpoint, data = null, params = {}) => {
  try {
    // Create a cache key for GET requests if caching is enabled
    const enableCache = params.cache !== false;
    let cacheKey = null;
    
    if (method.toLowerCase() === 'get' && enableCache) {
      // Create a key based on endpoint and query params
      const queryString = new URLSearchParams(params).toString();
      cacheKey = `${endpoint}${queryString ? '?' + queryString : ''}`;
      
      // Check for cached response
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Set up headers using AppCache or direct Cognito attributes (no cookies/localStorage)
    const headers = await getApiHeaders();
    
    // Prepare Axios config
    const axiosConfig = {
      method,
      url: endpoint,
      headers,
      ...params
    };
    
    // Add data for POST, PUT, PATCH requests
    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      axiosConfig.data = data;
    }
    
    // Set up request timeout and retry options
    axiosConfig.timeout = params.timeout || 60000; // Default 60s timeout
    
    // Add signal for request cancellation if supported by browser
    if (typeof AbortController !== 'undefined') {
      // Create a new abort controller for this request
      const controller = new AbortController();
      axiosConfig.signal = controller.signal;
      
      // Set up timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn(`[ApiRequest] Aborting request to ${endpoint} due to timeout`);
      }, axiosConfig.timeout + 1000); // 1s buffer over axios timeout
      
      // Clean up timeout when request completes
      axiosConfig.timeoutId = timeoutId;
    }
    
    // Add tenant ID from AppCache if available and not already in params
    if (typeof window !== 'undefined' && appCache.getAll()) {
      const tenantId = appCache.get('tenant.id');
      
      if (tenantId) {
        // Add to headers if not already there
        if (!axiosConfig.headers['X-Tenant-ID'] && !axiosConfig.headers['x-tenant-id']) {
          axiosConfig.headers['X-Tenant-ID'] = tenantId;
        }
        
        // Add to params if applicable for APIs that need it there
        if (!axiosConfig.params) {
          axiosConfig.params = {};
        }
        if (!axiosConfig.params.tenantId && !axiosConfig.params.tenant_id) {
          axiosConfig.params.tenantId = tenantId;
        }
        
        // For HR endpoints, add schema parameter if not present
        if (endpoint.includes('/api/hr/') && !axiosConfig.params.schema) {
          axiosConfig.params.schema = `tenant_${tenantId.replace(/-/g, '_')}`;
        }
      }
    }
    
    // Log request for debugging
    logger.info(`[apiRequest] Making ${method} request to ${endpoint}`, {
      tenantId: axiosConfig.headers['X-Tenant-ID'] || axiosConfig.headers['x-tenant-id'],
      hasAuthHeader: !!axiosConfig.headers['Authorization'],
      params: axiosConfig.params
    });
    
    // Make the request
    const response = await axiosInstance(axiosConfig);
    
    // Clear any timeout if it was set
    if (axiosConfig.timeoutId) {
      clearTimeout(axiosConfig.timeoutId);
    }
    
    // Cache GET responses if enabled
    if (method.toLowerCase() === 'get' && enableCache && cacheKey) {
      // Determine TTL based on endpoint
      const isLongCacheEndpoint = LONG_CACHE_ENDPOINTS.some(e => endpoint.includes(e));
      const ttl = isLongCacheEndpoint ? TENANT_ENDPOINT_CACHE_TTL : REQUEST_CACHE_TTL;
      
      // Cache the response
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl
      });
      
      logger.debug(`[ApiRequest] Cached response for ${cacheKey} with TTL ${ttl}ms`);
    }
    
    return response.data;
  } catch (error) {
    // Only log and handle errors that aren't cancellations
    if (error.name === 'CanceledError' || error.name === 'AbortError' || 
        error.message?.includes('cancel') || error.message?.includes('abort')) {
      logger.debug(`[ApiRequest] Request to ${endpoint} was cancelled/aborted`);
      
      // For HR endpoints, return empty array to prevent UI breaking
      if (endpoint.includes('/api/hr/employees')) {
        return [];
      }
      
      // For other endpoints, rethrow so error handling can happen normally
      throw error;
    }
    
    // Use the error handler for non-cancellation errors
    return handleApiError(error, method, endpoint, params);
  }
};

/**
 * Invalidate cache for a specific endpoint pattern
 * This should be called after mutations (POST, PUT, DELETE) to ensure fresh data
 * @param {string} endpointPattern - The endpoint pattern to invalidate (e.g. '/api/hr/employees')
 */
export const invalidateCache = (endpointPattern) => {
  if (!endpointPattern) return;
  
  let invalidatedCount = 0;
  
  // Look through all cache keys and invalidate matching ones
  requestCache.forEach((value, key) => {
    if (key.includes(endpointPattern)) {
      requestCache.delete(key);
      invalidatedCount++;
    }
  });
  
  logger.debug(`[ApiRequest] Invalidated ${invalidatedCount} cache entries for ${endpointPattern}`);
}; 