'use client';

import React from 'react';

/**
 * A simple error boundary handler component that can be used throughout the app.
 * This component avoids using any dynamic imports or require statements.
 */
export default function ErrorBoundaryHandler({ children, fallback }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Set up error boundary effect
  React.useEffect(() => {
    // Define error handling functions
    const handleError = (event) => {
      console.error('Caught in ErrorBoundaryHandler:', event.error);
      setError(event.error);
      setHasError(true);
      
      // Prevent default to avoid the error being logged by the browser
      event.preventDefault();
    };

    // Add event listener for errors
    window.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Reset the error state
  const resetErrorBoundary = () => {
    setError(null);
    setHasError(false);
  };

  // If there's an error, show the fallback UI
  if (hasError) {
    // Use the provided fallback or a default one
    if (fallback) {
      return React.cloneElement(fallback, {
        error,
        resetErrorBoundary
      });
    }

    // Default fallback UI
    return (
      <div className="p-4 border border-red-500 rounded bg-red-50 text-red-900">
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="mt-2 text-sm">{error?.message || 'An unexpected error occurred'}</p>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // If there's no error, render the children
  return children;
} 