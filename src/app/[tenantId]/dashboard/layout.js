// Tenant-specific dashboard layout
// This layout is similar to the main dashboard layout but includes tenant context

import React from 'react';
import DashboardClientLayout from '../../dashboard/DashboardClientLayout';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';
import SessionProviderWrapper from '../../dashboard/SessionProviderWrapper';
import Script from 'next/script';
import { serverLogger } from '@/utils/serverLogger';

// Export metadata
export const metadata = {
  title: 'Tenant Dashboard | Dott Business Management',
  description: 'Your tenant-specific dashboard',
};

// Tenant dashboard layout
export default function TenantDashboardLayout({ children, params }) {
  const { tenantId } = params;

  // Log tenant ID for debugging
  serverLogger.info(`[TenantDashboardLayout] Rendering for tenant: ${tenantId}`);

  return (
    <>
      {/* Add fallback script for handling chunk loading errors */}
      <Script id="tenant-chunk-error-handler" strategy="beforeInteractive">
        {`
          // Global error handler for chunk loading errors
          window.addEventListener('error', function(e) {
            if (e && e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
              console.error('Caught chunk load error in tenant global handler, recovering...');
              
              // Attempt to clean the cache by clearing service workers if present
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              
              // Force a clean reload after a short delay
              setTimeout(() => {
                window.location.href = '/${tenantId}/dashboard?refresh=true&ts=' + Date.now();
              }, 500);
            }
          });
          
          // Set tenant ID globally so components can access it
          window.__TENANT_ID = "${tenantId}";
        `}
      </Script>
      
      <MiddlewareHeaderHandler />
      <SessionProviderWrapper>
        <DashboardClientLayout>
          {children}
        </DashboardClientLayout>
      </SessionProviderWrapper>
    </>
  );
} 