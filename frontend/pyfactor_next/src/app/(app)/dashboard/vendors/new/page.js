'use client';


import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import VendorManagement from '@/app/(app)/dashboard/components/forms/VendorManagement';

/**
 * Page component for creating a new vendor
 */
export default function NewVendorPage() {
  return (
    <DashboardWrapper>
      <VendorManagement newVendor={true} />
    </DashboardWrapper>
  );
} 