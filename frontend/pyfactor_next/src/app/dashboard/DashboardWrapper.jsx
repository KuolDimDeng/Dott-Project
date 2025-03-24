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

  // Add an effect to check schema setup status when component mounts
  useEffect(() => {
    // This state will track if we've run a schema setup in this session
    const hasSetupBeenRunKey = 'schemaSetupAlreadyRunInSession';
    
    try {
      // Check existing localStorage values
      const setupDoneStr = localStorage.getItem('setupDone');
      const setupTimestamp = localStorage.getItem('setupTimestamp');
      const sessionSetupRun = sessionStorage.getItem(hasSetupBeenRunKey);
      
      logger.info('[Dashboard] Initial schema setup status check:', {
        setupDone: setupDoneStr === 'true' ? 'yes' : 'no',
        setupTime: setupTimestamp ? new Date(parseInt(setupTimestamp, 10)).toISOString() : 'none',
        sessionRun: sessionSetupRun === 'true' ? 'yes' : 'no'
      });
      
      // Create the persisted setup timestamp if it doesn't exist
      if (setupDoneStr !== 'true' || !setupTimestamp) {
        localStorage.setItem('setupDone', 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
        logger.info('[Dashboard] Created missing setup status in localStorage');
      }
    } catch (e) {
      logger.error('[Dashboard] Error accessing localStorage:', e);
    }
  }, []);

  // Effect for schema setup triggering
  useEffect(() => {
    logger.info('[Dashboard] Schema setup effect triggered');
    
    const triggerSchemaSetup = async () => {
      // Create a session key to prevent multiple setups in one session
      const hasSetupBeenRunKey = 'schemaSetupAlreadyRunInSession';
      const setupRunInSession = sessionStorage.getItem(hasSetupBeenRunKey) === 'true';
      
      // If we've already run setup in this session, don't do it again
      if (setupRunInSession) {
        logger.info('[Dashboard] Schema setup already run in this session, skipping');
        return;
      }
      
      try {
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
            hasUserData: !!userData
          });
        } catch (e) {
          logger.warn('[Dashboard] Error getting tenant ID:', e);
        }
        
        // Check if we should force schema setup
        let skipForceSetup = false;
        try {
          // First check session storage - if we've done setup in this browser session, skip
          if (setupRunInSession) {
            skipForceSetup = true;
            logger.info('[Dashboard] Setup already run in this session, skipping force_setup');
          }
          
          // Next check localStorage for setup status
          const setupDoneStr = localStorage.getItem('setupDone');
          const setupTimestamp = localStorage.getItem('setupTimestamp');
          const userDataStr = localStorage.getItem('userData');
          const userData = userDataStr ? JSON.parse(userDataStr) : null;
          
          // If localStorage indicates setup was done, skip force setup
          if (setupDoneStr === 'true' && setupTimestamp) {
            skipForceSetup = true;
            logger.info('[Dashboard] Setup marked as done in localStorage, skipping force_setup');
          }
          
          // Also check if user profile indicates setup is done
          if (userData?.onboardingStatus === "COMPLETE") {
            skipForceSetup = true;
            logger.info('[Dashboard] User onboarding status is COMPLETE, skipping force_setup');
          }
          
          logger.info('[Dashboard] Force setup decision:', { 
            skipForceSetup, 
            willForceSetup: !skipForceSetup 
          });
        } catch (e) {
          logger.warn('[Dashboard] Error checking setup status:', e);
          // Default to not forcing setup on errors
          skipForceSetup = true;
        }
        
        // Set session flag to prevent redundant setups in the same session
        sessionStorage.setItem(hasSetupBeenRunKey, 'true');
        
        // Prepare request body with force_setup=false by default
        const requestBody = { 
          force_setup: false, // Default to not forcing setup
          tenant_id: tenantId,
          source: 'dashboard' 
        };
        
        // Only set force_setup=true if we really need to force it
        if (!skipForceSetup) {
          requestBody.force_setup = true;
          logger.info('[Dashboard] Will force schema setup in this request');
        }
        
        logger.info('[Dashboard] Sending setup trigger request:', requestBody);
        
        // Make the API call with available data
        const response = await fetch('/api/onboarding/setup/trigger/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-Id': crypto.randomUUID()
          },
          body: JSON.stringify(requestBody),
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
            
            // Mark setup as done in both localStorage and sessionStorage
            try {
              const timestamp = Date.now().toString();
              localStorage.setItem('setupDone', 'true');
              localStorage.setItem('setupTimestamp', timestamp);
              sessionStorage.setItem('schemaSetupAlreadyRunInSession', 'true');
              
              logger.info('[Dashboard] Marked schema setup as complete');
            } catch (e) {
              logger.warn('[Dashboard] Error storing setup status:', e);
            }
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
            
            // Mark setup as done in both localStorage and sessionStorage
            try {
              const timestamp = Date.now().toString();
              localStorage.setItem('setupDone', 'true');
              localStorage.setItem('setupTimestamp', timestamp);
              sessionStorage.setItem('schemaSetupAlreadyRunInSession', 'true');
              
              logger.info('[Dashboard] Marked schema setup as complete (already_setup)');
            } catch (e) {
              logger.warn('[Dashboard] Error storing setup status:', e);
            }
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
            
            // Mark setup as done in both localStorage and sessionStorage
            try {
              const timestamp = Date.now().toString();
              localStorage.setItem('setupDone', 'true');
              localStorage.setItem('setupTimestamp', timestamp);
              sessionStorage.setItem('schemaSetupAlreadyRunInSession', 'true');
              
              logger.info('[Dashboard] Marked schema setup as complete (404 response)');
            } catch (e) {
              logger.warn('[Dashboard] Error storing setup status:', e);
            }
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
            
            // Mark setup as done in both localStorage and sessionStorage
            try {
              const timestamp = Date.now().toString();
              localStorage.setItem('setupDone', 'true');
              localStorage.setItem('setupTimestamp', timestamp);
              sessionStorage.setItem('schemaSetupAlreadyRunInSession', 'true');
              
              logger.info('[Dashboard] Marked schema setup as complete (from polling)');
            } catch (e) {
              logger.warn('[Dashboard] Error storing setup status:', e);
            }
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