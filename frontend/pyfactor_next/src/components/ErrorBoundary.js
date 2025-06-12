'use client';

import React from 'react';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

/**
 * Enhanced ErrorBoundary component to catch JavaScript errors in child components
 * and display a user-friendly fallback UI with retry functionality
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = this.state.errorId;
    
    // Enhanced error logging
    logger.error('[ErrorBoundary] Component error caught', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      context: this.props.context || 'unknown'
    });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error, {
        context: this.props.context,
        errorId,
        componentStack: errorInfo.componentStack
      });
    }

    // Handle API errors specifically
    if (error.response || error.request) {
      errorHandler.handleApiError(error, this.props.context || 'ErrorBoundary', {
        showToast: false, // Don't show toast as we're showing UI
        logError: false, // Already logged above
        throwError: false
      });
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    logger.info('[ErrorBoundary] User initiated retry', {
      errorId: this.state.errorId,
      retryCount: newRetryCount,
      context: this.props.context
    });

    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });
  };

  handleReload = () => {
    logger.info('[ErrorBoundary] User initiated page reload', {
      errorId: this.state.errorId,
      context: this.props.context
    });

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    logger.info('[ErrorBoundary] User navigating to home', {
      errorId: this.state.errorId,
      context: this.props.context
    });

    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  renderErrorDetails = () => {
    if (process.env.NODE_ENV !== 'development' || !this.props.showDetails) {
      return null;
    }

    return (
      <details className="mt-4 w-full">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
          Technical Details (Development)
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-40">
          <div className="mb-2">
            <strong>Error ID:</strong> {this.state.errorId}
          </div>
          <div className="mb-2">
            <strong>Error:</strong> {this.state.error?.message}
          </div>
          <div className="mb-2">
            <strong>Stack:</strong>
            <pre className="whitespace-pre-wrap text-xs mt-1">
              {this.state.error?.stack}
            </pre>
          </div>
          {this.state.errorInfo?.componentStack && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="whitespace-pre-wrap text-xs mt-1">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback && typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Enhanced user-friendly fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
              <svg 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {this.props.title || 'Something went wrong'}
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {this.props.message || 
               'We encountered an unexpected error. Please try again or contact support if the problem persists.'}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Try Again
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>

            {/* Retry Counter */}
            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-4">
                Retry attempts: {this.state.retryCount}
              </p>
            )}

            {/* Error Details for Development */}
            {this.renderErrorDetails()}

            {/* Support Information */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Error ID: <span className="font-mono">{this.state.errorId}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                If you need help, please include this error ID when contacting support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component to wrap components with error boundary
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook to trigger error boundary from child components
export function useErrorBoundary() {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const triggerError = React.useCallback((error) => {
    setError(error instanceof Error ? error : new Error(error));
  }, []);

  return triggerError;
}

export { ErrorBoundary };
export default ErrorBoundary;