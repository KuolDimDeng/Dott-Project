'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import CustomerDetails from '@/app/dashboard/components/forms/CustomerDetails';

/**
 * Page component for creating a new customer
 */
export default function NewCustomerPage() {
  const router = useRouter();

  const handleBackToList = () => {
    router.push('/dashboard/customers');
  };

  return (
    <DashboardWrapper>
      <CustomerDetails newCustomer={true} onBackToList={handleBackToList} />
    </DashboardWrapper>
  );
} 