///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/error/page.js
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';

const ERROR_MESSAGES = {
  OAuthCallback: 'There was an issue with the OAuth login process. Please try again.',
  AccessDenied: 'Access denied. You do not have permission to access this resource.',
  Configuration: 'There was an issue with the authentication configuration.',
  Unauthorized: 'Your session has expired or you are not authorized. Please sign in again.',
  Verification: 'Email verification is required. Please check your inbox.',
  Default: 'An unknown error occurred. Please try again.',
};

const REDIRECT_DELAY = 5000; // 5 seconds

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    // Log error
    logger.error('Authentication error occurred', {
      error,
      description: errorDescription,
    });

    // Show error toast
    toast.error(ERROR_MESSAGES[error] || ERROR_MESSAGES.Default, {
      toastId: error, // Prevent duplicate toasts
      autoClose: REDIRECT_DELAY - 1000, // Close just before redirect
    });

    // Redirect to sign-in page
    const timer = setTimeout(() => {
      logger.info('Redirecting to sign-in page...');
      router.push('/auth/signin');
    }, REDIRECT_DELAY);

    return () => clearTimeout(timer);
  }, [router, error, errorDescription]);

  const getErrorDetails = () => {
    return {
      title: 'Authentication Error',
      message: ERROR_MESSAGES[error] || ERROR_MESSAGES.Default,
      description: errorDescription || 'Please try signing in again.',
      severity: error === 'Verification' ? 'info' : 'error',
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8">
      <Image
        src="/static/images/Page-Not-Found-3--Streamline-Brooklyn.png"
        alt="Error Illustration"
        width={400}
        height={300}
        priority
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />

      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          {errorDetails.title}
        </h1>

        <div className={`border rounded-md p-4 mb-6 ${
          errorDetails.severity === 'info' 
            ? 'bg-blue-50 border-blue-200 text-blue-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="mb-2">
            {errorDetails.message}
          </p>
          {errorDescription && (
            <p className="text-sm text-gray-600">
              {errorDetails.description}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You will be redirected to the sign-in page in 5 seconds.
        </p>

        <div className="flex gap-4 justify-center mt-4">
          <Link
            href="/auth/signin"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors font-medium"
          >
            Return to Sign In
          </Link>
          <Link
            href="/"
            className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors font-medium"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

// Error boundary component
export function ErrorBoundary({ error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-2">
          Something went wrong
        </h2>
        <p className="text-sm">{error.message}</p>
      </div>
      <button 
        className="px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
        onClick={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  );
}
