'use client';

import React from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import ProductManagement from '@/app/dashboard/components/forms/ProductManagement';

/**
 * Page component for creating a new product
 */
export default function NewProductPage() {
  return (
    <DashboardWrapper>
      <ProductManagement newProduct={true} />
    </DashboardWrapper>
  );
} 