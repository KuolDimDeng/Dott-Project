'use client';


import { useEffect, useState } from 'react';
import DynamicComponents from '@/components/DynamicComponents';

export default function TestCrispPage() {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSessionData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Check if Crisp is loaded
    const checkCrisp = setInterval(() => {
      if (window.$crisp) {
        console.log('[TestCrisp] Crisp object found:', window.$crisp);
        console.log('[TestCrisp] Crisp website ID:', window.CRISP_WEBSITE_ID);
        clearInterval(checkCrisp);
      }
    }, 1000);

    return () => clearInterval(checkCrisp);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Crisp Chat Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Session Status</h2>
          {loading ? (
            <p>Loading session...</p>
          ) : error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
          <p><strong>NEXT_PUBLIC_CRISP_WEBSITE_ID:</strong> {process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || 'Not set'}</p>
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open browser console (F12)</li>
            <li>Check for any errors</li>
            <li>Look for [CrispChat] and [DynamicComponents] logs</li>
            <li>Check if window.$crisp is available in console</li>
            <li>Crisp chat widget should appear in bottom-right corner</li>
          </ol>
        </div>
      </div>

      {/* Include DynamicComponents which includes CrispChat */}
      <DynamicComponents />
    </div>
  );
}