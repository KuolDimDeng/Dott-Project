'use client';

import { useEffect, useState } from 'react';
import { captureEvent } from '@/lib/posthog';

export default function PostHogTestPage() {
  const [logs, setLogs] = useState([]);
  const [eventCount, setEventCount] = useState(0);

  const addLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addLog('PostHog Test Page loaded');
    
    // Check if PostHog is available
    if (typeof window !== 'undefined') {
      addLog(`window.posthog exists: ${!!window.posthog}`);
      addLog(`Navigator online: ${navigator.onLine}`);
      
      if (window.posthog) {
        addLog(`Distinct ID: ${window.posthog.get_distinct_id()}`);
        addLog(`Session ID: ${window.posthog.get_session_id()}`);
        
        // Check localStorage
        const phKeys = Object.keys(localStorage).filter(k => k.includes('posthog'));
        addLog(`PostHog keys in localStorage: ${phKeys.length} found`);
        
        // Send initial pageview
        captureEvent('posthog_test_page_loaded', {
          timestamp: new Date().toISOString()
        });
        addLog('Sent posthog_test_page_loaded event');
      }
    }
  }, []);

  const sendTestEvent = () => {
    const eventName = `test_event_${eventCount + 1}`;
    const eventData = {
      count: eventCount + 1,
      timestamp: new Date().toISOString(),
      random: Math.random(),
      userAgent: navigator.userAgent,
      online: navigator.onLine
    };
    
    addLog(`Sending event: ${eventName}`);
    captureEvent(eventName, eventData);
    setEventCount(prev => prev + 1);
    
    // Also try direct call
    if (window.posthog) {
      window.posthog.capture(`${eventName}_direct`, eventData);
      addLog(`Also sent ${eventName}_direct via window.posthog`);
    }
  };

  const checkQueue = () => {
    if (window.posthog) {
      const queueLength = window.posthog._request_queue?.length || 0;
      addLog(`Request queue length: ${queueLength}`);
      
      if (queueLength > 0) {
        addLog('Queue contents:');
        window.posthog._request_queue.forEach((item, index) => {
          addLog(`  [${index}] ${JSON.stringify(item).substring(0, 100)}...`);
        });
      }
    }
  };

  const forceFlush = () => {
    if (window.posthog) {
      addLog('Forcing flush...');
      window.posthog.flush();
      addLog('Flush complete');
      setTimeout(checkQueue, 500);
    }
  };

  const checkNetwork = async () => {
    addLog('Checking network connectivity to PostHog...');
    
    try {
      const response = await fetch('https://app.posthog.com/decide/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          distinct_id: 'test-connection'
        })
      });
      
      addLog(`Network response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`PostHog responded: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (error) {
      addLog(`Network error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PostHog Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={sendTestEvent}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Send Test Event ({eventCount})
            </button>
            <button
              onClick={checkQueue}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Check Queue
            </button>
            <button
              onClick={forceFlush}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Force Flush
            </button>
            <button
              onClick={checkNetwork}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Check Network
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <p>No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-600">
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>PostHog Key: {process.env.NEXT_PUBLIC_POSTHOG_KEY?.substring(0, 20)}...</p>
          <p>PostHog Host: {process.env.NEXT_PUBLIC_POSTHOG_HOST}</p>
        </div>
      </div>
    </div>
  );
}