'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession';

export function Complete() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    logger.debug('Complete step mounted');

    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="mt-16 flex flex-col items-center text-center space-y-6">
        {/* Success Icon */}
        <div className="text-green-500 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-20 w-20" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold">
          Setup Complete
        </h1>

        <h2 className="text-xl text-gray-600">
          Your workspace is ready
        </h2>

        <p className="text-gray-600">
          Welcome, {session?.user?.attributes?.['custom:firstname'] || 'User'}!
          Your account has been fully configured and you can now access all
          features.
        </p>

        <p className="text-sm text-gray-500 italic">
          Redirecting to dashboard...
        </p>

        <button
          onClick={() => router.replace('/dashboard')}
          className="mt-4 px-6 py-2 bg-primary-main hover:bg-primary-dark text-white rounded shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default Complete;