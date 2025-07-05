'use client';


import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import ServiceManagement from '@/app/dashboard/components/forms/ServiceManagement';

/**
 * Page component for creating a new service
 */
export default function NewServicePage() {
  return (
    <DashboardWrapper>
      <ServiceManagement newService={true} />
    </DashboardWrapper>
  );
} 