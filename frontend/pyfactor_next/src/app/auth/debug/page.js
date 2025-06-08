'use client';


import { useUser } from '@auth0/nextjs-auth0';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/TailwindComponents';

export default function Auth0DebugPage() {
  const { user, error, isLoading } = useUser();
  const [sessionData, setSessionData] = useState(null);
  const [apiMeData, setApiMeData] = useState(null);
  
  useEffect(() => {
    // Check session via API
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        setSessionData(data);
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    // Check /api/me endpoint
    const checkApiMe = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        setApiMeData(data);
      } catch (error) {
        console.error('Error checking /api/me:', error);
      }
    };
    
    checkSession();
    checkApiMe();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Auth0 Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Client-Side User (useUser hook)</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="text-red-600">
              <p>Error: {error.message}</p>
            </div>
          ) : user ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          ) : (
            <p>No user logged in</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Session Data (/api/auth/me)</h2>
          {sessionData ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          ) : (
            <p>No session data</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">API Me Data (/api/me)</h2>
          {apiMeData ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(apiMeData, null, 2)}
            </pre>
          ) : (
            <p>No API me data</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Auth0 Configuration</h2>
          <div className="space-y-2">
            <p><strong>Domain:</strong> {process.env.NEXT_PUBLIC_AUTH0_DOMAIN}</p>
            <p><strong>Client ID:</strong> {process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}</p>
            <p><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}</p>
          </div>
          
          <div className="mt-6 space-x-4">
            <Button onClick={() => window.location.href = '/api/auth/login'}>
              Login
            </Button>
            <Button onClick={() => window.location.href = '/api/auth/logout'}>
              Logout
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}