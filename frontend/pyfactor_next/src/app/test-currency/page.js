'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';

export default function TestCurrencyPage() {
  const { user, loading: sessionLoading } = useSession();
  const [apiTests, setApiTests] = useState({
    optionsTest: { status: 'pending', result: null },
    getTest: { status: 'pending', result: null },
    putTest: { status: 'pending', result: null },
    healthTest: { status: 'pending', result: null }
  });

  useEffect(() => {
    if (!sessionLoading) {
      runTests();
    }
  }, [sessionLoading]);

  const runTests = async () => {
    console.log('🧪 Starting Currency API Tests...');

    // Test 1: OPTIONS request
    try {
      console.log('📡 Test 1: OPTIONS /api/currency/preferences');
      const response = await fetch('/api/currency/preferences', {
        method: 'OPTIONS'
      });
      const data = await response.json();
      setApiTests(prev => ({
        ...prev,
        optionsTest: {
          status: response.ok ? 'success' : 'failed',
          result: { status: response.status, data }
        }
      }));
    } catch (error) {
      setApiTests(prev => ({
        ...prev,
        optionsTest: { status: 'error', result: error.message }
      }));
    }

    // Test 2: GET preferences
    try {
      console.log('📡 Test 2: GET /api/currency/preferences');
      const response = await fetch('/api/currency/preferences', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      console.log('GET Response:', { status: response.status, data });
      setApiTests(prev => ({
        ...prev,
        getTest: {
          status: response.ok ? 'success' : 'failed',
          result: { status: response.status, data }
        }
      }));
    } catch (error) {
      setApiTests(prev => ({
        ...prev,
        getTest: { status: 'error', result: error.message }
      }));
    }

    // Test 3: Backend health check (direct)
    try {
      console.log('📡 Test 3: Backend Health Check');
      const response = await fetch('https://api.dottapps.com/api/currency/health');
      const data = await response.json();
      setApiTests(prev => ({
        ...prev,
        healthTest: {
          status: response.ok ? 'success' : 'failed',
          result: { status: response.status, data }
        }
      }));
    } catch (error) {
      setApiTests(prev => ({
        ...prev,
        healthTest: { status: 'error', result: error.message }
      }));
    }
  };

  const testCurrencyUpdate = async (currencyCode) => {
    console.log('📡 Test PUT: Updating currency to', currencyCode);
    try {
      const response = await fetch('/api/currency/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currency_code: currencyCode,
          currency_name: `Test ${currencyCode}`,
          previous_currency: 'USD'
        })
      });
      const data = await response.json();
      console.log('PUT Response:', { status: response.status, data });
      setApiTests(prev => ({
        ...prev,
        putTest: {
          status: response.ok ? 'success' : 'failed',
          result: { status: response.status, data }
        }
      }));
    } catch (error) {
      console.error('PUT Error:', error);
      setApiTests(prev => ({
        ...prev,
        putTest: { status: 'error', result: error.message }
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'error': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'error': return '⚠️';
      default: return '⏳';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Currency API Test Page</h1>

      {/* Session Info */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold mb-2">Session Status</h2>
        <p>Loading: {sessionLoading ? 'Yes' : 'No'}</p>
        <p>Authenticated: {user ? 'Yes' : 'No'}</p>
        <p>User: {user?.email || 'Not logged in'}</p>
      </div>

      {/* API Tests */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">API Tests</h2>

        {Object.entries(apiTests).map(([testName, test]) => (
          <div key={testName} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium capitalize">
                {testName.replace(/Test$/, '')} Test
              </h3>
              <span className={`font-semibold ${getStatusColor(test.status)}`}>
                {getStatusIcon(test.status)} {test.status.toUpperCase()}
              </span>
            </div>
            {test.result && (
              <pre className="bg-gray-100 rounded p-2 text-xs overflow-auto">
                {JSON.stringify(test.result, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Manual Test Buttons */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Manual Tests</h2>
        
        <button
          onClick={runTests}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Re-run All Tests
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => testCurrencyUpdate('EUR')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Update to EUR
          </button>
          <button
            onClick={() => testCurrencyUpdate('SSP')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Update to SSP
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-gray-100 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <p className="text-sm">Frontend URL: {window.location.origin}</p>
        <p className="text-sm">Backend URL: https://api.dottapps.com</p>
        <p className="text-sm">Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}