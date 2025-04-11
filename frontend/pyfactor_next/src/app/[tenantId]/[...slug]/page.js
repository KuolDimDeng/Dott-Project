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
  // Unwrap params Promise using React.use()
  const unwrappedParams = React.use(params);
  const { tenantId, slug } = unwrappedParams;
  const router = useRouter();
  
  useEffect(() => {
    // Log the tenant ID and slug
    logger.info(`[TenantCatchAllPage] Tenant ID: ${tenantId}, Slug: ${slug.join('/')}`);
    
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
    const queryParams = { section: slug.join('/') };
    redirectToDashboard(router, { 
      tenantId: tenantId, 
      queryParams,
      source: 'tenant-catchall-redirect' 
    });
  }, [tenantId, slug, router]);
  
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