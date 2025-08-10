'use client';

import ProductManagement from './ProductManagement';

// Wrapper component for Sales Product Management
// This ensures ProductManagement is properly loaded when accessed from the sales menu
const SalesProductManagement = (props) => {
  return <ProductManagement {...props} salesContext={true} />;
};

export default SalesProductManagement;