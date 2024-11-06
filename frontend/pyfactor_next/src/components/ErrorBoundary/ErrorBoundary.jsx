// src/components/ErrorBoundary/ErrorBoundary.jsx
'use client';

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './ErrorFallback';

function logErrorToService(error, info) {
  // In production, you can send to an error reporting service
  console.error('Error caught by boundary:', error);
  console.error('Error info:', info);
}

export function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logErrorToService}
      onReset={() => {
        // Reset the state of your app here
        window.location.href = '/';
      }}
    >
      {children}
    </ErrorBoundary>
  );
}