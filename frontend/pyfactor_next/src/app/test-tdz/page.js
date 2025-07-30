'use client';

import { useState } from 'react';

export default function TestTDZ() {
  const [error, setError] = useState(null);
  
  const testLazyLoading = async () => {
    try {
      console.log('Starting lazy load test...');
      
      // Test 1: Load the dashboard components
      const { BusinessOverviewDashboard } = await import('@/app/dashboard/components/LazyDashboardComponents');
      console.log('LazyDashboardComponents loaded successfully');
      
      // Test 2: Load the actual component
      const module = await import('@/app/dashboard/components/dashboards/BusinessOverviewDashboard');
      console.log('BusinessOverviewDashboard module loaded:', module);
      
      setError(null);
      console.log('All tests passed!');
    } catch (err) {
      console.error('TDZ Test Error:', err);
      setError(err.toString());
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TDZ Error Test</h1>
      
      <button
        onClick={testLazyLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Lazy Loading
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="font-bold text-red-700">Error:</h2>
          <pre className="text-sm mt-2">{error}</pre>
        </div>
      )}
    </div>
  );
}