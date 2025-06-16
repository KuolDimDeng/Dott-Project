/**
 * Enhanced Error Handler v2
 * 
 * Provides user-friendly error messages and recovery actions
 */

import { logger } from '@/utils/logger';

// Error categories
const ERROR_CATEGORIES = {
  AUTH: 'authentication',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PAYMENT: 'payment',
  SESSION: 'session',
  ONBOARDING: 'onboarding',
  SYSTEM: 'system'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  // Authentication errors
  'invalid_credentials': {
    message: 'Invalid email or password',
    action: 'Please check your credentials and try again',
    category: ERROR_CATEGORIES.AUTH
  },
  'email_not_verified': {
    message: 'Email not verified',
    action: 'Please check your email for a verification link',
    category: ERROR_CATEGORIES.AUTH
  },
  'account_locked': {
    message: 'Account temporarily locked',
    action: 'Too many failed attempts. Please try again in 15 minutes',
    category: ERROR_CATEGORIES.AUTH
  },
  'session_expired': {
    message: 'Your session has expired',
    action: 'Please sign in again to continue',
    category: ERROR_CATEGORIES.SESSION
  },
  
  // Network errors
  'network_error': {
    message: 'Connection error',
    action: 'Please check your internet connection and try again',
    category: ERROR_CATEGORIES.NETWORK
  },
  'timeout': {
    message: 'Request timed out',
    action: 'The server is taking too long to respond. Please try again',
    category: ERROR_CATEGORIES.NETWORK
  },
  'ssl_error': {
    message: 'Secure connection failed',
    action: 'There was a problem establishing a secure connection. Please refresh and try again',
    category: ERROR_CATEGORIES.NETWORK
  },
  
  // Validation errors
  'missing_required_fields': {
    message: 'Required information missing',
    action: 'Please fill in all required fields',
    category: ERROR_CATEGORIES.VALIDATION
  },
  'invalid_email': {
    message: 'Invalid email address',
    action: 'Please enter a valid email address',
    category: ERROR_CATEGORIES.VALIDATION
  },
  'password_too_weak': {
    message: 'Password too weak',
    action: 'Password must be at least 8 characters with a mix of letters and numbers',
    category: ERROR_CATEGORIES.VALIDATION
  },
  
  // Payment errors
  'payment_failed': {
    message: 'Payment failed',
    action: 'Please check your payment details and try again',
    category: ERROR_CATEGORIES.PAYMENT
  },
  'card_declined': {
    message: 'Card declined',
    action: 'Your card was declined. Please try a different payment method',
    category: ERROR_CATEGORIES.PAYMENT
  },
  'insufficient_funds': {
    message: 'Insufficient funds',
    action: 'Please ensure sufficient funds and try again',
    category: ERROR_CATEGORIES.PAYMENT
  },
  
  // Onboarding errors
  'onboarding_incomplete': {
    message: 'Onboarding not complete',
    action: 'Please complete all onboarding steps to access the dashboard',
    category: ERROR_CATEGORIES.ONBOARDING
  },
  'invalid_state_transition': {
    message: 'Invalid action',
    action: 'This action cannot be performed at this time',
    category: ERROR_CATEGORIES.ONBOARDING
  },
  
  // System errors
  'rate_limit': {
    message: 'Too many requests',
    action: 'Please wait a moment before trying again',
    category: ERROR_CATEGORIES.SYSTEM
  },
  'server_error': {
    message: 'Something went wrong',
    action: 'An unexpected error occurred. Please try again later',
    category: ERROR_CATEGORIES.SYSTEM
  },
  'maintenance': {
    message: 'System maintenance',
    action: 'We\'re performing maintenance. Please try again in a few minutes',
    category: ERROR_CATEGORIES.SYSTEM
  }
};

class ErrorHandlerV2 {
  /**
   * Handle error and return user-friendly response
   */
  handle(error, context = {}) {
    logger.error('[ErrorHandler] Error occurred', {
      error: error.message || error,
      context,
      stack: error.stack
    });

    // Determine error type
    const errorInfo = this.identifyError(error);
    
    // Add recovery suggestions based on context
    const recovery = this.getRecoverySuggestions(errorInfo, context);
    
    return {
      ...errorInfo,
      recovery,
      timestamp: new Date().toISOString(),
      reference: this.generateErrorReference()
    };
  }

