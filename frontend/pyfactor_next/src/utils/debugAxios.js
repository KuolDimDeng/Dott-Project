import { axiosInstance, enhancedAxiosInstance, retryRequest } from '@/lib/axiosConfig';
import { logger } from './logger';

/**
 * Debug utilities for testing Axios configuration and timeout handling
 */

/**
 * Tests the timeout handling with the standard axios instance
 * @param {string} url - URL to test (defaults to a slow endpoint)
 * @param {number} timeout - Timeout in milliseconds to test with
 * @returns {Promise<Object>} Test results
 */
export const testStandardTimeout = async (url = '/api/test/slow-endpoint', timeout = 5000) => {
  logger.info('[DebugAxios] Testing standard axios instance with timeout:', timeout);
  
  try {
    const startTime = Date.now();
    
    const response = await axiosInstance.get(url, {
      timeout: timeout
    });
    
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
 * Tests the timeout handling with the enhanced axios instance (with auto-retry)
 * @param {string} url - URL to test (defaults to a slow endpoint)
 * @param {number} timeout - Timeout in milliseconds to test with
 * @returns {Promise<Object>} Test results
 */
export const testEnhancedTimeout = async (url = '/api/test/slow-endpoint', timeout = 5000) => {
  logger.info('[DebugAxios] Testing enhanced axios instance with timeout:', timeout);
  
  try {
    const startTime = Date.now();
    
    const response = await enhancedAxiosInstance.get(url, {
      timeout: timeout
    });
    
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
 * Tests the manual retry mechanism
 * @param {string} url - URL to test (defaults to a slow endpoint)
 * @param {number} timeout - Initial timeout in milliseconds 
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Object>} Test results
 */
export const testRetryMechanism = async (url = '/api/test/slow-endpoint', timeout = 3000, maxRetries = 3) => {
  logger.info('[DebugAxios] Testing retry mechanism with timeout:', timeout, 'maxRetries:', maxRetries);
  
  try {
    const startTime = Date.now();
    
    // Create a configuration object for the request that will likely timeout
    const config = {
      url,
      method: 'get',
      timeout: timeout,
      maxRetries: maxRetries
    };
    
    // First try with the standard instance - this should timeout
    try {
      await axiosInstance.get(url, { timeout });
    } catch (error) {
      // Expected to timeout, now test the retry mechanism
      logger.info('[DebugAxios] Initial request timed out as expected, testing retry...');
      
      const retryResponse = await retryRequest(config);
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
 * Initialize debug tools for Axios in the browser console
 */
export const initAxiosDebug = () => {
  if (typeof window !== 'undefined') {
    window._axiosDebug = {
      testStandardTimeout,
      testEnhancedTimeout,
      testRetryMechanism,
      axiosInstance,
      enhancedAxiosInstance,
      retryRequest
    };
    
    logger.info('[DebugAxios] Axios debug tools initialized. Access via window._axiosDebug in the console.');
  }
};

export default {
  testStandardTimeout,
  testEnhancedTimeout,
  testRetryMechanism,
  initAxiosDebug
}; 