'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const SalesOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[SalesOverview] Item clicked:', itemValue);
    
    if (itemValue === 'pos') {
      // Dispatch POS navigation event
      const navigationKey = `nav-${Date.now()}`;
      const payload = {
        item: 'pos',
        navigationKey,
        originalItem: 'Point of Sale',
        showCreateOptions: true,
        selectedOption: 'Sales'
      };
      
      window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
      window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
      return;
    }
    
    // For items that have their own routes, don't prefix with "sales-"
    const routeMapping = {
      'dashboard': 'sales-dashboard',
      'transactions': 'sales-transactions',
      'products': 'products',
      'services': 'services',
      'customers': 'customers',
      'estimates': 'estimates',
      'orders': 'orders',
      'invoices': 'invoices',
      'reports': 'sales-reports-management'
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
        menuSection="sales"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default SalesOverview;