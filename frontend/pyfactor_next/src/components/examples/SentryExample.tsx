'use client';

import React, { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorBoundary } from '@sentry/nextjs';
import { logger, trackEvent } from '@/utils/sentry';

// Component that might throw an error
const BuggyComponent: React.FC<{ shouldCrash: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('This is a test error from BuggyComponent');
  }
  return <div>Component is working fine!</div>;
};

// Example component with Sentry integration
export const SentryExample: React.FC = () => {
  const [shouldCrash, setShouldCrash] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>('');

  // Example of button click with performance monitoring
  const handleButtonClick = async () => {
    await Sentry.startSpan(
      {
        name: 'button-click',
        op: 'user-interaction',
      },
      async (span) => {
        try {
          // Track the event
          trackEvent('example_button_clicked', {
            timestamp: new Date().toISOString(),
          });

          logger.info('Button clicked', {
            component: 'SentryExample',
            action: 'test-click',
          });

          // Simulate some work
          await Sentry.startSpan(
            {
              op: 'process',
              name: 'Process button click',
            },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          );

          alert('Button clicked! Check Sentry for the transaction.');
        } catch (error) {
          logger.error('Error in button click handler', error);
          throw error;
        }
      }
    );
  };

  // Example API call with error handling
  const handleApiCall = async (triggerError: boolean = false) => {
    await Sentry.startSpan(
      {
        name: 'api-call-example',
        op: 'http.client',
      },
      async () => {
        try {
          logger.info('Making API call', { triggerError });

          const response = await fetch('/api/example-sentry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Test User',
              email: 'test@example.com',
              triggerError,
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'API call failed');
          }

          setApiResponse(JSON.stringify(data, null, 2));
        } catch (error) {
          logger.error('API call failed', error);
          setApiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }
    );
  };

  // Example of manual error capture
  const handleManualError = () => {
    try {
      // Simulate an error condition
      const data = JSON.parse('invalid json');
    } catch (error) {
      logger.error('Manual error example', error, {
        context: 'Attempting to parse invalid JSON',
      });
      alert('Error captured and sent to Sentry!');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sentry Integration Examples</h1>

      <div className="space-y-6">
        {/* Performance Monitoring Example */}
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Performance Monitoring</h2>
          <button
            onClick={handleButtonClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Click me (tracked with Sentry)
          </button>
        </section>

        {/* API Call Example */}
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">API Call Tracking</h2>
          <div className="space-x-3">
            <button
              onClick={() => handleApiCall(false)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Successful API Call
            </button>
            <button
              onClick={() => handleApiCall(true)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Failed API Call
            </button>
          </div>
          {apiResponse && (
            <pre className="mt-3 p-3 bg-gray-100 rounded overflow-x-auto">
              {apiResponse}
            </pre>
          )}
        </section>

        {/* Error Boundary Example */}
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Error Boundary</h2>
          <ErrorBoundary
            fallback={({ error, resetError }) => (
              <div className="bg-red-50 border border-red-300 rounded p-4">
                <h3 className="text-red-800 font-semibold">Something went wrong:</h3>
                <p className="text-red-700">{error?.message}</p>
                <button
                  onClick={resetError}
                  className="mt-3 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reset
                </button>
              </div>
            )}
            showDialog
          >
            <BuggyComponent shouldCrash={shouldCrash} />
            <button
              onClick={() => setShouldCrash(!shouldCrash)}
              className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              {shouldCrash ? 'Fix Component' : 'Break Component'}
            </button>
          </ErrorBoundary>
        </section>

        {/* Manual Error Capture */}
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Manual Error Capture</h2>
          <button
            onClick={handleManualError}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Trigger Manual Error
          </button>
        </section>

        {/* User Feedback */}
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">User Feedback</h2>
          <button
            onClick={() => {
              const name = prompt('Your name:');
              const message = prompt('Your feedback:');
              if (message) {
                Sentry.captureMessage(`User Feedback: ${message}`, {
                  level: 'info',
                  user: { username: name || 'Anonymous' },
                });
                alert('Feedback sent to Sentry!');
              }
            }}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
          >
            Send Feedback
          </button>
        </section>
      </div>
    </div>
  );
};