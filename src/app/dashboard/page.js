// Dashboard page (Server Component)
// Do NOT add 'use client' directive here since we're exporting metadata

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverLogger } from '@/utils/serverLogger';
import DashboardLoader from '@/components/DashboardLoader';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';
import dynamic from 'next/dynamic';

// Import the custom DashboardContent component
const CustomDashboardContent = dynamic(
  () => import('./components/DashboardContent'),
  { ssr: false, loading: () => <DashboardLoader message="Loading your custom dashboard..." /> }
);

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

export default function Dashboard() {
  try {
    // Return the custom dashboard component
    return (
      <div>
        <MiddlewareHeaderHandler />
        <Suspense fallback={<DashboardLoader message="Loading dashboard..." />}>
          <CustomDashboardContent />
        </Suspense>
      </div>
    );
  } catch (error) {
    serverLogger.error('Error in dashboard redirect:', error);
    return (
      <div>
        <DashboardLoader message="Recovering from error..." />
        <meta httpEquiv="x-dashboard-error" content="true" />
        <meta httpEquiv="x-error-message" content={error.message} />
      </div>
    );
  }
} 