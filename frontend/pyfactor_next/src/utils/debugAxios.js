'use client';


// Import only the logger, not the axiosConfig
import { logger } from './logger';
import axios from 'axios';

/**
 * Debug utilities for testing Axios configuration and timeout handling
 */

// Create instances directly to avoid circular imports
const axiosInstance = axios.create({
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

// Simple retry mechanism - defined locally
const retryRequest = async (config) => {
  const retryConfig = { ...config };
  retryConfig.retryCount = (retryConfig.retryCount || 0) + 1;
  
  if (retryConfig.retryCount > (retryConfig.maxRetries || 3)) {
    throw new Error('Max retries exceeded');
  }
  
  return axiosInstance(retryConfig);
};

// Basic test functions
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

/**
 * Wrapper for testStandardTimeout with improved logging
 */
export const debugStandardTimeout = async (url = '/api/test/slow-endpoint', timeout = 5000) => {
  logger.info('[DebugAxios] Testing standard axios instance with timeout:', timeout);
  const startTime = Date.now();
  
  try {
    const response = await testStandardTimeout(url, timeout);
    const elapsed = Date.now() - startTime;
    
    return {
      success: true,
      elapsed,
      data: response.data,
      message: `Request completed in ${elapsed}ms`
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    return {
      success: false,
      elapsed,
      error: error.message,
      code: error.code,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      message: `Request failed after ${elapsed}ms: ${error.message}`
    };
  }
};

/**
 * Wrapper for testEnhancedTimeout with improved logging
 */
export const debugEnhancedTimeout = async (url = '/api/test/slow-endpoint', timeout = 5000) => {
  logger.info('[DebugAxios] Testing enhanced axios instance with timeout:', timeout);
  const startTime = Date.now();
  
  try {
    const response = await testEnhancedTimeout(url, timeout);
    const elapsed = Date.now() - startTime;
    
    return {
      success: true,
      elapsed,
      data: response.data,
      message: `Request completed in ${elapsed}ms`
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    return {
      success: false,
      elapsed,
      error: error.message,
      code: error.code,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      message: `Request failed after ${elapsed}ms: ${error.message}`
    };
  }
};

/**
 * Wrapper for testRetryMechanism with improved logging
 */
export const debugRetryMechanism = async (url = '/api/test/slow-endpoint', timeout = 3000, maxRetries = 3) => {
  logger.info('[DebugAxios] Testing retry mechanism with timeout:', timeout, 'maxRetries:', maxRetries);
  const startTime = Date.now();
  
  try {
    // First try with the standard instance - this should timeout
    try {
      await axiosInstance.get(url, { timeout });
    } catch (error) {
      // Expected to timeout, now test the retry mechanism
      logger.info('[DebugAxios] Initial request timed out as expected, testing retry...');
      
      const retryResponse = await testRetryMechanism(url, timeout, maxRetries);
      const elapsed = Date.now() - startTime;
      
      return {
        success: true,
        elapsed,
        data: retryResponse.data,
        message: `Retry succeeded after ${elapsed}ms`
      };
    }
    
    // If we got here, the initial request didn't timeout as expected
    return {
      success: false,
      message: 'Initial request didn\'t timeout as expected'
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    return {
      success: false,
      elapsed,
      error: error.message,
      retryCount: error.config?.retryCount || 0,
      message: `All retries failed after ${elapsed}ms: ${error.message}`
    };
  }
};

/**
 * Initialize debug tools
 */
export const initAxiosDebug = () => {
  logger.info('[DebugAxios] Initializing Axios debug tools');
  
  if (typeof window !== 'undefined') {
    window._axiosDebug = {
      axiosInstance,
      enhancedAxiosInstance,
      retryRequest,
      testStandardTimeout,
      testEnhancedTimeout,
      testRetryMechanism,
      debugStandardTimeout,
      debugEnhancedTimeout,
      debugRetryMechanism
    };
    
    logger.info('[DebugAxios] Axios debug tools initialized. Access via window._axiosDebug');
  }
};

// Export the instances and functions
export {
  axiosInstance,
  enhancedAxiosInstance,
  retryRequest,
  testStandardTimeout,
  testEnhancedTimeout,
  testRetryMechanism
}; 