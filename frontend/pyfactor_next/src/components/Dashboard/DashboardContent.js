/**
 * PRIMARY DASHBOARD CONTENT FILE
 * 
 * IMPORTANT: This is the main DashboardContent file that should be used throughout the application.
 * Do not create duplicates or alternative versions of this component.
 * 
 * It is being imported by:
 * - /src/app/[tenantId]/dashboard/page.js
 */

'use client';

import React, { useState, useCallback, useEffect, lazy, Suspense, useMemo } from 'react';
import useClientEffect from '@/hooks/useClientEffect';
import { useStore } from '@/store/authStore';
import { Box, Container, Typography, Alert, Button } from '@/components/ui/TailwindComponents';
import DashAppBar from '../../app/dashboard/components/DashAppBar';
import Drawer from '../../app/dashboard/components/Drawer';
import { logger } from '@/utils/logger';
import ErrorBoundary from '../../app/dashboard/components/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import renderForm from '../../app/dashboard/components/RenderForm';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { fetchAuthSession } from '@aws-amplify/auth';
import { NotificationProvider, useNotification } from '@/context/NotificationContext';
import useEnsureTenant from '@/hooks/useEnsureTenant';
import { useAuth } from '@/hooks/auth';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import DashboardLoader from '@/components/DashboardLoader';

// Lazy load components to reduce initial memory usage
const RenderMainContent = lazy(() =>
  import('../../app/dashboard/components/RenderMainContent').then(module => ({
    default: module.default
  }))
);

// Use DashboardLoader for loading component
const LoadingComponent = () => <DashboardLoader message="Loading dashboard components..." />;

