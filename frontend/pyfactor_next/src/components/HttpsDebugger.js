import React, { useState } from 'react';
import { proxyApi } from '@/utils/httpsProxyFetch';

/**
 * HTTPS Debugger Component
 * - Tests API connectivity
 * - Resets circuit breakers
 * - Displays debug information
 */
export default function HttpsDebugger() {
  const [testResult, setTestResult] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [endpoint, setEndpoint] = useState('hr/employees');
  const [authToken, setAuthToken] = useState('');

  // Test the API connection
  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      // First try the direct endpoint with proper trailing slash
      try {
        // Add optional auth header if token is provided
        const headers = { 
          'Content-Type': 'application/json'
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const directResponse = await fetch(`https://127.0.0.1:8000/api/${endpoint}/`, {
          method: 'GET',
          headers,
        });
        console.log('[HttpsDebugger] Direct API response:', directResponse);
      } catch (directError) {
        console.warn('[HttpsDebugger] Direct API request failed:', directError);
      }
      
      // Then try the proxy with optional auth
      let proxyOptions = {};
      if (authToken) {
        proxyOptions = {
          headers: { 'Authorization': `Bearer ${authToken}` }
        };
      }
      
      const proxyResponse = await proxyApi.get(endpoint, proxyOptions);
      setTestResult({
        success: true,
        message: 'API connection successful',
        data: proxyResponse
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'API connection failed',
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset circuit breakers
  const resetCircuitBreakers = () => {
    try {
      const count = proxyApi.resetCircuitBreakers();
      setResetResult({
        success: true,
        message: `Reset ${count} circuit breakers`
      });
    } catch (error) {
      setResetResult({
        success: false,
        message: 'Failed to reset circuit breakers',
        error: error.message
      });
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 my-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">HTTPS Debug Tools</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-600 hover:text-blue-500"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="mb-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                API Endpoint
                <input 
                  type="text" 
                  value={endpoint} 
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="e.g., hr/employees"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>
              
              <label className="block text-sm font-medium text-gray-700">
                Auth Token (optional)
                <input 
                  type="text" 
                  value={authToken} 
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Bearer token for authenticated endpoints"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={testApiConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test API Connection'}
              </button>
              
              <button
                onClick={resetCircuitBreakers}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Reset Circuit Breakers
              </button>
            </div>
            
            {testResult && (
              <div className={`p-3 rounded ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-semibold">{testResult.message}</p>
                {!testResult.success && <p className="text-red-600 text-sm">{testResult.error}</p>}
                {testResult.success && testResult.data && (
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            {resetResult && (
              <div className={`p-3 rounded ${resetResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-semibold">{resetResult.message}</p>
                {!resetResult.success && <p className="text-red-600 text-sm">{resetResult.error}</p>}
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">Connection Information</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li><strong>Frontend URL:</strong> {window.location.origin}</li>
              <li><strong>API Proxy:</strong> {window.location.origin}/api/proxy/</li>
              <li><strong>Backend URL:</strong> https://127.0.0.1:8000/api/</li>
              <li>
                <strong>HTTPS Mode:</strong> {window.__HTTPS_ENABLED ? 'Enabled' : 'Disabled'}
              </li>
            </ul>
          </div>
          
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">Common API Endpoints</h4>
            <div className="text-sm space-y-1 text-gray-600">
              <button 
                onClick={() => setEndpoint('hr/employees')}
                className="block text-blue-500 hover:underline"
              >
                HR Employees
              </button>
              <button 
                onClick={() => setEndpoint('finance/transactions')}
                className="block text-blue-500 hover:underline"
              >
                Finance Transactions
              </button>
              <button 
                onClick={() => setEndpoint('database/health-check')}
                className="block text-blue-500 hover:underline"
              >
                Database Health Check
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>* This component is for development debugging only.</p>
          </div>
        </div>
      )}
    </div>
  );
}