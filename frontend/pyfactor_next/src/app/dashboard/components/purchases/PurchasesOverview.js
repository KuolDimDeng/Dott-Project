'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const PurchasesOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[PurchasesOverview] Item clicked:', itemValue);
    
    // Route mapping for purchases items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'purchases-dashboard',
      'vendors': 'vendor-management',
      'purchase-orders': 'purchase-order-management',
      'bills': 'bill-management',
      'expenses': 'expenses-management',
      'purchase-returns': 'purchase-returns-management',
      'procurement': 'procurement-management',
      'reports': 'purchases-reports'
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
        menuSection="purchases"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default PurchasesOverview;