function DashboardContent({ setupStatus = 'pending', customContent, mockData, userAttributes, tenantId: propTenantId }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const { tenantStatus, tenantError, tenantId: hookTenantId, retry } = useEnsureTenant();
  // Use prop tenant ID if available, otherwise use the one from the hook
  const effectiveTenantId = propTenantId || hookTenantId;
  const [tenantSetupAttempted, setTenantSetupAttempted] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [actualSetupStatus, setActualSetupStatus] = useState(setupStatus || 'pending');
  // Add ref for main content
  const mainContentRef = React.useRef(null);
  // Add state for window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Initialize user data with userAttributes from props if available
  const [initialUserData] = useState(() => {
    if (userAttributes) {
      return {
        email: userAttributes.email,
        name: userAttributes.name,
        phone_number: userAttributes.phone_number,
        sub: userAttributes.sub,
        businessName: userAttributes['custom:businessname'],
        businessType: userAttributes['custom:businesstype'],
        ...userAttributes
      };
    }
    return null;
  });

  // Watch for props changes
  useEffect(() => {
    if (setupStatus && setupStatus !== actualSetupStatus) {
      setActualSetupStatus(setupStatus);
    }
  }, [setupStatus, actualSetupStatus]);

  // Use a single state object for UI visibility flags to reduce memory overhead
  const [uiState, setUiState] = useState({
    // Menu state
    anchorEl: null,
    settingsAnchorEl: null,
    drawerOpen: true,
    
    // User data
    userData: initialUserData,
    
    // Current view
    view: 'customerList',
    
    // Selected items
    selectedOption: null,
    selectedReport: null,
    selectedInvoiceId: null,
    selectedCustomer: null,
    selectedInvoice: null,
    selectedCustomerId: null,
    selectedAnalysis: null,
    selectedSettingsOption: null,
    
    // Data collections
    products: [],
    services: [],
    
    // Section visibility - these are grouped by category
    // to reduce the number of state updates
    showKPIDashboard: false,
    showMainDashboard: false,
    showHome: true, // Show Home page by default,
    showInventoryItems: false, // Added for inventory items
    showInventoryManagement: false, // Added for inventory management
    
    // HR section visibility
    showHRDashboard: false,
    showEmployeeManagement: false,
    hrSection: 'dashboard',
    
    // Form visibility
    showForm: false,
    formOption: null,
    showCreateOptions: false, // Added for Create New menu functionality
    
    // User menu options visibility
    showMyAccount: false,
    showHelpCenter: false,
    
    // Create menu visibility
    showCreateMenu: false,
  });
  
  // Destructure state for easier access
  const {
    anchorEl, settingsAnchorEl, drawerOpen, userData, view,
    selectedOption, selectedReport, selectedInvoiceId, selectedCustomer,
    selectedInvoice, selectedCustomerId, selectedAnalysis, selectedSettingsOption,
    products, services, showKPIDashboard, showMainDashboard, showHome,
    showInventoryItems, showInventoryManagement, showForm, formOption,
    showHRDashboard, showEmployeeManagement, hrSection, showMyAccount, showHelpCenter,
    showCreateMenu, showCreateOptions
  } = uiState;
  
  // Computed values - memoize these values
  const openMenu = Boolean(anchorEl);
  const settingsMenuOpen = Boolean(settingsAnchorEl);
  
  // Create optimized state setter that uses functional updates to prevent unnecessary renders
  const updateState = useCallback((updates) => {
    setUiState(prev => {
      // Check if any values are actually changing to prevent unnecessary renders
      const hasChanges = Object.entries(updates).some(
        ([key, value]) => prev[key] !== value
      );
      
      // If no changes, return the previous state reference to avoid a re-render
      if (!hasChanges) return prev;
      
      // Otherwise, apply the updates
      return { ...prev, ...updates };
    });
  }, []);
  
  // Memoize commonly used callbacks
  const setAnchorEl = useCallback((value) => {
    if (value === uiState.anchorEl) return; // Skip update if unchanged
    updateState({ anchorEl: value });
  }, [updateState, uiState.anchorEl]);
  
  const setSettingsAnchorEl = useCallback((value) => {
    if (value === uiState.settingsAnchorEl) return; // Skip update if unchanged
    updateState({ settingsAnchorEl: value });
  }, [updateState, uiState.settingsAnchorEl]);
  
  const setDrawerOpen = useCallback((value) => {
    if (value === uiState.drawerOpen) return; // Skip update if unchanged
    updateState({ drawerOpen: value });
  }, [updateState, uiState.drawerOpen]);
  
  const setUserData = useCallback((value) => {
    updateState({ userData: value });
  }, [updateState]);
  
  const setView = useCallback((value) => {
    if (value === uiState.view) return; // Skip update if unchanged
    updateState({ view: value });
  }, [updateState, uiState.view]);
  
  const setShowKPIDashboard = useCallback((value) => {
    if (value === uiState.showKPIDashboard) return; // Skip update if unchanged
    updateState({ showKPIDashboard: value });
  }, [updateState, uiState.showKPIDashboard]);
  
  const setShowMainDashboard = useCallback((value) => {
    if (value === uiState.showMainDashboard) return; // Skip update if unchanged
    updateState({ showMainDashboard: value });
  }, [updateState, uiState.showMainDashboard]);
  
  const setShowHome = useCallback((value) => {
    if (value === uiState.showHome) return; // Skip update if unchanged
    updateState({ showHome: value });
  }, [updateState, uiState.showHome]);
  
  const setShowForm = useCallback((value) => {
    if (value === uiState.showForm) return; // Skip update if unchanged
    updateState({ showForm: value });
  }, [updateState, uiState.showForm]);
  
  const setFormOption = useCallback((value) => {
    if (value === uiState.formOption) return; // Skip update if unchanged
    updateState({ formOption: value });
  }, [updateState, uiState.formOption]);
  
  const setShowMyAccount = useCallback((value) => {
    if (value === uiState.showMyAccount) return; // Skip update if unchanged
    updateState({ showMyAccount: value });
  }, [updateState, uiState.showMyAccount]);
  
  const setShowHelpCenter = useCallback((value) => {
    if (value === uiState.showHelpCenter) return; // Skip update if unchanged
    updateState({ showHelpCenter: value });
  }, [updateState, uiState.showHelpCenter]);
  
  const setSelectedSettingsOption = useCallback((value) => {
    if (value === uiState.selectedSettingsOption) return; // Skip update if unchanged
    updateState({ selectedSettingsOption: value });
  }, [updateState, uiState.selectedSettingsOption]);
  
  const setShowCreateMenu = useCallback((value) => {
    if (value === uiState.showCreateMenu) return; // Skip update if unchanged
    updateState({ showCreateMenu: value });
  }, [updateState, uiState.showCreateMenu]);
  
  // Simplified reset state function with equality check to prevent unnecessary updates
  const resetAllStates = useCallback(() => {
    // Reset all view states to false except for the ones we want to keep
    const resetState = {
      showKPIDashboard: false,
      showMainDashboard: false,
      showHome: false,
      showInventoryItems: false,
      showInventoryManagement: false,
      showForm: false,
      formOption: null,
      // Keep other state values
      anchorEl: null,
      settingsAnchorEl: null,
      showHRDashboard: false,
      showEmployeeManagement: false,
      hrSection: 'dashboard',
      showMyAccount: false,
      showHelpCenter: false,
      showCreateMenu: false,
    };
    
    updateState(resetState);
  }, [updateState]);

  const drawerWidth = 260; // Match the increased width in Drawer.js
  const iconOnlyWidth = 60; // Width when showing only icons

  // Basic event handlers that need to be defined - memoize all handlers
  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, [setAnchorEl]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  const handleCloseCreateMenu = useCallback(() => {
    setShowCreateMenu(false);
  }, [setShowCreateMenu]);

  const handleDrawerItemClick = useCallback((option) => {
    console.log(`Drawer item clicked: ${option}`);
    
    // Reset states first
    resetAllStates();
    
    // Handle different navigation options
    switch(option) {
      case 'home':
        setShowHome(true);
        break;
      case 'main-dashboard':
        setShowMainDashboard(true);
        break;
      case 'kpi-dashboard':
        setShowKPIDashboard(true);
        break;
      default:
        // For other options, update the view directly
        setView(option);
    }
  }, [resetAllStates, setShowHome, setShowMainDashboard, setShowKPIDashboard, setView]);

  const handleHomeClick = useCallback(() => {
    resetAllStates();
    setShowHome(true);
  }, [resetAllStates, setShowHome]);

  const handleHRClick = useCallback((value) => {
    resetAllStates();
    console.log('HR option selected:', value);
    
    switch(value) {
      case 'dashboard':
        updateState({ showHRDashboard: true, hrSection: 'dashboard' });
        break;
      case 'employees':
        updateState({ showEmployeeManagement: true });
        break;
      case 'timesheets':
        updateState({ showTimesheetManagement: true });
        break;
      case 'taxes':
        updateState({ showTaxManagement: true });
        break;
      case 'benefits':
        updateState({ showBenefitsManagement: true });
        break;
      case 'reports':
        updateState({ showReportsManagement: true });
        break;
      case 'performance':
        updateState({ showPerformanceManagement: true });
        break;
      default:
        updateState({ showHRDashboard: true, hrSection: 'dashboard' });
    }
  }, [resetAllStates, updateState]);

  const handleInventoryClick = useCallback(() => {
    resetAllStates();
    updateState({ showInventoryManagement: true });
  }, [resetAllStates, updateState]);

  const handleShowCreateOptions = useCallback((option) => {
    if (option === selectedOption && showCreateOptions) return; // Skip if no change
    
    resetAllStates();
    updateState({ 
      showCreateOptions: true,
      selectedOption: option 
    });
  }, [resetAllStates, updateState, selectedOption, showCreateOptions]);

  const handleShowCreateMenu = useCallback(() => {
    setShowCreateMenu(true);
  }, [setShowCreateMenu]);

  const handleMenuItemClick = useCallback((option) => {
    handleCloseCreateMenu();
    handleShowCreateOptions(option);
  }, [handleCloseCreateMenu, handleShowCreateOptions]);

  const handleUserProfileClick = useCallback(() => {
    resetAllStates();
    setShowMyAccount(true);
    handleClose();
  }, [resetAllStates, setShowMyAccount, handleClose]);

  const handleSettingsClick = useCallback(() => {
    resetAllStates();
    setSelectedSettingsOption('general');
    handleClose();
  }, [resetAllStates, setSelectedSettingsOption, handleClose]);

  const handleHelpClick = useCallback(() => {
    setShowHelpCenter(true);
    handleClose();
  }, [setShowHelpCenter, handleClose]);

  const handlePrivacyClick = useCallback(() => {
    window.open('/privacy', '_blank');
    handleClose();
  }, [handleClose]);

  const handleTermsClick = useCallback(() => {
    window.open('/terms', '_blank');
    handleClose();
  }, [handleClose]);

  const handleSignOut = useCallback(() => {
    if (logout) {
      logout();
    }
    router.push('/');
  }, [logout, router]);

  // Enhanced handleDrawerToggle with logging
  const handleDrawerToggleWithLogging = useCallback(() => {
    const newState = !drawerOpen;
    console.log(`%c[ComponentsDashboard] Toggling drawer: ${drawerOpen ? 'OPEN' : 'CLOSED'} → ${newState ? 'OPEN' : 'CLOSED'}`, 'background: #dbeafe; color: #1e40af; padding: 2px 4px; border-radius: 2px;');
    setDrawerOpen(newState);
  }, [drawerOpen, setDrawerOpen]);

  // Add the handleEmployeeManagementClick function
  const handleEmployeeManagementClick = useCallback(() => {
    console.log('[DashboardContent] handleEmployeeManagementClick called');
    resetAllStates();
    updateState({
      showEmployeeManagement: true
    });
    console.log('[DashboardContent] Employee Management clicked');
  }, [resetAllStates, updateState]);

  // Add the handleCRMClick function
  const handleCRMClick = useCallback((option) => {
    console.log('[DashboardContent] handleCRMClick called with option:', option);
    resetAllStates();
    // Set view to the correct CRM section format that RenderMainContent expects
    setView(`crm-${option}`);
  }, [resetAllStates, setView]);

  // Memoize userData to prevent unnecessary re-renders
  const memoizedUserData = useMemo(() => {
    return userData || initialUserData;
  }, [userData, initialUserData]);
  
  // Memoize the main content class to prevent recalculating on every render
  const mainContentClass = useMemo(() => {
    // When drawer is OPEN (expanded): content should be MORE collapsed (smaller width)
    // When drawer is COLLAPSED: content should be MORE expanded (larger width)
    console.log(`%c[ComponentsDashboard] Calculating mainContentClass: drawer ${!drawerOpen ? 'COLLAPSED' : 'EXPANDED'}`, 'background: #f9a8d4; color: #831843; padding: 2px 4px; border-radius: 2px;');
    
    // Detailed logging of measurements
    // When drawer is open, we COLLAPSE the content more by adding extra padding
    const extraCollapsedWidth = drawerWidth + 100; // Add 100px extra to make content more collapsed when drawer is open
    const regularCollapsedWidth = 60; // The width when drawer is collapsed (icon only)
    
    const extraCollapsedMeasurements = `ml-[${drawerWidth}px] w-[calc(100%-${extraCollapsedWidth}px)]`;
    const expandedMeasurements = `ml-[${regularCollapsedWidth}px] w-[calc(100%-${regularCollapsedWidth}px)]`;
    
    console.log(`[ComponentsDashboard] Measurements:`);
    console.log(`  - Drawer Open (Extra Collapsed): ${extraCollapsedMeasurements}`);
    console.log(`  - Drawer Closed (Expanded): ${expandedMeasurements}`);
    
    // When drawer is OPEN, use the extra collapsed measurements (content is narrower)
    // When drawer is COLLAPSED, use the expanded measurements (content is wider)
    return `flex-grow bg-[#F8FAFC] min-h-[calc(100vh-64px)] p-6 transition-all duration-300 ease-in-out z-0 ${
      drawerOpen 
        ? `ml-[${drawerWidth}px] w-[calc(100%-${extraCollapsedWidth}px)]` 
        : `ml-[${regularCollapsedWidth}px] w-[calc(100%-${regularCollapsedWidth}px)]`
    }`;
  }, [drawerOpen, drawerWidth]);
  
  // Memoize DashAppBar props to prevent unnecessary re-renders
  const dashAppBarProps = useMemo(() => ({
    anchorEl,
    settingsAnchorEl,
    openMenu,
    settingsMenuOpen,
    setAnchorEl,
    setSettingsAnchorEl,
    setShowMyAccount,
    setShowHelpCenter,
    userData: memoizedUserData,
    userAttributes,
    setUserData,
    drawerOpen,
    handleDrawerToggle: handleDrawerToggleWithLogging,
    resetAllStates,
    setShowHome,
    setShowCreateMenu,
    showCreateMenu,
    handleClick,
    handleClose,
    handleUserProfileClick,
    handleSettingsClick,
    handleHelpClick,
    handlePrivacyClick,
    handleTermsClick,
    handleLogout: handleSignOut,
    handleCloseCreateMenu,
    handleMenuItemClick,
    setShowForm,
    setFormOption,
    tenantId: effectiveTenantId
  }), [
    anchorEl, settingsAnchorEl, openMenu, settingsMenuOpen, setAnchorEl, setSettingsAnchorEl,
    setShowMyAccount, setShowHelpCenter, memoizedUserData, userAttributes, setUserData, drawerOpen, handleDrawerToggleWithLogging,
    resetAllStates, setShowHome, setShowCreateMenu, showCreateMenu, handleClick, handleClose,
    handleUserProfileClick, handleSettingsClick, handleHelpClick, handlePrivacyClick, handleTermsClick,
    handleSignOut, handleCloseCreateMenu, handleMenuItemClick, setShowForm, setFormOption, effectiveTenantId
  ]);
  
  // Memoize Drawer props
  const drawerProps = useMemo(() => ({
    drawerOpen,
    handleDrawerToggle: handleDrawerToggleWithLogging,
    width: drawerWidth,
    handleDrawerItemClick,
    userData: memoizedUserData,
    resetAllStates,
    handleHomeClick,
    handleHRClick,
    handleInventoryClick,
    handleShowCreateOptions,
    handleShowCreateMenu,
    handleEmployeeManagementClick,
    handleCRMClick
  }), [
    drawerOpen, handleDrawerToggleWithLogging, drawerWidth, handleDrawerItemClick, memoizedUserData,
    resetAllStates, handleHomeClick, handleHRClick, handleInventoryClick,
    handleShowCreateOptions, handleShowCreateMenu, handleEmployeeManagementClick, handleCRMClick
  ]);
  
  // Memoize RenderMainContent props
  const mainContentProps = useMemo(() => ({
    view,
    userData: memoizedUserData,
    showKPIDashboard,
    showMainDashboard,
    showHome,
    handleSetView: setView,
    showForm,
    formOption,
    showHRDashboard,
    hrSection,
    showEmployeeManagement,
    setShowKPIDashboard,
    setShowMainDashboard,
    setSelectedReport: (selectedOption) => updateState({ selectedOption }),
    customContent,
    mockData,
    tenantId: effectiveTenantId,
    showCreateOptions,
    selectedOption,
    showProductManagement: view === 'inventory-products',
    showServiceManagement: view === 'services',
    showInvoiceManagement: view === 'invoices',
    showBillManagement: view === 'bills',
    showEstimateManagement: view === 'estimates',
    showCustomerList: view === 'customers',
    showVendorManagement: view === 'vendors',
    showTransactionForm: view === 'transactions',
    handleCreateCustomer: () => console.log('Create customer flow'),
    showMyAccount,
    showHelpCenter
  }), [
    view, memoizedUserData, showKPIDashboard, showMainDashboard, showHome, setView,
    showForm, formOption, showHRDashboard, hrSection, showEmployeeManagement,
    setShowKPIDashboard, setShowMainDashboard, updateState, customContent, mockData,
    effectiveTenantId, showCreateOptions, selectedOption, showMyAccount, showHelpCenter
  ]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <DashAppBar {...dashAppBarProps} />
            <div className="flex flex-grow pt-16 relative">
              <Drawer {...drawerProps} />
              
              <div 
                ref={mainContentRef}
                style={{
                  position: 'absolute',
                  top: '64px',
                  left: drawerOpen ? `${drawerWidth}px` : '60px',
                  right: '0',
                  width: 'auto',
                  minHeight: 'calc(100vh - 64px)',
                  backgroundColor: '#F8FAFC',
                  padding: '24px',
                  transition: 'all 300ms ease-in-out',
                  zIndex: '0'
                }}
              >
                <Suspense fallback={<LoadingComponent />}>
                  <RenderMainContent {...mainContentProps} />
                </Suspense>
              </div>
            </div>
          </div>
        </ToastProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

// Wrap DashboardContent with memo to prevent re-renders when props don't change
const MemoizedDashboardContent = React.memo(DashboardContent);

// Wrap DashboardContent with export for reuse
export default function Dashboard({ newAccount, plan, mockData, setupStatus, userAttributes, tenantId, children }) {
  return (
    <NotificationProvider>
      <ToastProvider>
        <Suspense fallback={<DashboardLoader message="Loading dashboard content..." />}>
          <ErrorBoundary>
            <MemoizedDashboardContent 
              setupStatus={setupStatus}
              mockData={mockData}
              userAttributes={userAttributes}
              tenantId={tenantId}
              newAccount={newAccount}
              plan={plan}
              customContent={children}
            />
          </ErrorBoundary>
        </Suspense>
      </ToastProvider>
    </NotificationProvider>
  );
} 