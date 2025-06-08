'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/error.js

import React, { useEffect } from 'react';
import { removeCacheValue } from '@/utils/appCache';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error information without using logger
    console.error('[pyfactor] [Application error]:', error?.message || 'Unknown error');
    
    // Log the stack trace if available
    if (error?.stack) {
      console.error('[pyfactor] [Error stack]:', error.stack);
    }
    
    // Clean up any relevant cache entries for error recovery
    try {
      // Clear any in-progress operations from the cache
      removeCacheValue('current_operation');
      removeCacheValue('last_error');
      
      // Store the current error for diagnostics
      if (typeof window !== 'undefined' && appCache.getAll()) {
        appCache.set('last_error', {
          message: error?.message || 'Unknown error',
          stack: error?.stack || '',
          timestamp: new Date().toISOString()
        });
      }
    } catch (cleanupError) {
      console.error('[pyfactor] Error during cleanup:', cleanupError);
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