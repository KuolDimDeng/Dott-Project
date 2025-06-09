'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EmailPasswordSignIn from '@/components/auth/EmailPasswordSignIn';

export default function EmailSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDebug, setShowDebug] = useState(false);
  
  // Check for debug mode
  useEffect(() => {
    const debug = searchParams.get('debug') === 'true';
    setShowDebug(debug);
  }, [searchParams]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <button
            onClick={() => router.push('/api/auth/login?connection=google-oauth2')}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            sign in with Google
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <EmailPasswordSignIn />
        </div>
      </div>
      
      {showDebug && (
        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Debug Information
            </h3>
            <div className="text-xs space-y-1 font-mono">
              <div>Auth0 Domain: auth.dottapps.com (custom)</div>
              <div>Connection: Username-Password-Authentication</div>
              <div>Grant Type: password (Resource Owner)</div>
              <div>Token Endpoint: https://auth.dottapps.com/oauth/token</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}