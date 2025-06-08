'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SignInPage() {
  const [showManualLink, setShowManualLink] = useState(false);

  useEffect(() => {
    // Show manual link after 3 seconds if auto-redirect doesn't work
    const timer = setTimeout(() => {
      setShowManualLink(true);
    }, 3000);

    // Auto-redirect to Auth0 login
    window.location.href = '/api/auth/login';

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Dott
          </h1>
          <p className="mt-2 text-gray-600">
            🎉 Auth0 Integration Working!
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">
              Redirecting to Auth0 secure login...
            </p>
            
            {showManualLink && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 mb-2">
                  ✅ Auth0 endpoint is working!
                </p>
                <a 
                  href="/api/auth/login" 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Click here to login with Auth0
                </a>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/api/auth/login?screen_hint=signup" className="font-medium text-blue-600 hover:underline">
                Sign up for free
              </a>
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}