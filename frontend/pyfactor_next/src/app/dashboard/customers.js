'use client';

// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/customers.js

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function CustomersRedirect() {
  const router = useRouter();

  useEffect(() => {
    logger.info('[CustomersRedirect] Redirecting to new customers page structure');
    router.replace('/dashboard/customers?tab=list');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-xl font-medium text-gray-700">Redirecting to Customers...</h2>
        <p className="text-gray-500 mt-2">You'll be redirected to the new customer management page.</p>
      </div>
    </div>
  );
}
