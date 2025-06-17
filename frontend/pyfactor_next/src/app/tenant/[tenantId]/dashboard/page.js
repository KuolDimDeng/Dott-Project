'use client';

// Tenant Dashboard page (Client Component)
// This page needs 'use client' because it accesses browser APIs like localStorage

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { DashboardProvider } from '@/context/DashboardContext';
import DashboardContent from '@/app/dashboard/DashboardContent';
import DashboardLoader from '@/components/DashboardLoader';
import { storeTenantId, getTenantIdFromCognito } from '@/utils/tenantUtils';
import { NotificationProvider } from '@/context/NotificationContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
// import { fetchUserAttributes } from '@/config/amplifyUnified'; // No longer using Cognito
import useEnsureTenant from '@/hooks/useEnsureTenant';
import { getFallbackTenantId, storeReliableTenantId } from '@/utils/tenantFallback';
import { useEnhancedSession } from '@/hooks/useEnhancedSession';

// Import needed for recovery
import { signIn } from '@/config/amplifyUnified';
import Cookies from 'js-cookie';
import SessionInitializer from '@/components/SessionInitializer';

// Emergency recovery functions
const checkEmergencyAccess = () => {
  // Check for emergency tokens in cookies or localStorage
  const hasEmergencyTokens = 
    Cookies.get('tenant_id') || 
    Cookies.get('subscription_plan') || 
    localStorage.getItem('subscription_completed') === 'true';
  
  // If coming from subscription page, we should have these markers
  const fromSubscription = window.location.search.includes('fromSubscription=true');
  
  logger.debug('[TenantDashboard] Emergency access check:', {
    hasEmergencyTokens,
    fromSubscription,
    cookies: {
      tenant_id: Cookies.get('tenant_id'),
      subscription_plan: Cookies.get('subscription_plan')
    }
  });
  
  return hasEmergencyTokens && fromSubscription;
};

const recoverSession = async (tenantId) => {
  try {
    // Store the tenant ID as reliable for recovery
    if (tenantId) {
      storeReliableTenantId(tenantId);
      localStorage.setItem('tenant_id', tenantId);
      Cookies.set('tenant_id', tenantId, { path: '/', expires: 30 });
    }
    
    // Set session recovery marker
    sessionStorage.setItem('recovery_attempted', 'true');
    sessionStorage.setItem('recovery_timestamp', new Date().toISOString());
    
    return true;
  } catch (error) {
    logger.error('[TenantDashboard] Session recovery failed:', error);
    return false;
  }
};

// Enhanced authentication check with retry logic
const checkAuthWithRetry = async (maxRetries = 3, delayMs = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info(`[TenantDashboard] Authentication check attempt ${attempt + 1}/${maxRetries}`);
      
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.authenticated) {
          logger.info('[TenantDashboard] Authentication successful');
          return { success: true, data: authData };
        }
      }
      
      // Check for session cookies as fallback
      const sessionCookie = Cookies.get('dott_auth_session') || Cookies.get('appSession');
      if (sessionCookie && attempt < maxRetries - 1) {
        logger.info('[TenantDashboard] Session cookie found, retrying...');
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // If last attempt and no success, check pending session
      if (attempt === maxRetries - 1) {
        const pendingSession = sessionStorage.getItem('pendingSession');
        if (pendingSession) {
          try {
            const sessionData = JSON.parse(pendingSession);
            if (sessionData.timestamp && Date.now() - sessionData.timestamp < 30000) {
              logger.info('[TenantDashboard] Using pending session data');
              return { 
                success: true, 
                data: { 
                  authenticated: true, 
                  user: sessionData.user,
                  pendingSync: true 
                } 
              };
            }
          } catch (e) {
            logger.error('[TenantDashboard] Error parsing pending session:', e);
          }
        }
      }
      
    } catch (error) {
      logger.error(`[TenantDashboard] Auth check attempt ${attempt + 1} failed:`, error);
    }
    
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return { success: false, data: null };
};

/**
 * TenantDashboard - A tenant-specific dashboard route
 */
