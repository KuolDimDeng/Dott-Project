'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const BankingOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[BankingOverview] Item clicked:', itemValue);
    
    // Route mapping for banking items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'banking-dashboard',
      'transactions': 'bank-transactions',
      'reconciliation': 'bank-reconciliation',
      'reports': 'banking-reports'
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
        menuSection="banking"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default BankingOverview;