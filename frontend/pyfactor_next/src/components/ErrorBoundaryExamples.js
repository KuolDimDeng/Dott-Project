/**
 * Error Boundary Usage Examples
 * Demonstrates how to use the various error boundary components
 */

'use client';

import React, { useState } from 'react';
import ErrorBoundary, { withErrorBoundary, useErrorBoundary } from './ErrorBoundary';
import {
  ApiErrorBoundary,
  FormErrorBoundary,
  DashboardErrorBoundary,
  RouteErrorBoundary,
  AsyncErrorBoundary,
  withApiErrorBoundary,
  withFormErrorBoundary
} from './ErrorBoundaries';
import { useGlobalError } from './GlobalErrorBoundary';

// Example 1: Basic error boundary usage
export function BasicErrorBoundaryExample() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error from BasicErrorBoundaryExample');
  }

  return (
    <ErrorBoundary context="example">
      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Basic Error Boundary</h3>
        <p className="mb-4">This component is wrapped with a basic error boundary.</p>
        <button
          onClick={() => setShouldError(true)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Trigger Error
        </button>
      </div>
    </ErrorBoundary>
  );
}

// Example 2: API Error Boundary with simulated API call
export function ApiErrorBoundaryExample() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulateApiCall = async () => {
    setLoading(true);
    try {
      // Simulate API call that might fail
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.5) {
            resolve({ message: 'Success!' });
          } else {
            reject(new Error('API call failed'));
          }
        }, 1000);
      });
    } catch (error) {
      // This error will be caught by the ApiErrorBoundary
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApiErrorBoundary context="api-example">
      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">API Error Boundary</h3>
        <p className="mb-4">This component handles API-related errors gracefully.</p>
        <button
          onClick={simulateApiCall}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Simulate API Call'}
        </button>
        {data && <p className="mt-2 text-green-600">API call successful!</p>}
      </div>
    </ApiErrorBoundary>
  );
}

// Example 3: Form Error Boundary
export function FormErrorBoundaryExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form validation error
    if (!formData.name || !formData.email) {
      throw new Error('Form validation failed');
    }
  };

  return (
    <FormErrorBoundary context="form-example">
      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Form Error Boundary</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit (will error if empty)
          </button>
        </form>
      </div>
    </FormErrorBoundary>
  );
}

// Example 4: Dashboard Widget with Error Boundary
function ProblematicWidget() {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('Widget failed to render data');
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h4 className="font-semibold mb-2">Sample Widget</h4>
      <p className="text-sm text-gray-600 mb-2">This widget might fail sometimes.</p>
      <button
        onClick={() => setShouldError(true)}
        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Break Widget
      </button>
    </div>
  );
}

export function DashboardErrorBoundaryExample() {
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-4">Dashboard Error Boundary</h3>
      <div className="grid grid-cols-2 gap-4">
        <DashboardErrorBoundary context="widget-1">
          <ProblematicWidget />
        </DashboardErrorBoundary>
        <DashboardErrorBoundary context="widget-2">
          <ProblematicWidget />
        </DashboardErrorBoundary>
      </div>
    </div>
  );
}

// Example 5: Using HOC (Higher-Order Component)
function ProblematicComponent() {
  const [count, setCount] = useState(0);
  
  if (count > 3) {
    throw new Error('Count exceeded maximum value');
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">HOC Protected Component</h3>
      <p className="mb-4">Count: {count}</p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Increment (errors after 3)
      </button>
    </div>
  );
}

const ProtectedComponent = withApiErrorBoundary(ProblematicComponent);

export function HOCExample() {
  return <ProtectedComponent />;
}

// Example 6: Using useErrorBoundary hook
export function ErrorBoundaryHookExample() {
  const triggerError = useErrorBoundary();
  const [asyncError, setAsyncError] = useState(false);

  const handleAsyncError = async () => {
    try {
      setAsyncError(true);
      // Simulate async operation that fails
      await new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Async operation failed')), 1000);
      });
    } catch (error) {
      triggerError(error);
    } finally {
      setAsyncError(false);
    }
  };

  return (
    <ErrorBoundary context="hook-example">
      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Error Boundary Hook</h3>
        <p className="mb-4">Using useErrorBoundary hook to trigger errors manually.</p>
        <div className="space-x-2">
          <button
            onClick={() => triggerError('Manual error trigger')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Trigger Sync Error
          </button>
          <button
            onClick={handleAsyncError}
            disabled={asyncError}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {asyncError ? 'Processing...' : 'Trigger Async Error'}
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Example 7: Global Error Context Usage
export function GlobalErrorExample() {
  const { addGlobalError, globalErrors, clearAllErrors } = useGlobalError();

  const addError = () => {
    addGlobalError(
      new Error('This is a global error example'),
      'example'
    );
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Global Error Context</h3>
      <p className="mb-4">Active global errors: {globalErrors.length}</p>
      <div className="space-x-2">
        <button
          onClick={addError}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add Global Error
        </button>
        <button
          onClick={clearAllErrors}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear All Errors
        </button>
      </div>
    </div>
  );
}

// Example 8: Async Component Error Boundary
const AsyncComponent = React.lazy(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve({
          default: () => (
            <div className="p-4 bg-green-100 rounded">
              <h4 className="font-semibold">Async Component Loaded</h4>
              <p className="text-sm">This component was loaded asynchronously.</p>
            </div>
          )
        });
      } else {
        reject(new Error('Failed to load async component'));
      }
    }, 1000);
  });
});

export function AsyncErrorBoundaryExample() {
  const [showAsync, setShowAsync] = useState(false);

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Async Error Boundary</h3>
      <button
        onClick={() => setShowAsync(!showAsync)}
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 mb-4"
      >
        {showAsync ? 'Hide' : 'Load'} Async Component
      </button>
      
      {showAsync && (
        <AsyncErrorBoundary context="async-example">
          <React.Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
            <AsyncComponent />
          </React.Suspense>
        </AsyncErrorBoundary>
      )}
    </div>
  );
}

// Main demo component
export default function ErrorBoundaryExamples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Error Boundary Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BasicErrorBoundaryExample />
        <ApiErrorBoundaryExample />
        <FormErrorBoundaryExample />
        <DashboardErrorBoundaryExample />
        <HOCExample />
        <ErrorBoundaryHookExample />
        <GlobalErrorExample />
        <AsyncErrorBoundaryExample />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Usage Tips</h2>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Wrap your route components with RouteErrorBoundary</li>
          <li>Use ApiErrorBoundary around components that make API calls</li>
          <li>Wrap forms with FormErrorBoundary for better UX</li>
          <li>Use DashboardErrorBoundary for dashboard widgets</li>
          <li>Apply GlobalErrorBoundary at your app root</li>
          <li>Use useErrorBoundary hook for manual error triggering</li>
        </ul>
      </div>
    </div>
  );
}