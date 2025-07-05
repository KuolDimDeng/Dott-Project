'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function CustomerDetailsRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const customerId = params?.id;
    
    if (!customerId) {
      logger.error('[CustomerDetailsRedirect] No customer ID provided');
      router.replace('/dashboard/customers?tab=list');
      return;
    }
    
    logger.info(`[CustomerDetailsRedirect] Redirecting to customer details with ID: ${customerId}`);
    router.replace(`/dashboard/customers?tab=details&id=${customerId}`);
  }, [router, params]);

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-xl font-medium text-gray-700">Loading Customer Details...</h2>
        <p className="text-gray-500 mt-2">Redirecting to the customer details view.</p>
      </div>
    </div>
  );
} 