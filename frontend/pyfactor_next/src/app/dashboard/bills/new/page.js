'use client';

import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import BillManagement from '@/app/dashboard/components/forms/BillManagement';

/**
 * Page component for creating a new bill
 */
export default function NewBillPage() {
  return (
    <DashboardWrapper>
      <BillManagement newBill={true} />
    </DashboardWrapper>
  );
} 