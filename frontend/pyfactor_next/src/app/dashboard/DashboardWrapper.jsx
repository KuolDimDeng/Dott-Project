'use client';

import React, { useEffect, useState } from 'react';
import Dashboard from './DashboardContent';
import { logger } from '@/utils/logger';

/**
 * Dashboard Wrapper Component
 * 
 * This component wraps the main Dashboard component and handles schema setup
 * when the dashboard first loads.
 */
const DashboardWrapper = () => {
  const [setupStatus, setSetupStatus] = useState('pending');

  // Add an effect to trigger the schema setup when the dashboard loads
  useEffect(() => {
    console.log('[Dashboard] Setup effect triggered');
    
    const triggerSchemaSetup = async () => {
      console.log('[Dashboard] Starting schema setup trigger');
      
      try {
        logger.debug('[Dashboard] Triggering schema setup...');
        console.log('[Dashboard] About to call fetch');
        
        // Try to get tenant ID from cookies or localStorage for passing to the API
        let tenantId = null;
        try {
          // Try to get from localStorage first
          tenantId = localStorage.getItem('tenantId');
          
          // If not in localStorage, try cookies
          if (!tenantId) {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'tenantId') {
                tenantId = value;
                break;
              }
            }
          }
          
          // Get user info from localStorage if available
          const userDataStr = localStorage.getItem('userData');
          const userData = userDataStr ? JSON.parse(userDataStr) : null;
          
          logger.debug('[Dashboard] Tenant ID for setup:', { 
            tenantId,
            hasUserData: !!userData,
            source: tenantId ? 'found' : 'missing'
          });
        } catch (e) {
          logger.warn('[Dashboard] Error getting tenant ID:', e);
        }
        
        // Make the API call with available data
        const response = await fetch('/api/onboarding/setup/trigger/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-Id': crypto.randomUUID()
          },
          body: JSON.stringify({ 
            force_setup: true,
            tenant_id: tenantId,
            source: 'dashboard' 
          }),
          credentials: 'include' // This ensures cookies are sent with the request
        });
        
        console.log('[Dashboard] Fetch response received:', response.status);
        
        // Check content type to avoid parsing errors
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const errorText = await response.text();
          console.error('[Dashboard] Non-JSON response:', errorText.substring(0, 500));
          setSetupStatus('error');
          return;
        }
        
        const data = await response.json();
        console.log('[Dashboard] Response data:', data);
        
        if (response.ok) {
          // Success cases
          if (data.status === 'complete') {
            // Setup is already complete
            logger.info('[Dashboard] Schema setup already completed');
            setSetupStatus('complete');
          } else if (data.status === 'pending' || data.status === 'in_progress') {
            // Setup is pending or in progress
            logger.info('[Dashboard] Schema setup is in progress');
            setSetupStatus('in_progress');
            
            // Store task ID if available
            if (data.task_id) {
              sessionStorage.setItem('schemaSetupTaskId', data.task_id);
            }
          } else if (data.status === 'success' && data.task_id) {
            // We have a task ID, store it for later reference
            sessionStorage.setItem('schemaSetupTaskId', data.task_id);
            logger.debug('[Dashboard] Schema setup triggered successfully:', data);
            setSetupStatus('in_progress');
          } else if (data.status === 'already_setup') {
            // Legacy status for backward compatibility
            logger.info('[Dashboard] Schema already fully set up:', data);
            setSetupStatus('complete');
          } else {
            // Default success case
            logger.debug('[Dashboard] Schema setup triggered with status:', data.status);
            setSetupStatus(data.status || 'unknown');
          }
        } else {
          // Handle specific error cases
          if (response.status === 404 && data.message === 'No pending schema setup found') {
            // This is actually expected for users with setupDone=TRUE
            logger.info('[Dashboard] Schema setup not needed (already done)');
            setSetupStatus('complete');
          } else if (response.status === 401) {
            // Authentication issue
            console.error('[Dashboard] Authentication required for schema setup');
            setSetupStatus('auth_error');
          } else {
            // Generic error
            logger.warn('[Dashboard] Failed to trigger schema setup:', data);
            setSetupStatus('error');
          }
        }
      } catch (error) {
        // Non-critical error, log but don't disrupt user experience
        console.error('[Dashboard] Error triggering schema setup:', error);
        logger.error('[Dashboard] Error triggering schema setup:', error);
        setSetupStatus('error');
      }
    };
    
    // Call the function to trigger schema setup
    triggerSchemaSetup();
    
    // Set up polling for status updates
    const statusInterval = setInterval(async () => {
      if (setupStatus !== 'in_progress') {
        clearInterval(statusInterval);
        return;
      }
      
      try {
        const response = await fetch('/api/onboarding/setup/status/', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'complete') {
            setSetupStatus('complete');
            clearInterval(statusInterval);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error checking setup status:', error);
      }
    }, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(statusInterval);
  }, [setupStatus]);
  
  // You could show a setup indicator based on setupStatus if needed
  // For now, just render the Dashboard component
  return <Dashboard setupStatus={setupStatus} />;
};

export default DashboardWrapper;