'use client';

import { useParams } from 'next/navigation';
import { logger } from '@/utils/logger';

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
      {children}
    </div>
  );
} 