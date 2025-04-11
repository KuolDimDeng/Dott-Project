// Dashboard page (Server Component)
// Do NOT add 'use client' directive here since we're exporting metadata

import { Suspense } from 'react';
import { DashboardProvider } from '@/context/DashboardContext';
import DashboardContent from '@/app/dashboard/DashboardContent';
import LoadingSpinner from '@/components/LoadingSpinner';
import { redirect } from 'next/navigation';
import { serverLogger } from '@/utils/serverLogger';

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * A server component that exports metadata and renders the client component.
 */

// Dashboard metadata
const defaultMetadata = {
  title: 'Dashboard | Dott Business Management',
  description: 'View and manage your business data on our dashboard.'
};

export const metadata = defaultMetadata;

// Server component that handles searchParams with proper async handling
export default async function DashboardPage({ searchParams }) {
  const {
    newAccount,
    plan,
    mockData,
    setupStatus
  } = searchParams || {};
  
  // Use serverLogger for server components
  serverLogger.info('Dashboard initial render with props:', {
    newAccount,
    plan,
    mockData,
    setupStatus
  });
  
  return (
    <Suspense fallback={<LoadingSpinner fullscreen message="Loading dashboard..." />}>
      <DashboardProvider>
        <DashboardContent 
          newAccount={newAccount === 'true'} 
          plan={plan}
          mockData={mockData}
          setupStatus={setupStatus}
        />
      </DashboardProvider>
    </Suspense>
  );
} 