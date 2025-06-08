'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { storeTenantId, isValidUUID } from '@/utils/tenantUtils';
import { redirectToDashboard } from '@/utils/redirectUtils';

/**
 * TenantCatchAllPage
 * 
 * This component handles any tenant-specific URLs that aren't explicitly 
 * handled by other routes. It extracts the tenant ID and redirects to the
 * appropriate page in the dashboard.
 */
export default function TenantCatchAllPage({ params }) {
  // Access params via React hooks instead of directly
  const router = useRouter();
  
  // Use the params object safely inside the useEffect hook
  // where React state updates are permitted
  useEffect(() => {
    // Extract the params within the effect
    const tenantId = params?.tenantId;
    const slug = params?.slug || [];
    
    try {
      // IMPORTANT: Don't handle API routes - they should be handled by their respective API handlers
      if (tenantId === 'api') {
        logger.debug(`[TenantCatchAllPage] Ignoring API route: /api/${Array.isArray(slug) ? slug.join('/') : slug}`);
        return; // Don't process API routes
      }
      
      // Also check for other system routes that shouldn't be handled as tenant routes
      const systemRoutes = ['_next', 'favicon.ico', 'robots.txt', 'sitemap.xml'];
      if (systemRoutes.includes(tenantId)) {
        logger.debug(`[TenantCatchAllPage] Ignoring system route: /${tenantId}`);
        return;
      }
      
      // Log the tenant ID and slug
      logger.info(`[TenantCatchAllPage] Tenant ID: ${tenantId}, Slug: ${Array.isArray(slug) ? slug.join('/') : slug}`);
      
      if (!tenantId) {
        logger.error('[TenantCatchAllPage] No tenant ID provided in URL path');
        redirectToDashboard(router, { source: 'tenant-catchall-no-id' });
        return;
      }
      
      if (!isValidUUID(tenantId)) {
        logger.error(`[TenantCatchAllPage] Invalid tenant ID format: ${tenantId}`);
        redirectToDashboard(router, { source: 'tenant-catchall-invalid-id' });
        return;
      }
      
      // Store the tenant ID in client storage
      storeTenantId(tenantId);
      
      // Redirect to the tenant-specific dashboard with the section as a query parameter
      const slugPath = Array.isArray(slug) ? slug.join('/') : slug;
      const queryParams = { section: slugPath };
      redirectToDashboard(router, { 
        tenantId: tenantId, 
        queryParams,
        source: 'tenant-catchall-redirect' 
      });
    } catch (error) {
      logger.error('[TenantCatchAllPage] Error processing tenant route:', error);
      // Fallback to dashboard on error
      redirectToDashboard(router, { source: 'tenant-catchall-error' });
    }
  }, [router, params]); // Add params as a dependency
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Redirecting to dashboard...</h2>
        <p className="text-gray-500">Please wait while we load your data.</p>
      </div>
    </div>
  );
}