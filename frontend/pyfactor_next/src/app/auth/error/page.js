'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ERROR_MESSAGES = {
  missing_code: 'Authorization code is missing. Please try signing in again.',
  code_reused: 'This sign-in link has already been used. Please sign in again.',
  exchange_failed: 'Failed to complete sign-in. Please try again.',
  auth_failed: 'Authentication failed. Please sign in again.',
  session_expired: 'Your session has expired. Please sign in again.',
  network_error: 'Network error occurred. Please check your connection and try again.',
  unexpected_error: 'An unexpected error occurred. Please try again.',
  oauth_configuration_error: 'OAuth configuration error. Please contact support.',
  invalid_grant: 'Invalid authorization grant. Please try signing in again.',
  timeout: 'The request timed out. Please try again.',
  access_denied: 'Access was denied. Please ensure you have the correct permissions.',
  // User-friendly messages
  default: 'Something went wrong. Please try signing in again.'
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  
  const errorCode = searchParams.get('error') || 'default';
  const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
  const details = searchParams.get('details');
  
  useEffect(() => {
    // Countdown to redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/auth/signin');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  const handleRetry = () => {
    router.push('/auth/signin');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          
          {/* Error Message */}
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          
          {/* Error Details (if available) */}
          {details && (
            <div className="bg-gray-50 rounded p-3 mb-4">
              <p className="text-sm text-gray-500">
                Error details: {details}
              </p>
            </div>
          )}
          
          {/* Error Code */}
          <p className="text-xs text-gray-400 mb-6">
            Error code: {errorCode}
          </p>
          
          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            
            <p className="text-sm text-gray-500">
              Redirecting to sign in page in {countdown} seconds...
            </p>
          </div>
          
          {/* Support Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a 
                href="mailto:support@dottapps.com" 
                className="text-blue-600 hover:text-blue-700"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}