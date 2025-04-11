'use client';

import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './DashboardContent';
import { logger } from '@/utils/logger';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import { useRouter } from 'next/navigation';
import DashboardLoader from '@/components/DashboardLoader';
import dynamic from 'next/dynamic';

// Dynamically import MemoryDebug component to avoid SSR issues
const MemoryDebug = dynamic(() => import('@/components/Debug/MemoryDebug'), { 
  ssr: false,
  loading: () => null
});

/**
 * Dashboard Wrapper Component
 * 
 * This component wraps the main Dashboard component and handles schema setup
 * when the dashboard first loads.
 */
const DashboardWrapper = ({ newAccount, plan }) => {
  const { updateCognitoOnboardingStatus } = useTenantInitialization();
  const [setupStatus, setSetupStatus] = useState('pending');
  const [cognitoUpdateNeeded, setCognitoUpdateNeeded] = useState(false);
  const [tenantVerified, setTenantVerified] = useState(false);
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantError, setTenantError] = useState(null);
  const [tenantProgress, setTenantProgress] = useState(30);
  const [userAttributes, setUserAttributes] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [shouldSkipLoading, setShouldSkipLoading] = useState(false);
  const hasRunSetup = useRef(false);
  const isLoggedIn = true; // Simplified since we're in the dashboard
  const router = useRouter();

  // Helper function to get cookie values
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Handle API errors
  const handleApiError = (error, component) => {
    logger.error(`[Dashboard] Error loading ${component}:`, error);
    
    // Check if we should ignore the error based on cookies
    const onboardedStatus = getCookie('onboardedStatus');
    const setupCompleted = getCookie('setupCompleted');
    
    if (onboardedStatus === 'complete' || setupCompleted === 'true') {
      // If cookies indicate completed onboarding, ignore API errors
      logger.info('[Dashboard] Ignoring API error due to completed onboarding in cookies');
      return null;
    }
    
    // Always return null regardless of environment
    return null;
  };

  // Function to initialize database environment and ensure tables exist
  const ensureDatabaseSetup = async () => {
    try {
      logger.info('[DashboardWrapper] Ensuring database tables exist');
      
      // First create the table
      const createTableResponse = await fetch('/api/tenant/create-table');
      if (createTableResponse.ok) {
        logger.info('[DashboardWrapper] Table creation successful or already exists');
      } else {
        logger.warn('[DashboardWrapper] Table creation response:', await createTableResponse.text());
      }
      
      // Then initialize the database environment
      const initResponse = await fetch('/api/tenant/init-db-env');
      if (initResponse.ok) {
        logger.info('[DashboardWrapper] Database environment initialized');
      } else {
        logger.warn('[DashboardWrapper] Database initialization response:', await initResponse.text());
      }
    } catch (error) {
      logger.error('[DashboardWrapper] Error ensuring database setup:', error);
    }
  };
  
  // Add an effect to verify tenant when component mounts
  useEffect(() => {
    console.log('DashboardWrapper mounted with props:', { newAccount, plan });
    
    // Check if we should skip loading
    const params = new URLSearchParams(window.location.search);
    if (params.get('noLoading') === 'true') {
      setShouldSkipLoading(true);
      console.log('[DashboardWrapper] Skipping loading screen due to noLoading parameter');
    }
    
    // Ensure database tables exist as early as possible
    ensureDatabaseSetup();
    
    // Remove development mode check - always use production behavior
    try {
      // Check existing localStorage values
      const setupDoneStr = localStorage.getItem('setupDone');
      const setupTimestamp = localStorage.getItem('setupTimestamp');
      
      logger.info('[Dashboard] Initial tenant verification:', {
        setupDone: setupDoneStr === 'true' ? 'yes' : 'no',
        setupTime: setupTimestamp ? new Date(parseInt(setupTimestamp, 10)).toISOString() : 'none'
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
  }, [newAccount, plan]);
  
  // New function to verify tenant exists and is properly set up
  const verifyTenant = async () => {
    setIsVerifyingTenant(true);
    try {
      const tokens = getTokensFromCookies();
      const accessToken = tokens?.accessToken;
      
      if (!accessToken) {
        console.error("[DashboardWrapper] No access token found for tenant verification");
        setIsVerifyingTenant(false);
        return false;
      }
      
      // Format tenant ID for database compatibility
      const formatTenantId = (id) => {
        if (!id) return null;
        return id.replace(/-/g, '_');
      };
      
      // Get tenant ID from various sources
      let tenantId = localStorage.getItem('tenantId') || getCookie('businessid');
      
      // Format tenant ID for database
      tenantId = formatTenantId(tenantId);
      
      const response = await fetch('/api/tenant/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          accessToken
        })
      });
      
      const data = await response.json();
      
      if (data.isValid) {
        // Store validated tenant info
        if (data.tenant) {
          localStorage.setItem('tenantId', data.tenant.id);
          localStorage.setItem('tenantName', data.tenant.name || '');
          
          // Set in state as well
          setTenantId(data.tenant.id);
          
          // Set cookie for server-side access
          setCookie('businessid', data.tenant.id, { path: '/' });
        }
        
        setIsVerifyingTenant(false);
        return true;
      } else {
        // Tenant verification failed, but we have valid tokens
        // Try to get or create tenant ID
        
        // Priority order:
        // 1. From localStorage
        // 2. From cookie
        // 3. Generate new one based on user ID
        
        let fallbackTenantId = localStorage.getItem('tenantId');
        
        if (!fallbackTenantId) {
          fallbackTenantId = getCookie('businessid');
        }
        
        if (!fallbackTenantId && tokens?.idToken) {
          // Extract user ID from token
          const payload = parseJwt(tokens.idToken);
          const userId = payload?.sub;
          
          if (userId) {
            // Generate deterministic UUID based on user ID
            try {
              const { v5: uuidv5 } = require('uuid');
              const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
              fallbackTenantId = uuidv5(userId, TENANT_NAMESPACE);
              console.log('[DashboardWrapper] Generated deterministic tenant ID from user ID:', fallbackTenantId);
            } catch (uuidError) {
              console.error('[DashboardWrapper] Error generating UUID:', uuidError);
              fallbackTenantId = null;
            }
          }
        }
        
        if (fallbackTenantId) {
          // Format for database compatibility
          fallbackTenantId = formatTenantId(fallbackTenantId);
          
          // Try to create tenant record in database
          try {
            const createResponse = await fetch('/api/tenant/init', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tenantId: fallbackTenantId,
                accessToken: tokens?.accessToken
              })
            });
            
            const createData = await createResponse.json();
            
            if (createData.success) {
              console.log("[DashboardWrapper] Successfully created tenant record:", createData);
              
              // Store tenant info
              localStorage.setItem('tenantId', createData.tenant_id);
              setTenantId(createData.tenant_id);
              
              // Set cookie for server-side access
              setCookie('businessid', createData.tenant_id, { path: '/' });
              
              setIsVerifyingTenant(false);
              return true;
            } else {
              console.error("[DashboardWrapper] Failed to create tenant record:", createData);
            }
          } catch (createError) {
            console.error("[DashboardWrapper] Error creating tenant record:", createError);
          }
        }
        
        setIsVerifyingTenant(false);
        return false;
      }
    } catch (error) {
      console.error("[DashboardWrapper] Error verifying tenant:", error);
      setIsVerifyingTenant(false);
      return false;
    }
  };
  
  // New function to check Cognito attributes
  const checkCognitoAttributes = async () => {
    try {
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
      const onboardingStatus = attributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS]?.toLowerCase();
      const setupDone = attributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED]?.toLowerCase() === 'true';
      
      logger.info('[Dashboard] Cognito attributes check:', {
        onboarding: onboardingStatus,
        setupDone: setupDone
      });
      
      // If either attribute is not set correctly, we need to update
      if (onboardingStatus !== ONBOARDING_STATUS.COMPLETE || setupDone !== 'true') {
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

  // Add the ensureProperCookies helper function
  const ensureProperCookies = (onboardingStatus, setupDone) => {
    // Check for lowercase 'complete' status
    const isComplete = onboardingStatus?.toLowerCase() === 'complete' || setupDone === true || setupDone === 'true';
    
    // Check for business info in cookies/localStorage
    const businessName = getCookie('businessName') || getCookie('business_name') || getCookie('custom:businessname') || localStorage.getItem('businessName');
    const businessType = getCookie('businessType') || getCookie('business_type') || getCookie('custom:businesstype') || localStorage.getItem('businessType');
    
    // If we have business info, force onboarding status to complete
    const shouldForceComplete = (businessName && businessType) || 
                               (window.location.pathname.startsWith('/dashboard') && (newAccount || plan));
    
    // Set cookies with consistent casing
    const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `onboardedStatus=${isComplete || shouldForceComplete ? 'complete' : (onboardingStatus || 'not_started')}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    document.cookie = `setupCompleted=${isComplete || shouldForceComplete ? 'true' : 'false'}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    document.cookie = `onboardingStep=${isComplete || shouldForceComplete ? 'complete' : 'business-info'}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    document.cookie = `onboardingInProgress=${isComplete || shouldForceComplete ? 'false' : 'true'}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    
    logger.debug('[Dashboard] Set onboarding cookies for consistency:', {
      onboardedStatus: isComplete || shouldForceComplete ? 'complete' : (onboardingStatus || 'not_started'),
      setupCompleted: isComplete || shouldForceComplete ? 'true' : 'false',
      onboardingStep: isComplete || shouldForceComplete ? 'complete' : 'business-info',
      forceComplete: shouldForceComplete
    });
    
    return isComplete || shouldForceComplete;
  };

  // Effect for tenant ID consistency check (replaces schema setup since we now use RLS)
  useEffect(() => {
    const ensureTenantConsistency = async () => {
      if (hasRunSetup.current) {
        logger.info('[Dashboard] Tenant consistency check already run in this session, skipping');
        return;
      }
      
      // Mark as run to prevent duplicate calls
      hasRunSetup.current = true;
      
      try {
        logger.debug('[Dashboard] Checking onboarding status for tenant consistency');
        
        // Get the current cookies for debugging
        const cookieOnboardingStatus = getCookie('onboardedStatus');
        const cookieSetupComplete = getCookie('setupCompleted');
        const cookieOnboardingStep = getCookie('onboardingStep');
        
        logger.debug('[Dashboard] Cookie values:', {
          onboardedStatus: cookieOnboardingStatus,
          setupCompleted: cookieSetupComplete,
          onboardingStep: cookieOnboardingStep
        });
        
        // Get tenant from authorized sources only, no fallbacks
        const tenantId = localStorage.getItem('tenantId') || getCookie('tenantId');
        const businessName = getCookie('businessName') || getCookie('business_name') || 
                           getCookie('custom:businessname') || localStorage.getItem('businessName');
        
        if (tenantId) {
          logger.info('[Dashboard] Ensuring tenant record exists in database');
          
          try {
            // First try our most reliable direct database endpoint that doesn't require auth
            let dbData = null;
            
            try {
              // Implement a simple retry mechanism for API calls
              const makeApiRequest = async (url, options, maxRetries = 2) => {
                let lastError = null;
                
                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                  try {
                    if (attempt > 0) {
                      // Wait with exponential backoff between retries
                      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
                      logger.debug(`[Dashboard] Retry ${attempt}/${maxRetries} for ${url}`);
                    }
                    
                    const response = await fetch(url, options);
                    
                    // Check if response is OK
                    if (!response.ok) {
                      throw new Error(`HTTP error ${response.status}`);
                    }
                    
                    // Try to parse JSON safely
                    const text = await response.text();
                    if (!text || text.trim() === '') {
                      throw new Error('Empty response');
                    }
                    
                    return JSON.parse(text);
                  } catch (error) {
                    lastError = error;
                    
                    // Only log the first error with details
                    if (attempt === 0) {
                      logger.warn(`[Dashboard] API error (attempt ${attempt + 1}): ${error.message}`);
                    }
                    
                    // Last attempt failed, throw the error
                    if (attempt === maxRetries) {
                      throw error;
                    }
                  }
                }
              };
              
              // Call the direct DB API endpoint
              dbData = await makeApiRequest('/api/tenant/ensure-db-record', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  tenantId,
                  businessName
                })
              });
              
              logger.info('[Dashboard] Successfully created tenant record via direct DB');
              
              // Always store tenantId in localStorage and cookies for consistency
              if (dbData.tenantId) {
                localStorage.setItem('tenantId', dbData.tenantId);
                document.cookie = `tenantId=${dbData.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
              }
            } catch (initError) {
              logger.error('[Dashboard] Error verifying tenant:', initError);
              // Continue with dashboard anyway
            }
          } catch (initError) {
            logger.error('[Dashboard] Error verifying tenant:', initError);
            // Continue with dashboard anyway
          }
        } else {
          logger.warn('[Dashboard] No tenant ID found, continuing without one');
        }
        
        // If onboarding is already marked as complete in cookies, skip further checks
        if (cookieOnboardingStatus === 'complete' || cookieSetupComplete === 'true' || 
            cookieOnboardingStep === 'complete' || localStorage.getItem('setupDone') === 'true') {
          
          logger.info('[Dashboard] Onboarding already marked as complete in cookies/localStorage');
          
          // Ensure cookies are consistent  
          ensureProperCookies('complete', true);
          
          // Update Cognito attributes if needed
          try {
            await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                attributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true',
                  [COGNITO_ATTRIBUTES.BUSINESS_NAME]: businessName
                },
                forceUpdate: true
              })
            });
            
            logger.info('[Dashboard] Updated Cognito attributes from cookie data');
          } catch (error) {
            logger.error('[Dashboard] Error updating Cognito attributes from cookies:', error);
          }
          
          setSetupStatus('success');
          return;
        }
        
        // If the user is viewing the dashboard with plan or newAccount params, force onboarding complete
        if (window.location.pathname.startsWith('/dashboard') && (newAccount || plan)) {
          logger.info('[Dashboard] User accessing dashboard with plan/newAccount, setting onboarding as complete');
          
          // Force onboarding status to complete
          ensureProperCookies('complete', true);
          
          // Try to update Cognito but don't block UI on failure
          try {
            await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                attributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
                },
                forceUpdate: true
              })
            });
          } catch (error) {
            logger.error('[Dashboard] Error updating Cognito attributes for new/plan user:', error);
          }
          
          setSetupStatus('success');
          return;
        }
        
        // Continue with the rest of the function as before...
        // Fetch user attributes to check onboarding status and tenant ID
        let userAttributes;
        try {
          userAttributes = await fetchUserAttributes();
        } catch (authError) {
          // Handle authentication errors specifically
          logger.error('[Dashboard] Authentication error fetching user attributes:', authError);
          
          // Try cookie check as fallback
          const isComplete = ensureProperCookies(cookieOnboardingStatus, cookieSetupComplete);
          if (isComplete) {
            logger.info('[Dashboard] Cookies indicate onboarding is complete despite auth error');
            setSetupStatus('success');
            return;
          }
          
          // Skip auth error redirection in development mode
          if (process.env.NODE_ENV === 'development') {
            logger.warn('[Dashboard] Development mode: Ignoring auth error, continuing with dashboard');
            setSetupStatus('success');
            return;
          }
          
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
        
        // Normalize onboarding status to lowercase for consistency
        const onboardingStatus = userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS]?.toLowerCase();
        const setupDone = userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED]?.toLowerCase() === 'true';
        const cognitoTenantId = userAttributes['custom:businessid'];
        
        // Debug log the normalized values and raw values
        logger.debug('[Dashboard] Normalized onboarding status:', { 
          onboardingStatus, 
          setupDone,
          rawOnboardingStatus: userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS],
          rawSetupDone: userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED]
        });
        
        // Ensure cookies are consistent with Cognito data
        const isComplete = ensureProperCookies(onboardingStatus, setupDone);
        
        // CRITICAL CHECK: If onboarding is complete, don't redirect
        if (isComplete) {
          logger.info('[Dashboard] Onboarding is complete, skipping redirection');
          
          // Update Cognito if needed to ensure consistency
          if (onboardingStatus !== 'complete' || setupDone !== true) {
            logger.info('[Dashboard] Updating Cognito attributes to ensure consistency');
            await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                attributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
                },
                forceUpdate: true
              })
            });
          }
          
          return;
        }
        
        // NEW: If user is new or in onboarding, redirect to onboarding
        if ((!onboardingStatus || onboardingStatus === 'not_started') && window.location.pathname.startsWith('/dashboard')) {
          // Check if business info is already in cookies before redirecting
          const businessNameCookie = getCookie('businessName');
          const businessTypeCookie = getCookie('businessType');
          
          // First check if onboarding is actually completed in other cookies/localStorage
          const onboardedStatusCookie = getCookie('onboardedStatus');
          const setupCompletedCookie = getCookie('setupCompleted');
          const onboardingStepCookie = getCookie('onboardingStep');
          
          // If any of these indicate onboarding is complete, update Cognito instead of redirecting
          if (onboardedStatusCookie === 'complete' || 
              setupCompletedCookie === 'true' ||
              onboardingStepCookie === 'complete' ||
              localStorage.getItem('setupDone') === 'true') {
            
            logger.info('[DashboardApp] Found completed onboarding in cookies/localStorage, updating Cognito');
            
            try {
              await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                    [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
                  },
                  forceUpdate: true
                })
              });
              
              // Also update the local state to prevent further redirect attempts
              setCognitoUpdateNeeded(false);
              
              // Don't redirect - just continue with dashboard
              logger.info('[DashboardApp] Updated Cognito with completed onboarding status');
              return;
            } catch (error) {
              logger.error('[DashboardApp] Error updating Cognito with onboarding status:', error);
            }
          }
          
          if (businessNameCookie && businessTypeCookie) {
            // If business info exists in cookies, try to update Cognito attributes instead of redirecting
            logger.info('[DashboardApp] Found business info in cookies, updating Cognito instead of redirecting');
            
            try {
              await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.BUSINESS_NAME]: businessNameCookie,
                    [COGNITO_ATTRIBUTES.BUSINESS_TYPE]: businessTypeCookie,
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'business_info_completed',
                  },
                  forceUpdate: true
                })
              });
              
              // Refresh the page instead of redirecting
              logger.info('[DashboardApp] Updated Cognito with business info from cookies, refreshing...');
              setTimeout(() => window.location.reload(), 1000);
              return;
            } catch (error) {
              logger.error('[DashboardApp] Error updating Cognito with business info:', error);
            }
          }
          
          logger.info('[DashboardApp] New user detected, handling redirection');
          window.location.href = '/onboarding/business-info';
          return;
        }
        
        if ((onboardingStatus && onboardingStatus !== 'complete') && window.location.pathname.startsWith('/dashboard')) {
          // Check if we're in a potential redirection loop
          const lastRedirectTime = localStorage.getItem('lastOnboardingRedirect');
          const currentTime = Date.now();
          
          // Check if this is a return from subscription page with plan parameter
          const urlParams = new URLSearchParams(window.location.search);
          const planParam = urlParams.get('plan');
          const newAccountParam = urlParams.get('newAccount');
          
          // If user is coming from subscription page with plan parameter, don't redirect
          if (planParam && (planParam === 'free' || planParam === 'basic' || planParam === 'pro')) {
            logger.info('[DashboardApp] User coming from subscription with plan, staying on dashboard', { plan: planParam });
            
            // Force onboarding status to complete
            try {
              await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                    [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
                  },
                  forceUpdate: true
                })
              });
              
              // Set cookies to match
              document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=complete; path=/`;
              document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/`;
              
              // Continue with dashboard - don't redirect or reload
              return;
            } catch (error) {
              logger.error('[DashboardApp] Error updating onboarding status for user with plan:', error);
            }
          }
          
          if (lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000) {
            // Less than 3 seconds since last redirect - likely in a loop
            logger.warn('[DashboardApp] Potential redirection loop detected, forcing dashboard access');
            
            // Force onboarding status to complete to break the loop
            try {
              await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: 'complete',
                    [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
                  },
                  forceUpdate: true
                })
              });
              
              // Set cookies to match
              document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=complete; path=/`;
              document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/`;
              
              // Ensure tenant record exists before refreshing
              try {
                // Get tenant ID from various sources
                const userTenantId = localStorage.getItem('tenantId') || 
                                   getCookie('tenantId') || 
                                   userAttributes?.['custom:businessid'];
                
                // First initialize the database environment to ensure tables exist
                try {
                  const initResponse = await fetch('/api/tenant/init-db-env');
                  const initData = await initResponse.json();
                  logger.info('[Dashboard] Database environment initialization:', 
                    initData.success ? 'successful' : 'failed',
                    'Table exists:', initData.tableExists);
                } catch (initError) {
                  logger.warn('[Dashboard] Error initializing database environment:', initError.message);
                  // Continue anyway, the main endpoint has its own initialization
                }
                
                // Create tenant record in database with our enhanced endpoint
                const createTenantResponse = await fetch('/api/tenant/create-tenant-record', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tenantId: userTenantId,
                    userId: localStorage.getItem('userId') || userAttributes?.sub,
                    email: localStorage.getItem('userEmail') || userAttributes?.email,
                    businessName: userAttributes?.['custom:businessname'] || '',
                    forceCreate: true
                  })
                });
                
                const tenantData = await createTenantResponse.json();
                logger.info('[Dashboard] Created tenant record to break redirection loop:', tenantData);
                
                // Store tenant ID in localStorage and cookie for consistency
                if (tenantData.tenantId) {
                  localStorage.setItem('tenantId', tenantData.tenantId);
                  document.cookie = `tenantId=${tenantData.tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
                }
              } catch (tenantError) {
                logger.error('[Dashboard] Error creating tenant record:', tenantError);
              }
              
              // Refresh the page
              setTimeout(() => window.location.reload(), 1000);
              return;
            } catch (error) {
              logger.error('[DashboardApp] Error breaking redirection loop:', error);
            }
          }
          
          // Record this redirect attempt
          localStorage.setItem('lastOnboardingRedirect', currentTime.toString());
          
          logger.info('[DashboardApp] Incomplete onboarding detected, redirecting to onboarding');
          
          // Determine the correct onboarding step
          let redirectPath = '/onboarding/business-info';
          if (onboardingStatus === 'business_info') {
            redirectPath = '/onboarding/subscription';
          } else if (onboardingStatus === 'subscription') {
            redirectPath = '/onboarding/payment';
          } else if (onboardingStatus === 'payment') {
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
        const cookieTenantId = getCookie('tenantId');
        
        // Log tenant ID from different sources for debugging
        logger.info('[Dashboard] Tenant ID check for RLS:', {
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
        
        logger.info('[Dashboard] Current Cognito status:', {
          onboarding: onboardingStatus || 'not set',
          setupDone: setupDone || 'not set',
          tenantId: cognitoTenantId || 'not set'
        });
        
        // If already complete according to Cognito (which is the source of truth), we're done
        if (onboardingStatus === 'complete' && (setupDone === true || setupDone === 'true')) {
          logger.info('[Dashboard] Onboarding already complete according to Cognito');
          setSetupStatus('already-complete');
          return;
        }
        
        // Flag that we definitely need to update Cognito attributes
        setCognitoUpdateNeeded(true);
        
        // For RLS, we don't need to trigger schema setup anymore, just ensure tenant ID is consistent
        // and Cognito attributes are up to date
        setSetupStatus('in-progress');
        
        // Verify/validate tenant ID via API
        const response = await fetch('/api/auth/verify-tenant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId: cognitoTenantId || localStorageTenantId || cookieTenantId,
            validateOnly: true
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(`Failed to verify tenant: ${errorData.message || response.status}`);
        }
        
        const data = await response.json();
        logger.debug('[Dashboard] Tenant verification successful:', data);
        
        // Set flag to update Cognito directly for redundancy
        setCognitoUpdateNeeded(true);
        setSetupStatus('completed');
        
        // Force immediate Cognito update check 
        setTimeout(() => {
          checkCognitoAttributes();
        }, 1000);
      } catch (error) {
        logger.error('[Dashboard] Error verifying tenant consistency:', error);
        setSetupStatus('failed');
        // Still try to update Cognito
        setCognitoUpdateNeeded(true);
      }
    };
    
    // Only run once when component mounts
    logger.info('[Dashboard] Tenant consistency check effect triggered');
    ensureTenantConsistency();
  }, []);
  
  // Handle Cognito attribute update if needed
  useEffect(() => {
    const updateCognitoIfNeeded = async () => {
      if (!cognitoUpdateNeeded) return;
      
      try {
        logger.info('[Dashboard] Attempting to update Cognito attributes directly');
        const result = await updateCognitoOnboardingStatus();
        
        // Consider the update successful if the result has success=true OR clientSideFallback=true
        const isSuccess = result.success === true || result.clientSideFallback === true;
        
        if (isSuccess) {
          logger.info('[Dashboard] Successfully updated Cognito attributes:', result);
          setCognitoUpdateNeeded(false);
          
          // Double-check after a delay to ensure changes propagated, but don't block UI
          setTimeout(async () => {
            try {
              const userAttributes = await fetchUserAttributes().catch(e => ({}));
              
              // Only log this if we successfully got attributes
              if (userAttributes) {
                logger.info('[Dashboard] Verified Cognito attributes after update:', {
                  onboarding: userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS],
                  setupDone: userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED]
                });
              }
            } catch (error) {
              // Just log and continue - this is not critical functionality
              logger.warn('[Dashboard] Non-critical error verifying Cognito attributes after update:', 
                error.message || error.toString());
            }
          }, 2000);
        } else {
          logger.warn('[Dashboard] Attribute update returned non-success response:', result);
          // For non-success results, don't retry to avoid spamming the API
          setCognitoUpdateNeeded(false);
        }
      } catch (error) {
        logger.error('[Dashboard] Error updating Cognito attributes:', error);
        
        // Immediately clear update needed to prevent infinite retries
        setCognitoUpdateNeeded(false);
        
        // Safely handle authentication errors without affecting user experience
        if (error.toString().includes('User needs to be authenticated') || 
            error.toString().includes('UnAuthenticated') ||
            error.toString().includes('Token expired')) {
          logger.warn('[Dashboard] Authentication token issue detected, but proceeding with dashboard');
        }
      }
    };
    
    if (cognitoUpdateNeeded) {
      updateCognitoIfNeeded();
    }
  }, [cognitoUpdateNeeded, updateCognitoOnboardingStatus]);

  // Function to parse JWT token
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('[DashboardWrapper] Error parsing JWT:', e);
      return null;
    }
  };

  // Function to get tokens from cookies
  const getTokensFromCookies = () => {
    try {
      const idTokenCookie = getCookie('idToken');
      const accessTokenCookie = getCookie('accessToken');
      
      if (idTokenCookie && accessTokenCookie) {
        return { idToken: idTokenCookie, accessToken: accessTokenCookie };
      }
      
      // Try Cognito cookie format if direct cookies not found
      const lastAuthUser = getCookie('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser');
      if (lastAuthUser) {
        const idToken = getCookie(`CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.${lastAuthUser}.idToken`);
        const accessToken = getCookie(`CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.${lastAuthUser}.accessToken`);
        
        if (idToken && accessToken) {
          return { idToken, accessToken };
        }
      }
      
      return null;
    } catch (e) {
      console.error('[DashboardWrapper] Error getting tokens from cookies:', e);
      return null;
    }
  };

  // Function to set cookie with options
  const setCookie = (name, value, options = {}) => {
    try {
      const { path = '/', maxAge = 60*60*24*30, sameSite = 'lax' } = options;
      document.cookie = `${name}=${value}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
    } catch (e) {
      console.error('[DashboardWrapper] Error setting cookie:', e);
    }
  };

  // Render loading screen and dashboard
  return (
    <>
      {/* Dashboard loading screen - show while verifying tenant or setting up */}
      {!shouldSkipLoading && (isVerifyingTenant || setupStatus === 'pending') && (
        <DashboardLoader message={
          tenantError ? 
            `Error: ${tenantError}` : 
            setupStatus === 'pending' ? 
              'Preparing your dashboard...' : 
              'Verifying your account...'
        } />
      )}
            
      {/* Debug component */}
      {process.env.NODE_ENV === 'development' && (
        <MemoryDebug />
      )}
      
      {/* Main dashboard component */}
      <Dashboard 
        tenantId={tenantId} 
        newAccount={newAccount}
        plan={plan}
      />
    </>
  );
};

export default DashboardWrapper;