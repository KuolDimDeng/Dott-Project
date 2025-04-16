// Simplified axios configuration that works in both client and server environments
// Uses dynamic imports for client-only dependencies

import axios from 'axios';
import { logger } from '@/utils/logger';

// Use the current origin as the base URL unless defined
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';

// Create main axios instance for API calls
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Export axiosInstance as the default export
export default axiosInstance;

// Token refresh function
const refreshTokenAndRetry = async (config) => {
  try {
    // Get fresh tokens
    const session = await fetchAuthSession();
    if (!session?.tokens?.idToken) {
      throw new Error('No id token in session');
    }
    
    const token = session.tokens.idToken.toString();
    
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
    
    // Retry the request with new config
    return axios(newConfig);
  } catch (error) {
    logger.error('[axiosConfig] Error refreshing token:', error);
    return Promise.reject(error);
  }
};

// Circuit breaker implementation
const circuitBreakers = {};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.pendingRequests = 0;
    this.maxPendingRequests = options.maxPendingRequests || 5;
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
}

// Get or create a circuit breaker for an endpoint
const getCircuitBreaker = (endpoint) => {
  const key = endpoint.split('?')[0]; // Ignore query params for circuit breaking
  
  if (!circuitBreakers[key]) {
    circuitBreakers[key] = new CircuitBreaker(key);
  }
  
  return circuitBreakers[key];
};

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
              if (session?.tokens?.idToken) {
                config.headers.Authorization = `Bearer ${session.tokens.idToken.toString()}`;
                config.headers['X-Id-Token'] = session.tokens.idToken.toString();
                
                // Save to APP_CACHE for future use
                if (window.__APP_CACHE) {
                  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                  window.__APP_CACHE.auth.token = session.tokens.idToken.toString();
                }
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
const serverAxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add SSL handling for development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const https = require('https');
  serverAxiosInstance.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
}

// Fix proper BACKEND_URL configuration for server-side requests
serverAxiosInstance.interceptors.request.use(
  (config) => {
    // Set a proper base URL for backend API requests
    if (!config.baseURL) {
      // Use environment variable or fallback to 127.0.0.1
      // Always use HTTP in development to avoid SSL issues
      const backendUrl = process.env.NODE_ENV === 'development' ? 
        'http://127.0.0.1:8000' : 
        (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');
      
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
serverAxiosInstance.interceptors.response.use(
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
      if (authSession?.tokens?.idToken) {
        config.headers['Authorization'] = `Bearer ${authSession.tokens.idToken.toString()}`;
        config.headers['x-id-token'] = authSession.tokens.idToken.toString();
        
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
      backendAxiosInstance,
      retryRequest,
      testStandardTimeout,
      testEnhancedTimeout,
      testRetryMechanism
    };
  }
};

// Export all functions and instances
export { 
  axiosInstance, 
  serverAxiosInstance, 
  backendAxiosInstance, 
  enhancedAxiosInstance, 
  retryRequest, 
  testStandardTimeout, 
  testEnhancedTimeout, 
  testRetryMechanism, 
  initAxiosDebug, 
  useApi 
}; 