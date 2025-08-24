'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const HROverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[HROverview] Item clicked:', itemValue);
    
    // Route mapping for HR items (based on listItems.js)
    const routeMapping = {
      'dashboard': 'hr-dashboard',
      'teams': 'employees',
      'timesheets': 'timesheets',
      'manage-pay': 'pay',
      'benefits': 'benefits',
      'reports': 'hr-reports',
      'performance': 'performance'
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
        menuSection="hr"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default HROverview;