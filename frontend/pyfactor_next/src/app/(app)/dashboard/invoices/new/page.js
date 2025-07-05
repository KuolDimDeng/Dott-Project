'use client';


import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import InvoiceManagement from '@/app/(app)/dashboard/components/forms/InvoiceManagement';

/**
 * Page component for creating a new invoice
 */
export default function NewInvoicePage() {
  return (
    <DashboardWrapper>
      <InvoiceManagement newInvoice={true} />
    </DashboardWrapper>
  );
} 