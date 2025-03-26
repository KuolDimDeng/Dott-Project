'use client';

import React, { useEffect } from 'react';
import DashboardWrapper from '../../DashboardWrapper';
import ProductManagement from '@/app/dashboard/components/forms/ProductManagement.jsx';
import { logger } from '@/utils/logger';

/**
 * Page component for creating a new product
 */
export default function NewProductPage() {
  // Add detailed logging for component lifecycle
  useEffect(() => {
    logger.info('[NewProductPage] Component mounted');
    
    // Log initialization details
    try {
      logger.debug('[NewProductPage] Initializing with newProduct=true');
      
      // Return cleanup function
      return () => {
        logger.info('[NewProductPage] Component unmounting');
      };
    } catch (error) {
      logger.error('[NewProductPage] Error during initialization:', error);
    }
  }, []);

  return (
    <DashboardWrapper>
      {logger.debug('[NewProductPage] Rendering ProductManagement with newProduct=true') || null}
      <ProductManagement newProduct={true} />
    </DashboardWrapper>
  );
} 