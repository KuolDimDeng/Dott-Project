'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const PayrollOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[PayrollOverview] Item clicked:', itemValue);
    
    // Route mapping for payroll items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'payroll-dashboard',
      'process-payroll': 'payroll-wizard',
      'transactions': 'payroll-transactions',
      'reports': 'payroll-reports'
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
        menuSection="payroll"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default PayrollOverview;