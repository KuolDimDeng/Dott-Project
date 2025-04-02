'use client';

/**
 * Simple axios configuration file using only named exports
 * - No default exports
 * - No module.exports (CommonJS)
 * - Only ESM exports with simplified initialization
 */

import axios from 'axios';

// Create axios instances directly at the top level
const axiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Alias for compatibility with code using useApi
const useApi = axiosInstance;

const serverAxiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const enhancedAxiosInstance = axios.create({
  baseURL: '',
  timeout: 40000,
  headers: {
    'Content-Type': 'application/json',
  }
});

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
  enhancedAxiosInstance,
  retryRequest,
  testStandardTimeout,
  testEnhancedTimeout,
  testRetryMechanism,
  initAxiosDebug,
  useApi
}; 