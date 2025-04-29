'use client';

import { useParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import Script from 'next/script';

/**
 * Layout for tenant-specific dashboard route
 */
export default function TenantDashboardLayout({ children }) {
  const params = useParams();
  const tenantId = params?.tenantId;

  // Log tenant ID for debugging
  logger.debug(`[TenantDashboardLayout] Rendering for tenant: ${tenantId}`);

  return (
    <div className="h-full min-h-screen bg-gray-50">
      {/* Emergency scripts to fix re-rendering issues */}
      <Script 
        src="/scripts/Version0003_fix_dashboard_rerendering.js" 
        strategy="beforeInteractive"
        id="dashboard-rerender-fix"
      />
      {children}
    </div>
  );
} 