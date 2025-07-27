import React from 'react';



// Fallback component for errors
const ErrorFallback = ({ error, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 mt-4">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-600 text-center mt-2">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go to homepage
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 rounded text-xs">
            <summary className="cursor-pointer text-gray-700">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap text-red-600">
              {error?.stack || error?.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

// Custom error boundary with Sentry integration
export const SentryErrorBoundary = ({ children, fallback, showDialog = false }) => {
  return (
    <ErrorBoundary 
      fallback={fallback || ErrorFallback} 
      showDialog={showDialog}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Hook to manually capture exceptions
export const useSentryError = () => {
  const captureError = React.useCallback((error, context = {}) => {
    Sentry.captureException(error, {
      contexts: {
        react: context,
      },
    });
  }, []);

  return { captureError };
};

export default SentryErrorBoundary;