'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { usePostHog } from 'posthog-js/react';

export default function PostHogTestPage() {
  const { session, isAuthenticated } = useSession();
  const posthog = usePostHog();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testIdentification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/posthog-identify', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success && posthog) {
        // Actually identify the user in PostHog
        const { identifyUser } = await import('@/lib/posthog');
        identifyUser(data.posthogData);
        
        // Capture a test event
        posthog.capture('posthog_test_identification', {
          test_source: 'debug_page',
          timestamp: new Date().toISOString()
        });
        
        setResult(prev => ({
          ...prev,
          identificationStatus: 'User identified in PostHog successfully',
          testEventSent: true
        }));
      }
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const checkPostHogStatus = () => {
    if (!posthog) {
      setResult({ error: 'PostHog not initialized' });
      return;
    }
    
    setResult({
      posthogStatus: 'PostHog is initialized',
      distinctId: posthog.get_distinct_id(),
      sessionId: posthog.get_session_id(),
      isIdentified: posthog._isIdentified?.() || 'Unknown'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PostHog Identification Test</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>User Email:</strong> {session?.user?.email || 'N/A'}</p>
            <p><strong>User Name:</strong> {session?.user?.name || 'N/A'}</p>
            <p><strong>Tenant ID:</strong> {session?.user?.tenantId || 'N/A'}</p>
            <p><strong>Role:</strong> {session?.user?.role || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">PostHog Status</h2>
          <div className="space-y-4">
            <button
              onClick={checkPostHogStatus}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Check PostHog Status
            </button>
            
            <button
              onClick={testIdentification}
              disabled={loading || !isAuthenticated}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 ml-4"
            >
              {loading ? 'Testing...' : 'Test User Identification'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}