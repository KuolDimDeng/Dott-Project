'use client';

import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './DashboardContent';
import { logger } from '@/utils/logger';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { fetchUserAttributes } from 'aws-amplify/auth';

/**
 * Dashboard Wrapper Component
 * 
 * This component wraps the main Dashboard component and handles schema setup
 * when the dashboard first loads.
 */
const DashboardWrapper = ({ children }) => {
  const { updateCognitoOnboardingStatus } = useTenantInitialization();
  const [setupStatus, setSetupStatus] = useState('pending');
  const [cognitoUpdateNeeded, setCognitoUpdateNeeded] = useState(false);
  const hasRunSetup = useRef(false);
  const isLoggedIn = true; // Simplified since we're in the dashboard

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
      
      // Check Cognito attributes on mount
      checkCognitoAttributes();
    } catch (e) {
      logger.error('[Dashboard] Error accessing localStorage:', e);
    }
  }, []);
  
  // New function to check Cognito attributes
  const checkCognitoAttributes = async () => {
    try {
      const userAttributes = await fetchUserAttributes();
      const onboardingStatus = userAttributes['custom:onboarding'];
      const setupDone = userAttributes['custom:setupdone'];
      
      logger.info('[Dashboard] Cognito attributes check:', {
        onboarding: onboardingStatus,
        setupDone: setupDone
      });
      
      // If either attribute is not set correctly, we need to update
      if (onboardingStatus !== 'COMPLETE' || setupDone !== 'TRUE') {
        logger.info('[Dashboard] Cognito attributes need update:', {
          onboarding: onboardingStatus,
          setupDone: setupDone
        });
        setCognitoUpdateNeeded(true);
      }
    } catch (error) {
      logger.error('[Dashboard] Error checking Cognito attributes:', error);
    }
  };

  // Effect for schema setup triggering
  useEffect(() => {
    const triggerSchemaSetup = async () => {
      if (hasRunSetup.current) {
        logger.info('[Dashboard] Schema setup already run in this session, skipping');
        return;
      }
      
      // Mark as run to prevent duplicate calls
      hasRunSetup.current = true;
      
      try {
        logger.debug('[Dashboard] Triggering schema setup');
        
        // Fetch user attributes to check onboarding status and tenant ID
        let userAttributes;
        try {
          userAttributes = await fetchUserAttributes();
        } catch (authError) {
          // Handle authentication errors specifically
          logger.error('[Dashboard] Authentication error fetching user attributes:', authError);
          
          // Check if it's an authentication error
          if (authError.toString().includes('User needs to be authenticated') || 
              authError.toString().includes('UnAuthenticated') ||
              authError.toString().includes('Token expired')) {
            logger.warn('[Dashboard] Authentication token invalid or expired, redirecting to sign-in');
            
            // Clear any stale auth data
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('idToken');
            }
            
            // Set a cookie to indicate auth error for debugging
            document.cookie = `authError=true; path=/; max-age=300`;
            
            // Redirect to sign-in page with return URL
            const returnUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `/auth/signin?returnUrl=${returnUrl}&authError=true`;
            return;
          }
          
          // For non-auth errors, continue but mark setup as failed
          setSetupStatus('failed');
          throw authError;
        }
        
        const onboardingStatus = userAttributes['custom:onboarding'];
        const setupDone = userAttributes['custom:setupdone'];
        const cognitoTenantId = userAttributes['custom:businessid'];
        
        // Check localStorage and cookies for tenant ID
        const localStorageTenantId = localStorage.getItem('tenantId');
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        const cookieTenantId = getCookie('tenantId');
        
        // Log tenant ID from different sources for debugging
        logger.info('[Dashboard] Tenant ID check before setup:', {
          cognito: cognitoTenantId || 'not set',
          localStorage: localStorageTenantId || 'not set',
          cookie: cookieTenantId || 'not set'
        });
        
        // Detect tenant ID mismatch
        const tenantIdMismatch = cognitoTenantId && localStorageTenantId && cognitoTenantId !== localStorageTenantId;
        if (tenantIdMismatch) {
          logger.warn('[Dashboard] Tenant ID mismatch detected:', {
            cognito: cognitoTenantId,
            localStorage: localStorageTenantId,
            cookie: cookieTenantId,
          });
          
          // Fix localStorage and cookies to match Cognito
          localStorage.setItem('tenantId', cognitoTenantId);
          document.cookie = `tenantId=${cognitoTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
          logger.info('[Dashboard] Fixed tenant ID inconsistency using Cognito ID:', cognitoTenantId);
        }
        
        logger.info('[Dashboard] Current Cognito status before setup:', {
          onboarding: onboardingStatus || 'not set',
          setupDone: setupDone || 'not set',
          tenantId: cognitoTenantId || 'not set'
        });
        
        // If already complete according to Cognito (which is the source of truth), no need to run
        if (onboardingStatus === 'COMPLETE' && setupDone === 'TRUE') {
          logger.info('[Dashboard] Onboarding already complete according to Cognito, skipping schema setup');
          setSetupStatus('already-complete');
          return;
        }
        
        // Flag that we definitely need to update Cognito attributes
        setCognitoUpdateNeeded(true);
        
        // Make API call to trigger schema setup
        setSetupStatus('in-progress');
        const response = await fetch('/api/dashboard/trigger-schema-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId: cognitoTenantId // Explicitly pass Cognito tenant ID if available
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to trigger schema setup: ${errorData.message || response.status}`);
        }
        
        const data = await response.json();
        logger.debug('[Dashboard] Schema setup triggered successfully:', data);
        
        // Always set flag to update Cognito directly for redundancy
        setCognitoUpdateNeeded(true);
        
        setSetupStatus('completed');
        
        // Force immediate Cognito update check 
        setTimeout(() => {
          checkCognitoAttributes();
        }, 1000);
        
        // Reload the page after a successful setup (to ensure tenant is properly loaded)
        if (data.schemaCreated) {
          logger.info('[Dashboard] Schema was newly created, will reload page in 3 seconds');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      } catch (error) {
        logger.error('[Dashboard] Error triggering schema setup:', error);
        setSetupStatus('failed');
        // Still try to update Cognito
        setCognitoUpdateNeeded(true);
      }
    };
    
    // Only run once when component mounts
    logger.info('[Dashboard] Schema setup effect triggered');
    triggerSchemaSetup();
  }, []);
  
  // Handle Cognito attribute update if needed
  useEffect(() => {
    const updateCognitoIfNeeded = async () => {
      if (!cognitoUpdateNeeded) return;
      
      try {
        logger.info('[Dashboard] Attempting to update Cognito attributes directly');
        const success = await updateCognitoOnboardingStatus();
        
        if (success) {
          logger.info('[Dashboard] Successfully updated Cognito attributes');
          setCognitoUpdateNeeded(false);
          
          // Double-check after a delay to ensure changes propagated
          setTimeout(async () => {
            try {
              const userAttributes = await fetchUserAttributes();
              logger.info('[Dashboard] Verified Cognito attributes after update:', {
                onboarding: userAttributes['custom:onboarding'],
                setupDone: userAttributes['custom:setupdone']
              });
            } catch (error) {
              logger.error('[Dashboard] Error verifying Cognito attributes after update:', error);
              
              // Handle authentication errors
              if (error.toString().includes('User needs to be authenticated') || 
                  error.toString().includes('UnAuthenticated') ||
                  error.toString().includes('Token expired')) {
                logger.warn('[Dashboard] Authentication token invalid or expired during verification');
                
                // Clear any stale auth data
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('idToken');
                }
                
                // Redirect to sign-in page with return URL
                const returnUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `/auth/signin?returnUrl=${returnUrl}&authError=true`;
                return;
              }
            }
          }, 2000);
        } else {
          logger.error('[Dashboard] Failed to update Cognito attributes directly');
          // Retry after a delay
          setTimeout(() => {
            logger.info('[Dashboard] Retrying Cognito attribute update...');
            setCognitoUpdateNeeded(true);
          }, 5000);
        }
      } catch (error) {
        logger.error('[Dashboard] Error updating Cognito attributes:', error);
        
        // Handle authentication errors
        if (error.toString().includes('User needs to be authenticated') || 
            error.toString().includes('UnAuthenticated') ||
            error.toString().includes('Token expired')) {
          logger.warn('[Dashboard] Authentication token invalid or expired during update');
          
          // Clear any stale auth data
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('idToken');
          }
          
          // Redirect to sign-in page with return URL
          const returnUrl = encodeURIComponent(window.location.pathname);
          window.location.href = `/auth/signin?returnUrl=${returnUrl}&authError=true`;
          return;
        }
        
        // For other errors, retry after a delay
        setTimeout(() => {
          logger.info('[Dashboard] Retrying Cognito attribute update after error...');
          setCognitoUpdateNeeded(true);
        }, 5000);
      }
    };
    
    if (cognitoUpdateNeeded) {
      updateCognitoIfNeeded();
    }
  }, [cognitoUpdateNeeded, updateCognitoOnboardingStatus]);

  return (
    <Dashboard setupStatus={setupStatus}>
      {children}
    </Dashboard>
  );
};

export default DashboardWrapper;