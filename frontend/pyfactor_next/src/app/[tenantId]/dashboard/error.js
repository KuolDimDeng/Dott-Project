'use client';


import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export default function TenantDashboardError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('[TenantDashboardError]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 text-red-500 mx-auto mb-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Unable to load dashboard</h2>
        <p className="text-gray-700 mb-4">{error?.message || "There was a problem loading your data. Please try again later."}</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => reset()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Default Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}