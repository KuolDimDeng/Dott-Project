'use client';

import React, { useState, useEffect } from 'react';

export default function TestKenyaPricing() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const tests = {};
    
    // Test 1: Direct API call with Kenya
    try {
      console.log('🧪 Test 1: Calling /api/pricing/by-country?country=KE');
      const res1 = await fetch('/api/pricing/by-country?country=KE');
      const data1 = await res1.json();
      tests.directApi = {
        success: res1.ok,
        status: res1.status,
        data: data1
      };
      console.log('🧪 Test 1 Result:', data1);
    } catch (e) {
      tests.directApi = { error: e.message };
    }

    // Test 2: Backend test endpoint
    try {
      console.log('🧪 Test 2: Calling /api/test-kenya-pricing');
      const res2 = await fetch('/api/test-kenya-pricing');
      const data2 = await res2.json();
      tests.testEndpoint = {
        success: res2.ok,
        status: res2.status,
        data: data2
      };
      console.log('🧪 Test 2 Result:', data2);
    } catch (e) {
      tests.testEndpoint = { error: e.message };
    }

    // Test 3: Direct backend call
    try {
      console.log('🧪 Test 3: Direct backend call');
      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?country=KE`;
      console.log('🧪 Backend URL:', backendUrl);
      const res3 = await fetch(backendUrl);
      const data3 = await res3.json();
      tests.directBackend = {
        success: res3.ok,
        status: res3.status,
        data: data3,
        url: backendUrl
      };
      console.log('🧪 Test 3 Result:', data3);
    } catch (e) {
      tests.directBackend = { error: e.message };
    }

    setResults(tests);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Running tests...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kenya Pricing Test Results</h1>
      
      <div className="space-y-6">
        {Object.entries(results).map(([test, result]) => (
          <div key={test} className="border rounded-lg p-4 bg-gray-50">
            <h2 className="font-semibold text-lg mb-2">{test}</h2>
            <pre className="text-sm overflow-auto bg-white p-2 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Results for Kenya:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Country code: KE</li>
          <li>Discount: 50%</li>
          <li>Professional monthly: $7.50 (was $15.00)</li>
          <li>Professional yearly: $72.00 (was $144.00)</li>
        </ul>
      </div>

      <div className="mt-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Tests Again
        </button>
      </div>
    </div>
  );
}