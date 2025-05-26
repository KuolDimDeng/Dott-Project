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
      {/* Re-rendering issues fixed directly in components - script removed to prevent MIME type errors */}
      {children}
    </div>
  );
} 