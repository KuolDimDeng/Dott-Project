'use client';

// In /app/dashboard/layout.js
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { ErrorBoundary } from 'react-error-boundary';
import { Box, Typography, Button, Alert } from '@mui/material';

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
        Something went wrong while loading the dashboard.
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
        {error.message || 'An unexpected error occurred'}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          // Clear any pending schema setup to avoid getting stuck
          sessionStorage.removeItem('pendingSchemaSetup');
          // Reset the error boundary
          resetErrorBoundary();
        }}
      >
        Try Again
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        sx={{ mt: 2 }}
        onClick={() => {
          // Clear session storage and reload
          sessionStorage.clear();
          window.location.reload();
        }}
      >
        Reload Dashboard
      </Button>
    </Box>
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
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {
            // Reset any state that might have caused the error
            sessionStorage.removeItem('pendingSchemaSetup');
        }}>
            {children}
            {showDebugger && <ReactErrorDebugger enabled={true} />}
        </ErrorBoundary>
    );
}