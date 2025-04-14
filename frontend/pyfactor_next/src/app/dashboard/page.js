// Dashboard page (Client Component)

'use client';

import React from 'react';
import { redirect } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import DashboardLoader from '@/components/DashboardLoader';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';

/**
 * Dashboard Page Component
 *
 * This is a redirect component that uses client-side navigation
 * instead of server-side redirects to avoid NEXT_REDIRECT errors
 */

// Dashboard metadata - moved to layout.js since metadata can't be exported from client components
// export const metadata = {
//   title: 'Dashboard | Dott Business Management',
//   description: 'Loading your dashboard...'
// };

// Client component that handles navigation
export default function DashboardPage() {
  // Use the useSearchParams hook instead of accessing props directly
  const searchParams = useSearchParams();
  
  // Parse tenant ID from URL parameters using the get method
  const tenantId = searchParams.get('tenantId') || null;
  const fromSignIn = searchParams.get('fromSignIn') === 'true';
  const fromAuth = searchParams.get('fromAuth') === 'true';
  const reset = searchParams.get('reset') === 'true';
  
  // Log initialization information
  console.info(`Dashboard: tenantId=${tenantId}, fromSignIn=${fromSignIn}`);
  
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