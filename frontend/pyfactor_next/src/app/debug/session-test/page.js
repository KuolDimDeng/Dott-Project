'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionTestPage() {
  const router = useRouter();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const addResult = (test, status, details) => {
    setTestResults(prev => [...prev, { test, status, details, timestamp: new Date().toISOString() }]);
  };
  
  const clearCache = async () => {
    // Clear all client-side storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies via API
    await fetch('/api/auth/clear-cookies', { method: 'POST' });
    
    addResult('Clear Cache', 'success', 'All storage and cookies cleared');
  };
  
  const testSessionBridge = async () => {
    addResult('Session Bridge Test', 'running', 'Starting test...');
    
    // Simulate what happens in the auth callback
    const mockToken = 'test-token-' + Date.now();
    const bridgeData = {
      token: mockToken,
      redirectUrl: '/dashboard',
      timestamp: Date.now()
    };
    
    // Store in sessionStorage
    sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
    addResult('Session Bridge', 'info', `Stored bridge data with token: ${mockToken.substring(0, 20)}...`);
    
    // Navigate to session bridge
    addResult('Session Bridge', 'info', 'Navigating to /auth/session-bridge...');
    router.push('/auth/session-bridge');
  };
  
  const testDirectSession = async () => {
    addResult('Direct Session Test', 'running', 'Testing direct session creation...');
    
    try {
      // Test establish-session endpoint directly
      const formData = new FormData();
      formData.append('token', 'direct-test-token-' + Date.now());
      formData.append('redirectUrl', '/dashboard');
      formData.append('timestamp', Date.now().toString());
      
      const response = await fetch('/api/auth/establish-session', {
        method: 'POST',
        body: formData,
        redirect: 'manual' // Don't follow redirects
      });
      
      addResult('Establish Session', response.ok ? 'success' : 'error', 
        `Status: ${response.status}, Redirected: ${response.type === 'opaqueredirect'}`);
      
      // Check session
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      addResult('Session Check', sessionData?.authenticated ? 'success' : 'error',
        sessionData ? JSON.stringify(sessionData, null, 2) : 'No session found');
        
    } catch (error) {
      addResult('Direct Session Test', 'error', error.message);
    }
  };
  
  const checkCurrentSession = async () => {
    addResult('Current Session Check', 'running', 'Checking current session...');
    
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data && data.authenticated) {
        addResult('Session Status', 'success', JSON.stringify({
          email: data.user?.email,
          tenantId: data.user?.tenantId,
          needsOnboarding: data.user?.needsOnboarding,
          hasAccessToken: !!data.accessToken,
          hasSessionToken: !!data.sessionToken
        }, null, 2));
      } else {
        addResult('Session Status', 'warning', 'No active session');
      }
      
      // Check cookies
      const cookieResponse = await fetch('/api/debug/cookies');
      const cookies = await cookieResponse.json();
      
      addResult('Cookies', 'info', JSON.stringify(cookies, null, 2));
      
    } catch (error) {
      addResult('Session Check', 'error', error.message);
    }
  };
  
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Run tests in sequence
    await checkCurrentSession();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await clearCache();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testDirectSession();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await checkCurrentSession();
    
    setIsRunning(false);
    addResult('Test Suite', 'success', 'All tests completed');
  };
  
  // Check for console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      const message = args.join(' ');
      if (message.includes('[SessionBridge]') || message.includes('[EstablishSession]')) {
        addResult('Console Log', 'info', message);
      }
    };
    
    console.error = (...args) => {
      originalError(...args);
      addResult('Console Error', 'error', args.join(' '));
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Session Debugging Tool</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded">
          <p className="text-sm">
            <strong>⚠️ Development Only:</strong> This tool helps debug session issues locally.
            Test the login flow after clearing cache.
          </p>
        </div>
        
        <div className="flex gap-4 mb-8">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={checkCurrentSession}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Check Session
          </button>
          
          <button
            onClick={clearCache}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Clear All Cache
          </button>
          
          <button
            onClick={testSessionBridge}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Test Session Bridge
          </button>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results:</h2>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click "Run All Tests" to start.</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded border ${
                    result.status === 'success' ? 'bg-green-50 border-green-200' :
                    result.status === 'error' ? 'bg-red-50 border-red-200' :
                    result.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    result.status === 'running' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{result.test}</h3>
                      <pre className="text-sm mt-1 whitespace-pre-wrap">{result.details}</pre>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Run All Tests" to simulate the login flow</li>
            <li>Watch the console (F12) for detailed logs</li>
            <li>Check the Network tab to see API calls</li>
            <li>Use "Test Session Bridge" to manually test the bridge flow</li>
            <li>After tests, try navigating to /dashboard to see if session works</li>
          </ol>
        </div>
      </div>
    </div>
  );
}