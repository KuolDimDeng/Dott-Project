'use client';

import { useState, useEffect } from 'react';

export default function TestKenyaDebugPage() {
  const [debugData, setDebugData] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // Test the debug endpoint
        console.log('🚨 Testing Kenya debug endpoint...');
        const debugResponse = await fetch('/api/debug/kenya-pricing');
        const debugJson = await debugResponse.json();
        console.log('🚨 Debug response:', debugJson);
        setDebugData(debugJson);

        // Test the pricing endpoint directly
        console.log('🚨 Testing pricing endpoint with country=KE...');
        const pricingResponse = await fetch('/api/pricing/by-country?country=KE');
        const pricingJson = await pricingResponse.json();
        console.log('🚨 Pricing response:', pricingJson);
        setPricingData(pricingJson);

      } catch (err) {
        console.error('🚨 Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, []);

  if (loading) return <div className="p-8">Loading debug data...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kenya Pricing Debug Test</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Endpoint Results</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Pricing Endpoint Results (country=KE)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(pricingData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Analysis</h2>
          {debugData && (
            <div className="space-y-2">
              <p>Kenya in database: <span className={debugData.debug?.kenya_in_db ? 'text-green-600' : 'text-red-600'}>
                {debugData.debug?.kenya_in_db ? '✓ Yes' : '✗ No'}
              </span></p>
              <p>Kenya discount: {debugData.debug?.discount_lookup}%</p>
              <p>Total countries: {debugData.debug?.total_countries}</p>
              {pricingData && (
                <>
                  <p>Pricing country returned: {pricingData.country_code}</p>
                  <p>Discount applied: {pricingData.discount_percentage}%</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}