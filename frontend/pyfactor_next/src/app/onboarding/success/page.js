'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SuccessPage() {
  const router = useRouter();
  const [setupStatus, setSetupStatus] = useState('initializing');
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initiateSetup = async () => {
      try {
        // Start the schema setup process in the background
        const setupResponse = await axiosInstance.post('/api/onboarding/setup/start/');
        
        if (setupResponse.data.status === 'success' || setupResponse.data.status === 'started') {
          logger.debug('Schema setup initiated:', setupResponse.data);
          
          // Redirect to dashboard immediately
          if (mounted) {
            setSetupStatus('ready');
            router.push('/dashboard');
          }
        } else {
          throw new Error('Setup failed to start');
        }
      } catch (error) {
        logger.error('Setup initiation failed:', error);
        if (mounted) {
          setError('Failed to start setup process');
          setSetupStatus('error');
        }
      }
    };

    initiateSetup();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className="mb-6 text-red-500">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Error</h1>
          <p className="text-lg text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retry Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto flex justify-center">
            <svg
              className="h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M14 24l8 8 16-16"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Setup Complete!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Your account has been successfully set up and is ready to use.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
