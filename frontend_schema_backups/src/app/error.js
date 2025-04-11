///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/error.js
'use client';

import React, { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error information without using logger
    console.error('[pyfactor] [Application error]:', error?.message || 'Unknown error');
    
    // Log the stack trace if available
    if (error?.stack) {
      console.error('[pyfactor] [Error stack]:', error.stack);
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          We're sorry for the inconvenience. Please try reloading the page.
        </p>
        <button
          onClick={reset}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}