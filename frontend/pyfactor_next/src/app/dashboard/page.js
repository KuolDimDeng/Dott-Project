// Dashboard page (Server Component)
// Do NOT add 'use client' directive here since we're exporting metadata

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverLogger } from '@/utils/serverLogger';
import { cookies } from 'next/headers';

/**
 * Dashboard Page Component
 *
 * This is a redirect component to ensure all dashboard access happens through
 * the tenant-specific route pattern /{tenantId}/dashboard
 */

// Dashboard metadata
export const metadata = {
  title: 'Redirecting to dashboard | Dott Business Management',
  description: 'Redirecting to your tenant-specific dashboard.'
};

// Server component that redirects to tenant-specific dashboard
export default async function DashboardPage({ searchParams }) {
  // Get tenant ID from cookies or search params - need to await cookies in Next.js 15+
  const cookieStore = await cookies();
  const tenantIdCookie = await cookieStore.get('tenantId');
  const businessIdCookie = await cookieStore.get('businessid');
  
  // Ensure searchParams is properly handled as it might be a Promise
  const resolvedParams = searchParams ? 
    (searchParams instanceof Promise ? await searchParams : searchParams) : 
    {};
  
  // Existing search params to preserve - use the resolved params
  const params = { ...resolvedParams };
  const {
    newAccount,
    plan,
    mockData,
    setupStatus,
    tenantId: urlTenantId,
    from,
    direct
  } = params;
  
  // Use tenant ID from URL if available, otherwise from cookies
  const effectiveTenantId = urlTenantId || tenantIdCookie?.value || businessIdCookie?.value;
  
  // Get all cookies for debugging
  const allCookies = await cookieStore.getAll();
  const cookieDetails = allCookies.map(cookie => `${cookie.name}: ${cookie.value}`);
  
  // Log redirection
  serverLogger.info('Redirecting from /dashboard to tenant-specific route', {
    tenantId: effectiveTenantId,
    searchParams: params,
    hasTenantIdCookie: !!tenantIdCookie,
    hasBusinessIdCookie: !!businessIdCookie,
    cookies: cookieDetails.slice(0, 10) // Limit to first 10 cookies
  });

  if (!effectiveTenantId) {
    // If no tenant ID available, show an error page or redirect to onboarding
    serverLogger.error('No tenant ID available for dashboard redirect');
    
    // Check for newAccount flag - this means we're coming from onboarding
    if (newAccount === 'true' || plan === 'free') {
      serverLogger.warn('New account detected but no tenant ID - redirecting to subscription selection');
      return redirect('/onboarding/subscription?error=missing_tenant');
    }
    
    // Redirect to onboarding or login page as fallback
    return redirect('/auth/signin?error=no_tenant_id');
  }
  
  // Preserve all search parameters
  const queryString = new URLSearchParams(params).toString();
  const destination = `/${effectiveTenantId}/dashboard${queryString ? `?${queryString}` : ''}`;
  
  serverLogger.info(`Redirecting to tenant-specific dashboard: ${destination}`);
  
  // Ensure tenant ID in URL for authenticated users
  if (searchParams.requestTenantCreation === 'true' && searchParams.businessId) {
    try {
      // Include the tenant creation logic directly in server component
      // to avoid client component rendering delays
      console.log('Dashboard is handling tenant creation request with business ID:', searchParams.businessId);
      
      return {
        // Render the dashboard with tenant creation in progress
        props: {
          newAccount: true,
          plan: searchParams.freePlan ? 'free' : undefined,
          createTenant: true,
          businessId: searchParams.businessId,
        },
      };
    } catch (error) {
      console.error('Error handling tenant creation:', error);
    }
  }
  
  // Redirect to tenant-specific dashboard
  return redirect(destination);
}