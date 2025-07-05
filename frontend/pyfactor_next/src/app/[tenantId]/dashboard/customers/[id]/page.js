'use client';


import { useParams } from 'next/navigation';
import CustomerDetails from '@/app/dashboard/components/forms/CustomerDetails';
import DashboardWrapper from '@/app/dashboard/DashboardWrapper';
import { logger } from '@/utils/logger';

/**
 * Tenant-specific customer details page
 * This is used when accessing a specific customer with a tenant ID in the URL
 */
export default function TenantCustomerDetailsPage() {
  const { tenantId, id: customerId } = useParams();
  
  logger.info(`[TenantCustomerDetailsPage] Viewing customer ${customerId} for tenant ${tenantId}`);
  
  const handleBackToList = () => {
    window.location.href = `/${tenantId}/dashboard/customers?tab=list`;
  };
  
  return (
    <DashboardWrapper tenantId={tenantId}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <CustomerDetails 
            customerId={customerId} 
            onBackToList={handleBackToList}
          />
        </div>
      </div>
    </DashboardWrapper>
  );
} 