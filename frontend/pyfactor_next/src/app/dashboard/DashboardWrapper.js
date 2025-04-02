'use client';

import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './DashboardContent';
import { logger } from '@/utils/logger';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { fetchUserAttributes } from 'aws-amplify/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';

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
  const [tenantVerified, setTenantVerified] = useState(false);
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantError, setTenantError] = useState(null);
  const [tenantProgress, setTenantProgress] = useState(30);
  const hasRunSetup = useRef(false);
  const isLoggedIn = true; // Simplified since we're in the dashboard

  // Add default mock data for development
  const mockData = {
    businessName: 'Juba Cargo Village',
    businessType: 'Accounting and Bookkeeping',
    userProfile: {
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'Administrator'
    },
    stats: {
      revenue: 24500,
      expenses: 12300,
      profit: 12200,
      customers: 48
    }
  };

  // Handle API errors
  const handleApiError = (error, component) => {
    logger.error(`[Dashboard] Error loading ${component}:`, error);
    
    // In development, provide fallback data
    if (process.env.NODE_ENV === 'development') {
      return { ...mockData };
    }
    
    return null;
  };

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
      
      // Add tenant verification
      verifyTenant();
    } catch (e) {
      logger.error('[Dashboard] Error accessing localStorage:', e);
    }
  }, []);
  
  // New function to verify tenant exists and is properly set up
  const verifyTenant = async () => {
    setIsVerifyingTenant(true);
    try {
      // CRITICAL FIX: First check if cookies indicate the user has completed onboarding
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      const onboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
      const setupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
      
      if (onboardingStatus === ONBOARDING_STATUS.COMPLETE || setupCompleted === 'true') {
        logger.info('[Dashboard] Cookies indicate onboarding is complete, allowing dashboard access');
        setTenantVerified(true);
        setIsVerifyingTenant(false);
        return;
      }
      
      // Attempt to get the tenant ID from various sources
      const userAttributes = await fetchUserAttributes();
      const cognitoTenantId = userAttributes['custom:businessid'];
      const localStorageTenantId = localStorage.getItem('tenantId');
      
      // Get tenant ID from cookie
      const cookieTenantId = getCookie('tenantId');
      
      // Use the best tenant ID source with priority order
      const tenantId = cognitoTenantId || cookieTenantId || localStorageTenantId;
      
      logger.info('[Dashboard] Verifying tenant:', {
        cognitoTenantId,
        cookieTenantId,
        localStorageTenantId,
        usedTenantId: tenantId
      });
      
      if (!tenantId) {
        // Check if URL parameters indicate we're coming from onboarding with a plan
        const urlParams = new URLSearchParams(window.location.search);
        const newAccount = urlParams.get('newAccount') === 'true';
        const plan = urlParams.get('plan');
        
        if (newAccount && plan) {
          logger.info('[Dashboard] New account with plan detected, allowing dashboard access');
          // Set cookies to indicate completed onboarding
          document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/`;
          document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/`;
          
          // CRITICAL FIX: Update Cognito attributes to ensure they match cookies
          try {
            await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attributes: {
                  'custom:onboarding': 'COMPLETE',
                  'custom:setupdone': 'TRUE'
                },
                forceUpdate: true
              })
            });
            logger.info('[Dashboard] Updated Cognito attributes to prevent redirection');
          } catch (error) {
            logger.error('[Dashboard] Failed to update Cognito attributes:', error);
          }
          
          setTenantVerified(true);
          setIsVerifyingTenant(false);
          return;
        }
        
        setTenantError('No tenant ID found. Please restart the onboarding process.');
        setIsVerifyingTenant(false);
        return;
      }
      
      // Verify the tenant with our API
      const verifyResponse = await fetch('/api/auth/verify-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          userId: userAttributes.sub,
          email: userAttributes.email
        })
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        logger.error('[Dashboard] Tenant verification failed:', errorData);
        
        // CRITICAL FIX: Check cookies one more time before redirecting
        if (onboardingStatus === ONBOARDING_STATUS.COMPLETE || setupCompleted === 'true') {
          logger.info('[Dashboard] API verification failed but cookies indicate onboarding is complete');
          setTenantVerified(true);
          setIsVerifyingTenant(false);
          return;
        }
        
        // Check for a 404 response which means tenant doesn't exist
        if (verifyResponse.status === 404) {
          setTenantError('Your account is not fully set up. Redirecting to onboarding...');
          
          // Redirect to onboarding/business-info after a short delay
          setTimeout(() => {
            window.location.href = '/onboarding/business-info';
          }, 3000);
          return;
        }
        
        setTenantError(errorData.message || 'Failed to verify your account');
        setIsVerifyingTenant(false);
        return;
      }
      
      const tenantData = await verifyResponse.json();
      logger.info('[Dashboard] Tenant verified successfully:', tenantData);
      
      // Ensure the tenant ID is consistent across all storage mechanisms
      if (tenantData.tenantId) {
        // Update local storage
        localStorage.setItem('tenantId', tenantData.tenantId);
        
        // Update cookie
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7);
        document.cookie = `tenantId=${tenantData.tenantId}; path=/; expires=${expiration.toUTCString()}`;
        
        // Set tenant as verified
        setTenantVerified(true);
      } else {
        setTenantError('Tenant verification succeeded but no tenant ID was returned');
      }
    } catch (error) {
      logger.error('[Dashboard] Error verifying tenant:', error);
      
      // CRITICAL FIX: Even if verification errors out, check cookies as a fallback
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      const onboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
      const setupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
      
      if (onboardingStatus === ONBOARDING_STATUS.COMPLETE || setupCompleted === 'true') {
        logger.info('[Dashboard] Verification error but cookies indicate onboarding is complete');
        setTenantVerified(true);
        setIsVerifyingTenant(false);
        return;
      }
      
      setTenantError(`Tenant verification failed: ${error.message}`);
    } finally {
      setIsVerifyingTenant(false);
    }
  };
  
  // New function to check Cognito attributes
  const checkCognitoAttributes = async () => {
    try {
      const userAttributes = await fetchUserAttributes();
      const onboardingStatus = userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
      const setupDone = userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
      
      logger.info('[Dashboard] Cognito attributes check:', {
        onboarding: onboardingStatus,
        setupDone: setupDone
      });
      
      // If either attribute is not set correctly, we need to update
      if (onboardingStatus !== ONBOARDING_STATUS.COMPLETE || setupDone !== 'TRUE') {
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
        logger.debug('[Dashboard] Checking onboarding status before schema setup');
        
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
        
        const onboardingStatus = userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
        const setupDone = userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
        const cognitoTenantId = userAttributes['custom:businessid'];
        
        // NEW: Check if user is in onboarding - redirect to business info if they are
        logger.info('[DashboardApp] Checking Cognito attributes for onboarding status:', {
          onboarding: onboardingStatus || 'not set',
          setupDone: setupDone || 'not set',
          businessId: cognitoTenantId || 'not set'
        });
        
        // NEW: If user is new or in onboarding, redirect to onboarding
        if ((!onboardingStatus || onboardingStatus === 'NOT_STARTED') && window.location.pathname.startsWith('/dashboard')) {
          logger.info('[DashboardApp] New user detected, handling redirection');
          window.location.href = '/onboarding/business-info';
          return;
        }
        
        if ((onboardingStatus && onboardingStatus !== 'COMPLETE') && window.location.pathname.startsWith('/dashboard')) {
          logger.info('[DashboardApp] Incomplete onboarding detected, redirecting to onboarding');
          
          // Determine the correct onboarding step
          let redirectPath = '/onboarding/business-info';
          if (onboardingStatus === 'BUSINESS_INFO') {
            redirectPath = '/onboarding/subscription';
          } else if (onboardingStatus === 'SUBSCRIPTION') {
            redirectPath = '/onboarding/payment';
          } else if (onboardingStatus === 'PAYMENT') {
            redirectPath = '/onboarding/setup';
          }
          
          logger.info('[DashboardApp] Redirecting to onboarding:', {
            from: '/dashboard',
            to: redirectPath,
            reason: 'Incomplete onboarding'
          });
          
          window.location.href = redirectPath;
          return;
        }
        
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
                onboarding: userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS],
                setupDone: userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED]
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

  // Final render of the Dashboard component
  return (
    <>
      {/* Show loading state during tenant verification */}
      {isVerifyingTenant ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-lg">
            <LoadingSpinner 
              size="large" 
              text="Verifying your account..."
              showProgress={true}
              progress={tenantProgress || 30}
              status="in_progress"
            />
            <p className="mt-6 text-gray-600">Please wait while we prepare your dashboard</p>
            <p className="mt-2 text-sm text-gray-500">This may take a few moments for new accounts</p>
          </div>
        </div>
      ) : tenantError ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Account Setup Issue</h2>
            <p className="text-gray-600 mb-6">{tenantError}</p>
            <button 
              onClick={() => window.location.href = '/onboarding/business-info'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Restart Onboarding
            </button>
          </div>
        </div>
      ) : (
        <Dashboard />
      )}
    </>
  );
};

export default DashboardWrapper;