'use client';

import { logger } from './logger';

/**
 * Global error handler for unhandled promise rejections and other errors
 */
class GlobalErrorHandler {
  constructor() {
    this.isInitialized = false;
    this.errorCount = 0;
    this.maxErrors = 10; // Prevent infinite error loops
    this.errorQueue = [];
    this.lastErrorTime = 0;
    this.errorThrottleTime = 1000; // 1 second throttle
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Handle uncaught JavaScript errors
    window.addEventListener('error', this.handleError.bind(this));
    
    // Handle React errors (for browsers that support it)
    if ('onunhandledrejection' in window) {
      window.onunhandledrejection = this.handleUnhandledRejection.bind(this);
    }

    console.log('[GlobalErrorHandler] Initialized successfully');
  }

  handleUnhandledRejection(event) {
    const now = Date.now();
    
    // Throttle errors to prevent spam
    if (now - this.lastErrorTime < this.errorThrottleTime) {
      return;
    }
    
    this.lastErrorTime = now;
    this.errorCount++;
    
    if (this.errorCount > this.maxErrors) {
      console.warn('[GlobalErrorHandler] Too many errors, stopping error handling');
      return;
    }

    const error = event.reason;
    const errorInfo = {
      type: 'unhandledRejection',
      error: error,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorCount: this.errorCount
    };

    // Log the error
    logger.error('[GlobalErrorHandler] Unhandled promise rejection:', errorInfo);

    // Check if it's a network error that should be handled gracefully
    if (this.isNetworkError(error)) {
      console.warn('[GlobalErrorHandler] Network error detected - handling gracefully');
      this.handleNetworkError(error);
      event.preventDefault(); // Prevent the default error handling
      return;
    }

    // Check if it's an authentication error
    if (this.isAuthError(error)) {
      console.warn('[GlobalErrorHandler] Auth error detected - handling gracefully');
      this.handleAuthError(error);
      event.preventDefault();
      return;
    }

    // Check if it's a hydration error
    if (this.isHydrationError(error)) {
      console.warn('[GlobalErrorHandler] Hydration error detected - handling gracefully');
      this.handleHydrationError(error);
      event.preventDefault();
      return;
    }

    // Add to error queue for potential retry
    this.errorQueue.push(errorInfo);

    // Don't prevent default for serious errors - let them bubble up
    if (!this.isCriticalError(error)) {
      event.preventDefault();
    }
  }

  handleError(event) {
    const now = Date.now();
    
    // Throttle errors
    if (now - this.lastErrorTime < this.errorThrottleTime) {
      return;
    }
    
    this.lastErrorTime = now;
    this.errorCount++;
    
    if (this.errorCount > this.maxErrors) {
      return;
    }

    const error = event.error;
    const errorInfo = {
      type: 'javascriptError',
      error: error,
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorCount: this.errorCount
    };

    logger.error('[GlobalErrorHandler] JavaScript error:', errorInfo);

    // Handle specific error types gracefully
    if (this.isHydrationError(error)) {
      this.handleHydrationError(error);
      return;
    }

    this.errorQueue.push(errorInfo);
  }

  isNetworkError(error) {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    
    return errorString.includes('networkerror') ||
           errorString.includes('fetch') ||
           errorString.includes('connection') ||
           messageString.includes('networkerror') ||
           messageString.includes('fetch') ||
           messageString.includes('connection refused') ||
           messageString.includes('timeout') ||
           error.code === 'NETWORK_ERROR' ||
           error.name === 'NetworkError';
  }

  isAuthError(error) {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    
    return errorString.includes('401') ||
           errorString.includes('unauthorized') ||
           errorString.includes('authentication') ||
           messageString.includes('401') ||
           messageString.includes('unauthorized') ||
           messageString.includes('authentication') ||
           error.status === 401;
  }

  isHydrationError(error) {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    
    return errorString.includes('hydration') ||
           errorString.includes('text content does not match') ||
           messageString.includes('hydration') ||
           messageString.includes('text content does not match') ||
           error.digest?.includes('418');
  }

  isCriticalError(error) {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    
    return errorString.includes('out of memory') ||
           errorString.includes('heap') ||
           errorString.includes('allocation failed') ||
           messageString.includes('out of memory') ||
           messageString.includes('heap') ||
           messageString.includes('allocation failed');
  }

  handleNetworkError(error) {
    console.log('[GlobalErrorHandler] Handling network error gracefully');
    
    // Don't redirect or show error modals for network errors
    // Let components handle them individually
    
    // Could dispatch a custom event for components to listen to
    window.dispatchEvent(new CustomEvent('networkError', {
      detail: { error, handled: true }
    }));
  }

  handleAuthError(error) {
    console.log('[GlobalErrorHandler] Handling auth error gracefully');
    
    // Don't automatically redirect for auth errors
    // Let components decide what to do
    
    window.dispatchEvent(new CustomEvent('authError', {
      detail: { error, handled: true }
    }));
  }

  handleHydrationError(error) {
    console.log('[GlobalErrorHandler] Handling hydration error gracefully');
    
    // Clear any problematic cached data
    try {
      sessionStorage.removeItem('pendingSchemaSetup');
      sessionStorage.removeItem('onboarding_status');
      sessionStorage.removeItem('tenantId');
      localStorage.removeItem('sidebar-collapsed');
      
      // Clear app cache if available
      if (window.__appCache) {
        window.__appCache = {};
      }
    } catch (e) {
      console.warn('[GlobalErrorHandler] Failed to clear storage:', e);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('hydrationError', {
      detail: { error, handled: true }
    }));
  }

  getErrorStats() {
    return {
      errorCount: this.errorCount,
      queueLength: this.errorQueue.length,
      isInitialized: this.isInitialized
    };
  }

  reset() {
    this.errorCount = 0;
    this.errorQueue = [];
    this.lastErrorTime = 0;
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      window.removeEventListener('error', this.handleError.bind(this));
    }
    this.isInitialized = false;
  }
}

// Create singleton instance
const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;