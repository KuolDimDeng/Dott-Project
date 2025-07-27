'use client';

import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';
import { 
  trackInteraction, 
  measureCustomMetric,
  trackNetworkRequest 
} from '@/utils/sentry-web-vitals';

export default function TestSentryPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [webVitalsData, setWebVitalsData] = useState({});

  useEffect(() => {
    // Observe Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setWebVitalsData(prev => ({
            ...prev,
            lcp: lastEntry.renderTime || lastEntry.loadTime
          }));
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // Get navigation timing
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        setWebVitalsData(prev => ({
          ...prev,
          ttfb: navTiming.responseStart - navTiming.requestStart,
          domLoad: navTiming.loadEventEnd - navTiming.loadEventStart,
        }));
      }
    }
  }, []);

  // Test regular error capture
  const testError = () => {
    trackInteraction('click', 'test-error-button');
    try {
      throw new Error('This is a test error from Dott');
    } catch (error) {
      Sentry.captureException(error, {
        tags: { page: 'test-sentry' },
        extra: { test: true }
      });
      setResult('Error sent to Sentry! Check your dashboard.');
    }
  };

  // Test performance monitoring
  const testPerformance = async () => {
    trackInteraction('click', 'test-performance-button');
    setLoading(true);
    
    await Sentry.startSpan(
      {
        op: 'test.performance',
        name: 'Test Performance Operation',
      },
      async (span) => {
        span.setAttribute('test.type', 'performance');
        span.setAttribute('test.user', 'demo');
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test nested span
        await Sentry.startSpan(
          {
            op: 'test.nested',
            name: 'Nested Operation',
          },
          async (nestedSpan) => {
            nestedSpan.setAttribute('nested', true);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        );
        
        setResult('Performance span sent! Check Sentry Performance tab.');
      }
    );
    
    setLoading(false);
  };

  // Test profiling
  const testProfiling = async () => {
    trackInteraction('click', 'test-profiling-button');
    setLoading(true);

    await Sentry.startSpan(
      {
        op: 'test.profiling',
        name: 'CPU Intensive Operation',
      },
      async (span) => {
        // Simulate CPU intensive work
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i);
        }
        
        span.setAttribute('calculation.result', result);
        span.setAttribute('calculation.iterations', 1000000);
        
        setResult('Profiling data sent! Check Sentry Profiling tab.');
      }
    );

    setLoading(false);
  };

  // Test Web Vitals
  const testWebVitals = () => {
    trackInteraction('click', 'test-web-vitals-button');
    
    // Measure custom metrics
    measureCustomMetric('button.click.latency', 50, 'millisecond');
    measureCustomMetric('custom.score', 95, 'percent');
    
    // Force a layout shift for CLS testing
    const testDiv = document.createElement('div');
    testDiv.style.height = '100px';
    testDiv.style.backgroundColor = 'yellow';
    testDiv.textContent = 'This element causes a layout shift';
    document.body.appendChild(testDiv);
    
    setTimeout(() => {
      document.body.removeChild(testDiv);
    }, 2000);
    
    setResult('Web Vitals tracked! Check Performance Monitoring.');
  };

  // Test network tracking
  const testNetworkTracking = async () => {
    trackInteraction('click', 'test-network-button');
    setLoading(true);
    
    try {
      // Make multiple requests to test tracking
      const requests = [
        fetch('/api/health'),
        fetch('/api/user/profile').catch(() => null),
        fetch('https://jsonplaceholder.typicode.com/posts/1'),
      ];
      
      await Promise.all(requests);
      
      setResult('Network requests tracked! Check breadcrumbs and performance data.');
    } catch (error) {
      console.error('Network test error:', error);
    }
    
    setLoading(false);
  };

  // Test asset monitoring
  const testAssetMonitoring = () => {
    trackInteraction('click', 'test-asset-button');
    
    // Create and load an image
    const img = new Image();
    img.src = 'https://via.placeholder.com/500x500?text=Test+Asset';
    
    img.onload = () => {
      measureCustomMetric('test.image.loaded', 1, 'none');
      setResult('Asset loading tracked! Check resource timing in breadcrumbs.');
    };
    
    // Create and load a script
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js';
    script.async = true;
    script.onload = () => {
      measureCustomMetric('test.script.loaded', 1, 'none');
    };
    document.head.appendChild(script);
  };

  // Test logging
  const testLogging = () => {
    trackInteraction('click', 'test-logging-button');
    const userId = 'test-user-123';
    const action = 'test-action';
    
    logger.info(logger.fmt`User ${userId} performed ${action}`, {
      page: 'test-sentry',
      environment: 'test'
    });
    
    logger.warn('This is a warning message', {
      threshold: 80,
      current: 85
    });
    
    logger.error('This is an error log', {
      errorCode: 'TEST_ERROR',
      userId
    });
    
    setResult('Logs sent! Check Sentry Logs (if enabled).');
  };

  // Test API error
  const testApiError = async () => {
    trackInteraction('click', 'test-api-error-button');
    setLoading(true);
    
    try {
      const response = await fetch('/api/test-sentry-error');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { 
          page: 'test-sentry',
          error_type: 'api'
        }
      });
      setResult('API error sent to Sentry!');
    }
    
    setLoading(false);
  };

  // Test user context
  const testUserContext = () => {
    trackInteraction('click', 'test-user-context-button');
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@dottapps.com',
      username: 'testuser'
    });
    
    Sentry.setContext('subscription', {
      plan: 'professional',
      credits: 100
    });
    
    // Now throw an error with context
    try {
      throw new Error('Error with user context');
    } catch (error) {
      Sentry.captureException(error);
      setResult('Error with user context sent!');
    }
  };

  // Test custom transaction
  const testCustomTransaction = async () => {
    trackInteraction('click', 'test-transaction-button');
    setLoading(true);

    await Sentry.startSpan(
      {
        name: 'test-custom-transaction',
        op: 'test',
        attributes: {
          page: 'test-sentry',
        },
      },
      async (span) => {
        // Add custom attributes
        span.setAttribute('test.duration', 1500);
        span.setAttribute('test.score', 98.5);
        
        // Simulate work with nested spans
        await Sentry.startSpan(
          {
            op: 'db.query',
            name: 'SELECT * FROM users',
          },
          async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        );

        await Sentry.startSpan(
          {
            op: 'http.client',
            name: 'GET /api/data',
          },
          async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        );
      }
    );

    setLoading(false);
    setResult('Custom transaction sent! Check Performance tab.');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Sentry Integration - Comprehensive Monitoring</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main testing panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Features</h2>
          <p className="text-gray-600 mb-6">
            Click the buttons below to test different Sentry features.
            Check your Sentry dashboard at{' '}
            <a 
              href="https://sentry.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              sentry.io
            </a>
          </p>
          
          <div className="grid gap-3">
            <button
              onClick={testError}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-left"
            >
              Test Error Capture
            </button>
            
            <button
              onClick={testPerformance}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-left"
            >
              {loading ? 'Running...' : 'Test Performance Monitoring'}
            </button>

            <button
              onClick={testProfiling}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-left"
            >
              Test Profiling (CPU Intensive)
            </button>

            <button
              onClick={testWebVitals}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-left"
            >
              Test Web Vitals & Custom Metrics
            </button>

            <button
              onClick={testNetworkTracking}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 text-left"
            >
              Test Network Request Tracking
            </button>

            <button
              onClick={testAssetMonitoring}
              className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 text-left"
            >
              Test Asset Loading Performance
            </button>
            
            <button
              onClick={testLogging}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-left"
            >
              Test Logging
            </button>
            
            <button
              onClick={testApiError}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-left"
            >
              Test API Error
            </button>
            
            <button
              onClick={testUserContext}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-left"
            >
              Test User Context
            </button>

            <button
              onClick={testCustomTransaction}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-left"
            >
              Test Custom Transaction
            </button>
          </div>
          
          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">{result}</p>
            </div>
          )}
        </div>

        {/* Web Vitals display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Current Web Vitals</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">LCP (Largest Contentful Paint)</span>
              <span className="text-sm">{webVitalsData.lcp ? `${webVitalsData.lcp.toFixed(2)}ms` : 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">TTFB (Time to First Byte)</span>
              <span className="text-sm">{webVitalsData.ttfb ? `${webVitalsData.ttfb.toFixed(2)}ms` : 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">DOM Load Time</span>
              <span className="text-sm">{webVitalsData.domLoad ? `${webVitalsData.domLoad.toFixed(2)}ms` : 'Loading...'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* What to check */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">What to check in Sentry:</h2>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Issues tab:</strong> Errors and exceptions</li>
            <li>• <strong>Performance tab:</strong> Transactions and spans</li>
            <li>• <strong>Profiling tab:</strong> CPU profiles and flame graphs</li>
            <li>• <strong>Web Vitals:</strong> LCP, FID, CLS, FCP, TTFB metrics</li>
            <li>• <strong>User Feedback:</strong> Context attached to errors</li>
            <li>• <strong>Session Replays:</strong> User interactions</li>
            <li>• <strong>Breadcrumbs:</strong> User actions and network requests</li>
            <li>• <strong>Custom Metrics:</strong> Business-specific measurements</li>
          </ul>
        </div>

        {/* New features */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="font-semibold text-green-900 mb-2">New Monitoring Features:</h2>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• <strong>Profiling:</strong> CPU usage and performance bottlenecks</li>
            <li>• <strong>Web Vitals:</strong> Core Web Vitals tracking</li>
            <li>• <strong>Network Tracking:</strong> API request performance</li>
            <li>• <strong>Asset Monitoring:</strong> Resource loading times</li>
            <li>• <strong>Custom Instrumentation:</strong> Business metrics</li>
            <li>• <strong>Enhanced Breadcrumbs:</strong> Detailed user journey</li>
            <li>• <strong>Session Timing:</strong> User session analytics</li>
            <li>• <strong>Memory Monitoring:</strong> JavaScript heap usage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}