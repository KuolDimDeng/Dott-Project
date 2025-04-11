'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SimpleFallback({ error, errorInfo, resetErrorBoundary }) {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  
  const handleReload = () => {
    setIsReloading(true);
    
    // Simple reload without circuit breaker parameters
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      // This should never happen, but just in case
      if (resetErrorBoundary) {
        resetErrorBoundary();
      }
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Application Error</h1>
        <p className="text-gray-600 mb-6">We're experiencing some technical difficulties. Please try refreshing the page.</p>
        
        <div className="flex flex-col space-y-3">
          {isReloading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
              <span>Reloading...</span>
            </div>
          ) : (
            <button
              onClick={handleReload}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200"
            >
              Reload Page
            </button>
          )}
          
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Homepage
          </Link>
          
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            {showDebugInfo ? 'Hide' : 'Show'} Technical Details
          </button>
        </div>
        
        {showDebugInfo && error && (
          <div className="mt-6 p-3 bg-gray-100 rounded-md text-left overflow-auto">
            <p className="text-sm font-mono text-red-600 break-all">{error.message || 'Unknown error'}</p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer">Stack Trace</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-32 p-2 bg-gray-200 rounded">{error.stack}</pre>
              </details>
            )}
            {errorInfo && errorInfo.componentStack && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer">Component Stack</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-32 p-2 bg-gray-200 rounded">{errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 