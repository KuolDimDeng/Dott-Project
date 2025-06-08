'use client';


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTenantStorage } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

export default function ClearTenantPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      clearTenantStorage();
      logger.info('[ClearTenant] Tenant storage cleared successfully');
      router.push('/');
    } catch (error) {
      logger.error('[ClearTenant] Error clearing tenant storage:', error);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Clearing Tenant Data...</h1>
        <p className="text-gray-600">You will be redirected to the home page shortly.</p>
      </div>
    </div>
  );
} 