// Tenant Dashboard page (Client Component)
// This page needs 'use client' because it accesses browser APIs like localStorage
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';
import { storeRedirectDebugInfo } from '@/utils/redirectUtils';
import { DashboardProvider } from '@/context/DashboardContext';
import DashboardContent from '@/app/dashboard/DashboardContent';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardLoader from '@/components/DashboardLoader';

/**
 * TenantDashboard - A tenant-specific dashboard route
 * This page can either redirect to the main dashboard or 
 * render the dashboard content directly depending on the direct parameter
 */
export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = params?.tenantId;
  const isDirect = searchParams.get('direct') === 'true';
  const [isLoading, setIsLoading] = useState(true);
  const [hasTenantError, setHasTenantError] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      logger.error('[TenantDashboard] No tenant ID found in URL params');
      router.push('/dashboard?error=missing_tenant_id');
      return;
    }

    logger.info(`[TenantDashboard] Processing tenant-specific dashboard for: ${tenantId}`);
    
    // Store the tenant ID in cookies and localStorage for persistence
    try {
      // Set cookies
      document.cookie = `tenantId=${tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `businessid=${tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      // Set localStorage
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('businessid', tenantId);
      
      // Log debug info for redirect tracking
      storeRedirectDebugInfo({
        source: `/tenant/${tenantId}/dashboard`,
        destination: isDirect ? 'staying_on_tenant_dashboard' : '/dashboard',
        timestamp: new Date().toISOString(),
        tenantId: tenantId,
        direct: isDirect
      });
      
      // Don't redirect if we were directly sent here by middleware
      if (isDirect) {
        logger.info('[TenantDashboard] Direct flag detected, loading dashboard content');
        setIsLoading(false);
        return;
      }
      
      // Otherwise redirect to the main dashboard with tenant ID
      router.push(`/dashboard?tid=${tenantId}&from=tenant_specific`);
    } catch (error) {
      logger.error('[TenantDashboard] Error storing tenant ID:', error);
      // Still try to redirect even if storage fails
      if (!isDirect) {
        router.push(`/dashboard?tid=${tenantId}&storage_error=true`);
      } else {
        // If direct mode but we had an error, still try to show dashboard
        setIsLoading(false);
        setHasTenantError(true);
      }
    }
  }, [tenantId, router, isDirect]);

  if (isLoading) {
    return (
      <DashboardLoader message={isDirect ? 'Loading your dashboard...' : 'Redirecting to your dashboard...'} />
    );
  }

  // Get searchParams to pass to dashboard
  const dashboardParams = {
    newAccount: searchParams.get('newAccount'),
    plan: searchParams.get('plan'),
    mockData: searchParams.get('mockData'),
    setupStatus: searchParams.get('setupStatus')
  };

  // When loading completes and we're in direct mode, render the actual dashboard
  return (
    <Suspense fallback={<DashboardLoader message="Loading dashboard content..." />}>
      <DashboardProvider>
        <DashboardContent
          newAccount={dashboardParams.newAccount === 'true'}
          plan={dashboardParams.plan}
          mockData={dashboardParams.mockData}
          setupStatus={dashboardParams.setupStatus}
          tenantId={tenantId}
        />
      </DashboardProvider>
    </Suspense>
  );
} 