/**
 * Specialized Error Boundary Components for different contexts
 * Provides context-specific error handling and fallback UIs
 */

'use client';

import React from 'react';
import ErrorBoundary, { withErrorBoundary } from './ErrorBoundary';

// API Error Boundary for API-related components
export function ApiErrorBoundary({ children, context = 'api' }) {
  const fallback = (error, retry) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Data Loading Error
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>We couldn't load the data you requested. This might be a temporary issue.</p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                onClick={retry}
                className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={context}
      fallback={fallback}
      title="API Error"
      message="There was a problem loading data from the server."
    >
      {children}
    </ErrorBoundary>
  );
}

// Form Error Boundary for form components
export function FormErrorBoundary({ children, context = 'form' }) {
  const fallback = (error, retry) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Form Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>There was a problem with the form. Please refresh and try again.</p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                onClick={retry}
                className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={context}
      fallback={fallback}
      title="Form Error"
      message="There was a problem with the form component."
    >
      {children}
    </ErrorBoundary>
  );
}

// Dashboard Error Boundary for dashboard components
export function DashboardErrorBoundary({ children, context = 'dashboard' }) {
  const fallback = (error, retry) => (
    <div className="min-h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-4">
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Widget Error</h3>
        <p className="mt-1 text-sm text-gray-500">This dashboard widget encountered an error.</p>
        <div className="mt-6">
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reload Widget
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={context}
      fallback={fallback}
      title="Dashboard Widget Error"
      message="A dashboard component failed to load properly."
    >
      {children}
    </ErrorBoundary>
  );
}

// Route Error Boundary for page-level errors
export function RouteErrorBoundary({ children, context = 'route' }) {
  return (
    <ErrorBoundary
      context={context}
      title="Page Error"
      message="This page encountered an unexpected error. Please try refreshing or navigate to a different page."
      showDetails={true}
    >
      {children}
    </ErrorBoundary>
  );
}

// Async Component Error Boundary for lazy-loaded components
export function AsyncErrorBoundary({ children, context = 'async' }) {
  const fallback = (error, retry) => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Component Failed to Load</h3>
        <p className="text-sm text-gray-500 mb-4">This component couldn't be loaded properly.</p>
        <button
          onClick={retry}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Retry Loading
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={context}
      fallback={fallback}
      title="Component Loading Error"
      message="A component failed to load. This might be due to a network issue or missing dependency."
    >
      {children}
    </ErrorBoundary>
  );
}

// HOCs for easy application
export const withApiErrorBoundary = (Component) => withErrorBoundary(Component, { 
  context: 'api',
  title: 'API Error',
  message: 'There was a problem loading data from the server.'
});

export const withFormErrorBoundary = (Component) => withErrorBoundary(Component, { 
  context: 'form',
  title: 'Form Error',
  message: 'There was a problem with the form component.'
});

export const withDashboardErrorBoundary = (Component) => withErrorBoundary(Component, { 
  context: 'dashboard',
  title: 'Dashboard Widget Error',
  message: 'A dashboard component failed to load properly.'
});

export const withRouteErrorBoundary = (Component) => withErrorBoundary(Component, { 
  context: 'route',
  title: 'Page Error',
  message: 'This page encountered an unexpected error.',
  showDetails: true
});

export const withAsyncErrorBoundary = (Component) => withErrorBoundary(Component, { 
  context: 'async',
  title: 'Component Loading Error',
  message: 'A component failed to load.'
});

// Export all boundaries
export {
  ApiErrorBoundary,
  FormErrorBoundary,
  DashboardErrorBoundary,
  RouteErrorBoundary,
  AsyncErrorBoundary
};