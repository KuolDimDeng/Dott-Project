'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { fetchUserAttributes, fetchAuthSession } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { usePathname, useRouter } from 'next/navigation';
import { isPublicRoute } from '@/lib/authUtils';
import { useNotification } from '@/context/NotificationContext';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import { SignIn } from '@/components/Auth/SignIn';
import { toast } from 'react-hot-toast';
import DashboardShell from '@/components/Dashboard/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { saveUserPreferences, getOnboardingStatus, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

// App Cache keys
const CACHE_KEYS = {
  ONBOARDING_STATUS: 'onboarding_status',
  SETUP_COMPLETED: 'setup_completed',
  BUSINESS_INFO_DONE: 'business_info_done',
  SUBSCRIPTION_DONE: 'subscription_done',
  PAYMENT_DONE: 'payment_done',
  FREE_PLAN_SELECTED: 'free_plan_selected'
};

/**
 * Global dashboard app component that runs at the application level
 * This component ensures critical app state like onboarding status
 * is properly synchronized across all components using Cognito attributes
 */
const DashboardApp = ({ children, params }) => {
  const { updateCognitoOnboardingStatus } = useTenantInitialization();
  const pathname = usePathname();
  const router = useRouter();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const { notifyWarning } = useNotification();
  const { 
    isAuthenticated,
    isLoading,
    needsReauthentication, 
    setReauthenticationRequired,
    updateLastAuthTime
  } = useAuth();
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  
  // Check for reauthentication requirement
  useEffect(() => {
    if (needsReauthentication && pathname.includes('/dashboard')) {
      logger.info('[DashboardApp] User needs to reauthenticate for full tenant access');
      
      // Show notification to the user
      notifyWarning(
        'Some features may be limited until you sign out and sign in again. This is due to security requirements.',
        { autoHideDuration: 10000 }
      );
      
      // Clear the flag after showing the notification
      setTimeout(async () => {
        try {
          await setReauthenticationRequired(false);
        } catch (error) {
          logger.error('[DashboardApp] Error clearing reauthentication flag:', error);
        }
      }, 30000); // Remove after 30 seconds to avoid showing it too often
    }
  }, [pathname, notifyWarning, needsReauthentication, setReauthenticationRequired]);
  
  // Effect to immediately check if user should be redirected based on Cognito attributes
  useEffect(() => {
    const checkClientOnboardingState = async () => {
      // Skip checks on public routes and onboarding routes
      if (isPublicRoute(pathname) || pathname.startsWith('/onboarding') || pathname.startsWith('/auth')) {
        return;
      }
      
      try {
        // Get onboarding status directly from Cognito
        const userAttributes = await fetchUserAttributes();
        
        // Extract onboarding information from attributes
        const onboardingStatus = userAttributes['custom:onboarding'] || 'not_started';
        const setupDone = userAttributes['custom:setupdone'] === 'TRUE';
        const businessInfoDone = userAttributes['custom:business_info_done'] === 'TRUE';
        const subscriptionDone = userAttributes['custom:subscription_done'] === 'TRUE';
        const paymentDone = userAttributes['custom:payment_done'] === 'TRUE';
        const subscriptionPlan = userAttributes['custom:subplan'] || '';
        
        // Consider user onboarded if any of these indicators are true
        const isCompleteStatus = onboardingStatus.toLowerCase() === ONBOARDING_STATUS.COMPLETE.toLowerCase();
        const isFreePlan = subscriptionPlan.toLowerCase() === 'free' || subscriptionPlan.toLowerCase() === 'basic';
        const isOnboarded = isCompleteStatus || setupDone || (isFreePlan && subscriptionDone);
        
        logger.debug('[DashboardApp] Cognito onboarding check:', { 
          onboardingStatus, 
          setupDone,
          businessInfoDone,
          subscriptionDone,
          paymentDone,
          subscriptionPlan,
          isOnboarded,
          pathname 
        });

        // If coming from onboarding flow with plan selection, 
        // consider this as completed onboarding and update Cognito
        const urlParams = new URLSearchParams(window.location.search);
        const isNewAccount = urlParams.get('newAccount') === 'true';
        const planSelected = urlParams.get('plan');
        
        if (pathname.includes('/dashboard') && isNewAccount && planSelected) {
          logger.info('[DashboardApp] New account with plan detected, setting onboarding completion in Cognito');
          
          // Format attributes for Cognito update
          const attributes = {
            'custom:onboarding': ONBOARDING_STATUS.COMPLETE,
            'custom:setupdone': 'TRUE',
            'custom:updated_at': new Date().toISOString()
          };
          
          // Update Cognito with the onboarding completion
          await updateCognitoOnboardingStatus(ONBOARDING_STATUS.COMPLETE, attributes);
          return; // Allow dashboard access
        }
        
        // If not onboarded and trying to access dashboard, redirect to onboarding
        if (pathname.includes('/dashboard') && !isOnboarded) {
          // Determine the appropriate onboarding step based on progress
          let redirectStep = 'business-info';
          
          if (businessInfoDone && !subscriptionDone) {
            redirectStep = 'subscription';
          } else if (businessInfoDone && subscriptionDone && !isFreePlan && !paymentDone) {
            redirectStep = 'payment';
          } else if ((businessInfoDone && subscriptionDone && isFreePlan) || 
                     (businessInfoDone && subscriptionDone && paymentDone && !setupDone)) {
            redirectStep = 'setup';
          }
          
          const redirectPath = `/onboarding/${redirectStep}`;
          
          logger.info('[DashboardApp] Redirecting from Cognito attribute check:', { 
            from: pathname, 
            to: redirectPath,
            reason: 'Incomplete onboarding' 
          });
          
          router.push(redirectPath);
        }
      } catch (error) {
        logger.warn('[DashboardApp] Error checking Cognito attributes:', error);
        // Allow access on error for better user experience
      }
    };
    
    // Run the client-side check
    checkClientOnboardingState();
  }, [pathname, router, updateCognitoOnboardingStatus]);
  
  // Effect to check and update Cognito attributes on app load
  useEffect(() => {
      // Skip attribute updates on public routes
      if (isPublicRoute(pathname) || pathname.startsWith('/auth')) {
        logger.debug('[DashboardApp] Skipping Cognito attribute check on public route:', pathname);
        return;
      }
      
    // **CRITICAL FIX**: First check if AppCache indicates onboarding is complete
        // If so, allow dashboard access immediately without waiting for Cognito
    const initialOnboardingStatus = getCacheValue(CACHE_KEYS.ONBOARDING_STATUS);
    const initialSetupCompleted = getCacheValue(CACHE_KEYS.SETUP_COMPLETED);
    const freePlanSelected = getCacheValue(CACHE_KEYS.FREE_PLAN_SELECTED);
        const isNewAccount = new URLSearchParams(window.location.search).get('newAccount') === 'true';
        
        // ENHANCED: Check for new account with free plan in URL parameters
        if (isNewAccount && 
            (pathname.startsWith('/dashboard') || pathname.includes('/dashboard')) && 
            (new URLSearchParams(window.location.search).get('plan') === 'free' || 
             new URLSearchParams(window.location.search).get('freePlan') === 'true')) {
          
          logger.info('[DashboardApp] Detected new account with free plan, ensuring onboarding status is complete');
          
      // Update AppCache with completion status
      setCacheValue(CACHE_KEYS.ONBOARDING_STATUS, ONBOARDING_STATUS.COMPLETE);
      setCacheValue(CACHE_KEYS.SETUP_COMPLETED, true);
      setCacheValue(CACHE_KEYS.FREE_PLAN_SELECTED, true);
      
      // Create an async function to handle the attribute updates
      const updateCognitoAttributesForAccount = async () => {
            logger.info('[DashboardApp] Updating Cognito attributes for new free plan account');
        
        try {
          // Use saveUserPreferences utility to update multiple attributes at once
          const success = await saveUserPreferences({
            [PREF_KEYS.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
            [PREF_KEYS.SETUP_DONE]: 'TRUE',
                    'custom:updated_at': new Date().toISOString()
          });
          
          if (!success) {
            // Then try server API
            try {
              // Force refresh the auth session first
              const { fetchAuthSession } = await import('aws-amplify/auth');
              await fetchAuthSession({ forceRefresh: true });
              
              const apiResponse = await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attributes: {
                    'custom:onboarding': 'complete',
                    'custom:setupdone': 'TRUE',
                    'custom:updated_at': new Date().toISOString()
                  },
                  forceUpdate: true
                })
              });
              
              if (apiResponse.ok) {
                logger.info('[DashboardApp] Successfully updated attributes via API for new account');
              } else {
                const errorText = await apiResponse.text();
                logger.warn('[DashboardApp] API attribute update failed:', errorText);
              }
            } catch (apiError) {
              logger.error('[DashboardApp] Failed API attribute update:', apiError);
            }
          }
        } catch (error) {
          logger.error('[DashboardApp] Error in Cognito attribute update process:', error);
        }
      };
      
      // Execute the async function
      updateCognitoAttributesForAccount();
    }
    
    // Main attribute check function
    const checkCognitoAttributes = async () => {
      try {
        // Get the user attributes from Cognito
        logger.debug('[DashboardApp] Checking Cognito attributes for onboarding status');
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        const userAttributes = await fetchUserAttributes();
        
        // Basic validation to check if the onboarding flow needs to be completed
        const onboardingStatus = userAttributes['custom:onboarding'] || '';
        const setupDone = userAttributes['custom:setupdone'] === 'TRUE';
        const businessInfoDone = userAttributes['custom:business_info_done'] === 'TRUE';
        const subscriptionDone = userAttributes['custom:subscription_done'] === 'TRUE';
        const paymentDone = userAttributes['custom:payment_done'] === 'TRUE';
        const subscriptionPlan = userAttributes['custom:subplan'] || '';
        
        // Log the attributes for debugging
        logger.debug('[DashboardApp] Cognito attributes on app load:', { 
          onboardingStatus, 
          setupDone, 
          businessInfoDone,
          subscriptionDone,
          paymentDone,
          subscriptionPlan
        });
        
        // Determine if onboarding is complete based on either the onboarding status
        // or the combination of business info, subscription and payment completion
        const isFreePlan = subscriptionPlan.toLowerCase() === 'free' || subscriptionPlan.toLowerCase() === 'basic';
        const isOnboardingComplete = 
          onboardingStatus.toLowerCase() === ONBOARDING_STATUS.COMPLETE.toLowerCase() || 
          setupDone ||
          (businessInfoDone && subscriptionDone && (isFreePlan || paymentDone));
        
        // If Cognito indicates onboarding is complete, but AppCache doesn't, update AppCache
        if (isOnboardingComplete && initialOnboardingStatus !== ONBOARDING_STATUS.COMPLETE) {
          logger.info('[DashboardApp] Setting onboarding cache values from Cognito attributes');
          
          // Update AppCache with Cognito values
          setCacheValue(CACHE_KEYS.ONBOARDING_STATUS, ONBOARDING_STATUS.COMPLETE);
          setCacheValue(CACHE_KEYS.SETUP_COMPLETED, setupDone);
          setCacheValue(CACHE_KEYS.BUSINESS_INFO_DONE, businessInfoDone);
          setCacheValue(CACHE_KEYS.SUBSCRIPTION_DONE, subscriptionDone);
          
          if (isFreePlan) {
            setCacheValue(CACHE_KEYS.FREE_PLAN_SELECTED, true);
          }
        }
        
        // Complete the initial check
        setInitialCheckComplete(true);
      } catch (error) {
        logger.warn('[DashboardApp] Error fetching Cognito attributes:', error);
        // Complete the check even on error to allow app to function
        setInitialCheckComplete(true);
      }
    };
    
    // Run the attribute check
    checkCognitoAttributes();
  }, [pathname]);
  
  // Handle successful re-authentication
  const handleReauthenticationSuccess = async () => {
    try {
      // Update last auth time
      await updateLastAuthTime();
      
      // Reset state
      setIsReauthenticating(false);
      
      // Show success message
      toast.success('Authentication refreshed successfully');
    } catch (error) {
      logger.error('[DashboardApp] Error handling re-authentication success:', error);
      toast.error('Error refreshing authentication');
    }
  };
  
  // Handle session expiry and re-authentication
  useEffect(() => {
    // If needs re-authentication, show re-auth flow
    if (needsReauthentication && isAuthenticated) {
      setIsReauthenticating(true);
                  } else {
      setIsReauthenticating(false);
    }
  }, [needsReauthentication, isAuthenticated]);
  
  // Check tenant ID in URL
  useEffect(() => {
    // Check if we have a tenant ID in the URL
    if (params?.tenantId) {
      // Redirect if needed or save the tenant ID preference
      // This will depend on your app's requirements
    }
  }, [params]);
  
  // Show loading state
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Show re-authentication dialog if needed
  if (isReauthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Session Expired</h1>
          <p className="mb-6 text-center text-muted-foreground">
            Your session has expired. Please re-authenticate to continue.
          </p>
          <SignIn 
            onSuccess={handleReauthenticationSuccess}
            isReauthentication
          />
        </div>
      </div>
    );
  }
  
  // Show dashboard if authenticated
  if (isAuthenticated) {
    return <DashboardShell>{children}</DashboardShell>;
  }
  
  // Redirect to login if not authenticated
  router.push('/login');
  return <div className="loading">Redirecting to login...</div>;
};

export default DashboardApp; 