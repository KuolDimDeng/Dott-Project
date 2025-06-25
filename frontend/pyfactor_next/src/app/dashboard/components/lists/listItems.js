'use client';

/**
 * @component MainListItems
 * @description 
 * IMPORTANT: THIS IS THE FINAL DESIGN AND LAYOUT FOR THE MAIN LIST MENU.
 * DO NOT MAKE ANY CHANGES TO THIS COMPONENT WITHOUT EXPRESS PERMISSION FROM THE OWNER.
 * This design was finalized on 2025-04-06 with the following specifications:
 * - Complete navigation menu system for the dashboard with collapsible sections
 * - Support for both expanded and icon-only views
 * - Custom SVG icons for all menu items
 * - Mobile and desktop responsive behavior
 * - Smooth animations and hover effects
 * 
 * Any changes require explicit approval from the project owner.
 */


import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';
import { usePermissions } from '@/hooks/usePermissions';

// SVG Icons for menu items
const NavIcons = {
  AddCircle: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Dashboard: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Sales: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Contacts: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Inventory: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Shipping: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  Payments: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Cart: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Bank: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  Wallet: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Reports: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Analytics: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Receipt: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ChevronDown: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronUp: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
    </svg>
  ),
  Home: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  People: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Description: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Settings: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
};

