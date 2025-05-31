'use client';

import { useState, useEffect } from 'react';

export default function AuthTestPage() {
  const [authState, setAuthState] = useState('loading');
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setAuthState('authenticated');
          setUserInfo(data.user);
        } else {
          setAuthState('unauthenticated');
        }
      } else {
        setAuthState('unauthenticated');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState('unauthenticated');
      setError(error.message);
    }
  };

  const handleSignIn = () => {
    window.location.href = '/api/auth/login';
  };

  const handleSignOut = () => {
    window.location.href = '/api/auth/logout';
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Checking authentication status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Auth0 Test Page</h2>
          <p className="mt-2 text-sm text-gray-600">Test your Auth0 integration</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Authentication Status
              </label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  authState === 'authenticated' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {authState === 'authenticated' ? '✓ Authenticated' : '✗ Not Authenticated'}
                </span>
              </div>
            </div>

            {userInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  User Information
                </label>
                <div className="mt-1 bg-gray-50 p-3 rounded-md">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(userInfo, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {error && (
              <div>
                <label className="block text-sm font-medium text-red-700">
                  Error
                </label>
                <div className="mt-1 bg-red-50 p-3 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              {authState === 'authenticated' ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In with Auth0
                </button>
              )}
              
              <button
                onClick={checkAuthStatus}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 