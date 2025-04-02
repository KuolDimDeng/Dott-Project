'use client';

import React from 'react';
import { resetAllCircuitBreakers } from '@/utils/circuit-breaker';

/**
 * Error boundary component that catches JavaScript errors anywhere in the child component tree
 * and provides a way to recover from them, including resetting circuit breakers
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleResetState = () => {
    try {
      // Reset circuit breakers to stop redirect loops
      resetAllCircuitBreakers();
      
      // Clear session storage and local storage
      sessionStorage.clear();
      localStorage.clear();
      
      this.setState({ 
        hasError: false,
        error: null,
        errorInfo: null,
        resetMessage: 'Application state reset successfully. Reloading...'
      });
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (e) {
      this.setState({ 
        resetMessage: `Failed to reset state: ${e.message}. Try reloading manually.`
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom FallbackComponent if provided
      if (this.props.FallbackComponent) {
        return <this.props.FallbackComponent 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.handleResetState}
        />;
      }
      
      // Otherwise, use default fallback UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 bg-gray-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Something went wrong</h2>
            <div className="bg-red-50 p-4 rounded-md mb-4">
              <p className="text-red-700 font-medium">
                {this.state.error && this.state.error.toString()}
              </p>
              {this.state.resetMessage && (
                <div className="mt-2 p-2 bg-green-100 text-green-800 rounded">
                  {this.state.resetMessage}
                </div>
              )}
            </div>
            <p className="mb-6 text-gray-600">
              The application encountered an error. This could be due to a temporary issue or a redirect loop.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={this.handleResetState}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
              >
                Reset Application State
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
              >
                Reload Page
              </button>
              <a 
                href="/"
                className="w-full text-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;