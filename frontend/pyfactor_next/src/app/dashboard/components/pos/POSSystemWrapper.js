'use client';

import React from 'react';
import POSSystem from './POSSystem';

/**
 * Wrapper component for POSSystem to be used in routing
 * Provides the required props that POSSystem expects
 */
const POSSystemWrapper = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const handleClose = () => {
    // Navigate back to dashboard or previous page
    window.history.back();
  };
  
  const handleSaleCompleted = (saleData) => {
    console.log('[POSSystemWrapper] Sale completed:', saleData);
    // Handle post-sale actions
  };
  
  return (
    <POSSystem 
      isOpen={isOpen}
      onClose={handleClose}
      onSaleCompleted={handleSaleCompleted}
    />
  );
};

export default POSSystemWrapper;