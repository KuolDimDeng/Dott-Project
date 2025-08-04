'use client';

import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Async Error Boundary
 * Combines error boundary with Suspense for async components
 */
const AsyncErrorBoundary = ({ 
  children, 
  fallback,
  loadingFallback,
  name = 'AsyncComponent' 
}) => {
  const defaultLoadingFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <ErrorBoundary name={name} fallback={fallback}>
      <Suspense fallback={loadingFallback || defaultLoadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default AsyncErrorBoundary;