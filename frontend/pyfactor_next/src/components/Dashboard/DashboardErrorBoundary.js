'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    console.error('[DashboardErrorBoundary] getDerivedStateFromError:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DashboardErrorBoundary] Error caught:', error);
    console.error('[DashboardErrorBoundary] Error info:', errorInfo);
    console.error('[DashboardErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-2xl w-full p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-700 mb-4">
                Dashboard Error
              </h1>
              <p className="text-red-600 mb-4">
                An error occurred while rendering the dashboard. This has been logged.
              </p>
              
              <div className="bg-white border border-red-100 rounded p-4 mb-4">
                <h2 className="font-semibold text-red-700 mb-2">Error Details:</h2>
                <p className="text-sm text-gray-700 font-mono">
                  {this.state.error && this.state.error.toString()}
                </p>
              </div>
              
              <div className="bg-white border border-red-100 rounded p-4 mb-4">
                <h2 className="font-semibold text-red-700 mb-2">Stack Trace:</h2>
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {this.state.error && this.state.error.stack}
                </pre>
              </div>
              
              {this.state.errorInfo && (
                <div className="bg-white border border-red-100 rounded p-4 mb-4">
                  <h2 className="font-semibold text-red-700 mb-2">Component Stack:</h2>
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;