// Simplified axios configuration that works in both client and server environments
// Uses dynamic imports for client-only dependencies

import axios from 'axios';
import { logger } from '@/utils/logger';
import https from 'https';

// Always use HTTPS for backend connections to avoid CORS issues
const PROTOCOL = 'https';

// Use the current origin as the base URL unless defined
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_API_URL || `${PROTOCOL}://127.0.0.1:3000`;
const BACKEND_API_URL = process.env.BACKEND_API_URL || `${PROTOCOL}://127.0.0.1:8000`;

// Create main axios instance for API calls
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create server-side axios instance with SSL verification disabled for local development
// This instance is used for direct communication with the backend API
const serverAxiosInstance = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  httpsAgent: process.env.NODE_ENV !== 'production' ? new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification for local development only
  }) : undefined
});

// Create a dedicated backend instance for HR/employee API calls
const backendHrApiInstance = axios.create({
  baseURL: `${BACKEND_API_URL}/api/hr`,
  timeout: 120000, // Increased timeout for HR operations from 90s to 120s
  headers: {
    'Content-Type': 'application/json',
    // Explicitly include standard CORS headers
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID'
  },
  // For HTTPS in local development, disable SSL verification
  // For HTTP, disable proxy to avoid interference
  ...(PROTOCOL === 'https' && process.env.NODE_ENV !== 'production' ? {
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  } : {
    proxy: false
  }),
  // Add specific settings to improve reliability of connections 
  maxRedirects: 5,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Only reject if status is 5xx (server errors)
  },
  // Add automatic retry configuration
  retry: 3,
  retryDelay: 1000,
  // Prevent request abortion on navigation
  cancelToken: undefined,
  signal: undefined
});

