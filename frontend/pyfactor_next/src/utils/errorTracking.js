/**
 * Enhanced Error Tracking System
 * Provides comprehensive error tracking with Sentry integration
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

class ErrorTracker {
  constructor() {
    this.errorQueue = [];
    this.isInitialized = false;
    this.userContext = {};
    this.errorCounts = {};
    this.maxErrorsPerType = 10; // Prevent error spam
  }

  /**
   * Initialize error tracking
   */
  initialize(config = {}) {
    if (this.isInitialized) return;

    // Initialize Sentry if in production
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
        tracesSampleRate: config.tracesSampleRate || 0.1,
        beforeSend: (event, hint) => this.beforeSend(event, hint),
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    }

    // Set up global error handlers
    this.setupGlobalHandlers();
    this.isInitialized = true;
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandledRejection',
        promise: event.promise,
      });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || event.message, {
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Track console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.captureError(args[0], {
        type: 'consoleError',
        arguments: args,
      });
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Before send hook for Sentry
   */
  beforeSend(event, hint) {
    // Filter out non-critical errors
    const error = hint.originalException;
    
    // Skip network errors that are expected
    if (error?.message?.includes('NetworkError')) {
      const isExpected = [
        'posthog',
        'analytics',
        'tracking',
        'beacon',
      ].some(term => error.message.toLowerCase().includes(term));
      
      if (isExpected) return null;
    }

    // Skip CORS errors for external services
    if (error?.message?.includes('CORS')) {
      return null;
    }

    // Add user context
    if (this.userContext.userId) {
      event.user = {
        id: this.userContext.userId,
        email: this.userContext.email,
        username: this.userContext.username,
      };
    }

    // Add custom context
    event.contexts = {
      ...event.contexts,
      app: {
        version: process.env.NEXT_PUBLIC_APP_VERSION,
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
      },
      session: {
        sessionId: this.userContext.sessionId,
        tenantId: this.userContext.tenantId,
      },
    };

    return event;
  }

  /**
   * Capture an error
   */
  captureError(error, context = {}) {
    try {
      // Create error signature for deduplication
      const errorSignature = this.getErrorSignature(error);
      
      // Check rate limiting
      if (!this.shouldCaptureError(errorSignature)) {
        return;
      }

      // Increment error count
      this.incrementErrorCount(errorSignature);

      // Create error object
      const errorObject = {
        message: error?.message || String(error),
        stack: error?.stack,
        type: error?.name || 'Error',
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...this.getBrowserContext(),
      };

      // Log locally
      logger.error('[ErrorTracker]', errorObject);

      // Send to Sentry if available
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error, {
          contexts: {
            custom: context,
          },
        });
      }

      // Send to custom backend
      this.sendToBackend(errorObject);

      // Add to error queue
      this.errorQueue.push(errorObject);
      
      // Limit queue size
      if (this.errorQueue.length > 100) {
        this.errorQueue.shift();
      }

    } catch (trackingError) {
      console.log('Error tracking failed:', trackingError);
    }
  }

  /**
   * Get error signature for deduplication
   */
  getErrorSignature(error) {
    const message = error?.message || String(error);
    const stack = error?.stack || '';
    return `${message}-${stack.split('\n')[0]}`;
  }

  /**
   * Check if error should be captured (rate limiting)
   */
  shouldCaptureError(signature) {
    const count = this.errorCounts[signature] || 0;
    return count < this.maxErrorsPerType;
  }

  /**
   * Increment error count
   */
  incrementErrorCount(signature) {
    this.errorCounts[signature] = (this.errorCounts[signature] || 0) + 1;
    
    // Reset counts periodically
    setTimeout(() => {
      if (this.errorCounts[signature] > 0) {
        this.errorCounts[signature]--;
      }
    }, 60000); // Decay after 1 minute
  }

  /**
   * Get browser context
   */
  getBrowserContext() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
      memory: navigator.deviceMemory,
      connection: navigator.connection?.effectiveType,
      language: navigator.language,
      platform: navigator.platform,
    };
  }

  /**
   * Send error to backend
   */
  async sendToBackend(errorObject) {
    try {
      const response = await fetch('/api/errors/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorObject),
      });

      if (!response.ok) {
        console.log('Failed to send error to backend:', response.status);
      }
    } catch (error) {
      console.log('Error sending to backend:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(context) {
    this.userContext = {
      ...this.userContext,
      ...context,
    };

    // Update Sentry user context
    if (typeof Sentry !== 'undefined' && Sentry.setUser) {
      Sentry.setUser({
        id: context.userId,
        email: context.email,
        username: context.username,
      });
    }
  }

  /**
   * Clear user context
   */
  clearUserContext() {
    this.userContext = {};
    
    if (typeof Sentry !== 'undefined' && Sentry.setUser) {
      Sentry.setUser(null);
    }
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(message, level = 'info', context = {}) {
    const messageObject = {
      message,
      level,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Log locally
    logger.info('[ErrorTracker]', messageObject);

    // Send to Sentry
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(message, level);
    }
  }

  /**
   * Capture breadcrumb for debugging
   */
  captureBreadcrumb(breadcrumb) {
    if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
      Sentry.addBreadcrumb(breadcrumb);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory() {
    return [...this.errorQueue];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorQueue = [];
    this.errorCounts = {};
  }

  /**
   * Test error tracking
   */
  testErrorTracking() {
    this.captureError(new Error('Test error from ErrorTracker'), {
      test: true,
      timestamp: Date.now(),
    });
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Initialize on load
if (typeof window !== 'undefined') {
  errorTracker.initialize();
}

export default errorTracker;

// React Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    errorTracker.captureError(error, {
      type: 'React Error Boundary',
      componentStack: errorInfo.componentStack,
      props: this.props,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            We've been notified of this error and are working to fix it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error tracking
export function useErrorTracking() {
  const captureError = (error, context) => {
    errorTracker.captureError(error, context);
  };

  const captureMessage = (message, level, context) => {
    errorTracker.captureMessage(message, level, context);
  };

  return {
    captureError,
    captureMessage,
    setUserContext: (context) => errorTracker.setUserContext(context),
    clearUserContext: () => errorTracker.clearUserContext(),
  };
}