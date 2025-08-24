'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const PaymentsOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[PaymentsOverview] Item clicked:', itemValue);
    
    // Route mapping for payments items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'payments-dashboard',
      'receive-payment': 'receive-payments',
      'make-payment': 'make-payments',
      'payment-methods': 'payment-methods',
      'recurring-payments': 'recurring-payments',
      'refunds': 'refunds',
      'reconciliation': 'payment-reconciliation',
      'payment-gateways': 'payment-gateways',
      'reports': 'payment-reports'
    };
    
    const targetRoute = routeMapping[itemValue] || itemValue;
    
    // Navigate directly to the component
    const navigationKey = `nav-${Date.now()}`;
    const payload = {
      item: targetRoute,
      navigationKey,
      originalItem: itemValue
    };
    
    window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
  };

  return (
    <div className="w-full h-full">
      <MenuOverviewGrid
        menuSection="payments"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default PaymentsOverview;