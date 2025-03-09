// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardWrapper.jsx
import { useState } from 'react';
import { logger } from '@/utils/logger';

export function DashboardWrapper({ children }) {
  const [requestId] = useState(() => crypto.randomUUID());

  logger.debug('Dashboard wrapper rendering:', {
    requestId,
    timestamp: new Date().toISOString()
  });

  return (
    <>
      {children}
    </>
  );
}