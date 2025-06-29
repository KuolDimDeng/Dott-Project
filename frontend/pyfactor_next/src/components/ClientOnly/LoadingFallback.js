'use client';


import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';

export function LoadingFallback({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    logger.debug('[LoadingFallback] Component mounted');
    setIsClient(true);
    return () => {
      logger.debug('[LoadingFallback] Component unmounting');
    };
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex justify-center">
              <StandardSpinner size="large" />
            </div>
            <p className="mt-4 text-center text-sm text-gray-600">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default LoadingFallback;