export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = params?.tenantId;
  const fromSignIn = searchParams.get('fromSignIn') === 'true';
  const fromSubscription = searchParams.get('fromSubscription') === 'true';
  const sessionToken = searchParams.get('token');
  const bridgeToken = searchParams.get('bridge');
  const emergencyAccess = fromSubscription && checkEmergencyAccess();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tenantStatus, setTenantStatus] = useState('pending');
  const [userAttributes, setUserAttributes] = useState(null);
  
  // Use enhanced session hook for better localStorage sync
  const { user: sessionUser } = useEnhancedSession();

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      // Declare idToken at function scope so it's accessible in both try and catch blocks
      const idToken = Cookies.get('idToken') || sessionStorage.getItem('idToken');
      
      try {
        logger.info('[TenantDashboard] Initializing dashboard for tenant:', tenantId);
        logger.info('[TenantDashboard] Current cookies:', document.cookie);
        logger.info('[TenantDashboard] SessionStorage pendingSession:', sessionStorage.getItem('pendingSession'));
        
        // CRITICAL: Verify onboarding is marked as complete in backend
        if (tenantId) {
          try {
            logger.info('[TenantDashboard] Verifying onboarding completion status...');
            // Use the correct endpoint that exists in the backend
            const verifyResponse = await fetch('/api/onboarding/status/', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            if (verifyResponse.ok) {
              const verifyResult = await verifyResponse.json();
              logger.info('[TenantDashboard] Onboarding verification result:', verifyResult);
              if (verifyResult.onboarding_status === 'complete' || verifyResult.setup_completed) {
                logger.info('[TenantDashboard] ✅ Onboarding is complete in backend');
              }
            }
          } catch (error) {
            logger.error('[TenantDashboard] Error verifying onboarding:', error);
          }
        }
        
        // If this is from subscription page and we have emergency tokens
        if (emergencyAccess) {
          logger.info('[TenantDashboard] Using emergency access mode from subscription');
          
          // Recover the session using fallback data
          await recoverSession(tenantId);
          
          // Set tenant status to active to allow access
          setTenantStatus('active');
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
        
        // Use SessionManager to get authentication state
        const { getSession, waitForSession } = await import('@/utils/sessionManager');
        
        // If coming from sign in, wait for session to be established
        let authData;
        if (fromSignIn) {
          logger.info('[TenantDashboard] Coming from sign-in, waiting for session...');
          const session = await waitForSession(10, 1000); // Wait up to 10 seconds
          if (!session) {
            throw new Error('Session not established after sign-in');
          }
          authData = { authenticated: true, user: session.user };
        } else {
          // Normal session check
          const session = await getSession();
          if (!session || !session.authenticated) {
            throw new Error('Not authenticated');
          }
          authData = { authenticated: true, user: session.user };
        }
        
        logger.debug('[TenantDashboard] User authenticated:', authData.user?.email);
        
        // Get user profile to check tenant and onboarding status
        // The enhanced session hook will automatically add localStorage headers
        const profileResponse = await fetch('/api/auth/profile', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          ,
        credentials: 'include'}
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          // Check if user has access to this tenant
          const userTenantId = profileData.tenantId || profileData.tenant_id;
          
          if (userTenantId !== tenantId) {
            logger.warn('[TenantDashboard] Tenant ID mismatch:', {
              urlTenantId: tenantId,
              userTenantId
            });
            
            // Redirect to correct tenant dashboard
            if (userTenantId) {
              router.push(`/tenant/${userTenantId}/dashboard`);
              return;
            }
          }
          
          // Check if user needs onboarding
          // Special case: if coming from payment completion, trust that onboarding is done
          const paymentCompleted = searchParams.get('payment_completed') === 'true';
          const fromOnboarding = searchParams.get('from_onboarding') === 'true';
          
          // If coming from onboarding completion, force a session refresh first
          if (fromOnboarding) {
            logger.info('[TenantDashboard] Coming from onboarding, forcing session sync');
            try {
              const syncResponse = await fetch('/api/auth/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
                credentials: 'include',
                body: JSON.stringify({
                  tenantId: tenantId,
                  needsOnboarding: false,
                  onboardingCompleted: true,
                  subscriptionPlan: profileData.subscriptionPlan || 'free'
                })
              });
              
              if (syncResponse.ok) {
                logger.info('[TenantDashboard] Session synced after onboarding');
                // Re-fetch the profile to get updated data
                const updatedProfileResponse = await fetch('/api/auth/profile', {
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  ,
        credentials: 'include'}
                });
                
                if (updatedProfileResponse.ok) {
                  profileData = await updatedProfileResponse.json();
                  logger.info('[TenantDashboard] Updated profile data after sync:', {
                    needsOnboarding: profileData.needsOnboarding,
                    onboardingCompleted: profileData.onboardingCompleted
                  });
                }
              }
            } catch (syncError) {
              logger.error('[TenantDashboard] Error syncing session after onboarding:', syncError);
            }
          }
          
          // Check if we have onboarding completion indicators
          // Check the secure session cookie first (more reliable)
          let sessionOnboardingCompleted = false;
          try {
            // Try to get completion status from the encrypted session
            const sessionResponse = await fetch('/api/auth/sync-session', { 
              method: 'GET',
              credentials: 'include'
            });
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              sessionOnboardingCompleted = sessionData.onboardingCompleted === true;
              logger.info('[TenantDashboard] Onboarding status from secure session:', {
                onboardingCompleted: sessionData.onboardingCompleted,
                needsOnboarding: sessionData.needsOnboarding
              });
            }
          } catch (e) {
            logger.warn('[TenantDashboard] Failed to check secure session status');
          }
          
          // Check for immediate onboarding completion indicator
          const justCompletedCookie = Cookies.get('onboarding_just_completed');
          const justCompleted = justCompletedCookie === 'true';
          
          if (justCompleted) {
            logger.info('[TenantDashboard] Found immediate onboarding completion indicator');
          }
          
          // Fallback: Check the client-side cookie (less secure but faster)
          const onboardingStatusCookie = Cookies.get('onboarding_status');
          let cookieOnboardingCompleted = false;
          if (onboardingStatusCookie) {
            try {
              const statusData = JSON.parse(onboardingStatusCookie);
              cookieOnboardingCompleted = statusData.completed === true;
              logger.info('[TenantDashboard] Onboarding status from client cookie:', statusData);
            } catch (e) {
              logger.warn('[TenantDashboard] Failed to parse onboarding_status cookie');
            }
          }
          
          logger.info('[TenantDashboard] Onboarding check:', {
            needsOnboarding: profileData.needsOnboarding,
            onboardingCompleted: profileData.onboardingCompleted,
            cookieOnboardingCompleted: cookieOnboardingCompleted,
            paymentCompleted: paymentCompleted,
            searchParams: Object.fromEntries(searchParams.entries())
          });
          
          // Trust secure session first, then other indicators
          const shouldSkipOnboarding = justCompleted || fromOnboarding || sessionOnboardingCompleted || profileData.onboardingCompleted || paymentCompleted || cookieOnboardingCompleted;
          
          if (profileData.needsOnboarding && !shouldSkipOnboarding) {
            logger.info('[TenantDashboard] User needs onboarding, redirecting');
            router.push('/onboarding');
            return;
          }
          
          // If payment was just completed, force sync the session
          if (paymentCompleted) {
            logger.info('[TenantDashboard] Payment completed, forcing session sync');
            try {
              // Use sync-session endpoint (force-sync doesn't exist)
              const syncResponse = await fetch('/api/auth/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
                credentials: 'include',
                body: JSON.stringify({
                  tenantId: tenantId,
                  needsOnboarding: false,
                  onboardingCompleted: true,
                  subscriptionPlan: profileData.subscriptionPlan || 'free'
                })
              });
              
              if (syncResponse.ok) {
                logger.info('[TenantDashboard] Session synced after payment');
                
                // Clean up URL parameters
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('payment_completed');
                newUrl.searchParams.delete('from_onboarding');
                
                // Use replaceState to update URL without adding to history
                window.history.replaceState({}, '', newUrl.toString());
                
                logger.info('[TenantDashboard] Cleaned URL parameters');
                
                // Override the profile data to skip onboarding check
                profileData.needsOnboarding = false;
                profileData.onboardingCompleted = true;
                
                // Continue with normal flow instead of reloading
              }
            } catch (syncError) {
              logger.error('[TenantDashboard] Error syncing session:', syncError);
            }
          }
          
          setUserAttributes(profileData);
          
          // SECURITY: Validate that the user actually has access to this tenant
          if (userTenantId && userTenantId !== tenantId) {
            logger.error('[TenantDashboard] Security: User trying to access unauthorized tenant');
            // Already handled redirect above
            return;
          }
          
          // SECURITY: Ensure user has completed onboarding and has a valid tenant
          if (!userTenantId && !emergencyAccess) {
            logger.error('[TenantDashboard] Security: No valid tenant ID for user');
            setError('No valid tenant found. Please complete onboarding.');
            router.push('/onboarding');
            return;
          }
        }
        
        // If the fetch succeeds, we're authenticated
        setAuthChecked(true);
        
        // Store the current tenant ID as the active one
        storeTenantId(tenantId);
        
        // Set tenant as active
        setTenantStatus('active');
        
        // Clear pending session after successful authentication
        sessionStorage.removeItem('pendingSession');
        
      } catch (authError) {
        logger.warn('[TenantDashboard] Auth check failed:', authError);
        
        // Check if we have a session cookie - it might just be a temporary API failure
        const sessionCookie = Cookies.get('dott_auth_session') || Cookies.get('appSession');
        
        if (sessionCookie) {
          logger.info('[TenantDashboard] Session cookie exists, retrying authentication check');
          
          // Wait a bit and retry once
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const retryAuthResponse = await fetch('/api/auth/me');
            if (retryAuthResponse.ok) {
              const retryAuthData = await retryAuthResponse.json();
              if (retryAuthData.authenticated) {
                logger.info('[TenantDashboard] Authentication successful on retry');
                setAuthChecked(true);
                setTenantStatus('active');
                storeTenantId(tenantId);
                setIsLoading(false);
                return;
              }
            }
          } catch (retryError) {
            logger.error('[TenantDashboard] Retry also failed:', retryError);
          }
        }
        
        // If we have idToken in cookies/storage but auth check failed,
        // try emergency fallback
        if (idToken || emergencyAccess) {
          logger.info('[TenantDashboard] Using emergency token fallback');
          
          // Attempt to recover session
          const recovered = await recoverSession(tenantId);
          
          if (recovered) {
            setTenantStatus('active');
            setAuthChecked(true);
          } else {
            // If recovery failed, redirect to sign in
            setError('Your session has expired. Please sign in again.');
            router.push('/auth/signin');
          }
        } else {
          // No tokens at all, redirect to sign in
          logger.error('[TenantDashboard] No valid authentication found');
          setError('Please sign in to access your dashboard');
          router.push('/auth/signin');
        }
      }
      
      setIsLoading(false);
    };
    
    initializeDashboard();
  }, [tenantId, router, fromSignIn, emergencyAccess, searchParams]);

  // If still initializing, show loader
  if (isLoading) {
    return <DashboardLoader message="Loading your dashboard..." />;
  }

  // If there was an authentication error, show error message
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-medium text-red-600 mb-4">Dashboard Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setAuthChecked(false);
                window.location.reload();
              }}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for tenant status to be verified
  if (tenantStatus === 'pending') {
    return <DashboardLoader message="Preparing your dashboard environment..." />;
  }

  // Prepare dashboard parameters from search params
  const dashboardParams = {
    newAccount: searchParams.get('newAccount') === 'true',
    plan: searchParams.get('plan'),
    mockData: searchParams.get('mockData') === 'true',
    setupStatus: searchParams.get('setupStatus'),
    fromSignIn,
    fromSubscription
  };

  // Render dashboard within providers, using the ensured tenantId if possible
  const effectiveTenantId = tenantId;
  
  // If we have a bridge token, wrap in SessionInitializer
  if (bridgeToken) {
    return (
      <SessionInitializer>
        <Suspense fallback={<DashboardLoader message="Loading dashboard content..." />}>
          <NotificationProvider>
            <UserProfileProvider tenantId={effectiveTenantId}>
              <DashboardProvider>
                <DashboardContent
                  newAccount={dashboardParams.newAccount}
                  plan={dashboardParams.plan}
                  mockData={dashboardParams.mockData}
                  setupStatus={dashboardParams.setupStatus}
                  userAttributes={userAttributes}
                  tenantId={effectiveTenantId}
                  fromSignIn={fromSignIn}
                  fromSubscription={fromSubscription}
                />
              </DashboardProvider>
            </UserProfileProvider>
          </NotificationProvider>
        </Suspense>
      </SessionInitializer>
    );
  }
  
  return (
    <Suspense fallback={<DashboardLoader message="Loading dashboard content..." />}>
      <NotificationProvider>
        <UserProfileProvider tenantId={effectiveTenantId}>
          <DashboardProvider>
            <DashboardContent
              newAccount={dashboardParams.newAccount}
              plan={dashboardParams.plan}
              mockData={dashboardParams.mockData}
              setupStatus={dashboardParams.setupStatus}
              userAttributes={userAttributes}
              tenantId={effectiveTenantId}
              fromSignIn={fromSignIn}
              fromSubscription={fromSubscription}
            />
          </DashboardProvider>
        </UserProfileProvider>
      </NotificationProvider>
    </Suspense>
  );
}