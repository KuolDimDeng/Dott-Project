// Dashboard page (Server Component)
// Do NOT add 'use client' directive here since we're exporting metadata

import { redirect } from 'next/navigation';
import { serverLogger } from '@/utils/serverLogger';
import DashboardLoader from '@/components/DashboardLoader';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';

/**
 * Dashboard Page Component
 *
 * This is a redirect component that uses client-side navigation
 * instead of server-side redirects to avoid NEXT_REDIRECT errors
 */

// Dashboard metadata
export const metadata = {
  title: 'Dashboard | Dott Business Management',
  description: 'Loading your dashboard...'
};

// Server component that renders client-side navigation
export default function DashboardPage(props) {
  // Get search params safely
  const searchParams = props.searchParams || {};
  
  // Parse tenant ID from URL parameters
  const tenantId = searchParams.tenantId || null;
  const fromSignIn = searchParams.fromSignIn === 'true';
  const fromAuth = searchParams.fromAuth === 'true';
  const reset = searchParams.reset === 'true';
  
  // Log initialization information
  serverLogger.info(`Dashboard: tenantId=${tenantId}, fromSignIn=${fromSignIn}`);
  
  // Determine the redirect path based on tenant ID
  let redirectPath = '';
  let message = 'Loading your dashboard...';
  
  if (reset) {
    return (
      <div>
        <MiddlewareHeaderHandler />
        <DashboardLoader message="Resetting navigation..." />
        <meta httpEquiv="x-reset-navigation" content="true" />
        <meta httpEquiv="x-tenant-id" content={tenantId || ''} />
      </div>
    );
  }
  
  if (tenantId) {
    // Build query string for tenant-specific URL
    const queryString = new URLSearchParams({
      fromSignIn: 'true',
      direct: 'true'
    }).toString();
    
    // Redirect to tenant-specific dashboard
    redirectPath = `/${tenantId}/dashboard?${queryString}`;
    message = 'Loading your dashboard...';
  } else if (!fromSignIn && !fromAuth) {
    // No tenant ID found, redirect to sign-in
    redirectPath = '/auth/signin?error=no_tenant_id';
    message = 'Redirecting to sign in...';
  } else {
    // From sign-in flow with no tenant ID yet
    redirectPath = `/dashboard?fromSignIn=true`;
    message = 'Setting up your dashboard...';
  }
  
  return (
    <div>
      <MiddlewareHeaderHandler />
      <DashboardLoader message={message} />
      <meta httpEquiv="x-should-redirect" content="true" />
      <meta httpEquiv="x-redirect-path" content={redirectPath} />
      {tenantId && <meta httpEquiv="x-tenant-id" content={tenantId} />}
    </div>
  );
}