// Helper icons for the inventory menu items (replacing MUI icons)
const InventoryIcons = {
  Dashboard: (props) => (
    <svg className={props.className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  People: (props) => (
    <svg className={props.className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
};

const MENU_WIDTH = 258; // Increased to match the drawer width (260px, leaving 2px for borders)

const MainListItems = ({
  handleMainDashboardClick,
  handleHomeClick,
  handleSalesClick,
  handlePaymentsClick,
  handlePurchasesClick,
  handleAccountingClick,
  handleBankingClick,
  handlePayrollClick,
  handleInventoryClick,
  handleReportClick,
  handleAnalysisClick,
  handleTaxesClick,
  handleCRMClick,
  handleTransportClick,
  handleHRClick,
  handleEmployeeManagementClick,
  handleShowCreateOptions,
  handleShowCreateMenu,
  handleDrawerClose,
  handleBillingClick = () => console.log('Billing clicked (default handler)'),
  handleSettingsClick = () => console.log('Settings clicked (default handler)'),
  isIconOnly = false,
  borderRightColor = 'transparent',
  borderRightWidth = '0px',
}) => {
  const { canAccessRoute, isOwnerOrAdmin, user, isLoading } = usePermissions();
  const [openMenu, setOpenMenu] = useState('');
  const [buttonWidth, setButtonWidth] = useState(0);
  const paperRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCreateOption, setHoveredCreateOption] = useState(null);
  const isMobile = useRef(window.innerWidth < 640);
  const [activeItem, setActiveItem] = useState(null);
  const [openTooltip, setOpenTooltip] = useState(null);
  

  // Check if we're on mobile/small screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => {
      isMobile.current = window.innerWidth < 640;
    };
    
    window.addEventListener('resize', checkMobile);
    checkMobile();
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Reset open menu when switching to icon-only mode
  useEffect(() => {
    if (isIconOnly) {
      setOpenMenu('');
    }
  }, [isIconOnly]);

  // Custom colors for menu items - these match the theme.js colors
  const navyBlue = '#0a3977';      // primary.main
  const hoverBgColor = '#f0f3f9';  // Very light blue-gray

  useEffect(() => {
    if (paperRef.current) {
      const paperWidth = paperRef.current.offsetWidth;
      setButtonWidth(paperWidth - 40); // 16px for left and right margin
    }
  }, []);

  const handleItemClick = useCallback((item, e) => {
    console.log('[DEBUG] handleItemClick called with item:', item);
    console.log('[DEBUG] handleItemClick called with item:', item);
    setOpenTooltip && setOpenTooltip(null);
    if (e) e.stopPropagation();
    
    // Reset any active component state before navigating
    setActiveItem && setActiveItem(item);
    
    // Standardize the item key for routing
    const routeKey = item.toLowerCase().replace(/\s+/g, '-');
    
    // Create a unique navigation key to force component unmounting/remounting
    const navigationKey = `nav-${Date.now()}`;
    try {
      window.sessionStorage.setItem('lastNavKey', navigationKey);
    } catch (error) {
      console.warn('[listItems] Error setting navigation key in sessionStorage:', error);
    }
    
    // Create consistent event payload 
    const payload = { 
      item: routeKey, 
      navigationKey,
      // Include original item name for debugging
      originalItem: item
    };
    
    // Dispatch a custom event for navigation - both formats for compatibility
    window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
    
    console.log(`[listItems] Navigating to ${item} (${routeKey}) with key ${navigationKey}`);
    
    // Cleanup previous state before navigating
    try {
      if (item.toLowerCase().includes('inventory')) {
        window.sessionStorage.removeItem('inventoryState');
        window.sessionStorage.removeItem('inventoryFilters');
      } else if (item.toLowerCase().includes('billing') || item.toLowerCase().includes('invoice')) {
        window.sessionStorage.removeItem('billingState');
        window.sessionStorage.removeItem('invoiceFilters');
      }
    } catch (error) {
      console.warn('[listItems] Error cleaning up previous state:', error);
    }
    
    // Handle different menu options
    if (item === 'inventory' || item === 'Inventory') {
      handleInventoryClick && handleInventoryClick('inventorydashboard');
    } else if (item === 'billing' || item === 'Billing') {
      handleBillingClick && handleBillingClick('invoices'); 
    } else if ((item === 'Dashboard' || item === 'dashboard') && handleMainDashboardClick) {
      handleMainDashboardClick();
    } else if ((item === 'Sales' || item === 'sales') && handleSalesClick) {
      handleSalesClick('dashboard');
    } else if ((item === 'CRM' || item === 'crm') && handleCRMClick) {
      handleCRMClick('dashboard');
    }
    // Add other handlers as needed
  }, [
    setOpenTooltip, 
    setActiveItem, 
    handleInventoryClick, 
    handleBillingClick, 
    handleMainDashboardClick,
    handleSalesClick,
    handleCRMClick
  ]);

  const handleMouseEnter = (menuName) => {
    setHoveredItem(menuName);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleMenuToggle = (menuName) => {
    setOpenMenu(prevMenu => prevMenu === menuName ? '' : menuName);
  };

  const menuItems = [
    {
      icon: <NavIcons.AddCircle className="w-5 h-5" />,
      label: 'Create New',
      onClick: handleShowCreateMenu,
      isSpecial: true,
    },
    {
      icon: <NavIcons.Dashboard className="w-5 h-5" />,
      label: 'Dashboard',
      onClick: handleMainDashboardClick,
    },
    /* Billing menu item - This will be used in future versions of the application
    {
      icon: <NavIcons.Wallet className="w-5 h-5" />,
      label: 'Billing',
      subItems: [
        { label: 'Invoices', onClick: handleBillingClick, value: 'invoices' },
        { label: 'Payments', onClick: handleBillingClick, value: 'payments' },
        { label: 'Subscriptions', onClick: handleBillingClick, value: 'subscriptions' },
        { label: 'Payment Methods', onClick: handleBillingClick, value: 'payment-methods' },
        { label: 'Reports', onClick: handleBillingClick, value: 'reports' },
      ],
    },
    */
    {
      icon: <NavIcons.Sales className="w-5 h-5" />,
      label: 'Sales',
      subItems: [
        { label: 'Dashboard', onClick: handleSalesClick, value: 'dashboard', path: '/dashboard/sales' },
        { 
        label: 'Products', 
        path: '/dashboard/products',
        onClick: (value) => {
          // Create navigation event for products
          const navigationKey = `nav-${Date.now()}`;
          const payload = { 
            item: 'product-management', 
            navigationKey,
            originalItem: 'Products'
          };
          
          // Dispatch navigation events
          window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
          
          // Load the ProductManagement component
          if (typeof handleSalesClick === 'function') {
            handleSalesClick('products');
          }
        }, 
        value: 'products' 
      },
      { 
        label: 'Services', 
        path: '/dashboard/services',
        onClick: (value) => {
          // Create navigation event for services
          const navigationKey = `nav-${Date.now()}`;
          const payload = { 
            item: 'service-management', 
            navigationKey,
            originalItem: 'Services'
          };
          
          // Dispatch navigation events
          window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
          
          // Load the ServiceManagement component
          if (typeof handleSalesClick === 'function') {
            handleSalesClick('services');
          }
        }, 
        value: 'services' 
      },
      { 
        label: 'Customers', 
        path: '/dashboard/customers',
        onClick: (value) => {
          // Create navigation event for customers
          const navigationKey = `nav-${Date.now()}`;
          const payload = { 
            item: 'customer-management', 
            navigationKey,
            originalItem: 'Customers'
          };
          
          // Dispatch navigation events
          window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
          
          // Load the CustomerManagement component
          if (typeof handleSalesClick === 'function') {
            handleSalesClick('customers');
          }
        }, 
        value: 'customers' 
      },
        { 
          label: 'Estimates', 
          onClick: (value) => {
            // Create navigation event for estimates
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'estimate-management', 
              navigationKey,
              originalItem: 'Estimates'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the EstimateManagement component
            if (typeof handleSalesClick === 'function') {
              handleSalesClick('estimates');
            }
          }, 
          value: 'estimates' 
        },
        { 
          label: 'Orders', 
          onClick: (value) => {
            // Create navigation event for orders
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'order-management', 
              navigationKey,
              originalItem: 'Orders'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the SalesOrderManagement component
            if (typeof handleSalesClick === 'function') {
              handleSalesClick('orders');
            }
          }, 
          value: 'orders' 
        },
        { 
          label: 'Invoices', 
          onClick: (value) => {
            // Create navigation event for invoices
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'invoice-management', 
              navigationKey,
              originalItem: 'Invoices'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the InvoiceManagement component
            if (typeof handleSalesClick === 'function') {
              handleSalesClick('invoices');
            }
          }, 
          value: 'invoices' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for sales reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'sales-reports-management', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the SalesReportsManagement component
            if (typeof handleSalesClick === 'function') {
              handleSalesClick('reports');
            }
          }, 
          value: 'reports' 
        },
      ],
    },
    /* CRM menu item - This will be used in future versions of the application
    {
      icon: <NavIcons.Contacts className="w-5 h-5" />,
      label: 'CRM',
      subItems: [
        { label: 'Dashboard', onClick: handleCRMClick, value: 'dashboard' },
        { label: 'Customers', onClick: handleCRMClick, value: 'customers' },
        { label: 'Contacts', onClick: handleCRMClick, value: 'contacts' },
        { label: 'Leads', onClick: handleCRMClick, value: 'leads' },
        { label: 'Opportunities', onClick: handleCRMClick, value: 'opportunities' },
        { label: 'Deals', onClick: handleCRMClick, value: 'deals' },
        { label: 'Activities', onClick: handleCRMClick, value: 'activities' },
        { label: 'Campaigns', onClick: handleCRMClick, value: 'campaigns' },
        { label: 'Reports', onClick: handleCRMClick, value: 'reports' },
      ],
    },
    */
    {
      icon: <NavIcons.Inventory className="w-5 h-5" />,
      label: 'Inventory',
      subItems: [
        { label: 'Dashboard', onClick: handleInventoryClick, value: 'inventorydashboard', path: '/dashboard/inventory' },
        { 
          label: 'Stock Adjustments', 
          path: '/dashboard/inventory',
          onClick: (value) => {
            // Call the inventory click handler with the appropriate value
            if (typeof handleInventoryClick === 'function') {
              handleInventoryClick('stock-adjustments');
            }
          }, 
          value: 'stock-adjustments' 
        },
        { 
          label: 'Locations', 
          onClick: (value) => {
            // Call the inventory click handler with the appropriate value
            if (typeof handleInventoryClick === 'function') {
              handleInventoryClick('locations');
            }
          }, 
          value: 'locations' 
        },
        { 
          label: 'Suppliers', 
          onClick: (value) => {
            // Call the inventory click handler with the appropriate value
            if (typeof handleInventoryClick === 'function') {
              handleInventoryClick('suppliers');
            }
          }, 
          value: 'suppliers' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Call the inventory click handler with the appropriate value
            if (typeof handleInventoryClick === 'function') {
              handleInventoryClick('reports');
            }
          }, 
          value: 'reports' 
        },
      ],
    },
    /* Transport menu item - This will be used in future versions of the application
    {
      icon: <NavIcons.Shipping className="w-5 h-5" />,
      label: 'Transport',
      subItems: [
        { label: 'Dashboard', onClick: handleTransportClick, value: 'dashboard' },
        { label: 'Loads/Jobs', onClick: handleTransportClick, value: 'loads' },
        { label: 'Vehicle', onClick: handleTransportClick, value: 'equipment' },
        { label: 'Routes', onClick: handleTransportClick, value: 'routes' },
        { label: 'Expenses', onClick: handleTransportClick, value: 'expenses' },
        { label: 'Maintenance', onClick: handleTransportClick, value: 'maintenance' },
        { label: 'Compliance', onClick: handleTransportClick, value: 'compliance' },
        { label: 'Reports', onClick: handleTransportClick, value: 'reports' },
      ],
    },
    */
    {
      icon: <NavIcons.Payments className="w-5 h-5" />,
      label: 'Payments',
      subItems: [
        { label: 'Dashboard', onClick: handlePaymentsClick, value: 'payments-dashboard' },
        { label: 'Receive Payments', onClick: handlePaymentsClick, value: 'receive-payments' },
        { label: 'Make Payments', onClick: handlePaymentsClick, value: 'make-payments' },
        { label: 'Payment Methods', onClick: handlePaymentsClick, value: 'payment-methods' },
        { label: 'Recurring Payments', onClick: handlePaymentsClick, value: 'recurring-payments' },
        { label: 'Refunds', onClick: handlePaymentsClick, value: 'refunds' },
        { label: 'Payment Reconciliation', onClick: handlePaymentsClick, value: 'payment-reconciliation' },
        { label: 'Payment Gateways', onClick: handlePaymentsClick, value: 'payment-gateways' },
        { label: 'Payment Plans', onClick: handlePaymentsClick, value: 'payment-plans' },
        { label: 'Reports', onClick: handlePaymentsClick, value: 'payment-reports' },
      ],
    },
    {
      icon: <NavIcons.Cart className="w-5 h-5" />,
      label: 'Purchases',
      subItems: [
        { label: 'Dashboard', onClick: handlePurchasesClick, value: 'dashboard' },
        { label: 'Vendors', onClick: handlePurchasesClick, value: 'vendors' },
        { label: 'Purchase Orders', onClick: handlePurchasesClick, value: 'purchase-orders' },
        { label: 'Bills', onClick: handlePurchasesClick, value: 'bills' },
        { label: 'Expenses', onClick: handlePurchasesClick, value: 'expenses' },
        { label: 'Purchase Returns', onClick: handlePurchasesClick, value: 'purchase-returns' },
        { label: 'Procurement', onClick: handlePurchasesClick, value: 'procurement' },
        { label: 'Reports', onClick: handlePurchasesClick, value: 'reports' },
      ],
    },
    {
      icon: <NavIcons.Bank className="w-5 h-5" />,
      label: 'Accounting',
      subItems: [
        { label: 'Dashboard', onClick: handleAccountingClick, value: 'dashboard' },
        { label: 'Chart of Accounts', onClick: handleAccountingClick, value: 'chart-of-accounts' },
        { label: 'Journal Entries', onClick: handleAccountingClick, value: 'journal-entries' },
        { label: 'General Ledger', onClick: handleAccountingClick, value: 'general-ledger' },
        { label: 'Reconciliation', onClick: handleAccountingClick, value: 'reconciliation' },
        {
          label: 'Financial Statements',
          onClick: handleAccountingClick,
          value: 'financial-statements',
        },
        { label: 'Fixed Assets', onClick: handleAccountingClick, value: 'fixed-assets' },
        { label: 'Reports', onClick: handleAccountingClick, value: 'reports' },
      ],
    },
    {
      icon: <NavIcons.Wallet className="w-5 h-5" />,
      label: 'Banking',
      subItems: [
        { label: 'Dashboard', onClick: handleBankingClick, value: 'dashboard' },
        { label: 'Connect to Bank', onClick: handleBankingClick, value: 'connect' },
        { label: 'Bank Transactions', onClick: handleBankingClick, value: 'transactions' },
        { label: 'Bank Reconciliation', onClick: handleBankingClick, value: 'reconciliation' },
        { label: 'Reports', onClick: handleBankingClick, value: 'bank-reports' },
      ],
    },
    {
      icon: <NavIcons.People className="w-5 h-5" />,
      label: 'HR',
      subItems: [
        { label: 'Dashboard', onClick: handleHRClick, value: 'dashboard', path: '/dashboard/hr' },
        { 
          label: 'Employees', 
          path: '/dashboard/employees',
          onClick: () => {
            console.log('[listItems] Employees menu item clicked');
            // Dispatch a standardized navigation event
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'employees', 
              navigationKey
            };
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            
            // Call the handler directly if it exists
            if (typeof handleEmployeeManagementClick === 'function') {
              handleEmployeeManagementClick();
            } else if (typeof handleHRClick === 'function') {
              // Fallback to handleHRClick with employees section
              handleHRClick('employees');
            }
          }
        },
        { 
          label: 'Timesheets', 
          onClick: () => {
            console.log('[listItems] Timesheets menu item clicked');
            // Dispatch a standardized navigation event
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'timesheets', 
              navigationKey
            };
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            
            // Call the handler directly
            if (typeof handleHRClick === 'function') {
              handleHRClick('timesheets');
            }
          }
        },
        { 
          label: 'Pay', 
          onClick: () => {
            console.log('[listItems] Pay menu item clicked');
            // Dispatch a standardized navigation event
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'pay', 
              navigationKey
            };
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            
            // Call the handler directly
            if (typeof handleHRClick === 'function') {
              handleHRClick('pay');
            }
          }
        },
        { 
          label: 'Benefits', 
          path: '/dashboard/benefits',
          onClick: () => {
            console.log('[DEBUG] Benefits menu item clicked - Start');
            
            // Generate a unique navigation key for navigation
            const navigationKey = `benefits-${Date.now()}`;
            console.log('[DEBUG] Generated navigationKey:', navigationKey);
            
            const payload = { 
              item: 'benefits', 
              navigationKey,
              source: 'hr-benefits-menu-click'
            };
            
            console.log('[DEBUG] Dispatching menuNavigation event with payload:', JSON.stringify(payload));
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            console.log('[DEBUG] menuNavigation event dispatched');
            
            // Call the handler directly
            if (typeof handleHRClick === 'function') {
              console.log('[DEBUG] Calling handleHRClick with section: benefits');
              handleHRClick('benefits');
              console.log('[DEBUG] handleHRClick called');
            } else {
              console.error('[DEBUG] handleHRClick is not a function');
            }
            
            console.log('[DEBUG] Benefits menu item clicked - End');
          }
        },
        { label: 'Reports', onClick: handleHRClick, value: 'reports', path: '/dashboard/reports' },
        { label: 'Performance', onClick: handleHRClick, value: 'performance', path: '/dashboard/hr' },
      ],
    },
    {
      icon: <NavIcons.Payments className="w-5 h-5" />,
      label: 'Payroll',
      subItems: [
        { label: 'Dashboard', onClick: handlePayrollClick, value: 'dashboard' },
        { label: 'Run Payroll', onClick: handlePayrollClick, value: 'run-payroll' },
        { label: 'Payroll Transactions', onClick: handlePayrollClick, value: 'transactions' },
        { label: 'Reports', onClick: handlePayrollClick, value: 'reports' },
      ],
    },
    {
      icon: <NavIcons.Receipt className="w-5 h-5" />,
      label: 'Taxes',
      subItems: [
        { label: 'Dashboard', onClick: handleTaxesClick, value: 'taxes-dashboard' },
        { label: 'Sales Tax', onClick: handleTaxesClick, value: 'sales-tax' },
        { label: 'Income Tax', onClick: handleTaxesClick, value: 'income-tax' },
        { label: 'Payroll Tax', onClick: handleTaxesClick, value: 'payroll-tax' },
        { label: 'Tax Payments', onClick: handleTaxesClick, value: 'tax-payments' },
        { label: 'Tax Forms', onClick: handleTaxesClick, value: 'tax-forms' },
        { label: 'Reports', onClick: handleTaxesClick, value: 'tax-reports' },
      ],
    },
    {
      icon: <NavIcons.Reports className="w-5 h-5" />,
      label: 'Reports',
      subItems: [
        { label: 'Dashboard', onClick: handleReportClick, value: 'reports-dashboard' },
        { label: 'Profit & Loss Statement', onClick: handleReportClick, value: 'income_statement' },
        { label: 'Balance Sheet', onClick: handleReportClick, value: 'balance_sheet' },
        { label: 'Cash Flow', onClick: handleReportClick, value: 'cash_flow' },
        { label: 'Sales Tax ', onClick: handleReportClick, value: 'sales_tax_report' },
        { label: 'Payroll Wage Tax', onClick: handleReportClick, value: 'payroll_wage_tax_report' },
        { label: 'Income by Customer', onClick: handleReportClick, value: 'income_by_customer' },
        { label: 'Aged Receivables', onClick: handleReportClick, value: 'aged_receivables' },
        { label: 'Purchases by Vendor', onClick: handleReportClick, value: 'purchases_by_vendor' },
        { label: 'Aged Payables', onClick: handleReportClick, value: 'aged_payables' },
        { label: 'Account Balances', onClick: handleReportClick, value: 'account_balances' },
        { label: 'Trial Balances', onClick: handleReportClick, value: 'trial_balance' },
        { label: 'General Ledger', onClick: handleReportClick, value: 'general_ledger' },
      ],
    },
    {
      icon: <NavIcons.Analytics className="w-5 h-5" />,
      label: 'Analytics',
      subItems: [
        { label: 'Dashboard', onClick: handleAnalysisClick, value: 'analytics-dashboard' },
        { label: 'A.I Query', onClick: handleAnalysisClick, value: 'ai-query' },
      ],
    },
  ];

  // Create a memoized version of menuItems that includes Settings for OWNER/ADMIN
  const finalMenuItems = useMemo(() => {
    const items = [...menuItems];
    
    // Add Settings menu for OWNER and ADMIN users
    if (user && (user.role === 'OWNER' || user.role === 'ADMIN')) {
      items.push({
        icon: <NavIcons.Settings className="w-5 h-5" />,
        label: 'Settings',
        subItems: [
          { 
            label: 'Users', 
            path: '/settings/users',
            onClick: () => {
              if (typeof handleSettingsClick === 'function') {
                handleSettingsClick('users');
              }
            }, 
            value: 'users' 
          },
          ...(user.role === 'OWNER' ? [
            { 
              label: 'Subscription', 
              path: '/settings/subscription',
              onClick: () => {
                if (typeof handleSettingsClick === 'function') {
                  handleSettingsClick('subscription');
                }
              }, 
              value: 'subscription' 
            },
            { 
              label: 'Close Account', 
              path: '/settings/close-account',
              onClick: () => {
                if (typeof handleSettingsClick === 'function') {
                  handleSettingsClick('close-account');
                }
              }, 
              value: 'close-account' 
            }
          ] : [])
        ],
      });
    }
    
    return items;
  }, [user, handleSettingsClick]);

  const createOptions = [
    {
      label: 'Create New',
      description: 'Create a new transaction, invoice, or entity',
      icon: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu) => {
        console.log('Create New button clicked');
        if (isIconOnly) {
          handleDrawerClose();
        }
        // Use handleShowCreateMenu instead of showing a local dropdown
        if (typeof handleShowCreateMenu === 'function') {
          handleShowCreateMenu();
        } else {
          console.error('handleShowCreateMenu is not a function');
        }
      }
    },
    {
      label: 'Transaction',
      description: 'Create a new transaction',
      icon: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Transaction');
        }
      }
    },
    {
      label: 'Product',
      icon: <NavIcons.Inventory className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Product');
        }
      },
      value: 'Product'
    },
    {
      label: 'Service',
      icon: <NavIcons.Receipt className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Service');
        }
      },
      value: 'Service'
    },
    {
      label: 'Invoice',
      icon: <NavIcons.Description className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Invoice');
        }
      },
      value: 'Invoice'
    },
    {
      label: 'Bill',
      icon: <NavIcons.Cart className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Bill');
        }
      },
      value: 'Bill'
    },
    {
      label: 'Estimate',
      icon: <NavIcons.Reports className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Estimate');
        }
      },
      value: 'Estimate'
    },
    {
      label: 'Customer',
      icon: <NavIcons.People className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Customer');
        }
      },
      value: 'Customer'
    },
    {
      label: 'Vendor',
      icon: <NavIcons.Contacts className="w-4 h-4" />,
      onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
        if (typeof handleShowCreateOptions === 'function') {
          handleShowCreateOptions('Vendor');
        }
      },
      value: 'Vendor'
    },
  ];

  // Create a Tailwind CSS based collapsible menu component to replace MUI Collapse
  const CollapsibleMenu = ({ isOpen, children }) => (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
      {children}
    </div>
  );

  // Render the sub-menu using Tailwind instead of MUI components
  const renderSubMenu = (items, parentMenu) => {
    const filteredItems = filterSubItems(items);
    
    if (filteredItems.length === 0) {
      return null;
    }
    
    return (
      <CollapsibleMenu isOpen={openMenu === parentMenu}>
        <ul className="pl-10 mt-1">
          {filteredItems.map((item, index) => (
          <li key={index}>
            <button
              className={`flex items-center w-full text-left px-4 py-2 text-sm rounded-md
                ${hoveredItem === `${parentMenu}-${item.value}` ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150
              `}
              onClick={(event) => {
                if (item.subItems) {
                  handleMenuToggle(item.label);
                } else if (item.onClick && item.value) {
                  // For handlers that take a value parameter
                  if (typeof item.onClick === 'function') {
                    item.onClick(item.value);
                  }
                  // Also update our active item state
                  setActiveItem && setActiveItem(`${parentMenu}-${item.value}`);
                } else if (item.onClick) {
                  // For handlers without parameters
                  if (typeof item.onClick === 'function') {
                    item.onClick();
                  }
                  // Also update our active item state
                  setActiveItem && setActiveItem(item.label);
                }
              }}
              onMouseEnter={() => handleMouseEnter(`${parentMenu}-${item.value}`)}
              onMouseLeave={handleMouseLeave}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </CollapsibleMenu>
    );
  };

  // Listen for navigation events from other components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleNavigationChange = (event) => {
      const { item, navigationKey } = event.detail;
      
      // Update active item if one is provided
      if (item && setActiveItem) {
        console.log(`[listItems] Navigation change detected for ${item}, updating active item`);
        setActiveItem(item);
      }
    };
    
    window.addEventListener('navigationChange', handleNavigationChange);
    
    return () => {
      window.removeEventListener('navigationChange', handleNavigationChange);
    };
  }, [setActiveItem]);
  
  // Listen for drawer state changes to reset menu state when drawer closes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleDrawerStateChange = () => {
      // Close any open menus when drawer state changes
      if (isIconOnly) {
        setOpenMenu('');
        setHoveredItem(null);
      }
    };
    
    window.addEventListener('drawerStateChanged', handleDrawerStateChange);
    
    return () => {
      window.removeEventListener('drawerStateChanged', handleDrawerStateChange);
    };
  }, [isIconOnly]);

  // Function to check if user can see menu item
  const canSeeMenuItem = (item) => {
    // Debug logging for Sales menu
    if (item.label === 'Sales') {
      console.log('[canSeeMenuItem] Sales menu debug:', {
        user: user,
        userRole: user?.role,
        isLoading: isLoading,
        isOwnerOrAdmin: isOwnerOrAdmin(),
        subItemsCount: item.subItems?.length
      });
    }
    
    // If still loading or user is OWNER/ADMIN, show all items
    if (isLoading || isOwnerOrAdmin()) {
      return true;
    }
    
    // Always show create new and dashboard
    if (item.label === 'Create New' || item.label === 'Dashboard') {
      return true;
    }
    
    // For items with subItems, check if user can access any subitem
    if (item.subItems) {
      return item.subItems.some(subItem => {
        if (!subItem.path) return true; // If no path defined, show it
        return canAccessRoute(subItem.path);
      });
    }
    
    // For direct items with paths
    if (item.path) {
      return canAccessRoute(item.path);
    }
    
    // Default to showing the item
    return true;
  };
  
  // Function to filter subItems based on permissions
  const filterSubItems = (subItems) => {
    if (!subItems) return [];
    
    // Debug logging
    console.log('[filterSubItems] Debug:', {
      user: user,
      userRole: user?.role,
      isLoading: isLoading,
      isOwnerOrAdmin: isOwnerOrAdmin(),
      subItemsCount: subItems.length
    });
    
    // If still loading or user is OWNER/ADMIN, show all items
    if (isLoading || isOwnerOrAdmin()) {
      console.log('[filterSubItems] Showing all items - isLoading:', isLoading, 'isOwnerOrAdmin:', isOwnerOrAdmin());
      return subItems;
    }
    
    return subItems.filter(subItem => {
      if (!subItem.path) return true; // If no path defined, show it
      const canAccess = canAccessRoute(subItem.path);
      console.log(`[filterSubItems] Checking ${subItem.label} with path ${subItem.path}: canAccess=${canAccess}`);
      return canAccess;
    });
  };
  
  // Filter menuItems before rendering
  const renderFilteredMenuItem = (item, index) => {
    // Check if user can see this menu item
    if (!canSeeMenuItem(item)) {
      return null;
    }
    return (
      <li
        key={index}
        className={`mb-2 ${isIconOnly ? '' : 'pr-3'}`}
      >
        <button
          className={`flex items-center w-full rounded-md text-left ${
            isIconOnly ? 'justify-center py-3 px-0' : 'px-4 py-2'
          } ${
            hoveredItem === item.label
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          } transition-colors duration-150`}
          onClick={(e) => {
            if (item.subItems) {
              handleMenuToggle(item.label);
            } else if (item.onClick) {
              item.onClick(e);
            }
          }}
          onMouseEnter={() => handleMouseEnter(item.label)}
          onMouseLeave={handleMouseLeave}
        >
          <span className={`${isIconOnly ? '' : 'mr-3'} flex items-center justify-center`}>
            {item.icon}
          </span>
          {!isIconOnly && (
            <span className="flex-1">{item.label}</span>
          )}
          {!isIconOnly && item.subItems && (
            <span className="ml-2">
              {openMenu === item.label ? (
                <NavIcons.ChevronUp className="w-4 h-4" />
              ) : (
                <NavIcons.ChevronDown className="w-4 h-4" />
              )}
            </span>
          )}
        </button>
        {item.subItems && renderSubMenu(item.subItems, item.label)}
      </li>
    );
  };

  return (
    <div className="relative">
      <div
        id="main-menu-container"
        className="w-full h-full overflow-x-hidden overflow-y-auto z-10"
        style={{ borderRight: `${borderRightWidth} solid ${borderRightColor}` }}
      >
        <div
          ref={paperRef}
          className="w-full pt-4 bg-transparent"
          style={{ width: isIconOnly ? '60px' : MENU_WIDTH + 'px' }}
        >
          <nav className="w-full" aria-label="Main Navigation">
            <ul className="w-full space-y-0.5 px-3">
              {finalMenuItems.map((item, index) => renderFilteredMenuItem(item, index))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default MainListItems;