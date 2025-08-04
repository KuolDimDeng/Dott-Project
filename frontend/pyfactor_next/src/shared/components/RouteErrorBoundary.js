'use client';

import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Route-specific Error Boundary
 * Specialized error boundary for route components
 */
const RouteErrorBoundary = ({ children, routeName }) => {
  const handleRouteError = (error, reset) => {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Unable to load {routeName || 'this page'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                The page encountered an error while loading. This might be temporary.
              </p>
            </div>
            
            <div className="mt-6 space-y-3">
              <button
                onClick={reset}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry Loading
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-500 text-center">
                Check console for error details
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary 
      name={`Route: ${routeName}`}
      fallback={handleRouteError}
      message={`Failed to load ${routeName}`}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;