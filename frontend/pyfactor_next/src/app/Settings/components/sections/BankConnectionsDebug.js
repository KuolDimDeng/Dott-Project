'use client';

import React, { useState, useEffect } from 'react';

const BankConnectionsDebug = () => {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First check what cookies we have
        console.log('🔍 [Debug] Document cookies:', document.cookie);
        
        // Check for session cookie specifically
        const sidCookie = document.cookie.split(';').find(c => c.trim().startsWith('sid='));
        console.log('🔍 [Debug] Session cookie found:', sidCookie ? sidCookie.trim() : 'NO SESSION COOKIE');
        
        console.log('🔍 [Debug] Fetching /api/users/me...');
        const response = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('🔍 [Debug] Response status:', response.status);
        console.log('🔍 [Debug] Response ok:', response.ok);
        console.log('🔍 [Debug] Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 [Debug] API Error:', response.status, errorText);
          setError(`API Error ${response.status}: ${errorText}`);
          return;
        }
        
        const data = await response.json();
        
        console.log('🔍 [Debug] Full response:', data);
        console.log('🔍 [Debug] Country field:', data.country);
        console.log('🔍 [Debug] Business Country field:', data.business_country);
        
        setApiData(data);
      } catch (err) {
        console.error('🔍 [Debug] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading debug info...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
      <h3 className="font-bold text-red-800 mb-2">DEBUG: API Response</h3>
      <div className="text-sm text-red-700">
        <p>Email: {apiData?.email}</p>
        <p>Country: {apiData?.country || 'NOT SET'}</p>
        <p>Business Country: {apiData?.business_country || 'NOT SET'}</p>
        <p>Tenant ID: {apiData?.tenant_id}</p>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-red-600">Full Response</summary>
        <pre className="text-xs overflow-auto mt-2 bg-white p-2 rounded">
          {JSON.stringify(apiData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default BankConnectionsDebug;