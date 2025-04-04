'use client';

import React, { useState, useEffect } from 'react';
import { 
  signIn, 
  fetchAuthSession, 
  fetchUserAttributes,
  getCurrentUser 
} from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import ConfigureAmplify from '@/components/ConfigureAmplify';

// Authentication test component
export default function AuthTest() {
  const [status, setStatus] = useState('Not started');
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({});
  const [config, setConfig] = useState({});
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);

  // Get configuration info on mount
  useEffect(() => {
    const getConfig = async () => {
      try {
        // Get environment configuration
        const envConfig = {
          region: process.env.NEXT_PUBLIC_AWS_REGION,
          userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
          clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
          authFlow: process.env.NEXT_PUBLIC_AUTH_FLOW_TYPE,
          allowedFlows: process.env.NEXT_PUBLIC_ALLOWED_AUTH_FLOWS
        };
        
        setConfig(envConfig);
        setStatus('Ready');
      } catch (err) {
        console.error('Error getting configuration:', err);
        setError(err.message);
        setStatus('Error loading config');
      }
    };
    
    getConfig();
  }, []);

  // Test authentication with provided credentials
  const testAuth = async () => {
    if (!testEmail || !testPassword) {
      setError('Please provide both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTestResults([]);
    
    try {
      // Add log entry
      addTestResult('info', 'Starting authentication test');
      addTestResult('info', `Testing with email: ${testEmail}`);
      
      // Try different auth flows
      const authFlows = ['USER_PASSWORD_AUTH', 'USER_SRP_AUTH'];
      let succeeded = false;
      
      for (const flow of authFlows) {
        try {
          addTestResult('info', `Attempting sign in with auth flow: ${flow}`);
          
          const startTime = Date.now();
          const result = await signIn({
            username: testEmail,
            password: testPassword,
            options: {
              authFlowType: flow,
              clientMetadata: {
                test_timestamp: new Date().toISOString(),
                test_client: 'web_diagnostics'
              }
            }
          });
          const endTime = Date.now();
          
          addTestResult('success', `Auth flow ${flow} succeeded in ${endTime - startTime}ms`);
          addTestResult('info', JSON.stringify({
            isSignedIn: result.isSignedIn,
            nextStep: result.nextStep?.signInStep
          }, null, 2));
          
          succeeded = true;
          
          // If sign in succeeded, try to get session and user info
          try {
            addTestResult('info', 'Fetching auth session...');
            const session = await fetchAuthSession();
            addTestResult('success', 'Session retrieved successfully');
            addTestResult('info', `Token expiration: ${new Date(session.tokens.accessToken.payload.exp * 1000).toLocaleString()}`);
            
            addTestResult('info', 'Fetching user attributes...');
            const attributes = await fetchUserAttributes();
            addTestResult('success', 'User attributes retrieved successfully');
            
            // Show key attributes (safely)
            if (attributes) {
              const safeAttributes = {
                email: attributes.email,
                email_verified: attributes.email_verified,
                onboarding: attributes['custom:onboarding'],
                setupdone: attributes['custom:setupdone']
              };
              addTestResult('info', 'Key attributes: ' + JSON.stringify(safeAttributes, null, 2));
            }
          } catch (postAuthError) {
            addTestResult('error', `Error after authentication: ${postAuthError.message}`);
          }
          
          break; // If this flow worked, no need to try others
        } catch (flowError) {
          addTestResult('error', `Auth flow ${flow} failed: ${flowError.message}`);
          
          // Add detailed error info
          if (flowError.code) {
            addTestResult('info', `Error code: ${flowError.code}`);
          }
          
          // Parse and show some common error details
          if (flowError.message) {
            if (flowError.message.includes('UserNotConfirmedException')) {
              addTestResult('warning', 'User exists but is not confirmed');
            } else if (flowError.message.includes('NotAuthorizedException')) {
              addTestResult('warning', 'Incorrect username or password');
            } else if (flowError.message.includes('UserNotFoundException')) {
              addTestResult('warning', 'User does not exist in Cognito');
            }
          }
        }
      }
      
      if (!succeeded) {
        addTestResult('error', 'All authentication flows failed');
      }
      
      setStatus(succeeded ? 'Authentication successful' : 'Authentication failed');
    } catch (err) {
      console.error('Error in auth test:', err);
      setError(err.message);
      setStatus('Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a result to the test results log
  const addTestResult = (type, message) => {
    setTestResults(prev => [...prev, {
      type, 
      message, 
      timestamp: new Date().toLocaleString()
    }]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ConfigureAmplify />
      
      <h1 className="text-2xl font-bold mb-4">Auth Diagnostics</h1>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Configuration</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Test Authentication</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={testAuth}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Authentication'}
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Status: {status}</h2>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md mb-4">
            {error}
          </div>
        )}
      </div>
      
      {testResults.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Test Results</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded text-sm ${
                  result.type === 'error' ? 'bg-red-50 text-red-800' :
                  result.type === 'success' ? 'bg-green-50 text-green-800' :
                  result.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                <span className="text-xs text-gray-500">{result.timestamp}</span>
                <div className="font-mono">{result.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 