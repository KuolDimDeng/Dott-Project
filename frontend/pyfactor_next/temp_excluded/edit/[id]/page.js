'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CustomerForm from '@/app/dashboard/components/forms/CustomerForm';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { logger } from '@/utils/logger';

/**
 * Customer Edit Page
 * This page allows users to edit an existing customer
 */
export default function EditCustomerPage({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const handleBackToList = () => {
    router.push('/dashboard/customers');
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    logger.info('[EditCustomerPage] Customer updated successfully:', updatedCustomer);
    // Navigate back to the customer list
    router.push('/dashboard/customers');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <CustomerForm 
          mode="edit"
          customerId={id}
          onBackToList={handleBackToList}
          onCustomerUpdated={handleCustomerUpdated}
        />
      </div>
    </DashboardLayout>
  );
} 