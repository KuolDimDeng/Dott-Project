/**
 * Error handling utilities for consistent error management across the application
 */
import { logger } from './logger';

/**
 * Handle API errors in a consistent way across the application
 * Logs errors and provides appropriate user feedback
 * 
 * @param {Error} error - The error object from the API call
 * @param {string} context - Context message describing where the error occurred
 * @param {Object} options - Additional options for error handling
 * @returns {Object} Standardized error object
 */
export const handleApiError = (error, context, options = {}) => {
  // Extract relevant information from the error
  const status = error?.response?.status || error?.status || 500;
  const message = error?.response?.data?.message || 
                 error?.response?.data?.error || 
                 error?.message || 
                 'Unknown error occurred';
  
  // Create standardized error object
  const standardError = {
    status,
    message,
    context,
    timestamp: new Date().toISOString(),
    originalError: error
  };
  
  // Determine error severity based on status code
  const isServerError = status >= 500;
  const isAuthError = status === 401 || status === 403;
  const isNotFoundError = status === 404;
  const isValidationError = status === 400 || status === 422;
  
  // Log error with appropriate severity
  if (isServerError) {
    logger.error(`API Error (${status}): ${context}`, {
      error: standardError,
      stack: error?.stack
    });
  } else if (isAuthError) {
    logger.warn(`Auth Error (${status}): ${context}`, {
      error: standardError
    });
    
    // Redirect to login page for authentication errors if specified
    if (options.redirectOnAuthError && typeof window !== 'undefined') {
      window.location.href = '/auth/signin?session_expired=true';
    }
  } else if (isValidationError) {
    logger.warn(`Validation Error (${status}): ${context}`, {
      error: standardError
    });
  } else {
    logger.warn(`API Error (${status}): ${context}`, {
      error: standardError
    });
  }
  
  // Return standardized error
  return standardError;
};

/**
 * Format API error message for user display
 * 
 * @param {Error} error - The error object 
 * @param {string} fallbackMessage - Fallback message if error doesn't have a readable message
 * @returns {string} User-friendly error message
 */
export const formatErrorMessage = (error, fallbackMessage = 'An unexpected error occurred') => {
  if (!error) return fallbackMessage;
  
  // Check for structured API error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check for network errors
  if (error.message?.includes('Network Error')) {
    return 'Network error. Please check your internet connection.';
  }
  
  // Check for timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again later.';
  }
  
  // Return error message or fallback
  return error.message || fallbackMessage;
};

export default {
  handleApiError,
  formatErrorMessage
}; 