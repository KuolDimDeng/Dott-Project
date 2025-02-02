///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/error.js
'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export default function Error({ error, reset }) {
  useEffect(() => {
    logger.error('Application error:', error);
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