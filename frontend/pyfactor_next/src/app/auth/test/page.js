'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0';

export default function AuthTestPage() {
  const [authState, setAuthState] = useState('loading');
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;
    
    if (user) {
      setAuthState('authenticated');
      setUserInfo(user);
    } else {
      setAuthState('unauthenticated');
    }
  }, [user, isLoading]);

  const handleSignIn = () => {
    window.location.href = '/api/auth/login';
  };

  const handleSignOut = () => {
    window.location.href = '/api/auth/logout';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Auth0 Test Page</h1>
          <p className="mt-2 text-gray-600">Test Auth0 authentication integration</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Authentication Status</h2>
            <div className={`px-3 py-2 rounded-md text-sm font-medium ${
              authState === 'authenticated' 
                ? 'bg-green-100 text-green-800' 
                : authState === 'unauthenticated'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {authState.charAt(0).toUpperCase() + authState.slice(1)}
            </div>
          </div>

          {userInfo && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-2">User Information</h3>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-red-900 mb-2">Error</h3>
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {authState === 'unauthenticated' && (
              <button
                onClick={handleSignIn}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In with Auth0
              </button>
            )}
            
            {authState === 'authenticated' && (
              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 