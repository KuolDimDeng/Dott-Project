'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const error = searchParams.get('error');
  const email = searchParams.get('email');
  const [showError, setShowError] = useState(false);
  
  useEffect(() => {
    // Check for email verification error
    if (error === 'email_not_verified' && email) {
      setShowError(true);
      // Redirect to email signin page with error message after a delay
      setTimeout(() => {
        router.push(`/auth/email-signin?error=email_not_verified&email=${encodeURIComponent(email)}`);
      }, 2000);
    } else if (error) {
      // Show error briefly then redirect
      setShowError(true);
      setTimeout(() => {
        window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnUrl)}`;
      }, 3000);
    } else {
      // No error, redirect immediately
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnUrl)}`;
    }
  }, [returnUrl, error, email, router]);
  
  if (showError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error === 'email_not_verified' ? 'Email Verification Required' : 'Authentication Error'}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error === 'email_not_verified' ? (
                    <p>Please verify your email address before signing in. Check your inbox for the verification email.</p>
                  ) : error === 'state_mismatch' ? (
                    <p>Authentication state mismatch. Please try again.</p>
                  ) : (
                    <p>An error occurred during authentication. Redirecting...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}