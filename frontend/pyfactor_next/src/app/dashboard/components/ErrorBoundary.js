'use client';


import React from 'react';
import { logger } from '@/utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    logger.error('Dashboard error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      stack: error.stack
    });
    
    this.setState({ errorInfo });
    
    // Check for memory-related errors
    const errorString = error.toString();
    if (
      errorString.includes('out of memory') ||
      errorString.includes('heap') ||
      errorString.includes('allocation failed')
    ) {
      // Clear any pending schema setup to avoid getting stuck
      try {
        sessionStorage.removeItem('pendingSchemaSetup');
      } catch (e) {
        // Ignore errors when clearing session storage
      }
      
      // Try to free up memory
      if (global.gc) {
        try {
          global.gc();
        } catch (e) {
          console.error('Failed to force garbage collection', e);
        }
      }
    }
  }

  handleRetry = () => {
    // Clear any pending schema setup
    try {
      sessionStorage.removeItem('pendingSchemaSetup');
    } catch (e) {
      // Ignore errors when clearing session storage
    }
    
    // Increment retry count
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  }

  handleReload = () => {
    // Clear session storage and reload
    try {
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors when clearing session storage
    }
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Check if we've retried too many times
      const tooManyRetries = this.state.retryCount >= 3;
      
      // Render fallback UI
      return (
        <div className="flex flex-col justify-center items-center min-h-screen p-6 text-center">
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md mb-6 max-w-xl">
            Something went wrong while loading the dashboard.
          </div>
          
          <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-xl">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          
          {tooManyRetries && (
            <p className="mb-6 text-red-600 dark:text-red-400">
              We've tried several times but the issue persists. Please try reloading the page.
            </p>
          )}
          
          <div className="flex gap-4">
            {!tooManyRetries && (
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
            )}
            
            <button 
              className="px-4 py-2 border border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              onClick={this.handleReload}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;