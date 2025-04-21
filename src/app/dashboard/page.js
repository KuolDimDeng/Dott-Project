// Dashboard page (Server Component)
// Do NOT add 'use client' directive here since we're exporting metadata

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverLogger } from '@/utils/serverLogger';
import DashboardLoader from '@/components/DashboardLoader';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';

// Import the static version of the dashboard content
// This is now located in the component directory
// DO NOT use dynamic imports here to avoid chunk loading errors
const CustomDashboardContent = () => {
  // This is a server component that will render the client component when needed
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Fallback recovery script
            window.addEventListener('error', function(e) {
              // Only handle chunk loading errors
              if (e && e.message && e.message.includes('ChunkLoadError')) {
                console.error('Caught chunk load error, trying to recover...');
                // Allow a small delay for any in-progress requests to finish
                setTimeout(() => {
                  // Force reload the page to get a fresh copy of the JS files
                  window.location.reload();
                }, 1000);
              }
            });
          `,
        }}
      />
      <div className="dashboard-content-wrapper">
        {/* This import will be handled on the client side */}
        <div id="dashboard-content-mount-point">
          <DashboardLoader message="Preparing dashboard..." />
        </div>
      </div>
    </>
  );
};

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