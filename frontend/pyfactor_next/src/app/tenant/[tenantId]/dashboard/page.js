// Tenant Dashboard page (Client Component)
// This page needs 'use client' because it accesses browser APIs like localStorage
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { DashboardProvider } from '@/context/DashboardContext';
import DashboardContent from '@/app/dashboard/DashboardContent';
import DashboardLoader from '@/components/DashboardLoader';
import { storeTenantId, getTenantIdFromCognito } from '@/utils/tenantUtils';
import { NotificationProvider } from '@/context/NotificationContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { fetchUserAttributes } from 'aws-amplify/auth';
import useEnsureTenant from '@/hooks/useEnsureTenant';

/**
 * TenantDashboard - A tenant-specific dashboard route
 */
export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = params?.tenantId;
  const fromSignIn = searchParams.get('fromSignIn') === 'true';
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userAttributes, setUserAttributes] = useState(null);
  const [error, setError] = useState(null);
  
  // Use the hook to ensure tenant existence
  const { status: tenantStatus, tenantId: ensuredTenantId } = useEnsureTenant();
  
  // Check auth on mount and store tenant ID
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!tenantId) {
          throw new Error('No tenant ID in URL parameters');
        }
        
        // Store tenant ID in localStorage/sessionStorage
        logger.info('[TenantDashboard] Storing tenant ID from URL parameter:', tenantId);
        storeTenantId(tenantId);
        
        // Fetch user attributes from Cognito to verify we're authenticated
        try {
          const attributes = await fetchUserAttributes();
          setUserAttributes(attributes);
          
          // Check if tenant ID matches - if not, update it
          const cognitoTenantId = attributes['custom:tenant_ID'];
          if (cognitoTenantId && cognitoTenantId !== tenantId) {
            logger.warn('[TenantDashboard] Tenant ID mismatch between URL and Cognito:', {
              url: tenantId,
              cognito: cognitoTenantId
            });
            
            // Prefer the Cognito tenant ID if available (update the URL without redirecting)
            if (cognitoTenantId && window.history && window.history.replaceState) {
              try {
                const newUrl = window.location.pathname.replace(
                  `/tenant/${tenantId}/`, 
                  `/tenant/${cognitoTenantId}/`
                );
                window.history.replaceState({}, '', newUrl);
                logger.info('[TenantDashboard] Updated URL with Cognito tenant ID:', cognitoTenantId);
              } catch (urlError) {
                logger.error('[TenantDashboard] Failed to update URL:', urlError);
              }
            }
          }
          
          setAuthChecked(true);
        } catch (authError) {
          logger.error('[TenantDashboard] Auth check failed:', authError);
          
          // If auth check fails and we weren't coming from sign-in page, redirect to sign in
          if (!fromSignIn) {
            router.push(`/auth/signin?redirect=/tenant/${tenantId}/dashboard`);
            return;
          }
          
          // Otherwise still mark auth checked but with error
          setAuthChecked(true);
          setError('Authentication failed. Please try signing in again.');
        }
        
        // Set loading false after initialization
        setIsLoading(false);
      } catch (error) {
        logger.error('[TenantDashboard] Dashboard initialization error:', error);
        setIsLoading(false);
        setAuthChecked(true);
        setError(`Dashboard initialization error: ${error.message}`);
      }
    };
    
    initializeDashboard();
  }, [tenantId, router, fromSignIn]);

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
    fromSignIn
  };

  // Render dashboard within providers, using the ensured tenantId if possible
  const effectiveTenantId = ensuredTenantId || tenantId;
  
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
              tenantId={effectiveTenantId}
              fromSignIn={fromSignIn}
              userAttributes={userAttributes}
            />
          </DashboardProvider>
        </UserProfileProvider>
      </NotificationProvider>
    </Suspense>
  );
} 