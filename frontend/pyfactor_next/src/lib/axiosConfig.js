'use client';

/**
 * Simple axios configuration file using only named exports
 * - No default exports
 * - No module.exports (CommonJS)
 * - Only ESM exports with simplified initialization
 */

import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getTenantId, getTenantHeaders } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

// Use the current origin as the base URL unless defined
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Create main axios instance for API calls
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

// Add request interceptor to include authorization and tenant info
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Add tenant headers for all requests
      const tenantId = getTenantId();
      if (tenantId) {
        config.headers = {
          ...config.headers,
          'X-Tenant-ID': tenantId
        };
      }
      
      // Add authorization header for authenticated requests
      const session = await fetchAuthSession();
      if (session?.tokens?.idToken) {
        config.headers.Authorization = `Bearer ${session.tokens.idToken.toString()}`;
      }
      
      return config;
    } catch (error) {
      logger.error('[axiosConfig] Error in request interceptor:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        return await refreshTokenAndRetry(originalRequest);
      } catch (refreshError) {
        logger.error('[axiosConfig] Token refresh failed:', refreshError);
        
        // Redirect to login on refresh failure
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle tenant errors
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('tenant')) {
      logger.error('[axiosConfig] Tenant access denied:', error.response.data);
      
      // Could redirect to tenant selection page
      // window.location.href = '/tenant/select';
    }
    
    return Promise.reject(error);
  }
);

// Alias for compatibility with code using useApi
const useApi = axiosInstance;

// Create a server-side safe axios instance that doesn't use client-side utilities
const serverAxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add simpler interceptors for server-side that don't depend on client-side auth
serverAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors in server components
    console.error('[Server] API request error:', error.message);
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
const retryRequest = async (config) => {
  const retryConfig = { ...config };
  retryConfig.retryCount = (retryConfig.retryCount || 0) + 1;
  
  if (retryConfig.retryCount > (retryConfig.maxRetries || 3)) {
    throw new Error('Max retries exceeded');
  }
  
  return axiosInstance(retryConfig);
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