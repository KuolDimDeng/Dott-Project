import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ErrorFallback({ error }) {
  return (
    <div className="p-6">
      <div className="bg-error-light/10 border-l-4 border-error-main text-error-dark p-4 rounded-r">
        {error.message || 'An unexpected error occurred'}
      </div>
    </div>
  );
}

export function ErrorWrapper({ children }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
