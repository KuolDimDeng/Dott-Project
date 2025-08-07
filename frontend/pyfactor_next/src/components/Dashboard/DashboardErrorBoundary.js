'use client';

import React from 'react';
import { logger } from '@/utils/logger';
import globalErrorHandler from '@/utils/globalErrorHandler';

/**
 * Enhanced Error Boundary specifically designed for dashboard components
 * Provides graceful fallbacks without redirecting users away from dashboard
 */
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      errorId: null,
      isNetworkError: false,
      isHydrationError: false,
      componentName: props.componentName || 'Dashboard Component'
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = `dashboard_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true,
      error: error,
      errorId: errorId,
      isNetworkError: DashboardErrorBoundary.isNetworkError(error),
      isHydrationError: DashboardErrorBoundary.isHydrationError(error)
    };
  }

  static isNetworkError(error) {
    if (!error) return false;
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    return errorString.includes('networkerror') ||
           errorString.includes('fetch') ||
           messageString.includes('networkerror') ||
           messageString.includes('connection') ||
           error.name === 'NetworkError';
  }

  static isHydrationError(error) {
    if (!error) return false;
    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    return errorString.includes('hydration') ||
           errorString.includes('text content does not match') ||
           messageString.includes('hydration') ||
           error.digest?.includes('418');
  }

  componentDidCatch(error, errorInfo) {
    const { componentName } = this.state;
    const errorId = this.state.errorId;
    
    // Log comprehensive error information
    logger.error(`[DashboardErrorBoundary] Error in ${componentName}:`, {
      errorId,
      componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      isNetworkError: this.state.isNetworkError,
      isHydrationError: this.state.isHydrationError,
      props: this.props
    });
    
    this.setState({
      errorInfo: errorInfo
    });

    // Handle specific error types
    if (this.state.isHydrationError) {
      this.handleHydrationError(error);
    } else if (this.state.isNetworkError) {
      this.handleNetworkError(error);
    }

    // Report to global error handler
    if (globalErrorHandler && globalErrorHandler.errorQueue) {
      globalErrorHandler.errorQueue.push({
        type: 'componentError',
        component: componentName,
        errorId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleHydrationError = (error) => {
    console.warn('[DashboardErrorBoundary] Handling hydration error for', this.state.componentName);
    
    // Clear problematic cached data
    try {
      sessionStorage.removeItem('pendingSchemaSetup');
      sessionStorage.removeItem('onboarding_status');
      if (window.__appCache) {
        window.__appCache = {};
      }
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }

    // Auto-retry once for hydration errors
    if (this.state.retryCount === 0) {
      setTimeout(() => {
        this.handleRetry();
      }, 100);
    }
  }

  handleNetworkError = (error) => {
    console.warn('[DashboardErrorBoundary] Handling network error for', this.state.componentName);
    
    // For network errors, we can try to retry after a delay
    if (this.state.retryCount < 2) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1));
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    logger.info(`[DashboardErrorBoundary] Retrying ${this.state.componentName} (attempt ${newRetryCount})`, {
      errorId: this.state.errorId,
      componentName: this.state.componentName,
      retryCount: newRetryCount
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });
  }

  render() {
    if (this.state.hasError) {
      const { componentName, error, retryCount, isNetworkError, isHydrationError, errorId } = this.state;
      const { fallbackComponent, minimal = false } = this.props;

      // If a custom fallback component is provided, use it
      if (fallbackComponent && typeof fallbackComponent === 'function') {
        return fallbackComponent(error, this.handleRetry, { componentName, errorId, retryCount });
      }

      // Minimal fallback for small components
      if (minimal) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">Component temporarily unavailable</p>
            </div>
            <button
              onClick={this.handleRetry}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        );
      }

      // Full fallback UI for larger components
      return (
        <div className="flex items-center justify-center p-8 bg-white border border-gray-200 rounded-lg">
          <div className="text-center max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {componentName} Unavailable
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {isNetworkError && 'Connection issue detected. '}
              {isHydrationError && 'Display sync issue detected. '}
              {!isNetworkError && !isHydrationError && 'An unexpected error occurred. '}
              This component is temporarily unavailable, but the rest of your dashboard is still working.
            </p>

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {retryCount >= 3 ? 'Max retries reached' : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
              </button>

              {retryCount >= 3 && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reload Page
                </button>
              )}
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-auto">
                  <div><strong>Component:</strong> {componentName}</div>
                  <div><strong>Error ID:</strong> {errorId}</div>
                  <div><strong>Error:</strong> {error?.message}</div>
                  {error?.stack && (
                    <div><strong>Stack:</strong><pre className="whitespace-pre-wrap text-xs mt-1">{error.stack}</pre></div>
                  )}
                </div>
              </details>
            )}

            <p className="text-xs text-gray-400 mt-4">
              Error ID: {errorId}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withDashboardErrorBoundary(Component, options = {}) {
  const WrappedComponent = (props) => (
    <DashboardErrorBoundary 
      componentName={options.componentName || Component.displayName || Component.name}
      minimal={options.minimal}
      fallbackComponent={options.fallbackComponent}
    >
      <Component {...props} />
    </DashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withDashboardErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default DashboardErrorBoundary;