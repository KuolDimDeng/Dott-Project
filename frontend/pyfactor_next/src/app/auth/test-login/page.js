'use client';

import { useState } from 'react';

export default function TestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleDirectLogin = () => {
    // Use direct navigation instead of any fetch
    window.location.href = '/api/auth/login';
  };
  
  const handleLoginWithHint = () => {
    // Navigate with email hint
    window.location.href = `/api/auth/login?login_hint=${encodeURIComponent(email)}`;
  };
  
  const handleGoogleLogin = () => {
    // Navigate with Google connection
    window.location.href = '/api/auth/login?connection=google-oauth2';
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Auth0 Login Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="user@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (not used yet)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="********"
            />
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleDirectLogin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Login (No Hint)
            </button>
            
            <button
              onClick={handleLoginWithHint}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              disabled={!email}
            >
              Login with Email Hint
            </button>
            
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Login with Google
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h3>
            <p className="text-xs text-gray-600">
              This page uses window.location.href for navigation to avoid XHR/fetch issues.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Check browser console and network tab for any errors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}