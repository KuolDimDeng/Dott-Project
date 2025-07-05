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
import { useSession } from '@/hooks/useSession-v2';

// Import needed for recovery
// import { signIn } from '@/config/amplifyUnified'; // Removed - no longer using Cognito
import Cookies from 'js-cookie';
import SessionInitializer from '@/components/SessionInitializer';

// Removed emergency access and recovery logic - only trust backend session

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
  // Removed emergency access logic - only trust backend session
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tenantStatus, setTenantStatus] = useState('pending');
  const [userAttributes, setUserAttributes] = useState(null);
  
  // Use session hook for better localStorage sync
  const { data: sessionData } = useSession();
  const sessionUser = sessionData?.user;

  // Initialize dashboard
  useEffect(() => {
    // Set page title
    document.title = 'Dott: Business Platform';
    
    const initializeDashboard = async () => {
      // Declare idToken at function scope so it's accessible in both try and catch blocks
      const idToken = Cookies.get('idToken') || sessionStorage.getItem('idToken');
      
      try {
        logger.info('[TenantDashboard] Initializing dashboard for tenant:', tenantId);
        logger.info('[TenantDashboard] Current URL:', window.location.href);
        logger.info('[TenantDashboard] Current pathname:', window.location.pathname);
        logger.info('[TenantDashboard] URL params:', params);
        logger.info('[TenantDashboard] Search params:', Object.fromEntries(searchParams.entries()));
        logger.info('[TenantDashboard] Current cookies:', document.cookie);
        logger.info('[TenantDashboard] SessionStorage pendingSession:', sessionStorage.getItem('pendingSession'));
        
        // Check for double tenant ID in URL
        const pathSegments = window.location.pathname.split('/');
        const tenantIdCount = pathSegments.filter(segment => segment === tenantId).length;
        if (tenantIdCount > 1) {
          logger.error('[TenantDashboard] DOUBLE TENANT ID DETECTED IN URL!', {
            pathname: window.location.pathname,
            segments: pathSegments,
            tenantIdCount: tenantIdCount
          });
          
          // Fix the URL by removing the duplicate
          const correctUrl = `/${tenantId}/dashboard${window.location.search}`;
          logger.info('[TenantDashboard] Fixing URL to:', correctUrl);
          window.history.replaceState(null, '', correctUrl);
        }
        
        // CRITICAL: Check if user just completed onboarding
        const onboardingJustCompleted = Cookies.get('onboarding_just_completed');
        if (onboardingJustCompleted === 'true') {
          logger.info('[TenantDashboard] 🎯 User just completed onboarding, verifying session...');
          
          // Wait for session cookies to fully propagate
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify session is properly established
          try {
            const sessionVerifyResponse = await fetch('/api/auth/session-verify', {
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (sessionVerifyResponse.ok) {
              const sessionVerifyData = await sessionVerifyResponse.json();
              logger.info('[TenantDashboard] Session verification after onboarding:', sessionVerifyData);
              
              if (sessionVerifyData.valid) {
                logger.info('[TenantDashboard] ✅ Session is valid, proceeding with dashboard load');
                // Remove the temporary cookie
                Cookies.remove('onboarding_just_completed');
              } else {
                logger.error('[TenantDashboard] ❌ Session invalid after onboarding:', sessionVerifyData.reason);
                // Try to recover the session
                if (sessionVerifyData.reason === 'No session token found') {
                  logger.info('[TenantDashboard] Attempting session recovery...');
                  // Redirect back to auth callback to re-establish session
                  router.push(`/auth/callback?returnTo=/${tenantId}/dashboard`);
                  return;
                }
              }
            }
          } catch (error) {
            logger.error('[TenantDashboard] Session verification error:', error);
          }
        }
        
        // CRITICAL: Verify onboarding is marked as complete in backend
        if (tenantId) {
          try {
            logger.info('[TenantDashboard] Verifying onboarding completion status...');
            // Use the correct endpoint that exists in the backend
            const verifyResponse = await fetch('/api/onboarding/status', {
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
        
        // Removed emergency access logic - only trust backend session
        
        // Check if we just came from auth
        const fromAuth = searchParams.get('fromAuth') === 'true';
        if (fromAuth) {
          logger.info('[TenantDashboard] Coming from auth, waiting for cookies to propagate...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Use SessionManager to get authentication state
        const { sessionManagerEnhanced } = await import('@/utils/sessionManager-v2-enhanced');
        const getSession = () => sessionManagerEnhanced.getSession();
        const waitForSession = (retries, delay) => sessionManagerEnhanced.waitForSession(retries, delay);
        
        // Log all cookies to debug session issue
        logger.info('[TenantDashboard] All cookies:', {
          cookies: document.cookie.split(';').map(c => c.trim().split('=')[0]),
          hasDottAuth: document.cookie.includes('dott_auth_session'),
          hasSessionToken: document.cookie.includes('session_token'),
          hasOnboardingStatus: document.cookie.includes('onboarding_status')
        });
        
        // If we have a bridge token, wait a bit for server-side cookies to propagate
        if (bridgeToken) {
          logger.info('[TenantDashboard] Bridge token detected, waiting for cookie propagation...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // If coming from sign in, wait for session to be established
        let authData;
        if (fromSignIn) {
          logger.info('[TenantDashboard] Coming from sign-in, waiting for session...');
          const session = await waitForSession(10, 1000); // Wait up to 10 seconds
          if (!session) {
            // Check if we have a session token in URL params (fallback)
            if (sessionToken || bridgeToken) {
              logger.info('[TenantDashboard] No session found but have token in URL, creating session...');
              // Try to create session from URL token
              const sessionCreateResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  accessToken: sessionToken || bridgeToken,
                  user: {
                    email: searchParams.get('email'),
                    sub: searchParams.get('sub'),
                    tenantId: tenantId
                  }
                })
              });
              
              if (sessionCreateResponse.ok) {
                logger.info('[TenantDashboard] Session created from URL token, retrying...');
                const newSession = await waitForSession(5, 1000);
                if (newSession) {
                  authData = { authenticated: true, user: newSession.user };
                } else {
                  throw new Error('Session not established after token creation');
                }
              } else {
                throw new Error('Failed to create session from URL token');
              }
            } else {
              throw new Error('Session not established after sign-in');
            }
          } else {
            authData = { authenticated: true, user: session.user };
          }
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
          let profileData = await profileResponse.json();
          
          // CRITICAL: Check if profile data is null (no session found)
          if (!profileData) {
            logger.warn('[TenantDashboard] Profile API returned null - no session found');
            
            // Check if user just completed onboarding (special case)
            const onboardingJustCompleted = Cookies.get('onboarding_just_completed');
            const onboardingCompleted = Cookies.get('onboardingCompleted');
            const userTenantIdCookie = Cookies.get('user_tenant_id');
            
            if ((onboardingJustCompleted === 'true' || onboardingCompleted === 'true') && userTenantIdCookie) {
              logger.info('[TenantDashboard] User just completed onboarding, waiting for session to establish...');
              
              // Wait for session to propagate
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Retry profile fetch
              const retryProfileResponse = await fetch('/api/auth/profile', {
                cache: 'no-store',
                credentials: 'include'
              });
              
              if (retryProfileResponse.ok) {
                const retryProfileData = await retryProfileResponse.json();
                if (retryProfileData) {
                  logger.info('[TenantDashboard] Profile found on retry after onboarding');
                  profileData = retryProfileData;
                } else {
                  throw new Error('Session not established after onboarding');
                }
              } else {
                throw new Error('Failed to fetch profile after onboarding');
              }
            } else {
              throw new Error('No authenticated session found');
            }
          }
          
          // Check if user has access to this tenant
          const userTenantId = profileData.tenantId || profileData.tenant_id;
          
          if (userTenantId !== tenantId) {
            logger.warn('[TenantDashboard] Tenant ID mismatch:', {
              urlTenantId: tenantId,
              userTenantId
            });
            
            // Redirect to correct tenant dashboard
            if (userTenantId) {
              router.push(`/${userTenantId}/dashboard`);
              return;
            }
          }
          
          // CRITICAL: Only trust backend's single source of truth for onboarding status
          // Backend's profileData.needsOnboarding is the ONLY source we trust
          logger.info('[TenantDashboard] Backend onboarding status:', {
            needsOnboarding: profileData.needsOnboarding,
            onboardingCompleted: profileData.onboardingCompleted,
            tenantId: profileData.tenantId || profileData.tenant_id
          });
          
          // If backend says user needs onboarding, redirect them
          if (profileData.needsOnboarding === true) {
            logger.info('[TenantDashboard] Backend says user needs onboarding, redirecting');
            router.push('/onboarding');
            return;
          }
          // Dashboard page should NOT check onboarding status - that's already been checked
          // If user made it here, they should have access to the dashboard
          logger.info('[TenantDashboard] User has access to dashboard');
          
          setUserAttributes(profileData);
          
          // SECURITY: Validate that the user actually has access to this tenant
          if (userTenantId && userTenantId !== tenantId) {
            logger.error('[TenantDashboard] Security: User trying to access unauthorized tenant');
            // Already handled redirect above
            return;
          }
          
          // SECURITY: Ensure user has completed onboarding and has a valid tenant
          if (!userTenantId) {
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
        
        // If we have idToken but auth check failed, redirect to sign in
        if (idToken) {
          logger.info('[TenantDashboard] IdToken found but auth failed, redirecting to sign in');
          setError('Your session has expired. Please sign in again.');
          router.push('/auth/signin');
          return;
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
  }, [tenantId, router, fromSignIn, searchParams]);

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