// Add request interceptor to backendHrApiInstance for authentication and circuit breaking
backendHrApiInstance.interceptors.request.use(
  async (config) => {
    try {
      // Check if we're in a browser environment
      const isBrowser = typeof window !== 'undefined';
      
      if (isBrowser) {
        try {
          // Dynamically import client-side only modules
          const { getTenantId } = await import('@/utils/tenantUtils');
          const { fetchAuthSession } = await import('aws-amplify/auth');
          
          // Use AWS AppCache for tenant ID - prioritize this over other sources
          if (window.__APP_CACHE?.tenant?.id) {
            const cachedTenantId = window.__APP_CACHE.tenant.id;
            config.headers = {
              ...config.headers,
              'X-Tenant-ID': cachedTenantId
            };
            logger.debug('[AxiosConfig] Using tenant ID from APP_CACHE for HR API');
          } else {
            // Fall back to utilities function which will try other sources
            const tenantId = await getTenantId();
            if (tenantId) {
              config.headers = {
                ...config.headers,
                'X-Tenant-ID': tenantId
              };
            }
          }
          
          // Use AWS AppCache for auth tokens if available
          if (window.__APP_CACHE?.auth?.token) {
            config.headers.Authorization = `Bearer ${window.__APP_CACHE.auth.token}`;
            logger.debug('[AxiosConfig] Using auth token from APP_CACHE for HR API');
          } else {
            // Fall back to Amplify Auth
            try {
              const session = await fetchAuthSession();
              if (session?.tokens?.accessToken) {
                config.headers.Authorization = `Bearer ${session.tokens.accessToken.toString()}`;
              }
            } catch (authError) {
              logger.warn('[AxiosConfig] Auth session error for HR API:', authError.message);
            }
          }
        } catch (importError) {
          logger.warn('[AxiosConfig] Import error in HR API request interceptor:', importError.message);
        }
      }
      
      // Add CORS headers for direct backend communication
      config.headers = {
        ...config.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization, X-Tenant-ID'
      };
      
      // Circuit breaker pattern - reuse the same implementation from axiosInstance
      const url = config.url?.split('?')[0] || '';
      const cb = getCircuitBreaker(url);
      
      if (!cb.canRequest()) {
        logger.warn(`[AxiosConfig] Circuit breaker open for HR API ${url}, rejecting request`);
        return Promise.reject(new Error(`Circuit breaker open for ${url}`));
      }
      
      // Track this request
      cb.recordRequest();
      config._circuitBreakerHandled = true;
      
      return config;
    } catch (error) {
      logger.error('[AxiosConfig] Error in HR API request interceptor:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    logger.error('[AxiosConfig] HR API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to backendHrApiInstance for error handling and circuit breaking
backendHrApiInstance.interceptors.response.use(
  (response) => {
    // Handle circuit breaker if this request was handled by it
    if (response.config._circuitBreakerHandled) {
      const url = response.config.url?.split('?')[0] || '';
      const cb = getCircuitBreaker(url);
      cb.recordSuccess();
    }
    
    return response;
  },
  async (error) => {
    // Basic error logging
    const errorMessage = error.response ? 
      `Error ${error.response.status}: ${error.response.statusText}` : 
      `Network Error: ${error.message}`;
    
    logger.error(`[AxiosConfig] HR API Response error: ${errorMessage}`, error);
    
    // Handle circuit breaker if this request was handled by it
    if (error.config && error.config._circuitBreakerHandled) {
      const url = error.config.url?.split('?')[0] || '';
      const cb = getCircuitBreaker(url);
      cb.recordFailure();
    }
    
    // Implement automatic retry for network-related errors
    const config = error.config;
    
    // Initialize retry count if not already present
    if (!config._retryCount) {
      config._retryCount = 0;
    }
    
    // Get max retries from config or use default
    const maxRetries = config.retry || 3;
    
    // Check if we should retry this request
    const shouldRetry = (
      config._retryCount < maxRetries && 
      (
        // Network error or timeout
        error.code === 'ECONNABORTED' || 
        error.message?.includes('timeout') ||
        error.message?.includes('Network Error') ||
        error.message?.includes('aborted') ||
        // Server errors (5xx)
        (error.response && error.response.status >= 500 && error.response.status < 600)
      )
    );
    
    if (shouldRetry) {
      config._retryCount += 1;
      logger.info(`[AxiosConfig] Retrying HR API request (${config._retryCount}/${maxRetries}): ${config.url}`);
      
      // Clear any potential abort controllers or signals
      delete config.cancelToken;
      delete config.signal;
      
      // Increase timeout for subsequent retries
      config.timeout = config.timeout * 1.5;
      
      // Wait before retrying - use exponential backoff
      const delay = config.retryDelay || 1000;
      const backoff = delay * Math.pow(2, config._retryCount - 1);
      
      await new Promise(resolve => setTimeout(resolve, backoff));
      
      // Retry the request
      return backendHrApiInstance(config);
    }
    
    // Handle specific error cases for HR API
    if (error.response) {
      // Handle HTTP errors
      if (error.response.status === 401) {
        // Authentication error - try to refresh token
        try {
          return await refreshTokenAndRetry(error.config);
        } catch (refreshError) {
          logger.error('[AxiosConfig] Failed to refresh token for HR API:', refreshError);
          return Promise.reject(error);
        }
      } else if (error.response.status === 403) {
        // Permission error - be more specific about tenant access
        logger.warn('[AxiosConfig] Permission denied access to HR API. Check tenant ID configuration.');
        return Promise.reject(new Error('Permission denied. Please verify you have access to this tenant\'s employee data.'));
      }
    }
    
    return Promise.reject(error);
  }
);

// Export axiosInstance as the default export
export default axiosInstance;

// Export named instances for specific use cases
export { 
  axiosInstance,
  serverAxiosInstance,
  backendHrApiInstance,
  refreshTokenAndRetry,
  retryRequest,
  testStandardTimeout,
  testEnhancedTimeout,
  testRetryMechanism,
  initAxiosDebug,
  useApi,
  resetCircuitBreakers,
  diagnoseConnection,
  verifyBackendConnection,
  diagnoseAndFixBackendConnection
};

// Token refresh function
const refreshTokenAndRetry = async (config) => {
  try {
    // Get fresh tokens
    const session = await fetchAuthSession();
    if (!session?.tokens?.accessToken) {
      throw new Error('No access token in session');
    }
    
    const token = session.tokens.accessToken.toString();
    
    // Store the new token in APP_CACHE for future requests
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
      window.__APP_CACHE.auth.token = token;
      window.__APP_CACHE.auth.provider = 'cognito';
      logger.debug('[AxiosConfig] Updated access token in APP_CACHE');
    }
    
    // Create new config with fresh token
    const newConfig = {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`
      }
    };
    
    // Add tenant headers if available
    const tenantId = getTenantId();
    if (tenantId) {
      newConfig.headers = {
        ...newConfig.headers,
        'X-Tenant-ID': tenantId
      };
    }
    
    // Retry with the new token
    logger.info('[AxiosConfig] Retrying request with fresh access token');
    return backendHrApiInstance(newConfig);
  } catch (error) {
    logger.error('[AxiosConfig] Token refresh failed:', error);
    throw error;
  }
};

// Circuit breaker implementation
const circuitBreakers = {};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5; // Increased from 3 to 5
    this.resetTimeout = options.resetTimeout || 15000; // Decreased from 30s to 15s
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.pendingRequests = 0;
    this.maxPendingRequests = options.maxPendingRequests || 10; // Increased from 5 to 10
  }
  
  canRequest() {
    const now = Date.now();
    
    // Check if too many requests are already pending for this endpoint
    if (this.pendingRequests >= this.maxPendingRequests) {
      logger.warn(`[CircuitBreaker] Too many pending requests (${this.pendingRequests}) for ${this.name}`);
      return false;
    }
    
    if (this.state === 'OPEN') {
      // Check if the circuit has been open long enough to try again
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`[CircuitBreaker] ${this.name} state changed from OPEN to HALF_OPEN`);
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  recordRequest() {
    this.pendingRequests++;
  }
  
  recordSuccess() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    
    if (this.state === 'HALF_OPEN') {
      this.failureCount = 0;
      this.state = 'CLOSED';
      logger.info(`[CircuitBreaker] ${this.name} state changed from HALF_OPEN to CLOSED`);
    }
  }
  
  recordFailure() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker] ${this.name} state changed from CLOSED to OPEN after ${this.failureCount} failures`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker] ${this.name} state changed from HALF_OPEN to OPEN after test request failed`);
    }
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.pendingRequests = 0;
    logger.info(`[CircuitBreaker] ${this.name} has been manually reset to CLOSED state`);
    return true;
  }
}

// Get or create a circuit breaker for an endpoint
const getCircuitBreaker = (endpoint) => {
  const key = endpoint.split('?')[0]; // Ignore query params for circuit breaking
  
  if (!circuitBreakers[key]) {
    circuitBreakers[key] = new CircuitBreaker(key);
  }
  
  return circuitBreakers[key];
};

// Reset all circuit breakers or a specific one
const resetCircuitBreakers = (specificEndpoint = null) => {
  if (specificEndpoint) {
    const cb = getCircuitBreaker(specificEndpoint);
    return cb.reset();
  } else {
    // Reset all circuit breakers
    Object.keys(circuitBreakers).forEach(key => {
      circuitBreakers[key].reset();
    });
    logger.info('[CircuitBreaker] All circuit breakers have been reset');
    return true;
  }
};

// Reset the employees endpoint circuit breaker
resetCircuitBreakers('/employees');

// Request interceptor to add authorization token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Check if we're in a browser environment
      const isBrowser = typeof window !== 'undefined';
      
      if (isBrowser) {
        try {
          // Dynamically import client-side only modules
          const { getTenantId } = await import('@/utils/tenantUtils');
          const { fetchAuthSession } = await import('aws-amplify/auth');
          
          // Use AWS AppCache for tenant ID - prioritize this over other sources
          if (window.__APP_CACHE?.tenant?.id) {
            const cachedTenantId = window.__APP_CACHE.tenant.id;
            config.headers = {
              ...config.headers,
              'X-Tenant-ID': cachedTenantId
            };
            logger.debug('[AxiosConfig] Using tenant ID from APP_CACHE');
          } else {
            // Fall back to utilities function which will try other sources
            const tenantId = await getTenantId();
            if (tenantId) {
              config.headers = {
                ...config.headers,
                'X-Tenant-ID': tenantId
              };
            }
          }
          
          // Use AWS AppCache for auth tokens if available
          if (window.__APP_CACHE?.auth?.token) {
            config.headers.Authorization = `Bearer ${window.__APP_CACHE.auth.token}`;
            logger.debug('[AxiosConfig] Using auth token from APP_CACHE');
          } else {
            // Fall back to Amplify Auth
            try {
              const session = await fetchAuthSession();
              if (session?.tokens?.accessToken) {
                config.headers.Authorization = `Bearer ${session.tokens.accessToken.toString()}`;
              }
            } catch (authError) {
              logger.warn('[AxiosConfig] Auth session error:', authError.message);
            }
          }
        } catch (importError) {
          logger.warn('[AxiosConfig] Import error in request interceptor:', importError.message);
        }
      }
      
      // Circuit breaker pattern
      const url = config.url?.split('?')[0] || '';
      const cb = getCircuitBreaker(url);
      
      if (!cb.canRequest()) {
        logger.warn(`[AxiosConfig] Circuit breaker open for ${url}, rejecting request`);
        return Promise.reject(new Error(`Circuit breaker open for ${url}`));
      }
      
      // Track this request
      cb.recordRequest();
      config._circuitBreakerHandled = true;
      
      return config;
    } catch (error) {
      logger.error('[AxiosConfig] Error in request interceptor:', error.message);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Add circuit breaker to response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    try {
      // Record success in circuit breaker if available
      const url = response.config.url?.split('?')[0] || '';
      const cb = getCircuitBreaker(url);
      
      if (response.config._circuitBreakerHandled) {
        cb.recordSuccess();
      }
    } catch (e) {
      // Don't let circuit breaker errors affect response
      logger.error('[axiosConfig] Error in circuit breaker success handling:', e.message);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isBrowser = typeof window !== 'undefined';
    
    try {
      // Record failure in circuit breaker if available
      if (originalRequest?._circuitBreakerHandled) {
        const url = originalRequest.url?.split('?')[0] || '';
        const cb = getCircuitBreaker(url);
        cb.recordFailure();
      }
    } catch (e) {
      // Don't let circuit breaker errors affect error response
      logger.error('[axiosConfig] Error in circuit breaker failure handling:', e.message);
    }
    
    // If error is 401 Unauthorized and we haven't retried yet and we're in a browser
    if (isBrowser && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        return await refreshTokenAndRetry(originalRequest);
      } catch (refreshError) {
        logger.error('[axiosConfig] Token refresh failed:', refreshError.message);
        
        // Redirect to login on refresh failure (only in browser)
        if (isBrowser) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle ECONNABORTED errors (request timeouts and aborts)
    if (error.code === 'ECONNABORTED' && !originalRequest._abortRetry) {
      logger.warn('[axiosConfig] Request aborted or timed out, retrying...');
      
      // Mark as retry attempt to prevent infinite loops
      originalRequest._abortRetry = true;
      
      // Increase timeout for retry
      originalRequest.timeout = originalRequest.timeout ? originalRequest.timeout * 1.5 : 45000;
      
      // Add a delay before retrying
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(axiosInstance(originalRequest));
        }, 2000);
      });
    }
    
    return Promise.reject(error);
  }
);

// Alias for compatibility with code using useApi
const useApi = axiosInstance;

// Create a server-side safe axios instance that doesn't use client-side utilities
const serverSafeAxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add SSL handling for development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const https = require('https');
  serverSafeAxiosInstance.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
}

// Fix proper BACKEND_URL configuration for server-side requests
serverSafeAxiosInstance.interceptors.request.use(
  (config) => {
    // Set a proper base URL for backend API requests
    if (!config.baseURL) {
      // Always use HTTPS to avoid CORS issues
      const backendUrl = process.env.BACKEND_API_URL || 
        process.env.NEXT_PUBLIC_API_URL || 
        'https://127.0.0.1:8000';
      
      if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`[ServerAxiosConfig] Using backend URL: ${backendUrl} for request: ${config.url}`);
      }
      
      // Update the config with the correct baseURL
      config.baseURL = backendUrl;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add simpler interceptors and error handler for connection issues
serverSafeAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log connection errors in a helpful way
    if (error.code === 'ECONNREFUSED') {
      console.error(`[ServerAxiosConfig] Connection refused to ${error.config?.url || 'unknown URL'}`);
      error.message = `Connection to backend server failed (${error.address}:${error.port})`;
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[ServerAxiosConfig] Connection timeout to ${error.config?.url || 'unknown URL'}`);
      error.message = 'Connection to backend server timed out';
    } else if (error.code === 'EPROTO') {
      console.error(`[ServerAxiosConfig] SSL Protocol error with ${error.config?.url || 'unknown URL'}`);
      error.message = 'SSL Protocol error - possible mismatch between HTTP/HTTPS';
    } else {
      // Handle errors in server components
      console.error('[Server] API request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Create a backend axios instance specifically for server-to-server communication
const backendAxiosInstance = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const enhancedAxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 40000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add the same interceptors to the enhanced instance
enhancedAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const authSession = await fetchAuthSession();
      if (authSession?.tokens?.accessToken) {
        config.headers['Authorization'] = `Bearer ${authSession.tokens.accessToken.toString()}`;
        config.headers['x-id-token'] = authSession.tokens.accessToken.toString();
        
        if (typeof window !== 'undefined') {
          const tenantId = localStorage.getItem('tenantId');
          if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
          }
        }
      }
      return config;
    } catch (error) {
      console.warn('Failed to get auth session for enhanced API request', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Simple retry mechanism
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry 4xx client errors except timeout/abort
      if (error.response && error.response.status >= 400 && error.response.status < 500 && 
          error.code !== 'ECONNABORTED') {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before trying again with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
};

// Test functions
const testStandardTimeout = async (url, timeout) => {
  return axiosInstance.get(url, { timeout });
};

const testEnhancedTimeout = async (url, timeout) => {
  return enhancedAxiosInstance.get(url, { timeout });
};

const testRetryMechanism = async (url, timeout, maxRetries) => {
  const config = { url, method: 'get', timeout, maxRetries };
  return retryRequest(config);
};

// Debug function
const initAxiosDebug = () => {
  if (typeof window !== 'undefined') {
    window._axiosDebug = {
      axiosInstance,
      enhancedAxiosInstance,
      serverAxiosInstance,
      serverSafeAxiosInstance,
      backendAxiosInstance,
      retryRequest,
      testStandardTimeout,
      testEnhancedTimeout,
      testRetryMechanism
    };
  }
};

// Connection diagnostics
const diagnoseConnection = async (targetUrl = `${BACKEND_API_URL}/api/hr/employees`) => {
  logger.info(`[AxiosConfig] Diagnosing connection to: ${targetUrl}`);
  try {
    const results = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: Basic connection
    try {
      const startTime = Date.now();
      const response = await axios.get(targetUrl, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });
      const endTime = Date.now();
      
      results.tests.basic = {
        success: response.status < 500,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        hasData: !!response.data
      };
    } catch (error) {
      results.tests.basic = {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    
    // Test 2: With credentials
    try {
      const startTime = Date.now();
      const response = await axios.get(targetUrl, { 
        timeout: 5000,
        validateStatus: () => true,
        withCredentials: true
      });
      const endTime = Date.now();
      
      results.tests.withCredentials = {
        success: response.status < 500,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime
      };
    } catch (error) {
      results.tests.withCredentials = {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    
    // Test 3: Using backendHrApiInstance
    try {
      const startTime = Date.now();
      // Strip the base URL part from the target URL for this test
      const endpoint = targetUrl.replace(`${BACKEND_API_URL}/hr`, '');
      const response = await backendHrApiInstance.get(endpoint || '/', { 
        timeout: 5000,
        validateStatus: () => true
      });
      const endTime = Date.now();
      
      results.tests.backendHrApiInstance = {
        success: response.status < 500,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime
      };
    } catch (error) {
      results.tests.backendHrApiInstance = {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    
    logger.info('[Diagnostics] Connection test results:', results);
    return results;
  } catch (error) {
    logger.error('[AxiosConfig] Connection diagnostic error:', error);
    return {
      success: false,
      status: error.response?.status || 0,
      message: `Connection diagnostic failed: ${error.message}`,
      error: error.toString()
    };
  }
};

// Connection verification function
const verifyBackendConnection = async () => {
  const healthEndpoint = `${BACKEND_API_URL}/api/hr/health`;
  logger.info(`[BackendConnectionCheck] Verifying backend connection to: ${healthEndpoint}`);
  
  // First reset ALL circuit breakers
  resetCircuitBreakers();
  logger.info('[BackendConnectionCheck] All circuit breakers have been reset');
  
  try {
    // Get tenant ID from APP_CACHE or Cognito
    let tenantId = null;
    if (typeof window !== 'undefined') {
      if (window.__APP_CACHE?.tenant?.id) {
        tenantId = window.__APP_CACHE.tenant.id;
        logger.debug(`[BackendConnectionCheck] Using tenant ID from APP_CACHE: ${tenantId}`);
      } else {
        try {
          // Try to get tenant ID from Cognito
          const { getTenantIdFromCognito } = await import('@/utils/tenantUtils');
          tenantId = await getTenantIdFromCognito();
          logger.debug(`[BackendConnectionCheck] Using tenant ID from Cognito: ${tenantId}`);
        } catch (error) {
          logger.warn('[BackendConnectionCheck] Could not get tenant ID from Cognito:', error);
        }
      }
    }
    
    // First try a basic GET request without headers to avoid CORS preflight
    try {
      logger.info('[BackendConnectionCheck] Trying health check without headers first...');
      const basicResponse = await axios.get(healthEndpoint, {
        timeout: 5000,
        validateStatus: () => true,
        // Disable certificate verification in development
        ...(process.env.NODE_ENV !== 'production' && {
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
      });
      
      // If successful, return the result
      if (basicResponse.status >= 200 && basicResponse.status < 300) {
        const responseTime = 0; // Not measuring time for simplicity
        logger.info(`[BackendConnectionCheck] Connection successful without tenant header:`, basicResponse.data);
        
        return {
          success: true,
          status: basicResponse.status,
          message: "Connection successful",
          responseTime,
          data: basicResponse.data
        };
      }
      
      // If 403, we need to try with tenant ID
      logger.info(`[BackendConnectionCheck] Basic health check returned ${basicResponse.status}, trying with tenant ID...`);
    } catch (basicError) {
      logger.warn('[BackendConnectionCheck] Basic health check failed:', basicError.message);
    }
    
    // Now try with tenant ID
    const startTime = Date.now();
    
    // Create custom axios instance for this request to avoid CORS issues
    const customAxios = axios.create({
      timeout: 5000,
      validateStatus: () => true,
      ...(process.env.NODE_ENV !== 'production' && {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      })
    });
    
    // Start with a preflight request
    logger.info('[BackendConnectionCheck] Sending OPTIONS preflight request...');
    try {
      await customAxios.options(healthEndpoint);
      logger.info('[BackendConnectionCheck] Preflight request successful');
    } catch (preflightError) {
      logger.warn('[BackendConnectionCheck] Preflight error (continuing anyway):', preflightError.message);
    }
    
    // Create headers with tenant ID
    const headers = {};
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    // Use the custom axios instance for the actual request
    const response = await customAxios.get(healthEndpoint, {
      headers: headers
    });
    
    const responseTime = Date.now() - startTime;
    const isSuccess = response.status >= 200 && response.status < 300;
    
    if (isSuccess) {
      logger.info(`[BackendConnectionCheck] Connection successful (${responseTime}ms):`, response.data);
    } else {
      logger.warn(`[BackendConnectionCheck] Connection returned non-success status ${response.status} (${responseTime}ms):`, response.data);
    }
    
    return {
      success: isSuccess,
      status: response.status,
      message: isSuccess ? "Connection successful" : `Received status code ${response.status}`,
      responseTime,
      data: response.data
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      isAxiosError: error.isAxiosError || false,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers
    };
    
    logger.error('[BackendConnectionCheck] Connection failed:', errorDetails);
    
    return {
      success: false,
      status: error.response?.status || 0,
      message: `Connection failed: ${error.message}`,
      errorDetails,
      error: error.toString()
    };
  }
};

// Add the function after the verifyBackendConnection function
const diagnoseAndFixBackendConnection = async () => {
  logger.info('[BackendConnectionCheck] Diagnosing and attempting to fix connection issues');
  
  // First reset all circuit breakers
  resetCircuitBreakers();
  logger.info('[BackendConnectionCheck] All circuit breakers have been reset');
  
  // Try to get tenant ID
  let tenantId = null;
  try {
    if (typeof window !== 'undefined') {
      // Use APP_CACHE if available
      if (window.__APP_CACHE?.tenant?.id) {
        tenantId = window.__APP_CACHE.tenant.id;
      } else {
        // Try to dynamically import and use tenantUtils
        const { getTenantId } = await import('@/utils/tenantUtils');
        tenantId = await getTenantId();
      }
      
      if (tenantId) {
        logger.info(`[BackendConnectionCheck] Found tenant ID: ${tenantId}`);
      } else {
        logger.warn('[BackendConnectionCheck] No tenant ID found');
      }
    }
  } catch (error) {
    logger.error('[BackendConnectionCheck] Error getting tenant ID:', error);
  }
  
  // Test connection with backendHrApiInstance
  try {
    const headers = tenantId ? { 'X-Tenant-ID': tenantId } : {};
    const response = await backendHrApiInstance.get('/health', {
      timeout: 10000,
      validateStatus: () => true,
      headers
    });
    
    logger.info(`[BackendConnectionCheck] Health check status: ${response.status}`, response.data);
    
    if (response.status === 200) {
      logger.info('[BackendConnectionCheck] Backend connection restored successfully');
      return {
        success: true,
        message: 'Connection restored successfully',
        status: response.status,
        data: response.data
      };
    } else if (response.status === 403 && tenantId) {
      logger.warn('[BackendConnectionCheck] Received 403 despite having tenant ID');
      return {
        success: false,
        message: 'Authentication issues with backend',
        status: response.status,
        data: response.data
      };
    } else {
      return {
        success: false,
        message: `Health check failed with status ${response.status}`,
        status: response.status,
        data: response.data
      };
    }
  } catch (error) {
    logger.error('[BackendConnectionCheck] Health check failed:', error);
    return {
      success: false,
      message: `Connection error: ${error.message}`,
      error: error.toString()
    };
  }
};

// At the end of the file, before the closing if statement for window.__diagnostics
// Add a function to force reset the whole connection system
const resetConnectionSystem = async () => {
  logger.info('[ConnectionReset] Resetting all connection systems');
  
  try {
    // Reset all circuit breakers
    resetCircuitBreakers();
    logger.info('[ConnectionReset] All circuit breakers have been reset');
    
    // Clear any cached connection errors
    if (typeof window !== 'undefined') {
      if (window.__APP_CACHE) {
        delete window.__APP_CACHE.connectionErrors;
        logger.info('[ConnectionReset] Cleared cached connection errors');
      }
    }
    
    // Try a basic connection with no tenant ID
    const healthEndpoint = `${BACKEND_API_URL}/api/hr/health`;
    logger.info(`[ConnectionReset] Testing basic connection to: ${healthEndpoint}`);
    
    try {
      const response = await axios.get(healthEndpoint, { 
        timeout: 3000,
        validateStatus: () => true,
        ...(process.env.NODE_ENV !== 'production' && {
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
      });
      
      logger.info(`[ConnectionReset] Basic connection test result: ${response.status}`, response.data);
    } catch (error) {
      logger.error('[ConnectionReset] Basic connection test failed:', error.message);
    }
    
    return {
      success: true,
      message: 'Connection system reset completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('[ConnectionReset] Error during reset:', error);
    return {
      success: false,
      message: `Reset failed: ${error.message}`,
      error: error.toString()
    };
  }
};

// If in development, expose diagnostics to window for easier debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__diagnostics = {
    diagnoseConnection,
    resetCircuitBreakers,
    circuitBreakers,
    verifyBackendConnection,
    diagnoseAndFixBackendConnection,
    resetConnectionSystem
  };
} 