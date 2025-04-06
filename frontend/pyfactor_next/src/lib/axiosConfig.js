'use client';

/**
 * Simple axios configuration file using only named exports
 * - No default exports
 * - No module.exports (CommonJS)
 * - Only ESM exports with simplified initialization
 */

import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Use the current origin as the base URL unless defined
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Create axios instances directly at the top level
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get the current auth session
      const authSession = await fetchAuthSession();
      
      // Add auth headers if tokens are available
      if (authSession?.tokens?.idToken) {
        // Add the ID token as a bearer token
        config.headers['Authorization'] = `Bearer ${authSession.tokens.idToken.toString()}`;
        config.headers['x-id-token'] = authSession.tokens.idToken.toString();
        
        // Also add tenant ID if available from localStorage
        if (typeof window !== 'undefined') {
          const tenantId = localStorage.getItem('tenantId');
          if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
          }
        }
      }
      
      return config;
    } catch (error) {
      // If we can't get auth session, continue without auth headers
      console.warn('Failed to get auth session for API request', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors by logging them
    if (error.response && error.response.status === 401) {
      console.error('Authentication error in API request', error);
      // You could redirect to login here if needed
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