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
import { fetchUserAttributes } from '@/config/amplifyUnified';
import useEnsureTenant from '@/hooks/useEnsureTenant';
import { getFallbackTenantId, storeReliableTenantId } from '@/utils/tenantFallback';

// Import needed for recovery
import { signIn } from '@/config/amplifyUnified';
import Cookies from 'js-cookie';

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
  const emergencyAccess = fromSubscription && checkEmergencyAccess();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tenantStatus, setTenantStatus] = useState('pending');
  const [userAttributes, setUserAttributes] = useState(null);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        logger.info('[TenantDashboard] Initializing dashboard for tenant:', tenantId);
        
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

        // Check cookie auth token
        const idToken = Cookies.get('idToken') || sessionStorage.getItem('idToken');
        
        // Normal authentication flow
        try {
          // First try Cognito
          const fetchedUserAttributes = await fetchUserAttributes();
          setUserAttributes(fetchedUserAttributes);
          logger.debug('[TenantDashboard] User attributes:', fetchedUserAttributes);
          
          // If the fetch succeeds, we're authenticated
          setAuthChecked(true);
          
          // Check if tenant ID matches what's in Cognito
          const cognitoTenantId = fetchedUserAttributes['custom:tenant_ID'] || 
                                 fetchedUserAttributes['custom:businessid'] || 
                                 getFallbackTenantId();
          
          // If tenant IDs don't match, either store the new one or redirect
          if (cognitoTenantId && cognitoTenantId !== tenantId) {
            // For now, we'll allow the access but update our tracking
            // This could be modified to redirect if desired
            logger.warn('[TenantDashboard] Tenant ID mismatch:', {
              urlTenantId: tenantId,
              cognitoTenantId
            });
            
            // Store the current tenant ID as the active one
            storeTenantId(tenantId);
          }
          
          // Set tenant as active
          setTenantStatus('active');
        } catch (authError) {
          logger.warn('[TenantDashboard] Cognito auth check failed:', authError);
          
          // If we have idToken in cookies/storage but Cognito check failed,
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
      } catch (error) {
        logger.error('[TenantDashboard] Dashboard initialization error:', error);
        setIsLoading(false);
        setAuthChecked(true);
        setError(`Dashboard initialization error: ${error.message}`);
      }
    };
    
    initializeDashboard();
  }, [tenantId, router, fromSignIn, emergencyAccess]);

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