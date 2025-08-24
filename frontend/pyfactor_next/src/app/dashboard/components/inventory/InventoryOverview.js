'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const InventoryOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[InventoryOverview] Item clicked:', itemValue);
    
    // Route mapping for inventory items
    const routeMapping = {
      'dashboard': 'inventory-dashboard',
      'products': 'products',
      'categories': 'product-categories',
      'stock-management': 'stock-management',
      'suppliers': 'inventory-suppliers',
      'purchase-orders': 'purchase-orders',
      'stock-adjustments': 'stock-adjustments',
      'warehouses': 'warehouses',
      'transfers': 'inventory-transfers',
      'reports': 'inventory-reports'
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
        menuSection="inventory"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default InventoryOverview;