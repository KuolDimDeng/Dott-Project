
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.js
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';

// Dynamically import the DashboardContent with increased timeout and chunking
const DashboardWrapper = dynamic(() =>
  import('./DashboardWrapper').then(mod => ({
    default: mod.default
  })),
  {
    ssr: false,
    loading: () => null
  }
);

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * It uses code splitting and progressive loading to reduce memory usage.
 * It also checks for schema setup status and shows appropriate loading states.
 */
export default function DashboardPage() {
  // Track if component is mounted to prevent memory leaks
  const [mounted, setMounted] = useState(false);
  // Track schema setup status
  const [schemaStatus, setSchemaStatus] = useState('checking');
  // Track loading progress
  const [setupProgress, setSetupProgress] = useState(0);
  // Track any errors
  const [setupError, setSetupError] = useState(null);
  // Track retry count to avoid infinite loops
  const [retryCount, setRetryCount] = useState(0);
  
  // Check schema setup status
  useEffect(() => {
    let isMounted = true;
    let statusCheckInterval;
    
    const checkSchemaStatus = async () => {
      try {
        // Check if there's a pending schema setup in session storage
        const pendingSetupStr = sessionStorage.getItem('pendingSchemaSetup');
        
        if (pendingSetupStr) {
          let pendingSetup;
          try {
            pendingSetup = JSON.parse(pendingSetupStr);
          } catch (e) {
            // If parsing fails, assume it's not valid JSON and remove it
            sessionStorage.removeItem('pendingSchemaSetup');
            if (isMounted) {
              setSchemaStatus('ready');
              setSetupProgress(100);
            }
            return;
          }
          
          // If the setup was started more than 5 minutes ago, assume it's complete
          const setupTime = new Date(pendingSetup.timestamp).getTime();
          const currentTime = new Date().getTime();
          const fiveMinutesInMs = 5 * 60 * 1000;
          
          if (currentTime - setupTime > fiveMinutesInMs) {
            logger.info('Schema setup timeout reached, assuming complete');
            sessionStorage.removeItem('pendingSchemaSetup');
            if (isMounted) {
              setSchemaStatus('ready');
              setSetupProgress(100);
            }
            return;
          }
          
          // If there's a pending setup, check its status
          const response = await fetch('/api/onboarding/setup/status', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            // If status check fails, increment progress anyway to avoid getting stuck
            if (isMounted) {
              setSetupProgress(prev => Math.min(prev + 10, 95));
            }
            
            // If we've retried too many times, assume setup is complete
            if (retryCount > 3) {
              logger.warn('Too many retries for schema status check, assuming complete');
              sessionStorage.removeItem('pendingSchemaSetup');
              if (isMounted) {
                setSchemaStatus('ready');
                setSetupProgress(100);
              }
            } else {
              setRetryCount(prev => prev + 1);
            }
            return;
          }
          
          const data = await response.json();
          
          if (isMounted) {
            // Update progress based on status
            if (data.status === 'complete' || data.status === 'ready') {
              setSchemaStatus('ready');
              setSetupProgress(100);
              // Clear the pending setup flag
              sessionStorage.removeItem('pendingSchemaSetup');
              // Clear the interval
              if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
              }
            } else if (data.status === 'in_progress' || data.status === 'pending') {
              setSchemaStatus('loading');
              // Use the progress from the API if available, otherwise increment
              setSetupProgress(data.progress || Math.min(setupProgress + 5, 95));
            } else if (data.status === 'error' || data.status === 'failed') {
              setSchemaStatus('error');
              setSetupError(data.message || 'Failed to set up database');
              // Clear the interval
              if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
              }
            }
          }
        } else {
          // If no pending setup, assume schema is ready
          if (isMounted) {
            setSchemaStatus('ready');
            setSetupProgress(100);
          }
        }
      } catch (error) {
        logger.error('Error checking schema status:', error);
        if (isMounted) {
          // Even if there's an error checking status, increment progress
          // to avoid getting stuck
          setSetupProgress(prev => Math.min(prev + 5, 95));
          
          // If we've retried too many times, assume setup is complete
          if (retryCount > 3) {
            logger.warn('Too many retries for schema status check, assuming complete');
            sessionStorage.removeItem('pendingSchemaSetup');
            setSchemaStatus('ready');
            setSetupProgress(100);
          } else {
            setRetryCount(prev => prev + 1);
          }
        }
      }
    };
    
    // Check status immediately
    checkSchemaStatus();
    
    // Set up interval to check status every 3 seconds
    statusCheckInterval = setInterval(checkSchemaStatus, 3000);
    
    // Set mounted state to true
    setMounted(true);
    
    // Clean up resources when component unmounts
    return () => {
      isMounted = false;
      setMounted(false);
      
      // Clear interval
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [setupProgress, retryCount]);
  
  // Background setup is happening, but we don't show a loading screen anymore
  // We'll just continue to the dashboard content directly
  
  // Create a component for the error notification that will be shown at the top of the dashboard
  const ErrorNotification = () => schemaStatus === 'error' ? (
    <Alert
      severity="error"
      sx={{ mb: 3, maxWidth: '100%' }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            // Clear pending schema setup
            sessionStorage.removeItem('pendingSchemaSetup');
            // Reset state
            setSchemaStatus('checking');
            setSetupProgress(0);
            setSetupError(null);
            setRetryCount(0);
          }}
        >
          Retry
        </Button>
      }
    >
      {setupError || 'There was an error setting up your account. Some features may be limited.'}
    </Alert>
  ) : null;
  
  // Use Suspense for better loading behavior
  return (
    <>
      {/* Show error notification if there was an error */}
      {schemaStatus === 'error' && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, p: 2 }}>
          <ErrorNotification />
        </Box>
      )}
      
      <Suspense fallback={null}>
        {mounted && <DashboardWrapper />}
      </Suspense>
    </>
  );
}