'use client';

import React, { useState, useEffect } from 'react';
import MenuOverviewGrid from '../menu/MenuOverviewGrid';
import SalesDashboardEnhanced from '../dashboards/SalesDashboardEnhanced';
import InvoiceManagement from '../forms/InvoiceManagement';
import SalesReportsManagement from '../forms/SalesReportsManagement';
import ProductList from '../lists/ProductList';
import CustomerList from '../lists/CustomerList';
import Transactions from './Transactions';

const SalesOverview = ({ userData, ...props }) => {
  const [selectedView, setSelectedView] = useState('overview');
  const [isDirectNavigation, setIsDirectNavigation] = useState(false);

  useEffect(() => {
    const handleDirectNavigation = (event) => {
      const { subView } = event.detail;
      if (subView && subView !== 'overview') {
        setSelectedView(subView);
        setIsDirectNavigation(true);
      }
    };

    window.addEventListener('salesDirectNavigation', handleDirectNavigation);
    return () => {
      window.removeEventListener('salesDirectNavigation', handleDirectNavigation);
    };
  }, []);

  const handleItemClick = (itemValue) => {
    console.log('[SalesOverview] Item clicked:', itemValue);
    
    if (itemValue === 'pos') {
      if (typeof props.handleShowCreateOptions === 'function') {
        props.handleShowCreateOptions('Sales');
      } else {
        console.warn('[SalesOverview] POS handler not available');
      }
      return;
    }
    
    setSelectedView(itemValue);
    setIsDirectNavigation(false);

    const navigationKey = `nav-${Date.now()}`;
    const payload = {
      item: `sales-${itemValue}`,
      navigationKey,
      originalItem: itemValue
    };
    
    window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'overview':
        return (
          <MenuOverviewGrid
            menuSection="sales"
            onItemClick={handleItemClick}
            userData={userData}
          />
        );
      
      case 'dashboard':
        return <SalesDashboardEnhanced userData={userData} {...props} />;
      
      case 'transactions':
        return <Transactions userData={userData} {...props} />;
      
      case 'products':
        return <ProductList userData={userData} {...props} />;
      
      case 'customers':
        return <CustomerList userData={userData} {...props} />;
      
      case 'estimates':
        // Placeholder for estimates - component needs to be created
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold">Estimates</h2>
            <p className="text-gray-600 mt-2">Estimates management coming soon...</p>
          </div>
        );
      
      case 'orders':
        // Placeholder for orders - component needs to be created
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold">Sales Orders</h2>
            <p className="text-gray-600 mt-2">Orders management coming soon...</p>
          </div>
        );
      
      case 'invoices':
        return <InvoiceManagement userData={userData} {...props} />;
      
      case 'reports':
        return <SalesReportsManagement userData={userData} {...props} />;
      
      default:
        return (
          <MenuOverviewGrid
            menuSection="sales"
            onItemClick={handleItemClick}
            userData={userData}
          />
        );
    }
  };

  return (
    <div className="w-full h-full">
      {!isDirectNavigation && selectedView !== 'overview' && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedView('overview')}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sales Overview
          </button>
        </div>
      )}
      
      {renderContent()}
    </div>
  );
};

export default SalesOverview;