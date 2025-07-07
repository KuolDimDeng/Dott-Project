'use client';

import { useEffect, useState } from 'react';
import { captureEvent } from '@/lib/posthog';
import posthog from 'posthog-js';

export default function PostHogDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState({});
  const [testEventSent, setTestEventSent] = useState(false);

  useEffect(() => {
    // Gather diagnostic information
    const info = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 
          `${process.env.NEXT_PUBLIC_POSTHOG_KEY.substring(0, 10)}...` : 'NOT SET',
        posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        browserOnline: navigator.onLine,
        userAgent: navigator.userAgent
      },
      posthogStatus: {
        initialized: !!window.posthog,
        distinctId: window.posthog?.get_distinct_id?.() || 'N/A',
        sessionId: window.posthog?.get_session_id?.() || 'N/A',
        hasLocalStorage: !!window.localStorage,
        localStorageKeys: Object.keys(localStorage).filter(key => key.includes('posthog')),
        queueLength: window.posthog?._request_queue?.length || 0
      },
      networkRequests: []
    };

    // Check PostHog configuration
    if (window.posthog) {
      info.posthogConfig = {
        apiHost: window.posthog.config?.api_host,
        persistence: window.posthog.config?.persistence,
        capturePageview: window.posthog.config?.capture_pageview,
        capturePageleave: window.posthog.config?.capture_pageleave,
        autocapture: window.posthog.config?.autocapture
      };
    }

    setDiagnosticInfo(info);

    // Monitor network requests to PostHog
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url] = args;
      if (url && url.includes('posthog')) {
        console.log('[PostHog Network] Request to:', url);
        setDiagnosticInfo(prev => ({
          ...prev,
          networkRequests: [...prev.networkRequests, {
            url,
            timestamp: new Date().toISOString(),
            method: args[1]?.method || 'GET'
          }]
        }));
      }
      return originalFetch.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const sendTestEvent = () => {
    console.log('[PostHog Diagnostic] Sending test event...');
    
    // Try multiple ways to send event
    try {
      // Method 1: Using our wrapper
      captureEvent('posthog_diagnostic_test', {
        timestamp: new Date().toISOString(),
        method: 'wrapper_function',
        diagnostic: true
      });

      // Method 2: Direct PostHog call
      if (window.posthog) {
        window.posthog.capture('posthog_diagnostic_test_direct', {
          timestamp: new Date().toISOString(),
          method: 'direct_call',
          diagnostic: true
        });
      }

      setTestEventSent(true);
      
      // Check queue after a delay
      setTimeout(() => {
        console.log('[PostHog Diagnostic] Queue status:', {
          queueLength: window.posthog?._request_queue?.length || 0,
          queue: window.posthog?._request_queue
        });
      }, 1000);
      
    } catch (error) {
      console.error('[PostHog Diagnostic] Error sending test event:', error);
    }
  };

  const forceFlush = () => {
    console.log('[PostHog Diagnostic] Forcing flush...');
    if (window.posthog && typeof window.posthog.flush === 'function') {
      window.posthog.flush();
      console.log('[PostHog Diagnostic] Flush called');
    } else {
      console.warn('[PostHog Diagnostic] flush() method not available');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-md max-h-96 overflow-auto z-50">
      <h3 className="font-bold text-lg mb-2">PostHog Diagnostic</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <h4 className="font-semibold">Environment:</h4>
          <pre className="bg-gray-100 p-1 rounded overflow-auto">
            {JSON.stringify(diagnosticInfo.environment, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-semibold">PostHog Status:</h4>
          <pre className="bg-gray-100 p-1 rounded overflow-auto">
            {JSON.stringify(diagnosticInfo.posthogStatus, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-semibold">PostHog Config:</h4>
          <pre className="bg-gray-100 p-1 rounded overflow-auto">
            {JSON.stringify(diagnosticInfo.posthogConfig, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-semibold">Recent Network Requests:</h4>
          <pre className="bg-gray-100 p-1 rounded overflow-auto max-h-20">
            {JSON.stringify(diagnosticInfo.networkRequests?.slice(-5), null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-3 space-x-2">
        <button
          onClick={sendTestEvent}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          disabled={testEventSent}
        >
          {testEventSent ? 'Test Event Sent' : 'Send Test Event'}
        </button>
        
        <button
          onClick={forceFlush}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Force Flush
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          Reload
        </button>
      </div>
    </div>
  );
}