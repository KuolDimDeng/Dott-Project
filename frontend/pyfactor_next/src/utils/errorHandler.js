/**
 * Comprehensive Error Handling System
 * Provides user-friendly error messages and logging
 */

import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { withRetry } from '@/utils/retryUtils';

// Error message mappings for common HTTP status codes
const ERROR_MESSAGES = {
  400: {
    title: 'Invalid Request',
    message: 'The information provided is incorrect. Please check and try again.',
    userAction: 'Review your input and try again'
  },
  401: {
    title: 'Authentication Required',
    message: 'Please sign in to continue.',
    userAction: 'Sign in to your account'
  },
  403: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this resource.',
    userAction: 'Contact support if you believe this is an error'
  },
  404: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    userAction: 'Check the URL or try again later'
  },
  409: {
    title: 'Conflict',
    message: 'This action conflicts with existing data.',
    userAction: 'Refresh and try again'
  },
  422: {
    title: 'Validation Error',
    message: 'Some of the information provided is invalid.',
    userAction: 'Check your input and try again'
  },
  429: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests. Please wait a moment.',
    userAction: 'Wait a few minutes before trying again'
  },
  500: {
    title: 'Server Error',
    message: 'Something went wrong on our end. We\'re working on it.',
    userAction: 'Try again in a few moments'
  },
  502: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    userAction: 'Please try again in a few minutes'
  },
  503: {
    title: 'Service Maintenance',
    message: 'The service is undergoing maintenance.',
    userAction: 'Please check back later'
  },
  504: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    userAction: 'Check your connection and try again'
  }
};

// Context-specific error messages
const CONTEXT_ERRORS = {
  // Authentication errors
  'auth/signin': {
    401: 'Invalid email or password. Please try again.',
    500: 'Unable to sign in at the moment. Please try again.'
  },
  'auth/signup': {
    409: 'An account with this email already exists.',
    422: 'Please provide valid information to create your account.'
  },
  
  // Profile errors
  'profile/fetch': {
    401: 'Session expired. Please sign in again.',
    404: 'Profile not found. Please complete your account setup.',
    500: 'Unable to load profile data. Please try again.'
  },
  'profile/update': {
    422: 'Please check your profile information and try again.',
    500: 'Unable to update profile. Please try again.'
  },
  
  // Business operations
  'business/create': {
    409: 'A business with this name already exists.',
    422: 'Please provide all required business information.'
  },
  'business/update': {
    403: 'You don\'t have permission to edit this business.',
    404: 'Business not found.',
    422: 'Invalid business information provided.'
  },
  
  // Subscription errors
  'subscription/upgrade': {
    402: 'Payment required. Please update your payment method.',
    409: 'You already have an active subscription.',
    422: 'Invalid subscription plan selected.'
  },
  
  // Network errors
  'network/timeout': 'The request timed out. Please check your internet connection.',
  'network/offline': 'You appear to be offline. Please check your connection.',
  'network/dns': 'Unable to reach the server. Please try again later.'
};

/**
 * Main error handler class
 */
export class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.isProcessing = false;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error, context = '', options = {}) {
    const {
      showToast = true,
      logError = true,
      throwError = false,
      customMessage = null
    } = options;

    // Extract error details
    const errorDetails = this.extractErrorDetails(error);
    
    // Get appropriate error message
    const errorMessage = this.getErrorMessage(errorDetails, context, customMessage);
    
    // Log error if needed
    if (logError) {
      logger.error(`[${context}] API Error:`, {
        status: errorDetails.status,
        message: errorDetails.message,
        data: errorDetails.data,
        stack: error.stack
      });
    }
    
    // Show toast notification if needed
    if (showToast) {
      this.showErrorToast(errorMessage);
    }
    
    // Throw error if needed
    if (throwError) {
      throw new Error(errorMessage.message);
    }
    
