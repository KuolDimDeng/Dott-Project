'use client';

import React from 'react';
import ProductManagement from './ProductManagement';

/**
 * A wrapper component for product management in sales context.
 * This component ensures proper initialization of the ProductManagement component
 * with the salesContext prop to avoid issues with lazy loading and memoization.
 */
const SalesProductManagement = (props) => {
  // Ensure component is properly mounted with React context
  return (
    <ProductManagement 
      {...props} 
      salesContext={true} 
    />
  );
};

export default SalesProductManagement;