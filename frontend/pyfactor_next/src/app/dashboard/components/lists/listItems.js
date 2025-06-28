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
  SmartBusiness: (props) => (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

// Define createOptions outside the component so it can be exported
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
    label: 'Sales',
    description: 'Record a sale transaction quickly',
    icon: (props) => (
      <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    onClick: (isIconOnly, handleDrawerClose, handleShowCreateMenu, handleShowCreateOptions) => {
      if (typeof handleShowCreateOptions === 'function') {
        handleShowCreateOptions('Sales');
      }
    },
    value: 'Sales'
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
  
  // Debug logging for permissions hook
  useEffect(() => {
    console.log('[MainListItems] usePermissions hook data:', {
      user: user,
      userRole: user?.role,
      isLoading: isLoading,
      isOwnerOrAdmin: isOwnerOrAdmin(),
      canAccessRoute: typeof canAccessRoute
    });
  }, [user, isLoading]);
  

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
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for payments dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payments-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'payments-dashboard' 
        },
        { 
          label: 'Receive Payments', 
          onClick: (value) => {
            // Create navigation event for receive payments
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'receive-payments', 
              navigationKey,
              originalItem: 'Receive Payments'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'receive-payments' 
        },
        { 
          label: 'Make Payments', 
          onClick: (value) => {
            // Create navigation event for make payments
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'make-payments', 
              navigationKey,
              originalItem: 'Make Payments'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'make-payments' 
        },
        { 
          label: 'Payment Methods', 
          onClick: (value) => {
            // Create navigation event for payment methods
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payment-methods', 
              navigationKey,
              originalItem: 'Payment Methods'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'payment-methods' 
        },
        { 
          label: 'Recurring Payments', 
          onClick: (value) => {
            // Create navigation event for recurring payments
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'recurring-payments', 
              navigationKey,
              originalItem: 'Recurring Payments'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'recurring-payments' 
        },
        { 
          label: 'Refunds', 
          onClick: (value) => {
            // Create navigation event for refunds
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'refunds', 
              navigationKey,
              originalItem: 'Refunds'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'refunds' 
        },
        { 
          label: 'Payment Reconciliation', 
          onClick: (value) => {
            // Create navigation event for payment reconciliation
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payment-reconciliation', 
              navigationKey,
              originalItem: 'Payment Reconciliation'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'payment-reconciliation' 
        },
        { 
          label: 'Payment Gateways', 
          onClick: (value) => {
            // Create navigation event for payment gateways
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payment-gateways', 
              navigationKey,
              originalItem: 'Payment Gateways'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'payment-gateways' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for payment reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payment-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Note: Removed handlePaymentsClick call to prevent double navigation
            // The menuNavigation event handler in DashboardContent will handle the view update
          }, 
          value: 'payment-reports' 
        },
      ],
    },
    {
      icon: <NavIcons.Cart className="w-5 h-5" />,
      label: 'Purchases',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for purchases dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'purchases-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PurchasesDashboard component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('dashboard');
            }
          }, 
          value: 'dashboard' 
        },
        { 
          label: 'Vendors', 
          onClick: (value) => {
            // Create navigation event for vendor management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'vendor-management', 
              navigationKey,
              originalItem: 'Vendors'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the VendorManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('vendors');
            }
          }, 
          value: 'vendors' 
        },
        { 
          label: 'Purchase Orders', 
          onClick: (value) => {
            // Create navigation event for purchase order management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'purchase-order-management', 
              navigationKey,
              originalItem: 'Purchase Orders'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PurchaseOrderManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('purchase-orders');
            }
          }, 
          value: 'purchase-orders' 
        },
        { 
          label: 'Bills', 
          onClick: (value) => {
            // Create navigation event for bills management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'bill-management', 
              navigationKey,
              originalItem: 'Bills'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BillManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('bills');
            }
          }, 
          value: 'bills' 
        },
        { 
          label: 'Expenses', 
          onClick: (value) => {
            // Create navigation event for expenses management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'expenses-management', 
              navigationKey,
              originalItem: 'Expenses'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the ExpensesManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('expenses');
            }
          }, 
          value: 'expenses' 
        },
        { 
          label: 'Purchase Returns', 
          onClick: (value) => {
            // Create navigation event for purchase returns management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'purchase-returns-management', 
              navigationKey,
              originalItem: 'Purchase Returns'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PurchaseReturnsManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('purchase-returns');
            }
          }, 
          value: 'purchase-returns' 
        },
        { 
          label: 'Procurement', 
          onClick: (value) => {
            // Create navigation event for procurement management
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'procurement-management', 
              navigationKey,
              originalItem: 'Procurement'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the ProcurementManagement component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('procurement');
            }
          }, 
          value: 'procurement' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for purchases reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'purchases-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PurchasesReports component
            if (typeof handlePurchasesClick === 'function') {
              handlePurchasesClick('reports');
            }
          }, 
          value: 'reports' 
        },
      ],
    },
    {
      icon: <NavIcons.Bank className="w-5 h-5" />,
      label: 'Accounting',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for accounting dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'accounting-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the AccountingDashboard component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('dashboard');
            }
          }, 
          value: 'dashboard' 
        },
        { 
          label: 'Chart of Accounts', 
          onClick: (value) => {
            // Create navigation event for chart of accounts
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'chart-of-accounts', 
              navigationKey,
              originalItem: 'Chart of Accounts'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the ChartOfAccounts component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('chart-of-accounts');
            }
          }, 
          value: 'chart-of-accounts' 
        },
        { 
          label: 'Journal Entries', 
          onClick: (value) => {
            // Create navigation event for journal entries
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'journal-entries', 
              navigationKey,
              originalItem: 'Journal Entries'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the JournalEntries component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('journal-entries');
            }
          }, 
          value: 'journal-entries' 
        },
        { 
          label: 'General Ledger', 
          onClick: (value) => {
            // Create navigation event for general ledger
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'general-ledger', 
              navigationKey,
              originalItem: 'General Ledger'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the GeneralLedger component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('general-ledger');
            }
          }, 
          value: 'general-ledger' 
        },
        { 
          label: 'Reconciliation', 
          onClick: (value) => {
            // Create navigation event for reconciliation
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'reconciliation', 
              navigationKey,
              originalItem: 'Reconciliation'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the Reconciliation component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('reconciliation');
            }
          }, 
          value: 'reconciliation' 
        },
        {
          label: 'Financial Statements',
          onClick: (value) => {
            // Create navigation event for financial statements
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'financial-statements', 
              navigationKey,
              originalItem: 'Financial Statements'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the FinancialStatements component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('financial-statements');
            }
          },
          value: 'financial-statements',
        },
        { 
          label: 'Fixed Assets', 
          onClick: (value) => {
            // Create navigation event for fixed assets
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'fixed-assets', 
              navigationKey,
              originalItem: 'Fixed Assets'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the FixedAssets component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('fixed-assets');
            }
          }, 
          value: 'fixed-assets' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for accounting reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'accounting-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the AccountingReports component
            if (typeof handleAccountingClick === 'function') {
              handleAccountingClick('reports');
            }
          }, 
          value: 'reports' 
        },
      ],
    },
    {
      icon: <NavIcons.Wallet className="w-5 h-5" />,
      label: 'Banking',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for banking dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'banking-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankingDashboard component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('dashboard');
            }
          }, 
          value: 'dashboard' 
        },
        { 
          label: 'Connect to Bank', 
          onClick: (value) => {
            // Create navigation event for bank connection
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'bank-connect', 
              navigationKey,
              originalItem: 'Connect to Bank'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankConnect component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('connect');
            }
          }, 
          value: 'connect' 
        },
        { 
          label: 'Bank Transactions', 
          onClick: (value) => {
            // Create navigation event for bank transactions
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'bank-transactions', 
              navigationKey,
              originalItem: 'Bank Transactions'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankTransactions component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('transactions');
            }
          }, 
          value: 'transactions' 
        },
        { 
          label: 'Bank Reconciliation', 
          onClick: (value) => {
            // Create navigation event for bank reconciliation
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'bank-reconciliation', 
              navigationKey,
              originalItem: 'Bank Reconciliation'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankReconciliation component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('reconciliation');
            }
          }, 
          value: 'reconciliation' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for banking reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'banking-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankingReports component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('bank-reports');
            }
          }, 
          value: 'bank-reports' 
        },
        { 
          label: 'Banking Tools', 
          onClick: (value) => {
            // Create navigation event for banking tools
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'banking-tools', 
              navigationKey,
              originalItem: 'Banking Tools'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BankingTools component
            if (typeof handleBankingClick === 'function') {
              handleBankingClick('tools');
            }
          }, 
          value: 'tools' 
        },
      ],
    },
    {
      icon: <NavIcons.People className="w-5 h-5" />,
      label: 'HR',
      subItems: [
        { label: 'Dashboard', onClick: handleHRClick, value: 'dashboard', path: '/dashboard/hr' },
        { label: 'Employees', onClick: handleHRClick, value: 'employees', path: '/dashboard/employees' },
        { label: 'Timesheets', onClick: handleHRClick, value: 'timesheets', path: '/dashboard/timesheets' },
        { label: 'Pay', onClick: handleHRClick, value: 'pay', path: '/dashboard/pay' },
        { label: 'Benefits', onClick: handleHRClick, value: 'benefits', path: '/dashboard/benefits' },
        { label: 'Reports', onClick: handleHRClick, value: 'reports', path: '/dashboard/reports' },
        { label: 'Performance', onClick: handleHRClick, value: 'performance', path: '/dashboard/performance' },
      ],
    },
    {
      icon: <NavIcons.Payments className="w-5 h-5" />,
      label: 'Payroll',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for payroll dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payroll-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PayrollDashboard component
            if (typeof handlePayrollClick === 'function') {
              handlePayrollClick('dashboard');
            }
          }, 
          value: 'dashboard' 
        },
        { 
          label: 'Run Payroll', 
          onClick: (value) => {
            // Create navigation event for run payroll
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'run-payroll', 
              navigationKey,
              originalItem: 'Run Payroll'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the RunPayroll component
            if (typeof handlePayrollClick === 'function') {
              handlePayrollClick('run-payroll');
            }
          }, 
          value: 'run-payroll' 
        },
        { 
          label: 'Payroll Transactions', 
          onClick: (value) => {
            // Create navigation event for payroll transactions
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payroll-transactions', 
              navigationKey,
              originalItem: 'Payroll Transactions'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PayrollTransactions component
            if (typeof handlePayrollClick === 'function') {
              handlePayrollClick('transactions');
            }
          }, 
          value: 'transactions' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for payroll reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payroll-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PayrollReports component
            if (typeof handlePayrollClick === 'function') {
              handlePayrollClick('reports');
            }
          }, 
          value: 'reports' 
        },
      ],
    },
    {
      icon: <NavIcons.Receipt className="w-5 h-5" />,
      label: 'Taxes',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for taxes dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'taxes-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the TaxesDashboard component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('taxes-dashboard');
            }
          }, 
          value: 'taxes-dashboard' 
        },
        { 
          label: 'Sales Tax', 
          onClick: (value) => {
            // Create navigation event for sales tax
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'sales-tax', 
              navigationKey,
              originalItem: 'Sales Tax'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the SalesTax component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('sales-tax');
            }
          }, 
          value: 'sales-tax' 
        },
        { 
          label: 'Income Tax', 
          onClick: (value) => {
            // Create navigation event for income tax
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'income-tax', 
              navigationKey,
              originalItem: 'Income Tax'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the IncomeTax component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('income-tax');
            }
          }, 
          value: 'income-tax' 
        },
        { 
          label: 'Payroll Tax', 
          onClick: (value) => {
            // Create navigation event for payroll tax
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payroll-tax', 
              navigationKey,
              originalItem: 'Payroll Tax'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PayrollTax component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('payroll-tax');
            }
          }, 
          value: 'payroll-tax' 
        },
        { 
          label: 'Tax Payments', 
          onClick: (value) => {
            // Create navigation event for tax payments
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'tax-payments', 
              navigationKey,
              originalItem: 'Tax Payments'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the TaxPayments component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('tax-payments');
            }
          }, 
          value: 'tax-payments' 
        },
        { 
          label: 'Tax Forms', 
          onClick: (value) => {
            // Create navigation event for tax forms
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'tax-forms', 
              navigationKey,
              originalItem: 'Tax Forms'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the TaxForms component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('tax-forms');
            }
          }, 
          value: 'tax-forms' 
        },
        { 
          label: 'Reports', 
          onClick: (value) => {
            // Create navigation event for tax reports
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'tax-reports', 
              navigationKey,
              originalItem: 'Reports'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the TaxReports component
            if (typeof handleTaxesClick === 'function') {
              handleTaxesClick('tax-reports');
            }
          }, 
          value: 'tax-reports' 
        },
      ],
    },
    {
      icon: <NavIcons.Reports className="w-5 h-5" />,
      label: 'Reports',
      subItems: [
        { 
          label: 'Dashboard', 
          onClick: (value) => {
            // Create navigation event for reports dashboard
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'reports-dashboard', 
              navigationKey,
              originalItem: 'Dashboard'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the ReportsDashboard component
            if (typeof handleReportClick === 'function') {
              handleReportClick('reports-dashboard');
            }
          }, 
          value: 'reports-dashboard' 
        },
        { 
          label: 'Profit & Loss Statement', 
          onClick: (value) => {
            // Create navigation event for income statement
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'income-statement', 
              navigationKey,
              originalItem: 'Profit & Loss Statement'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the IncomeStatement component
            if (typeof handleReportClick === 'function') {
              handleReportClick('income_statement');
            }
          }, 
          value: 'income_statement' 
        },
        { 
          label: 'Balance Sheet', 
          onClick: (value) => {
            // Create navigation event for balance sheet
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'balance-sheet', 
              navigationKey,
              originalItem: 'Balance Sheet'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the BalanceSheet component
            if (typeof handleReportClick === 'function') {
              handleReportClick('balance_sheet');
            }
          }, 
          value: 'balance_sheet' 
        },
        { 
          label: 'Cash Flow', 
          onClick: (value) => {
            // Create navigation event for cash flow
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'cash-flow', 
              navigationKey,
              originalItem: 'Cash Flow'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the CashFlow component
            if (typeof handleReportClick === 'function') {
              handleReportClick('cash_flow');
            }
          }, 
          value: 'cash_flow' 
        },
        { 
          label: 'Sales Tax ', 
          onClick: (value) => {
            // Create navigation event for sales tax report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'sales-tax-report', 
              navigationKey,
              originalItem: 'Sales Tax'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the SalesTaxReport component
            if (typeof handleReportClick === 'function') {
              handleReportClick('sales_tax_report');
            }
          }, 
          value: 'sales_tax_report' 
        },
        { 
          label: 'Payroll Wage Tax', 
          onClick: (value) => {
            // Create navigation event for payroll wage tax report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'payroll-wage-tax-report', 
              navigationKey,
              originalItem: 'Payroll Wage Tax'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PayrollWageTaxReport component
            if (typeof handleReportClick === 'function') {
              handleReportClick('payroll_wage_tax_report');
            }
          }, 
          value: 'payroll_wage_tax_report' 
        },
        { 
          label: 'Income by Customer', 
          onClick: (value) => {
            // Create navigation event for income by customer report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'income-by-customer', 
              navigationKey,
              originalItem: 'Income by Customer'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the IncomeByCustomer component
            if (typeof handleReportClick === 'function') {
              handleReportClick('income_by_customer');
            }
          }, 
          value: 'income_by_customer' 
        },
        { 
          label: 'Aged Receivables', 
          onClick: (value) => {
            // Create navigation event for aged receivables report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'aged-receivables', 
              navigationKey,
              originalItem: 'Aged Receivables'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the AgedReceivables component
            if (typeof handleReportClick === 'function') {
              handleReportClick('aged_receivables');
            }
          }, 
          value: 'aged_receivables' 
        },
        { 
          label: 'Purchases by Vendor', 
          onClick: (value) => {
            // Create navigation event for purchases by vendor report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'purchases-by-vendor', 
              navigationKey,
              originalItem: 'Purchases by Vendor'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the PurchasesByVendor component
            if (typeof handleReportClick === 'function') {
              handleReportClick('purchases_by_vendor');
            }
          }, 
          value: 'purchases_by_vendor' 
        },
        { 
          label: 'Aged Payables', 
          onClick: (value) => {
            // Create navigation event for aged payables report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'aged-payables', 
              navigationKey,
              originalItem: 'Aged Payables'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the AgedPayables component
            if (typeof handleReportClick === 'function') {
              handleReportClick('aged_payables');
            }
          }, 
          value: 'aged_payables' 
        },
        { 
          label: 'Account Balances', 
          onClick: (value) => {
            // Create navigation event for account balances report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'account-balances', 
              navigationKey,
              originalItem: 'Account Balances'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the AccountBalances component
            if (typeof handleReportClick === 'function') {
              handleReportClick('account_balances');
            }
          }, 
          value: 'account_balances' 
        },
        { 
          label: 'Trial Balances', 
          onClick: (value) => {
            // Create navigation event for trial balance report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'trial-balance', 
              navigationKey,
              originalItem: 'Trial Balances'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the TrialBalance component
            if (typeof handleReportClick === 'function') {
              handleReportClick('trial_balance');
            }
          }, 
          value: 'trial_balance' 
        },
        { 
          label: 'General Ledger', 
          onClick: (value) => {
            // Create navigation event for general ledger report
            const navigationKey = `nav-${Date.now()}`;
            const payload = { 
              item: 'general-ledger-report', 
              navigationKey,
              originalItem: 'General Ledger'
            };
            
            // Dispatch navigation events
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
            
            // Load the GeneralLedgerReport component
            if (typeof handleReportClick === 'function') {
              handleReportClick('general_ledger');
            }
          }, 
          value: 'general_ledger' 
        },
      ],
    },
    {
      icon: <NavIcons.Analytics className="w-5 h-5" />,
      label: 'Analytics',
      onClick: () => {
        // Create navigation event for analytics dashboard
        const navigationKey = `nav-${Date.now()}`;
        const payload = { 
          item: 'analytics-dashboard', 
          navigationKey,
          originalItem: 'Analytics'
        };
        
        // Dispatch navigation events
        window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
        window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
        
        // Load the AnalyticsDashboard component
        if (typeof handleAnalysisClick === 'function') {
          handleAnalysisClick('analytics-dashboard');
        }
      },
    },
    {
      icon: <NavIcons.SmartBusiness className="w-5 h-5" />,
      label: 'Smart Business',
      onClick: () => {
        // Create navigation event for Smart Business AI
        const navigationKey = `nav-${Date.now()}`;
        const payload = { 
          item: 'smart-business', 
          navigationKey,
          originalItem: 'Smart Business'
        };
        
        // Dispatch navigation events
        window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
        window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
        
        // Load Smart Business component
        if (typeof handleAnalysisClick === 'function') {
          handleAnalysisClick('smart-business');
        }
      },
    },
  ];

  // Use menuItems directly (Settings is in the user dropdown menu)
  const finalMenuItems = menuItems;

  // Create a Tailwind CSS based collapsible menu component to replace MUI Collapse
  const CollapsibleMenu = ({ isOpen, children }) => (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
      {children}
    </div>
  );

  // Render the sub-menu using Tailwind instead of MUI components
  const renderSubMenu = (items, parentMenu) => {
    // For OWNER users, don't filter sub-items at all
    const filteredItems = (user?.role === 'OWNER' || user?.role === 'ADMIN') ? items : filterSubItems(items);
    
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
    
    // If user is OWNER or ADMIN, always show all items
    if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
      return true;
    }
    
    // If still loading, show all items
    if (isLoading) {
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

export { createOptions };
export default MainListItems;