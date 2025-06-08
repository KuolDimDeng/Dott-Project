'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Simple API test page that doesn't require authentication
 */
export default function TestPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch backend status on load
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        
        // Use the test API endpoint
        const response = await fetch('/api/test');
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        console.error('Error fetching status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatus();
  }, []);
  
  // Reset the test (refresh data)
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    
    fetch('/api/test')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => setStatus(data))
      .catch(err => {
        console.error('Error refreshing status:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };
  
  // Reset frontend circuit breakers
  const resetCircuitBreakers = () => {
    // Clear any circuit breaker data from localStorage
    const keys = Object.keys(localStorage);
    const circuitBreakerKeys = keys.filter(key => key.startsWith('circuitBreaker:'));
    
    circuitBreakerKeys.forEach(key => {
      console.log(`[resetCircuitBreakers] Removing ${key} from localStorage`);
      localStorage.removeItem(key);
    });
    
    alert(`Reset ${circuitBreakerKeys.length} circuit breakers`);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-xl font-bold text-white">HTTPS API Test Page</h1>
          <p className="text-blue-100 text-sm">No authentication required</p>
        </div>
        
        <div className="px-6 py-4">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Status'}
            </button>
            
            <button
              onClick={resetCircuitBreakers}
              className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded"
            >
              Reset Circuit Breakers
            </button>
            
            <Link href="/" className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded inline-block">
              Back to Home
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          {status && (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h2 className="text-lg font-medium">Backend Status</h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center mb-2">
                    <span className="font-medium mr-2">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.backend.status === 'ok' ? 'bg-green-100 text-green-800' 
                      : status.backend.status === 'responsive' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                      {status.backend.status}
                    </span>
                    {status.backend.statusCode && (
                      <span className="ml-2 text-sm text-gray-500">
                        HTTP {status.backend.statusCode}
                      </span>
                    )}
                  </div>
                  
                  {status.backend.message && (
                    <div className="text-sm text-blue-600 mb-4 p-2 bg-blue-50 rounded">
                      {status.backend.message}
                    </div>
                  )}
                  
                  {status.backend.error && (
                    <div className="text-sm text-red-600 mb-4">
                      {status.backend.error}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">Endpoint Status:</h3>
                    <div className="space-y-3">
                      {Object.entries(status.backend.endpoints).map(([endpoint, data]) => (
                        <div key={endpoint} className="border rounded p-3">
                          <div className="font-mono text-sm mb-1">{endpoint}</div>
                          <div className="flex items-center mb-1">
                            <span className="text-sm font-medium mr-2">Status:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              data.ok ? 'bg-green-100 text-green-800' 
                              : data.status === 401 ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                              {data.status}
                            </span>
                          </div>
                          {data.contentType && (
                            <div className="text-xs text-gray-500">
                              Content-Type: {data.contentType}
                            </div>
                          )}
                          {data.dataPreview && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Response preview:</div>
                              <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                {data.dataPreview}
                              </pre>
                            </div>
                          )}
                          {data.error && (
                            <div className="text-xs text-red-600 mt-1">
                              Error: {data.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {status.solutions && status.solutions.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h2 className="text-lg font-medium">Troubleshooting & Solutions</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {status.solutions.map((solution) => (
                        <div key={solution.id} className="border-l-4 border-blue-500 pl-3 py-2">
                          <h4 className="font-medium text-blue-700">{solution.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{solution.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Last updated: {new Date(status.timestamp).toLocaleString()}
              </div>
            </div>
          )}
          
          {loading && !status && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 