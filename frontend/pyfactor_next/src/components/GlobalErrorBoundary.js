/**
 * Global Error Boundary Provider
 * Wraps the entire application with error handling and provides global error context
 */

'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

// Global error context
const GlobalErrorContext = createContext(null);

// Hook to use global error context
export function useGlobalError() {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorBoundaryProvider');
  }
  return context;
}

// Global error state management
function GlobalErrorProvider({ children }) {
  const [globalErrors, setGlobalErrors] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  // Add global error
  const addGlobalError = useCallback((error, context = 'global') => {
    const errorInfo = {
      id: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      timestamp: new Date().toISOString(),
      dismissed: false
    };

    setGlobalErrors(prev => [...prev, errorInfo]);
    logger.error('[GlobalError] Added global error', errorInfo);

    return errorInfo.id;
  }, []);

  // Remove global error
  const removeGlobalError = useCallback((errorId) => {
    setGlobalErrors(prev => prev.filter(err => err.id !== errorId));
    logger.debug('[GlobalError] Removed global error', { errorId });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setGlobalErrors([]);
    logger.debug('[GlobalError] Cleared all global errors');
  }, []);

  // Dismiss error
  const dismissError = useCallback((errorId) => {
    setGlobalErrors(prev => 
      prev.map(err => 
        err.id === errorId ? { ...err, dismissed: true } : err
      )
    );
  }, []);

  // Handle online/offline status
  React.useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      logger.info('[GlobalError] Network connection restored');
    }

    function handleOffline() {
      setIsOnline(false);
      logger.warn('[GlobalError] Network connection lost');
      addGlobalError(
        new Error('Network connection lost'),
        'network'
      );
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addGlobalError]);

  // Handle unhandled promise rejections
  React.useEffect(() => {
    function handleUnhandledRejection(event) {
      logger.error('[GlobalError] Unhandled promise rejection', event.reason);
      addGlobalError(
        event.reason instanceof Error ? event.reason : new Error(event.reason),
        'unhandledPromise'
      );
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addGlobalError]);

  const contextValue = {
    globalErrors: globalErrors.filter(err => !err.dismissed),
    isOnline,
    addGlobalError,
    removeGlobalError,
    clearAllErrors,
    dismissError
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
      <GlobalErrorDisplay />
    </GlobalErrorContext.Provider>
  );
}

// Global error display component
function GlobalErrorDisplay() {
  const { globalErrors, dismissError, isOnline } = useGlobalError();

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center z-50">
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
          </svg>
          You're offline. Some features may not work properly.
        </div>
      </div>
    );
  }

  if (globalErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {globalErrors.slice(-3).map((errorInfo) => (
        <div
          key={errorInfo.id}
          className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {errorInfo.context.charAt(0).toUpperCase() + errorInfo.context.slice(1)} Error
              </h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{errorInfo.error.message || 'An unexpected error occurred'}</p>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => dismissError(errorInfo.id)}
                className="bg-red-50 rounded-md inline-flex text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main global error boundary component
export default function GlobalErrorBoundary({ children }) {
  const globalFallback = (error, retry) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Application Error
        </h2>
        
        <p className="text-gray-600 mb-6">
          The application has encountered a critical error and needs to restart.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={retry}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Restart Application
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Go to Home
          </button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context="global"
      fallback={globalFallback}
      title="Critical Application Error"
      message="The application has encountered a critical error."
      showDetails={true}
    >
      <GlobalErrorProvider>
        {children}
      </GlobalErrorProvider>
    </ErrorBoundary>
  );
}