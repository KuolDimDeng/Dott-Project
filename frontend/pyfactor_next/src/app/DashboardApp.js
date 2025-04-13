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

/**
 * Global dashboard app component that runs at the application level
 * This component ensures critical app state like onboarding status
 * is properly synchronized across all components using Cognito attributes
 */
const DashboardApp = ({ children }) => {
  const { updateCognitoOnboardingStatus } = useTenantInitialization();
  const pathname = usePathname();
  const router = useRouter();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const { notifyWarning } = useNotification();
  
  // Check for reauthentication requirement
  useEffect(() => {
    const needsReauth = localStorage.getItem('needsReauthentication') === 'true';
    
    if (needsReauth && pathname.includes('/dashboard')) {
      logger.info('[DashboardApp] User needs to reauthenticate for full tenant access');
      
      // Show notification to the user
      notifyWarning(
        'Some features may be limited until you sign out and sign in again. This is due to security requirements.',
        { autoHideDuration: 10000 }
      );
      
      // Clear the flag after showing the notification
      setTimeout(() => {
        localStorage.removeItem('needsReauthentication');
      }, 30000); // Remove after 30 seconds to avoid showing it too often
    }
  }, [pathname, notifyWarning]);
  
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
    const checkAndUpdateCognitoAttributes = async () => {
      // Skip attribute updates on public routes
      if (isPublicRoute(pathname) || pathname.startsWith('/auth')) {
        logger.debug('[DashboardApp] Skipping Cognito attribute check on public route:', pathname);
        return;
      }
      
      try {
        // **CRITICAL FIX**: First check if cookies indicate onboarding is complete
        // If so, allow dashboard access immediately without waiting for Cognito
        const getCookie = (name) => {
          const value = document.cookie.split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
          return value;
        };
        
        const cookieOnboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
        const cookieSetupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
        const freePlanSelected = getCookie(COOKIE_NAMES.FREE_PLAN_SELECTED);
        const isNewAccount = new URLSearchParams(window.location.search).get('newAccount') === 'true';
        
        // ENHANCED: Check for new account with free plan in URL parameters
        if (isNewAccount && 
            (pathname.startsWith('/dashboard') || pathname.includes('/dashboard')) && 
            (new URLSearchParams(window.location.search).get('plan') === 'free' || 
             new URLSearchParams(window.location.search).get('freePlan') === 'true')) {
          
          logger.info('[DashboardApp] Detected new account with free plan, ensuring onboarding status is complete');
          
          // Force cookies to indicate completion
          document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; max-age=${60*60*24*7}`;
          document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/; max-age=${60*60*24*7}`;
          document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.COMPLETE}; path=/; max-age=${60*60*24*7}`;
          document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; max-age=${60*60*24*7}`;
          
          // Also update localStorage for redundancy
          try {
            localStorage.setItem('onboardingStatus', ONBOARDING_STATUS.COMPLETE);
            localStorage.setItem('setupCompleted', 'true');
            localStorage.setItem('freePlanSelected', 'true');
          } catch (e) {
            // Ignore localStorage errors
          }
          
          // Force update Cognito attributes with multiple approaches
          try {
            // First try client-side update
            logger.info('[DashboardApp] Updating Cognito attributes for new free plan account');
            const { updateUserAttributes } = await import('aws-amplify/auth');
            try {
              await updateUserAttributes({
                userAttributes: {
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true',
                  'custom:updated_at': new Date().toISOString()
                }
              });
              logger.info('[DashboardApp] Successfully updated client-side Cognito attributes for new account');
            } catch (clientError) {
              logger.warn('[DashboardApp] Failed client-side attribute update:', clientError);
              
              // Then try server API
              try {
                // Force refresh the auth session first
                await fetchAuthSession({ forceRefresh: true });
                
                const apiResponse = await fetch('/api/user/update-attributes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    attributes: {
                      'custom:onboarding': 'complete',
                      'custom:setupdone': 'true',
                      'custom:updated_at': new Date().toISOString()
                    },
                    forceUpdate: true
                  })
                });
                
                if (apiResponse.ok) {
                  logger.info('[DashboardApp] Successfully updated attributes via API for new account');
                } else {
                  logger.warn('[DashboardApp] API attribute update failed:', await apiResponse.text());
                }
              } catch (apiError) {
                logger.error('[DashboardApp] Failed API attribute update:', apiError);
              }
            }
          } catch (e) {
            logger.error('[DashboardApp] Error updating attributes for new account:', e);
          }
          
          setInitialCheckComplete(true);
          return; // Continue with dashboard access
        }
        
        if (pathname.startsWith('/dashboard') && 
            (cookieOnboardingStatus === ONBOARDING_STATUS.COMPLETE || cookieSetupCompleted === 'true')) {
          logger.info('[DashboardApp] Cookies indicate onboarding complete, proceeding with dashboard');
          setInitialCheckComplete(true);
          
          // Always verify and update attributes in Cognito (source of truth for dashboard)
          fetchUserAttributes().catch(() => ({})).then(attrs => {
            // Always update Cognito attributes if we're in the dashboard
            logger.info('[DashboardApp] Updating Cognito attributes for dashboard consistency');
            
            // First try client-side update
            try {
              const { updateUserAttributes } = await import('aws-amplify/auth');
              await updateUserAttributes({
                userAttributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true',
                  'custom:updated_at': new Date().toISOString()
                }
              });
              logger.info('[DashboardApp] Successfully updated client-side attributes');
            } catch (clientError) {
              logger.warn('[DashboardApp] Client-side attribute update failed:', clientError);
              
              // Fall back to server API
              fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
                    [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true',
                    'custom:updated_at': new Date().toISOString()
                  },
                  forceUpdate: true
                })
              }).catch(e => logger.warn('Failed to update attributes via API:', e));
            }
          });
          
          return; // Exit early and allow dashboard access
        }
        
        // Check current Cognito attributes
        const userAttributes = await fetchUserAttributes().catch(error => {
          logger.warn('[DashboardApp] Error fetching user attributes:', {
            message: error.message,
            name: error.name
          });
          return {}; // Return empty object to continue with defaults
        });
        
        const onboardingStatus = userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
        const setupDone = userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
        const businessId = userAttributes[COGNITO_ATTRIBUTES.BUSINESS_ID] || '';
        const subscriptionPlan = userAttributes[COGNITO_ATTRIBUTES.SUBSCRIPTION_PLAN] || '';
        
        // IMPORTANT ENHANCEMENT: If user has FREE plan but onboarding is still 'subscription',
        // update it to 'complete' automatically
        const isFreePlan = subscriptionPlan.toUpperCase() === 'FREE';
        if (isFreePlan && onboardingStatus === 'subscription' && pathname.includes('/dashboard')) {
          logger.info('[DashboardApp] Detected FREE plan with incomplete onboarding status, fixing now');
          
          // Update onboarding status for free plan
          try {
            const { updateUserAttributes } = await import('aws-amplify/auth');
            await updateUserAttributes({
              userAttributes: {
                'custom:onboarding': 'complete',
                'custom:setupdone': 'true',
                'custom:updated_at': new Date().toISOString()
              }
            });
            logger.info('[DashboardApp] Successfully updated Cognito attributes for FREE plan');
            
            // Set cookies to match
            document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; max-age=${60*60*24*7}`;
            document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/; max-age=${60*60*24*7}`;
            document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; max-age=${60*60*24*7}`;
            
            setInitialCheckComplete(true);
            return; // Continue with dashboard access
          } catch (error) {
            logger.warn('[DashboardApp] Failed to update attributes for FREE plan, trying API', error);
            
            // Try server-side update as fallback
            try {
              const apiResponse = await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attributes: {
                    'custom:onboarding': 'complete',
                    'custom:setupdone': 'true',
                    'custom:updated_at': new Date().toISOString()
                  },
                  forceUpdate: true
                })
              });
              
              if (apiResponse.ok) {
                logger.info('[DashboardApp] Successfully updated attributes via API for FREE plan');
                
                // Set cookies to match
                document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; max-age=${60*60*24*7}`;
                document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/; max-age=${60*60*24*7}`;
                document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; max-age=${60*60*24*7}`;
                
                setInitialCheckComplete(true);
                return; // Continue with dashboard access
              }
            } catch (apiError) {
              logger.error('[DashboardApp] Failed API attribute update for FREE plan:', apiError);
            }
          }
        }
        
        logger.info('[DashboardApp] Checking Cognito attributes for onboarding status:', {
          onboarding: onboardingStatus || 'not set',
          setupDone: setupDone || 'not set',
          businessId: businessId || 'not set'
        });
        
        setInitialCheckComplete(true);
        
        // Also check cookies and localStorage to see if user is truly onboarded
        // Helper to get cookie value
        const getCookie = (name) => {
          const value = document.cookie.split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
          return value;
        };
        
        // Check all possible indicators of completed onboarding
        const cookieOnboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
        const cookieSetupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
        const cookieFreePlan = getCookie(COOKIE_NAMES.FREE_PLAN_SELECTED);
        const cookieOnboardingStep = getCookie(COOKIE_NAMES.ONBOARDING_STEP);
        
        // Check localStorage too
        let localStorageOnboarded = false;
        try {
          localStorageOnboarded = 
            localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS) === ONBOARDING_STATUS.COMPLETE || 
            localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETED) === 'true';
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // Consider onboarded if ANY indicator shows completion
        const isFullyOnboardedByAnySource = 
          onboardingStatus === ONBOARDING_STATUS.COMPLETE || 
          setupDone === 'TRUE' ||
          cookieOnboardingStatus === ONBOARDING_STATUS.COMPLETE ||
          cookieSetupCompleted === 'true' ||
          cookieFreePlan === 'true' ||
          cookieOnboardingStep === ONBOARDING_STEPS.COMPLETE ||
          localStorageOnboarded;
          
        logger.debug('[DashboardApp] Combined onboarding indicators:', {
          cognitoOnboarding: onboardingStatus,
          cognitoSetupDone: setupDone,
          cookieOnboardingStatus,
          cookieSetupCompleted,
          cookieFreePlan,
          cookieOnboardingStep,
          localStorageOnboarded,
          isFullyOnboardedByAnySource,
          currentPath: pathname
        });
        
        // Critical change: If on dashboard and cookies indicate onboarding complete,
        // skip redirection regardless of Cognito attributes
        if (pathname.startsWith('/dashboard') && 
            (cookieOnboardingStatus === ONBOARDING_STATUS.COMPLETE || 
             cookieSetupCompleted === 'true' || 
             cookieFreePlan === 'true' ||
             cookieOnboardingStep === ONBOARDING_STEPS.COMPLETE ||
             localStorageOnboarded)) {
          logger.info('[DashboardApp] Onboarding complete in cookies/localStorage, allowing dashboard access');
          
          // CRITICAL FIX: Always update Cognito attributes to match cookie state
          // This prevents race conditions where Cognito might not be updated yet
          logger.info('[DashboardApp] Proactively updating Cognito to match cookies/localStorage state');
          try {
            const result = await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'TRUE'
                },
                forceUpdate: true
              })
            });
            
            if (result.ok) {
              logger.info('[DashboardApp] Successfully updated Cognito attributes to match cookies');
            } else {
              logger.warn('[DashboardApp] Failed to update Cognito attributes:', await result.text());
            }
          } catch (error) {
            logger.error('[DashboardApp] Error updating attributes:', error);
          }
          
          return; // Exit early, allow dashboard access
        }
        
        // For new users or users with incomplete onboarding, redirect to onboarding
        const isNewUser = !onboardingStatus || onboardingStatus === '';
        const isOnboardingIncomplete = !isFullyOnboardedByAnySource;
        
        if ((isNewUser || isOnboardingIncomplete) && !pathname.startsWith('/onboarding')) {
          logger.info(`[DashboardApp] ${isNewUser ? 'New user' : 'Incomplete onboarding'} detected, handling redirection`);
          
          // For new users, set status to INCOMPLETE first
          if (isNewUser) {
            try {
              // Try server-side update first via regular API
              await fetch('/api/user/update-attributes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  attributes: {
                    [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.IN_PROGRESS
                  }
                })
              });
              
              logger.info('[DashboardApp] Set onboarding status to INCOMPLETE for new user');
            } catch (error) {
              logger.error('[DashboardApp] Error setting new user onboarding status', error);
            }
          }
          
          // Also update cookies to match Cognito state
          document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${isNewUser ? ONBOARDING_STATUS.IN_PROGRESS : onboardingStatus}; path=/`;
          document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.BUSINESS_INFO}; path=/`;
          
          // Redirect to onboarding
          const redirectPath = '/onboarding/business-info';
          logger.info('[DashboardApp] Redirecting to onboarding:', {
            from: pathname,
            to: redirectPath
          });
          
          router.push(redirectPath);
          return;
        }
        
        // Only continue with attribute updates for fully onboarded users
        if (pathname.startsWith('/onboarding')) {
          logger.debug('[DashboardApp] On onboarding route, skipping attribute update');
          return;
        }
        
        // If attributes are not set to COMPLETE, attempt an update
        if (onboardingStatus !== ONBOARDING_STATUS.COMPLETE || setupDone !== 'TRUE') {
          logger.info('[DashboardApp] Onboarding attributes need update, attempting now');
          
          // Try server-side update first via regular API
          let serverUpdateSuccess = false;
          
          try {
            const response = await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                attributes: {
                  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
                  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'TRUE'
                }
              })
            });
            
            // Check response and parse JSON
            if (response.ok) {
              const result = await response.json();
              logger.info('[DashboardApp] Server-side attribute update successful:', result);
              serverUpdateSuccess = true;
            } else {
              logger.warn('[DashboardApp] Server-side attribute update failed, status:', response.status);
              
              // Try to get error details if available
              try {
                const errorData = await response.json();
                logger.warn('[DashboardApp] Server update error details:', errorData);
              } catch (parseError) {
                logger.debug('[DashboardApp] Could not parse error response');
              }
            }
          } catch (serverError) {
            logger.error('[DashboardApp] Error in server-side attribute update:', {
              message: serverError.message,
              name: serverError.name,
              stack: serverError.stack?.split('\n')[0] // Just the first line of stack for brevity
            });
          }
          
          // Try client-side update if server-side failed
          let clientUpdateSuccess = false;
          
          if (!serverUpdateSuccess) {
            logger.warn('[DashboardApp] Server-side update failed, trying client-side update with retry');
            
            // Create retry function
            const clientUpdateWithRetry = async (maxRetries = 3) => {
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  logger.info(`[DashboardApp] Client-side attribute update attempt ${attempt}/${maxRetries}`);
                  const success = await updateCognitoOnboardingStatus();
                  
                  if (success) {
                    logger.info('[DashboardApp] Client-side attribute update successful');
                    return true;
                  } else {
                    logger.warn(`[DashboardApp] Client-side update attempt ${attempt} returned false`);
                  }
                } catch (clientError) {
                  logger.error(`[DashboardApp] Client-side update attempt ${attempt} failed:`, {
                    message: clientError.message,
                    name: clientError.name
                  });
                }
                
                if (attempt < maxRetries) {
                  // Wait with exponential backoff before retrying
                  const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
                  logger.info(`[DashboardApp] Waiting ${delay}ms before retry ${attempt + 1}`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
              
              logger.error('[DashboardApp] All client-side update attempts failed');
              return false;
            };
            
            // Execute the retry logic
            clientUpdateSuccess = await clientUpdateWithRetry();
          }
          
          // If both server and client approaches failed, try our special fix endpoint
          if (!serverUpdateSuccess && !clientUpdateSuccess) {
            logger.warn('[DashboardApp] Both standard approaches failed, trying fix-attributes endpoint');
            
            try {
              // Get the current session tokens
              const { tokens } = await fetchAuthSession().catch(error => {
                logger.error('[DashboardApp] Error fetching auth session:', error);
                return { tokens: null };
              });
              
              if (!tokens) {
                logger.error('[DashboardApp] No tokens available for fix-attributes call');
              } else {
                // Call our special fix endpoint with the token
                const fixResponse = await fetch('/api/onboarding/fix-attributes', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens.idToken.toString()}`
                  }
                });
                
                if (fixResponse.ok) {
                  const fixResult = await fixResponse.json();
                  logger.info('[DashboardApp] fix-attributes call successful:', fixResult);
                } else {
                  logger.error('[DashboardApp] fix-attributes call failed:', {
                    status: fixResponse.status,
                    data: await fixResponse.json().catch(() => ({}))
                  });
                }
              }
            } catch (fixError) {
              logger.error('[DashboardApp] Error calling fix-attributes endpoint:', {
                message: fixError.message,
                name: fixError.name
              });
            }
          }
        } else {
          logger.info('[DashboardApp] Cognito attributes already set correctly');
        }
      } catch (error) {
        logger.error('[DashboardApp] Error checking/updating Cognito attributes:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
        });
      }
    };
    
    // Run the check when the app loads
    checkAndUpdateCognitoAttributes();
  }, [updateCognitoOnboardingStatus, pathname, router]);
  
  return children;
};

export default DashboardApp; 