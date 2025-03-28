'use client';

// In /app/dashboard/layout.js
import dynamic from 'next/dynamic';
import React, { useEffect, useState, Suspense } from 'react';
import { logger } from '@/utils/logger';
import { ErrorBoundary } from 'react-error-boundary';

// Dynamically load components with Next.js dynamic import
const KeyboardFixerLoader = dynamic(
  () => import('./components/forms/fixed/KeyboardEventFixer'),
  { 
    ssr: false,
    loading: () => null
  }
);

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
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
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => {
          // Clear any pending schema setup to avoid getting stuck
          sessionStorage.removeItem('pendingSchemaSetup');
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
          sessionStorage.clear();
          window.location.reload();
        }}
        className="px-4 py-2 text-primary-main border border-primary-main hover:bg-primary-main/5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2"
      >
        Reload Dashboard
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }) {
    const [showDebugger, setShowDebugger] = useState(false);
    
    // Disable the debugger by default
    useEffect(() => {
        // Force disable the debugger
        setShowDebugger(false);
        localStorage.setItem('enableReactDebugger', 'false');
        
        // Still allow keyboard shortcut to enable it if needed
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setShowDebugger(prev => {
                    const newValue = !prev;
                    localStorage.setItem('enableReactDebugger', newValue.toString());
                    logger.debug(`[DashboardLayout] ${newValue ? 'Enabling' : 'Disabling'} React error debugger`);
                    return newValue;
                });
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Add error boundary to catch any rendering errors
    useEffect(() => {
        // Set up global error handler for React errors
        const originalError = console.error;
        console.error = (...args) => {
            // Check if this is a React error
            const errorString = args.join(' ');
            if (errorString.includes('render is not a function')) {
                logger.error('[DashboardLayout] Caught "render is not a function" error:', {
                    args,
                    stack: new Error().stack
                });
            }
            
            // Check for memory-related errors
            if (errorString.includes('out of memory') ||
                errorString.includes('heap') ||
                errorString.includes('allocation failed')) {
                logger.error('[DashboardLayout] Caught memory-related error:', {
                    args,
                    stack: new Error().stack
                });
                
                // Clear any pending schema setup to avoid getting stuck
                try {
                    sessionStorage.removeItem('pendingSchemaSetup');
                } catch (e) {
                    // Ignore errors when clearing session storage
                }
            }
            
            // Call original error handler
            originalError.apply(console, args);
        };
        
        return () => {
            console.error = originalError;
        };
    }, []);
    
    // Performance monitoring for input fixes
    useEffect(() => {
        const monitorPerformance = () => {
            // Watch for long tasks that might indicate performance issues
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        for (const entry of entries) {
                            if (entry.duration > 50) { // Long task threshold (ms)
                                logger.warn('[DashboardLayout] Long task detected:', {
                                    duration: Math.round(entry.duration),
                                    startTime: Math.round(entry.startTime),
                                    name: entry.name
                                });
                                
                                // If we detect very long tasks (> 500ms), disable the keyboard fix temporarily
                                if (entry.duration > 500 && window.toggleInputFix) {
                                    window.toggleInputFix(false);
                                    
                                    // Re-enable after 1 second
                                    setTimeout(() => {
                                        if (window.toggleInputFix) window.toggleInputFix(true);
                                    }, 1000);
                                }
                            }
                        }
                    });
                    
                    observer.observe({ entryTypes: ['longtask'] });
                    return () => observer.disconnect();
                } catch (e) {
                    logger.error('[DashboardLayout] Error setting up performance observer:', e);
                }
            }
        };
        
        monitorPerformance();
    }, []);
    
    // Handle unhandled promise rejections
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            logger.error('[DashboardLayout] Unhandled promise rejection:', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        };
        
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);
    
    return (
        <div className="text-gray-900 bg-gray-50 min-h-screen">
            <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {
                // Reset any state that might have caused the error
                sessionStorage.removeItem('pendingSchemaSetup');
            }}>
                <div className="dashboard-container relative min-h-screen">
                    {/* 
                      Load both input fixes, but with Suspense and lazy loading to minimize
                      performance impact. These components run in parallel and complement each other.
                    */}
                    <Suspense fallback={null}>
                      {React.createElement(
                        React.lazy(() => import('./fixInputEvent')), 
                        {}
                      )}
                    </Suspense>
                    
                    {/* Load the second fixer after a short delay */}
                    <Suspense fallback={null}>
                      {React.createElement(
                        React.lazy(() => {
                          // Small delay to stagger the loading
                          return new Promise(resolve => {
                            setTimeout(() => {
                              resolve(import('./components/forms/fixed/KeyboardEventFixer'));
                            }, 300);
                          });
                        }),
                        {}
                      )}
                    </Suspense>
                    
                    {/* Add diagnostics component to help identify input issues */}
                    <Suspense fallback={null}>
                      {React.createElement(
                        React.lazy(() => import('./RootDiagnostics')),
                        {}
                      )}
                    </Suspense>
                    
                    {children}
                    
                    {showDebugger && <ReactErrorDebugger enabled={true} />}
                </div>
            </ErrorBoundary>
        </div>
    );
}