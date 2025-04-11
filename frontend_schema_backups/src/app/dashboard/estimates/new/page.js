'use client';

import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import EstimateManagement from '@/app/dashboard/components/forms/EstimateManagement';

/**
 * Page component for creating a new estimate
 */
export default function NewEstimatePage() {
  return (
    <DashboardWrapper>
      <EstimateManagement newEstimate={true} />
    </DashboardWrapper>
  );
} 