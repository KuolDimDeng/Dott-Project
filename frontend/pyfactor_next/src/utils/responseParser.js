/**
 * Utility functions for safely parsing API responses
 * Prevents "JSON unexpected character" errors by checking content-type first
 */

import { logger } from '@/utils/logger';

/**
 * Safely parse a Response object as JSON
 * @param {Response} response - The fetch response object
 * @param {string} context - Context for logging (e.g., 'CreateSubscription', 'Session')
 * @returns {Promise<any>} Parsed JSON data
 * @throws {Error} If response is not JSON or parsing fails
 */
export async function safeJsonParse(response, context = 'API') {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    
    logger.error(`[${context}] Non-JSON response received:`, {
      status: response.status,
      contentType,
      textPreview: text.substring(0, 500)
    });
    
    // Provide specific error messages based on content
    if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
      throw new Error('Server returned HTML page instead of JSON data. This may indicate a server configuration issue.');
    } else if (text.includes('502 Bad Gateway') || text.includes('504 Gateway')) {
      throw new Error('Backend service is temporarily unavailable. Please try again in a few moments.');
    } else if (text.includes('503 Service Unavailable')) {
      throw new Error('Service is temporarily unavailable. Please try again in a few moments.');
    } else if (text.includes('403 Forbidden')) {
      throw new Error('Access denied. You may not have permission to perform this action.');
    } else if (text.includes('401 Unauthorized')) {
      throw new Error('Authentication expired. Please refresh the page and try again.');
    } else if (text.includes('404 Not Found')) {
      throw new Error('Requested resource not found. This may indicate a service configuration issue.');
    } else if (text.includes('500 Internal Server Error')) {
      throw new Error('Internal server error. Please try again or contact support if the issue persists.');
    } else if (text.trim() === '') {
      throw new Error('Server returned empty response. Please try again.');
    } else {
      throw new Error('Server returned invalid response format. Please try again.');
    }
  }
  
  try {
    const data = await response.json();
    return data;
  } catch (parseError) {
    logger.error(`[${context}] JSON parsing failed:`, {
      error: parseError.message,
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers)
    });
    
    // Try to get raw text for debugging
    try {
      const text = await response.text();
      logger.error(`[${context}] Raw response text:`, text.substring(0, 500));
      
      if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
        throw new Error('Server returned HTML page instead of JSON data.');
      } else if (text.trim() === '') {
        throw new Error('Server returned empty response.');
      } else {
        throw new Error('Server returned malformed JSON data.');
      }
    } catch (textError) {
      throw new Error('Unable to process server response. Please try again.');
    }
  }
}

/**
 * Safely parse response text with error handling
 * @param {Response} response - The fetch response object
 * @param {string} context - Context for logging
 * @returns {Promise<string>} Response text
 */
export async function safeTextParse(response, context = 'API') {
  try {
    const text = await response.text();
    return text;
  } catch (error) {
    logger.error(`[${context}] Text parsing failed:`, error);
    throw new Error('Unable to read server response. Please try again.');
  }
}

/**
 * Create a standardized error response for API routes
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} context - Context for logging
 * @returns {Response} NextResponse with error
 */
export function createErrorResponse(message, status = 500, context = 'API') {
  logger.error(`[${context}] Error response:`, { message, status });
  
  return Response.json({
    error: message,
    context,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Handle fetch errors with proper error messages
 * @param {Error} error - The fetch error
 * @param {string} context - Context for logging
 * @returns {Error} Processed error with user-friendly message
 */
export function handleFetchError(error, context = 'API') {
  logger.error(`[${context}] Fetch error:`, error);
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new Error('Unable to connect to server. Please check your internet connection and try again.');
  } else if (error.name === 'AbortError') {
    return new Error('Request timed out. Please try again.');
  } else if (error.message.includes('ECONNREFUSED')) {
    return new Error('Server is not responding. Please try again in a few moments.');
  } else if (error.message.includes('ENOTFOUND')) {
    return new Error('Server address not found. Please check your connection and try again.');
  } else {
    return new Error('Network error occurred. Please try again.');
  }
}