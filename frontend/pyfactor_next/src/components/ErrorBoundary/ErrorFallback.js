'use client';

// src/components/ErrorBoundary/ErrorFallback.js

import React from 'react';
import { ErrorOutlineIcon } from '@/app/components/icons';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="container mx-auto max-w-md">
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center rounded-lg shadow-lg bg-white dark:bg-gray-800 w-full">
          <ErrorOutlineIcon 
            className="text-6xl text-error-main mb-4 mx-auto"
          />

          <h2 className="text-xl font-semibold text-error-main mb-2">
            Oops! Something went wrong
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={resetErrorBoundary} 
              className="px-4 py-2 bg-primary-main text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50"
            >
              Try again
            </button>

            <button 
              onClick={() => (window.location.href = '/')} 
              className="px-4 py-2 border border-primary-main text-primary-main rounded-md hover:bg-primary-main/5 focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50"
            >
              Go to Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 text-left">
              <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-4 rounded text-xs overflow-auto">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
