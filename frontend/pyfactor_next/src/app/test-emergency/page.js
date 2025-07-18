'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession-v2';

export default function TestEmergencyPage() {
  const { session } = useSession();
  const [emergencyData, setEmergencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testEmergencyEndpoint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hr/employee/profile/emergency');
      const data = await response.json();
      
      if (response.ok) {
        setEmergencyData(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Emergency Profile Endpoint Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Emergency Profile Data</h2>
            <button
              onClick={testEmergencyEndpoint}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Emergency Endpoint'}
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <pre className="text-sm text-red-700 whitespace-pre-wrap">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          {emergencyData && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(emergencyData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}