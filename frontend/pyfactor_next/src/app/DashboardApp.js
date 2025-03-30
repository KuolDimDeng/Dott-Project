'use client';

import { useEffect, useState } from 'react';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { fetchUserAttributes, fetchAuthSession } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { usePathname, useRouter } from 'next/navigation';
import { isPublicRoute } from '@/lib/authUtils';

/**
 * Global dashboard app component that runs at the application level
 * This component ensures critical app state like onboarding status
 * is properly synchronized across all components
 */
const DashboardApp = ({ children }) => {
  const { updateCognitoOnboardingStatus } = useTenantInitialization();
  const pathname = usePathname();
  const router = useRouter();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  
  // Effect to immediately check if user should be redirected based on client-side data
  useEffect(() => {
    const checkClientOnboardingState = () => {
      // Skip checks on public routes and onboarding routes
      if (isPublicRoute(pathname) || pathname.startsWith('/onboarding') || pathname.startsWith('/auth')) {
        return;
      }
      
      // Check cookies for onboarding status
      const onboardingStatus = document.cookie.split('; ')
        .find(row => row.startsWith('onboardedStatus='))
        ?.split('=')[1];
      
      const onboardingStep = document.cookie.split('; ')
        .find(row => row.startsWith('onboardingStep='))
        ?.split('=')[1];
      
      logger.debug('[DashboardApp] Client-side onboarding check:', { 
        onboardingStatus, 
        onboardingStep,
        pathname 
      });
      
      // If not onboarded and trying to access dashboard, redirect to onboarding
      if (pathname.includes('/dashboard') && onboardingStatus !== 'COMPLETE') {
        const redirectPath = onboardingStep && onboardingStep !== 'dashboard' && onboardingStep !== 'complete'
          ? `/onboarding/${onboardingStep}`
          : '/onboarding/business-info';
        
        logger.info('[DashboardApp] Redirecting from client-side check:', { 
          from: pathname, 
          to: redirectPath,
          reason: 'Incomplete onboarding' 
        });
        
        router.push(redirectPath);
      }
    };
    
    // Run the client-side check immediately
    checkClientOnboardingState();
  }, [pathname, router]);
  
  // Effect to check and update Cognito attributes on app load
  useEffect(() => {
    const checkAndUpdateCognitoAttributes = async () => {
      // Skip attribute updates on public routes
      if (isPublicRoute(pathname) || pathname.startsWith('/auth')) {
        logger.debug('[DashboardApp] Skipping Cognito attribute check on public route:', pathname);
        return;
      }
      
      try {
        // Check current Cognito attributes
        const userAttributes = await fetchUserAttributes().catch(error => {
          logger.warn('[DashboardApp] Error fetching user attributes:', {
            message: error.message,
            name: error.name
          });
          return {}; // Return empty object to continue with defaults
        });
        
        const onboardingStatus = userAttributes['custom:onboarding'];
        const setupDone = userAttributes['custom:setupdone'];
        const businessId = userAttributes['custom:businessid'] || '';
        
        logger.info('[DashboardApp] Checking Cognito attributes for onboarding status:', {
          onboarding: onboardingStatus || 'not set',
          setupDone: setupDone || 'not set',
          businessId: businessId || 'not set'
        });
        
        setInitialCheckComplete(true);
        
        // For new users or users with incomplete onboarding, redirect to onboarding
        const isNewUser = !onboardingStatus || onboardingStatus === '';
        const isOnboardingIncomplete = onboardingStatus !== 'COMPLETE';
        
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
                    'custom:onboarding': 'INCOMPLETE'
                  }
                })
              });
              
              logger.info('[DashboardApp] Set onboarding status to INCOMPLETE for new user');
            } catch (error) {
              logger.error('[DashboardApp] Error setting new user onboarding status', error);
            }
          }
          
          // Also update cookies to match Cognito state
          document.cookie = `onboardedStatus=${isNewUser ? 'INCOMPLETE' : onboardingStatus}; path=/`;
          document.cookie = `onboardingStep=business-info; path=/`;
          
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
        if (onboardingStatus !== 'COMPLETE' || setupDone !== 'TRUE') {
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
                  'custom:onboarding': 'COMPLETE',
                  'custom:setupdone': 'TRUE'
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