/**
 * Utility functions for API requests
 */
import { logger } from './logger';

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
    // Include idToken if available
    const idToken = localStorage.getItem('idToken');
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
 * Makes a standardized API request with proper headers and error handling
 */
export const apiRequest = async (url, options = {}) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Merge default headers with any custom headers
    const headers = {
      ...getApiHeaders(),
      ...options.headers
    };
    
    // Add request ID for tracing
    headers['x-request-id'] = requestId;
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const responseTime = Date.now() - startTime;
    
    // For non-JSON responses or empty responses
    if (!response.ok) {
      logger.warn(`[apiRequest] Request failed: ${response.status}`, {
        url,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        requestId
      });
      
      // Try to parse error as JSON
      try {
        const errorData = await response.json();
        throw {
          status: response.status,
          message: errorData.error || errorData.message || 'Request failed',
          data: errorData,
          requestId,
          responseTime
        };
      } catch (e) {
        // If parsing fails, throw generic error
        throw {
          status: response.status,
          message: response.statusText || 'Request failed',
          requestId,
          responseTime
        };
      }
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        success: true,
        data: null,
        requestId,
        responseTime
      };
    }
    
    const data = await response.json();
    
    // Return standardized success response
    return {
      success: true,
      data,
      requestId,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Standardize error format
    const standardError = {
      success: false,
      error: error.message || 'An error occurred',
      data: error.data,
      status: error.status || 500,
      requestId,
      responseTime
    };
    
    logger.error(`[apiRequest] Error: ${standardError.error}`, {
      url,
      error: standardError,
      stack: error.stack
    });
    
    return standardError;
  }
}; 