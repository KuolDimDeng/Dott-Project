'use client';

import React, { useState, useEffect } from 'react';
import { getCountryCode } from '@/utils/countryMapping';

export default function TestKenyaPricing() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const testResults = {};
      
      // Test 1: Country code mapping
      testResults.countryCodeMapping = {
        'Kenya': getCountryCode('Kenya'),
        'KE': getCountryCode('KE'),
        'United States': getCountryCode('United States'),
        'US': getCountryCode('US')
      };
      
      // Test 2: API call with Kenya
      try {
        const response1 = await fetch('/api/pricing/by-country?country=Kenya');
        const data1 = await response1.json();
        testResults.apiWithCountryName = {
          status: response1.status,
          country: data1.country_code,
          discount: data1.discount_percentage
        };
      } catch (error) {
        testResults.apiWithCountryName = { error: error.message };
      }
      
      // Test 3: API call with KE
      try {
        const response2 = await fetch('/api/pricing/by-country?country=KE');
        const data2 = await response2.json();
        testResults.apiWithCountryCode = {
          status: response2.status,
          country: data2.country_code,
          discount: data2.discount_percentage
        };
      } catch (error) {
        testResults.apiWithCountryCode = { error: error.message };
      }
      
      // Test 4: Payment methods for Kenya
      try {
        const response3 = await fetch('/api/payment-methods/available?country=Kenya');
        const data3 = await response3.json();
        testResults.paymentMethodsKenya = data3;
      } catch (error) {
        testResults.paymentMethodsKenya = { error: error.message };
      }
      
      // Test 5: Payment methods for KE
      try {
        const response4 = await fetch('/api/payment-methods/available?country=KE');
        const data4 = await response4.json();
        testResults.paymentMethodsKE = data4;
      } catch (error) {
        testResults.paymentMethodsKE = { error: error.message };
      }
      
      setResults(testResults);
      setLoading(false);
    };
    
    runTests();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kenya Pricing Test Results</h1>
      
      {loading ? (
        <div>Running tests...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">1. Country Code Mapping</h2>
            <pre className="text-sm">{JSON.stringify(results.countryCodeMapping, null, 2)}</pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">2. API with Country Name (Kenya)</h2>
            <pre className="text-sm">{JSON.stringify(results.apiWithCountryName, null, 2)}</pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">3. API with Country Code (KE)</h2>
            <pre className="text-sm">{JSON.stringify(results.apiWithCountryCode, null, 2)}</pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">4. Payment Methods for Kenya</h2>
            <pre className="text-sm">{JSON.stringify(results.paymentMethodsKenya, null, 2)}</pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">5. Payment Methods for KE</h2>
            <pre className="text-sm">{JSON.stringify(results.paymentMethodsKE, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}