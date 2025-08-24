'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const AccountingOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[AccountingOverview] Item clicked:', itemValue);
    
    // Route mapping for accounting items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'accounting-dashboard',
      'chart-of-accounts': 'chart-of-accounts',
      'journal-entries': 'journal-entries',
      'general-ledger': 'general-ledger',
      'reconciliation': 'reconciliation',
      'financial-statements': 'financial-statements',
      'fixed-assets': 'fixed-assets',
      'reports': 'accounting-reports'
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
        menuSection="accounting"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default AccountingOverview;