    return errorMessage;
  }

  /**
   * Extract error details from various error formats
   */
  extractErrorDetails(error) {
    // Handle Axios errors
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || error.response.data?.error || error.message,
        data: error.response.data,
        headers: error.response.headers
      };
    }
    
    // Handle fetch errors
    if (error instanceof Response) {
      return {
        status: error.status,
        message: error.statusText,
        data: null,
        headers: error.headers
      };
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        status: 0,
        message: 'network/timeout',
        data: null
      };
    }
    
    if (!navigator.onLine) {
      return {
        status: 0,
        message: 'network/offline',
        data: null
      };
    }
    
    // Default error
    return {
      status: 500,
      message: error.message || 'An unexpected error occurred',
      data: null
    };
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorDetails, context, customMessage) {
    // Use custom message if provided
    if (customMessage) {
      return {
        title: 'Error',
        message: customMessage,
        userAction: 'Please try again'
      };
    }
    
    // Check context-specific messages
    if (context && CONTEXT_ERRORS[context]) {
      const contextError = CONTEXT_ERRORS[context][errorDetails.status];
      if (contextError) {
        return {
          title: ERROR_MESSAGES[errorDetails.status]?.title || 'Error',
          message: contextError,
          userAction: ERROR_MESSAGES[errorDetails.status]?.userAction || 'Please try again'
        };
      }
    }
    
    // Check for network errors
    if (errorDetails.status === 0 && CONTEXT_ERRORS[errorDetails.message]) {
      return {
        title: 'Connection Error',
        message: CONTEXT_ERRORS[errorDetails.message],
        userAction: 'Check your connection'
      };
    }
    
    // Use status code mapping
    const statusError = ERROR_MESSAGES[errorDetails.status];
    if (statusError) {
      return statusError;
    }
    
    // Default error message
    return {
      title: 'Error',
      message: errorDetails.message || 'Something went wrong. Please try again.',
      userAction: 'If the problem persists, contact support'
    };
  }

  /**
   * Show error toast notification
   */
  showErrorToast(errorMessage) {
    // Prevent duplicate toasts
    const toastId = `${errorMessage.title}-${errorMessage.message}`;
    
    toast.error(
      <div>
        <strong>{errorMessage.title}</strong>
        <p className="text-sm mt-1">{errorMessage.message}</p>
        {errorMessage.userAction && (
          <p className="text-xs mt-2 opacity-80">{errorMessage.userAction}</p>
        )}
      </div>,
      {
        id: toastId,
        duration: 5000,
        style: {
          maxWidth: '400px'
        }
      }
    );
  }

  /**
   * Handle form validation errors
   */
  handleValidationErrors(errors, options = {}) {
    const { showToast = true } = options;
    
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const message = Array.isArray(messages) ? messages[0] : messages;
        return `${fieldName}: ${message}`;
      })
      .join('\n');
    
    const errorMessage = {
      title: 'Validation Error',
      message: errorMessages,
      userAction: 'Please correct the errors and try again'
    };
    
    if (showToast) {
      this.showErrorToast(errorMessage);
    }
    
    return errorMessage;
  }

  /**
   * Execute a function with automatic retry on failure
   */
  async executeWithRetry(fn, options = {}) {
    const {
      context = '',
      maxRetries = 3,
      initialDelay = 1000,
      showToast = true,
      logError = true,
      customMessage = null,
      onRetry = null
    } = options;

    return withRetry(fn, {
      maxRetries,
      initialDelay,
      onRetry: (error, attempt, delay) => {
        // Log the retry attempt
        if (logError) {
          logger.info(`[${context}] Retrying operation (attempt ${attempt})`, {
            error: error.message,
            delay
          });
        }

        // Show toast notification on first retry
        if (attempt === 1 && showToast) {
          toast.loading('Retrying request...', {
            id: `retry-${context}`,
            duration: delay
          });
        }

        // Call custom onRetry callback if provided
        if (onRetry && typeof onRetry === 'function') {
          onRetry(error, attempt, delay);
        }
      }
    }).catch(error => {
      // Handle final failure after all retries
      const errorMessage = this.handleApiError(error, context, {
        showToast,
        logError,
        customMessage,
        throwError: false
      });

      // Dismiss any loading toast
      toast.dismiss(`retry-${context}`);

      throw error;
    });
  }

  /**
   * Create a retryable version of an API call
   */
  makeRetryable(apiCall, defaultOptions = {}) {
    return async (...args) => {
      const lastArg = args[args.length - 1];
      let retryOptions = defaultOptions;

      // Check if last argument contains retry options
      if (lastArg && typeof lastArg === 'object' && lastArg._retryOptions) {
        retryOptions = { ...defaultOptions, ...lastArg._retryOptions };
        args = args.slice(0, -1);
      }

      return this.executeWithRetry(() => apiCall(...args), retryOptions);
    };
  }

  /**
   * Create error boundary fallback
   */
  static ErrorFallback({ error, resetErrorBoundary }) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            {error.message || 'An unexpected error occurred'}
          </p>
          <div className="mt-6">
            <button
              onClick={resetErrorBoundary}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export React hook for error handling
export function useErrorHandler() {
  const handleError = useCallback((error, context, options) => {
    return errorHandler.handleApiError(error, context, options);
  }, []);
  
  const handleValidationErrors = useCallback((errors, options) => {
    return errorHandler.handleValidationErrors(errors, options);
  }, []);

  const executeWithRetry = useCallback((fn, options) => {
    return errorHandler.executeWithRetry(fn, options);
  }, []);

  const makeRetryable = useCallback((apiCall, defaultOptions) => {
    return errorHandler.makeRetryable(apiCall, defaultOptions);
  }, []);
  
  return { 
    handleError, 
    handleValidationErrors, 
    executeWithRetry, 
    makeRetryable 
  };
}

// Import React for the error boundary component
import React, { useCallback } from 'react';