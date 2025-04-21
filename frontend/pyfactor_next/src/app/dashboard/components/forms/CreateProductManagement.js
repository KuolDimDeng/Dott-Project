import React, { memo, useCallback } from 'react';
import ProductManagement from './ProductManagement';

/**
 * A wrapper component for creating new products.
 * This component ensures proper initialization of the ProductManagement component
 * with the correct props to avoid infinite update loops.
 */
const CreateProductManagement = (props) => {
  // Extract only the specific props we need and avoid spreading
  // This prevents unnecessary re-renders and potential infinite loops
  const { onSave, onCancel } = props;
  
  // Memoize the callback functions to prevent recreating them on each render
  const handleSave = useCallback((data) => {
    if (onSave && typeof onSave === 'function') {
      onSave(data);
    }
  }, [onSave]);
  
  const handleCancel = useCallback(() => {
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  }, [onCancel]);
  
  return (
    <ProductManagement 
      isNewProduct={true} 
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      // Do NOT spread props - this can cause infinite updates
    />
  );
};

// Wrap in memo to prevent unnecessary re-renders
export default memo(CreateProductManagement); 