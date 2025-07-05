'use client';


import { useParams } from 'next/navigation';
import CustomerForm from '@/app/dashboard/components/forms/CustomerForm';
import DashboardWrapper from '@/app/dashboard/DashboardWrapper';
import { logger } from '@/utils/logger';

/**
 * Tenant-specific new customer page
 * This is used when creating a new customer with a tenant ID in the URL
 */
export default function TenantNewCustomerPage() {
  const { tenantId } = useParams();
  
  logger.info(`[TenantNewCustomerPage] Creating new customer for tenant ${tenantId}`);
  
  const handleBackToList = () => {
    window.location.href = `/${tenantId}/dashboard/customers?tab=list`;
  };
  
  const handleCustomerCreated = (customer) => {
    logger.info(`[TenantNewCustomerPage] Customer created for tenant ${tenantId}:`, customer);
    window.location.href = `/${tenantId}/dashboard/customers?tab=list`;
  };
  
  return (
    <DashboardWrapper tenantId={tenantId}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <CustomerForm 
            mode="create" 
            onBackToList={handleBackToList}
            onCustomerCreated={handleCustomerCreated}
          />
        </div>
      </div>
    </DashboardWrapper>
  );
} 