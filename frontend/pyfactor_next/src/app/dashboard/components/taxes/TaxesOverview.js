'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const TaxesOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[TaxesOverview] Item clicked:', itemValue);
    
    // Route mapping for taxes items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'taxes-dashboard',
      'sales-tax': 'sales-tax-filing',
      'file-return': 'new-filing',
      'filing-history': 'filing-history'
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
        menuSection="taxes"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default TaxesOverview;