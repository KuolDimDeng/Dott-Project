'use client';

// In DashboardClientLayout.js
import dynamic from 'next/dynamic';
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { logger } from '@/utils/logger';
import ErrorBoundaryHandler from '@/components/ErrorBoundaryHandler';
import { useRouter } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { SessionProvider } from '@/contexts/SessionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Use a more direct approach for dynamic imports
const KeyboardFixerLoader = dynamic(
  () => import('./components/forms/fixed/KeyboardEventFixer').then(mod => mod),
  { ssr: false, loading: () => null }
);

const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger').then(mod => mod),
  { ssr: false, loading: () => null }
);

// Simplified import for FixInputEvent
const FixInputEvent = dynamic(
  () => import('./fixInputEvent').catch(err => {
      console.error('Failed to load FixInputEvent component:', err);
      return null;
    }
  )
);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-3 text-center"
    >
      <div className="mb-3 max-w-md p-4 text-red-700 border border-red-200 bg-red-50 rounded-md">
        Something went wrong while loading the dashboard.
      </div>
      <p className="mb-3 max-w-md text-sm text-gray-500">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => {
          // Clear any pending schema setup to avoid getting stuck
          try {
            sessionStorage.removeItem('pendingSchemaSetup');
          } catch (e) {
            // Ignore errors
          }
          // Reset the error boundary
          resetErrorBoundary();
        }}
        className="px-4 py-2 mb-2 text-white bg-primary-main hover:bg-primary-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2"
      >
        Try Again
      </button>
      <button
        onClick={() => {
          // Clear session storage and reload
          try {
            sessionStorage.clear();
          } catch (e) {
            // Ignore errors
          }
          window.location.reload();
        }}
        className="px-4 py-2 text-primary-main border border-primary-main hover:bg-primary-main/5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2"
      >
        Reload Dashboard
      </button>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <>
      <style jsx global>{`
        /* Base styles */
        html {
          height: 100%;
          min-height: 100%;
          width: 100%;
          overflow-x: hidden;
        }

        body {
          height: 100%;
          min-height: 100%;
          width: 100%;
          font-family: var(--font-family);
          overflow-x: hidden !important;
          margin: 0;
          padding: 0;
        }

        /* App root must fill viewport */
        #app-root {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          width: 100%;
        }

        /* Global text selection color */
        ::selection {
          background-color: rgba(67, 56, 202, 0.3);
        }

        /* Helper classes */
        .full-height {
          height: 100%;
          min-height: 100%;
        }

        .full-width {
          width: 100%;
        }
      `}</style>
      <SessionProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </>
  );
} 