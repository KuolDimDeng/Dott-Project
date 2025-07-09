'use client';

import React, { useState, useEffect } from 'react';
import { getCountryCode, getCountryName } from '@/utils/countryMapping';

export default function TestKenyaPricingFix() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const tests = {};
    
    // Test country mapping
    tests.countryMapping = {
      kenyaNameToCode: getCountryCode('Kenya'),
      kenyaCodeToName: getCountryName('KE'),
      testConversion: {
        input: 'Kenya',
        output: getCountryCode('Kenya'),
        expected: 'KE'
      }
    };
    
    // Test 1: API call with KE (country code)
    try {
      console.log('🧪 Test 1: Calling /api/pricing/by-country?country=KE');
      const res1 = await fetch('/api/pricing/by-country?country=KE');
      const data1 = await res1.json();
      tests.withCountryCode = {
        success: res1.ok,
        status: res1.status,
        data: data1,
        discount: data1.discount_percentage,
        expectedDiscount: 50
      };
      console.log('🧪 Test 1 Result:', data1);
    } catch (e) {
      tests.withCountryCode = { error: e.message };
    }

    // Test 2: API call with Kenya (country name) - should fail
    try {
      console.log('🧪 Test 2: Calling /api/pricing/by-country?country=Kenya');
      const res2 = await fetch('/api/pricing/by-country?country=Kenya');
      const data2 = await res2.json();
      tests.withCountryName = {
        success: res2.ok,
        status: res2.status,
        data: data2,
        discount: data2.discount_percentage,
        note: 'This should return US pricing (0% discount) because backend expects country code'
      };
      console.log('🧪 Test 2 Result:', data2);
    } catch (e) {
      tests.withCountryName = { error: e.message };
    }

    // Test 3: Direct backend call with KE
    try {
      console.log('🧪 Test 3: Direct backend call with KE');
      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?country=KE`;
      console.log('🧪 Backend URL:', backendUrl);
      const res3 = await fetch(backendUrl);
      const data3 = await res3.json();
      tests.directBackend = {
        success: res3.ok,
        status: res3.status,
        data: data3,
        url: backendUrl,
        discount: data3.discount_percentage
      };
      console.log('🧪 Test 3 Result:', data3);
    } catch (e) {
      tests.directBackend = { error: e.message };
    }

    setResults(tests);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Running tests...</div>;

  const allTestsPassed = 
    results.countryMapping?.testConversion?.output === 'KE' &&
    results.withCountryCode?.discount === 50 &&
    results.directBackend?.discount === 50;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kenya Pricing Fix Test Results</h1>
      
      <div className={`mb-6 p-4 rounded-lg ${allTestsPassed ? 'bg-green-50' : 'bg-red-50'}`}>
        <h2 className="text-lg font-semibold mb-2">
          Overall Status: {allTestsPassed ? '✅ FIXED' : '❌ STILL BROKEN'}
        </h2>
        <p className="text-sm">
          {allTestsPassed 
            ? 'Kenya discount is now working correctly with country code KE!'
            : 'There are still issues with the Kenya discount implementation.'}
        </p>
      </div>
      
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
        <h3 className="font-semibold mb-2">Fix Summary:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Business form now stores country codes (KE) instead of names (Kenya)</li>
          <li>API calls now convert country names to codes before sending</li>
          <li>Backend expects and correctly processes 2-letter country codes</li>
          <li>Kenya (KE) should receive 50% discount on all plans</li>
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