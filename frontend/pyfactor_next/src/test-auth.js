'use client';

import { useEffect, useState } from 'react';
import { signIn, isAmplifyConfigured, configureAmplify } from '@/config/amplifyUnified';

export default function TestAuth() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testAuth() {
      try {
        // First check if Amplify is configured
        const configured = isAmplifyConfigured();
        setStatus(`Amplify configured: ${configured}`);
        
        if (!configured) {
          // Try to configure it
          const configResult = configureAmplify();
          setStatus(`Amplify configuration result: ${configResult}`);
        }
        
        // Now try a sign in with dummy credentials to test configuration
        setStatus('Testing sign in...');
        await signIn({
          username: 'test@example.com',
          password: 'password123',
          options: {
            authFlowType: 'USER_SRP_AUTH'
          }
        });
        
        setStatus('Sign in test completed without errors');
      } catch (error) {
        console.error('Auth test error:', error);
        setStatus('Auth test failed');
        setError(error.message || 'Unknown error');
      }
    }
    
    testAuth();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Auth Configuration Test</h1>
      <div className="mb-4">
        <p><strong>Status:</strong> {status}</p>
      </div>
      {error && (
        <div className="p-4 bg-red-100 rounded-md">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
    </div>
  );
}