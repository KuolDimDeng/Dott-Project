'use client';

import React from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';

const JobsOverview = ({ userData, ...props }) => {

  const handleItemClick = (itemValue) => {
    console.log('[JobsOverview] Item clicked:', itemValue);
    
    // Route mapping for jobs items
    const routeMapping = {
      'dashboard': 'job-dashboard',
      'jobs-list': 'jobs-list',
      'job-costing': 'job-costing',
      'job-materials': 'job-materials',
      'job-labor': 'job-labor',
      'job-profitability': 'job-profitability',
      'vehicles': 'vehicles',
      'reports': 'jobs-reports'
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
        menuSection="jobs"
        onItemClick={handleItemClick}
        userData={userData}
      />
    </div>
  );
};

export default JobsOverview;