  /**
   * Identify error type and get user-friendly message
   */
  identifyError(error) {
    // Check for known error codes
    if (error.code && ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }

    // Check error message patterns
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Auth errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return ERROR_MESSAGES.session_expired;
    }
    
    if (errorMessage.includes('invalid') && errorMessage.includes('password')) {
      return ERROR_MESSAGES.invalid_credentials;
    }
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ERROR_MESSAGES.network_error;
    }
    
    if (errorMessage.includes('timeout')) {
      return ERROR_MESSAGES.timeout;
    }
    
    if (errorMessage.includes('ssl') || errorMessage.includes('certificate')) {
      return ERROR_MESSAGES.ssl_error;
    }
    
    // Payment errors
    if (errorMessage.includes('payment') || errorMessage.includes('stripe')) {
      return ERROR_MESSAGES.payment_failed;
    }
    
    if (errorMessage.includes('declined')) {
      return ERROR_MESSAGES.card_declined;
    }
    
    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return ERROR_MESSAGES.rate_limit;
    }
    
    // Default to generic error
    return ERROR_MESSAGES.server_error;
  }

  /**
   * Get recovery suggestions based on error and context
   */
  getRecoverySuggestions(errorInfo, context) {
    const suggestions = [];
    
    switch (errorInfo.category) {
      case ERROR_CATEGORIES.AUTH:
        suggestions.push({ action: 'retry_login', label: 'Try signing in again' });
        suggestions.push({ action: 'reset_password', label: 'Reset your password' });
        break;
        
      case ERROR_CATEGORIES.SESSION:
        suggestions.push({ action: 'refresh', label: 'Refresh the page' });
        suggestions.push({ action: 'login', label: 'Sign in again' });
        break;
        
      case ERROR_CATEGORIES.NETWORK:
        suggestions.push({ action: 'retry', label: 'Try again' });
        suggestions.push({ action: 'check_connection', label: 'Check your connection' });
        break;
        
      case ERROR_CATEGORIES.PAYMENT:
        suggestions.push({ action: 'update_payment', label: 'Update payment method' });
        suggestions.push({ action: 'contact_support', label: 'Contact support' });
        break;
        
      case ERROR_CATEGORIES.ONBOARDING:
        suggestions.push({ action: 'continue_onboarding', label: 'Continue setup' });
        suggestions.push({ action: 'restart_onboarding', label: 'Start over' });
        break;
        
      default:
        suggestions.push({ action: 'retry', label: 'Try again' });
        suggestions.push({ action: 'contact_support', label: 'Get help' });
    }
    
    return suggestions;
  }

  /**
   * Generate error reference for support
   */
  generateErrorReference() {
    return `ERR-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Create user-friendly error component props
   */
  toComponentProps(error, context) {
    const errorInfo = this.handle(error, context);
    
    return {
      title: errorInfo.message,
      description: errorInfo.action,
      suggestions: errorInfo.recovery,
      reference: errorInfo.reference,
      severity: this.getSeverity(errorInfo.category),
      showContactSupport: errorInfo.category === ERROR_CATEGORIES.SYSTEM
    };
  }

  /**
   * Get error severity
   */
  getSeverity(category) {
    switch (category) {
      case ERROR_CATEGORIES.AUTH:
      case ERROR_CATEGORIES.SESSION:
        return 'warning';
      case ERROR_CATEGORIES.PAYMENT:
      case ERROR_CATEGORIES.SYSTEM:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    const errorInfo = this.identifyError(error);
    
    return [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.SYSTEM
    ].includes(errorInfo.category) && 
    errorInfo.message !== ERROR_MESSAGES.rate_limit.message;
  }

  /**
   * Get retry delay based on error
   */
  getRetryDelay(error, attemptNumber = 1) {
    const errorInfo = this.identifyError(error);
    
    // Rate limit has specific delay
    if (errorInfo.message === ERROR_MESSAGES.rate_limit.message) {
      return 60000; // 1 minute
    }
    
    // Exponential backoff for other errors
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerV2();

// Also export class for testing
export default ErrorHandlerV2;