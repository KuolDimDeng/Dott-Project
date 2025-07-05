import React from 'react';
import ProductManagement from './ProductManagement';

/**
 * A wrapper component for product management in sales context.
 * This component ensures proper initialization of the ProductManagement component
 * with the salesContext prop to avoid infinite update loops.
 */
const SalesProductManagement = (props) => {
  // Since this is a separate component, React will handle mounting properly
  return (
    <ProductManagement 
      salesContext={true}
      {...props}
    />
  );
};

export default SalesProductManagement; 