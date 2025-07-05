'use client';

import React, { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';

export default function TestSentryPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  // Test regular error capture
  const testError = () => {
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

  // Test logging
  const testLogging = () => {
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Sentry Integration</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
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
        
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={testError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Test Error Capture
          </button>
          
          <button
            onClick={testPerformance}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Test Performance'}
          </button>
          
          <button
            onClick={testLogging}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Logging
          </button>
          
          <button
            onClick={testApiError}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Test API Error
          </button>
          
          <button
            onClick={testUserContext}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test User Context
          </button>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">{result}</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">What to check:</h2>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Errors appear in Issues tab</li>
          <li>• Performance data in Performance tab</li>
          <li>• User context attached to errors</li>
          <li>• Session replays (if enabled)</li>
          <li>• Breadcrumbs showing user actions</li>
        </ul>
      </div>
    </div>
  );
}