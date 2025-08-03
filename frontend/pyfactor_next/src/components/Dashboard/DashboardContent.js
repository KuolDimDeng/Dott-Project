'use client';

/**
 * PRIMARY DASHBOARD CONTENT FILE
 * 
 * IMPORTANT: This is the main DashboardContent file that should be used throughout the application.
 * Do not create duplicates or alternative versions of this component.
 * 
 * It is being imported by:
 * - /src/app/[tenantId]/dashboard/page.js
 */


import React, { useState, useCallback, useEffect, lazy, Suspense, useMemo, useRef } from 'react';
import useClientEffect from '@/hooks/useClientEffect';
import { useStore } from '@/store/authStore';
import { Box, Container, Typography, Alert, Button } from '@/components/ui/TailwindComponents';
import DashAppBar from '@/app/dashboard/components/DashAppBar';
import Drawer from '@/app/dashboard/components/Drawer';
import { logger } from '@/utils/logger';
import ErrorBoundary from '../../app/dashboard/components/ErrorBoundary';
import { useRouter } from 'next/navigation';

// import { getCurrentUser, fetchUserAttributes  } from '@/config/amplifyUnified'; // Removed - no longer using Cognito
import renderForm from '../../app/dashboard/components/RenderForm';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
// import { fetchAuthSession  } from '@/config/amplifyUnified'; // Removed - no longer using Cognito
import { NotificationProvider, useNotification } from '@/context/NotificationContext';
import useEnsureTenant from '@/hooks/useEnsureTenant';
import { useAuth } from '@/hooks/auth';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import DashboardLoader from '@/components/DashboardLoader';
import { ensureAuthProvider } from '@/utils/refreshUserSession';
// POSSystem is no longer needed - we use POSSystemInline in RenderMainContent
import DashboardErrorBoundary from './DashboardErrorBoundary';
import { useSession } from '@/hooks/useSession-v2';

// Lazy load components to reduce initial memory usage
const RenderMainContent = lazy(() =>
  import('../../app/dashboard/components/RenderMainContent').then(module => ({
    default: module.default
  }))
);

// Use DashboardLoader for loading component
const LoadingComponent = () => <DashboardLoader message="Loading dashboard components..." />;

function DashboardContent({ setupStatus = 'pending', customContent, mockData, userAttributes, tenantId: propTenantId }) {
  // CRITICAL DEBUG: Log all props received
  console.log('🚨 [DashboardContent] === COMPONENT RENDER START ===');
  console.log('🚨 [DashboardContent] Props received:', {
    setupStatus,
    hasCustomContent: !!customContent,
    hasMockData: !!mockData,
    hasUserAttributes: !!userAttributes,
    userAttributesKeys: userAttributes ? Object.keys(userAttributes) : 'none',
    propTenantId
  });
  console.log('🚨 [DashboardContent] Full userAttributes:', userAttributes);
  
  let user, isAuthenticated, logout;
  try {
    console.log('🚨 [DashboardContent] About to call useAuth hook...');
    const authResult = useAuth();
    user = authResult.user;
    isAuthenticated = authResult.isAuthenticated;
    logout = authResult.logout;
    console.log('🚨 [DashboardContent] useAuth successful:', { hasUser: !!user, isAuthenticated });
  } catch (authError) {
    console.error('🎯 [DashboardContent] ERROR in useAuth:', authError);
    console.error('Stack:', authError?.stack);
    if (authError?.message?.includes('t is not defined')) {
      console.error('🎯 FOUND "t is not defined" ERROR IN useAuth!');
    }
    // Set default values
    user = null;
    isAuthenticated = false;
    logout = () => {};
  }
  
  let router;
  try {
    console.log('🚨 [DashboardContent] About to call useRouter...');
    router = useRouter();
    console.log('🚨 [DashboardContent] useRouter successful');
  } catch (routerError) {
    console.error('🎯 [DashboardContent] ERROR in useRouter:', routerError);
    console.error('Stack:', routerError?.stack);
    if (routerError?.message?.includes('t is not defined')) {
      console.error('🎯 FOUND "t is not defined" ERROR IN useRouter!');
    }
  }
  
  let showNotification;
  try {
    console.log('🚨 [DashboardContent] About to call useNotification...');
    const notifResult = useNotification();
    showNotification = notifResult.showNotification;
    console.log('🚨 [DashboardContent] useNotification successful');
  } catch (notifError) {
    console.error('🎯 [DashboardContent] ERROR in useNotification:', notifError);
    console.error('Stack:', notifError?.stack);
    if (notifError?.message?.includes('t is not defined')) {
      console.error('🎯 FOUND "t is not defined" ERROR IN useNotification!');
    }
    // Set default value
    showNotification = () => {};
  }
  
  // Performance monitoring for dashboard render
  const renderStartTime = useRef(Date.now());
  
  useEffect(() => {
    try {
      console.error('[DashboardContent] useEffect - Starting dashboard content render');
      const span = Sentry.startSpan({ name: 'dashboard-content-render' });
      const renderTime = Date.now() - renderStartTime.current;
      logger.performance('DashboardContent render', renderTime);
      span.end();
      
      // Set user context for Sentry
      if (user) {
        console.error('[DashboardContent] useEffect - Setting user context:', user);
        Sentry.setUser({
          id: user.id,
          email: user.email,
          tenantId: user.tenant_id,
        });
      }
      
      return () => {
        console.error('[DashboardContent] useEffect - Cleanup');
        span.end();
      };
    } catch (error) {
      console.error('[DashboardContent] ERROR in useEffect:', error);
      console.error('[DashboardContent] Error stack:', error.stack);
    }
  }, [user]);
  const { tenantStatus, tenantError, tenantId: hookTenantId, retry } = useEnsureTenant();
  // Use prop tenant ID if available, otherwise use the one from the hook
  const effectiveTenantId = propTenantId || hookTenantId;
  const [tenantSetupAttempted, setTenantSetupAttempted] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [actualSetupStatus, setActualSetupStatus] = useState(setupStatus || 'pending');
  // Add ref for main content
  const mainContentRef = useRef(null);
  // Add state for window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  // Add navigationKey state to track navigation changes
  const [navigationKey, setNavigationKey] = useState(`initial-${Date.now()}`);

  // Initialize user data with userAttributes from props if available
  const [initialUserData, setInitialUserData] = useState(() => {
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

  // CRITICAL FIX: Add session management to update userData when session loads
  const { session, loading: sessionLoading } = useSession();
  

  // Fetch Auth0 profile data on mount
  useEffect(() => {
    const fetchAuth0Profile = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const profileData = await response.json();
          if (profileData) {
            console.log('[DashboardContent] Auth0 profile data loaded:', profileData);
            setInitialUserData({
              ...profileData,
              email: profileData.email,
              name: profileData.name,
              firstName: profileData.given_name || profileData.firstName,
              lastName: profileData.family_name || profileData.lastName,
              sub: profileData.sub,
              id: profileData.id || profileData.sub,
              businessName: profileData.businessName,
              businessType: profileData.businessType,
              tenantId: profileData.tenantId || profileData.tenant_id
            });
            
            // Also update the uiState userData
            setUiState(prev => ({
              ...prev,
              userData: {
                ...profileData,
                email: profileData.email,
                name: profileData.name,
                firstName: profileData.given_name || profileData.firstName,
                lastName: profileData.family_name || profileData.lastName,
                sub: profileData.sub,
                id: profileData.id || profileData.sub,
                businessName: profileData.businessName,
                businessType: profileData.businessType,
                tenantId: profileData.tenantId || profileData.tenant_id
              }
            }));
          }
        }
      } catch (error) {
        console.error('[DashboardContent] Error fetching Auth0 profile:', error);
      }
    };

    // Only fetch if we don't have user data from props
    if (!userAttributes) {
      fetchAuth0Profile();
    }
  }, [userAttributes]);

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
    drawerOpen: true, // Start with drawer open by default
    
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
    showTaxManagement: false,
    showTaxesDashboard: false,
    showReportsManagement: false,
    showTimesheetManagement: false, // Added for timesheet management
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
    
    // Modal visibility
    showPOSSystem: false,
    
    // Payroll wizard visibility
    showPayrollWizard: false,
  });
  
  // Destructure state for easier access
  const {
    anchorEl, settingsAnchorEl, drawerOpen, userData, view,
    selectedOption, selectedReport, selectedInvoiceId, selectedCustomer,
    selectedInvoice, selectedCustomerId, selectedAnalysis, selectedSettingsOption,
    products, services, showKPIDashboard, showMainDashboard, showHome,
    showInventoryItems, showInventoryManagement, showForm, formOption,
    showHRDashboard, showEmployeeManagement, showTimesheetManagement, hrSection, showMyAccount, showHelpCenter,
    showCreateMenu, showCreateOptions, showBenefitsManagement, showPOSSystem, showPayrollWizard
  } = uiState;
  
  // CRITICAL DEBUG: Log userData state after destructuring
  console.log('🔴 [DashboardContent] === USERDATA STATE DEBUG ===');
  console.log('🔴 [DashboardContent] userData from uiState:', userData);
  console.log('🔴 [DashboardContent] userData type:', typeof userData);
  console.log('🔴 [DashboardContent] userData is null:', userData === null);
  console.log('🔴 [DashboardContent] userData is undefined:', userData === undefined);
  console.log('🔴 [DashboardContent] userData keys:', userData ? Object.keys(userData) : 'userData is falsy');
  console.log('🔴 [DashboardContent] initialUserData:', initialUserData);
  
  // Track showPOSSystem state changes
  useEffect(() => {
    console.log('🎯 [DashboardContent] showPOSSystem state changed to:', showPOSSystem);
    console.log('🎯 [DashboardContent] Full uiState:', {
      showPOSSystem,
      showCreateMenu,
      showCreateOptions,
      selectedOption,
      view
    });
  }, [showPOSSystem]);
  console.log('🔴 [DashboardContent] Full uiState:', uiState);
  
  // Computed values - memoize these values
  const openMenu = Boolean(anchorEl);
  const settingsMenuOpen = Boolean(settingsAnchorEl);
  
  // Create optimized state setter that uses functional updates to prevent unnecessary renders
  const updateState = useCallback((updates) => {
    try {
      console.error('[DashboardContent] updateState called with:', typeof updates === 'function' ? 'function' : updates);
      setUiState(prev => {
        // If updates is a function, call it with prev
        if (typeof updates === 'function') {
          console.error('[DashboardContent] updateState - Calling function update');
          return updates(prev);
        }
        
        // Check if any values are actually changing to prevent unnecessary renders
        const hasChanges = Object.entries(updates).some(
          ([key, value]) => prev[key] !== value
        );
        
        console.error('[DashboardContent] updateState - hasChanges:', hasChanges);
        
        // If no changes, return the previous state reference to avoid a re-render
        if (!hasChanges) return prev;
        
        // Otherwise, apply the updates
        return { ...prev, ...updates };
      });
    } catch (error) {
      console.error('[DashboardContent] ERROR in updateState:', error);
      console.error('[DashboardContent] Error stack:', error.stack);
    }
  }, []);

  // Update userData state when session data is available
  useEffect(() => {
    console.log('🚨 [DashboardContent] === SESSION SYNC DEBUG START ===');
    console.log('🚨 [DashboardContent] Session loading:', sessionLoading);
    console.log('🚨 [DashboardContent] Session object:', session);
    console.log('🚨 [DashboardContent] Session user:', session?.user);
    
    if (session?.user && !sessionLoading) {
      console.log('🚨 [DashboardContent] Updating userData state with session data');
      updateState({ userData: session.user });
    }
    console.log('🚨 [DashboardContent] === SESSION SYNC DEBUG END ===');
  }, [session, sessionLoading, updateState]);

  // Handle clearCreateOptions event
  useEffect(() => {
    const handleClearCreateOptions = () => {
      console.log('[DashboardContent] Clearing create options from event');
      updateState({ 
        showCreateOptions: false,
        selectedOption: null,
        view: 'dashboard'
      });
    };

    window.addEventListener('clearCreateOptions', handleClearCreateOptions);
    
    return () => {
      window.removeEventListener('clearCreateOptions', handleClearCreateOptions);
    };
  }, [updateState]);
  
  // Memoize commonly used callbacks with optimized equality checks
  const setAnchorEl = useCallback((value) => {
    updateState(prev => {
      if (value === prev.anchorEl) return prev; // Skip update if unchanged
      return { ...prev, anchorEl: value };
    });
  }, [updateState]);
  
  const setSettingsAnchorEl = useCallback((value) => {
    updateState(prev => {
      if (value === prev.settingsAnchorEl) return prev; // Skip update if unchanged
      return { ...prev, settingsAnchorEl: value };
    });
  }, [updateState]);
  
  const setDrawerOpen = useCallback((value) => {
    updateState(prev => {
      // Check if value is a function (for functional updates)
      const newValue = typeof value === 'function' ? value(prev.drawerOpen) : value;
      if (newValue === prev.drawerOpen) return prev; // Skip update if unchanged
      return { ...prev, drawerOpen: newValue };
    });
  }, [updateState]);
  
  const setUserData = useCallback((value) => {
    updateState({ userData: value });
  }, [updateState]);
  
  const setView = useCallback((value) => {
    updateState(prev => {
      if (value === prev.view) return prev;
      return { ...prev, view: value };
    });
  }, [updateState]);
  
  const setShowKPIDashboard = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showKPIDashboard) return prev;
      return { ...prev, showKPIDashboard: value };
    });
  }, [updateState]);
  
  const setShowMainDashboard = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showMainDashboard) return prev;
      return { ...prev, showMainDashboard: value };
    });
  }, [updateState]);
  
  const setShowHome = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showHome) return prev;
      return { ...prev, showHome: value };
    });
  }, [updateState]);
  
  const setShowForm = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showForm) return prev;
      return { ...prev, showForm: value };
    });
  }, [updateState]);
  
  const setFormOption = useCallback((value) => {
    updateState(prev => {
      if (value === prev.formOption) return prev;
      return { ...prev, formOption: value };
    });
  }, [updateState]);
  
  const setShowMyAccount = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showMyAccount) return prev;
      return { ...prev, showMyAccount: value };
    });
  }, [updateState]);
  
  const setShowHelpCenter = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showHelpCenter) return prev;
      return { ...prev, showHelpCenter: value };
    });
  }, [updateState]);
  
  const setSelectedSettingsOption = useCallback((value) => {
    updateState(prev => {
      if (value === prev.selectedSettingsOption) return prev;
      return { ...prev, selectedSettingsOption: value };
    });
  }, [updateState]);
  
  const setShowCreateMenu = useCallback((value) => {
    updateState(prev => {
      if (value === prev.showCreateMenu) return prev;
      return { ...prev, showCreateMenu: value };
    });
  }, [updateState]);

  const setShowPOSSystem = useCallback((value) => {
    console.log('🎯 [DashboardContent] setShowPOSSystem called with:', value);
    console.log('🎯 [DashboardContent] Current showPOSSystem state:', uiState.showPOSSystem);
    updateState(prev => {
      console.log('🎯 [DashboardContent] Previous state showPOSSystem:', prev.showPOSSystem);
      if (value === prev.showPOSSystem) {
        console.log('🎯 [DashboardContent] No state change needed, value same as previous');
        return prev;
      }
      console.log('🎯 [DashboardContent] Updating showPOSSystem to:', value);
      return { ...prev, showPOSSystem: value };
    });
  }, [updateState, uiState.showPOSSystem]);

  // Reset all view states for navigation
  const resetAllStates = useCallback(() => {
    console.log('[DashboardContent] Resetting all view states');
    
    // Use a single batch update for better performance
    updateState({
      // Reset menu states
      anchorEl: null,
      settingsAnchorEl: null,
      
      // Reset view states
      view: null,
      showMainDashboard: false,
      showHome: false,
      showForm: false,
      showMyAccount: false,
      showHelpCenter: false,
      showKPIDashboard: false,
      showUserProfileSettings: false,
      
      // Reset form states
      formOption: '',
      selectedSettingsOption: null,
      
      // Reset HR states
      showEmployeeManagement: false,
      showHRDashboard: false,
      showTaxManagement: false,
      showTaxesDashboard: false,
      showTimesheetManagement: false,
      showBenefitsManagement: false,
      showReportsManagement: false,
      showPerformanceManagement: false,
      showPayManagement: false,
      hrSection: 'dashboard',
      
      // Reset Sales states
      showCustomerList: false,
      showProductManagement: false,
      showServiceManagement: false,
      showEstimateManagement: false,
      showSalesOrderManagement: false,
      showInvoiceManagement: false,
      
      // Reset other states
      showCreateOptions: false,
      showInventoryItems: false,
      showInventoryManagement: false,
      selectedReport: null,
      selectedOption: null,
      selectedCustomer: null,
      selectedInvoice: null,
      showCustomerDetails: false,
      
      // Reset modal states
      showPOSSystem: false,
      showCreateMenu: false,
      showPayrollWizard: false,
      isCreating: false,
      isEditing: false
    });
    
    console.log('[DashboardContent] All view states have been reset');
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
    console.log(`[DashboardContent] Drawer item clicked: ${option}`);
    
    // Reset states first - this will close profile view if it's open
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const navKey = `nav-${option}-${Date.now()}`;
    console.log(`[DashboardContent] Setting navigationKey for ${option}: ${navKey}`);
    
    // Handle different navigation options
    switch(option) {
      case 'home':
        updateState({ 
          showHome: true, 
          view: 'home',
          navigationKey: navKey 
        });
        break;
      case 'main-dashboard':
        updateState({ 
          showMainDashboard: true, 
          view: 'main-dashboard',
          navigationKey: navKey 
        });
        break;
      case 'kpi-dashboard':
        updateState({ 
          showKPIDashboard: true, 
          view: 'kpi-dashboard',
          navigationKey: navKey 
        });
        break;
      default:
        // For other options, update the view directly
        updateState({ 
          view: option,
          navigationKey: navKey 
        });
    }
    
    // Also update the navigation key separately to ensure component remounting
    setNavigationKey(navKey);
    
    console.log(`[DashboardContent] Navigation completed for ${option} with key ${navKey}`);
  }, [resetAllStates, updateState, setNavigationKey]);

  // Handle main dashboard click - shows the business overview
  const handleMainDashboardClick = useCallback(() => {
    console.log('[DashboardContent] handleMainDashboardClick called');
    resetAllStates();
    const dashboardNavKey = `dashboard-${Date.now()}`;
    // Set both showMainDashboard and view to ensure proper rendering
    updateState({ 
      showMainDashboard: true,
      view: 'main-dashboard'
    });
    setNavigationKey(dashboardNavKey);
    console.log('[DashboardContent] Set showMainDashboard to true with key:', dashboardNavKey);
  }, [resetAllStates, updateState, setNavigationKey]);

  const handleHomeClick = useCallback(() => {
    console.log('[DashboardContent] handleHomeClick called');
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const homeNavKey = `home-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for home:', homeNavKey);
    
    // Update state to show home view
    updateState({ 
      showHome: true,
      view: 'home',
      navigationKey: homeNavKey
    });
    
    // Also update the navigation key separately to ensure component remounting
    setNavigationKey(homeNavKey);
    
    console.log('[DashboardContent] Navigating to Home view with key', homeNavKey);
  }, [resetAllStates, updateState, setNavigationKey]);

  const handleHRClick = useCallback((value) => {
    console.log('[DashboardContent] HR option selected:', value);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const hrNavKey = `hr-${Date.now()}`;
    
    switch(value) {
      case 'dashboard':
        updateState({ 
          view: 'hr-dashboard',
          navigationKey: hrNavKey
        });
        break;
      case 'employees':
        updateState({ 
          view: 'hr-employees',
          navigationKey: hrNavKey
        });
        break;
      case 'timesheets':
        updateState({ 
          view: 'hr-timesheets',
          navigationKey: hrNavKey
        });
        break;
      case 'pay':
        updateState({ 
          view: 'hr-pay',
          navigationKey: hrNavKey
        });
        break;
      case 'benefits':
        updateState({ 
          view: 'hr-benefits',
          navigationKey: hrNavKey
        });
        break;
      case 'reports':
        updateState({ 
          view: 'hr-reports',
          navigationKey: hrNavKey
        });
        break;
      case 'performance':
        updateState({ 
          view: 'hr-performance',
          navigationKey: hrNavKey
        });
        break;
      default:
        // Default to HR dashboard
        updateState({ 
          view: 'hr-dashboard',
          navigationKey: hrNavKey
        });
    }
    
    console.log(`[DashboardContent] Navigating to HR ${value} with key ${hrNavKey}`);
  }, [resetAllStates, updateState]);

  const handleInventoryClick = useCallback((value) => {
    console.log('[DashboardContent] Inventory option selected:', value);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const inventoryNavKey = `inventory-${value}-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for inventory:', inventoryNavKey);
    
    // For the products view, redirect to our new unified inventory page
    if (value === 'items') {
      window.location.href = '/inventory';
      return;
    }
    
    let newView = '';
    switch(value) {
      case 'inventorydashboard':
        newView = 'inventory-dashboard';
        break;
      case 'stock-adjustments':
        newView = 'inventory-stock-adjustments';
        break;
      case 'locations':
        newView = 'inventory-locations';
        break;
      case 'suppliers':
        console.log('[DashboardContent] Setting view to inventory-suppliers');
        newView = 'inventory-suppliers';
        break;
      case 'products':
        newView = 'inventory-products';
        break;
      case 'supplies':
        console.log('[DashboardContent] Setting view to inventory-supplies');
        newView = 'inventory-supplies';
        break;
      case 'transactions':
        newView = 'inventory-transactions';
        break;
      case 'reports':
        newView = 'inventory-reports';
        break;
      default:
        // If no specific option is selected, show the inventory management page
        updateState({ showInventoryManagement: true });
        return;
    }
    
    // Update state with both the view and navigation key
    updateState({ 
      view: newView,
      navigationKey: inventoryNavKey
    });
    
    // Also update the navigation key separately to ensure component remounting
    setNavigationKey(inventoryNavKey);
    
    console.log(`[DashboardContent] Inventory navigation complete: view=${newView}, key=${inventoryNavKey}`);
  }, [resetAllStates, updateState, setNavigationKey]);

  const handleBankingClick = useCallback((value) => {
    console.log('[DashboardContent] Banking option selected:', value);
    resetAllStates();
    
    switch(value) {
      case 'dashboard':
        updateState({ view: 'banking' });
        break;
      case 'connect':
        updateState({ view: 'connect-bank' });
        break;
      case 'transactions':
        updateState({ view: 'bank-transactions' });
        break;
      case 'reconciliation':
        updateState({ view: 'bank-reconciliation' });
        break;
      case 'bank-reports':
        updateState({ view: 'bank-report' });
        break;
      case 'tools':
        updateState({ view: 'banking-tools' });
        break;
      default:
        // Default to banking dashboard
        updateState({ view: 'banking' });
    }
    
    // Generate a unique navigation key for component remounting
    const bankNavKey = `banking-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for banking:', bankNavKey);
    setNavigationKey(bankNavKey);
    
  }, [resetAllStates, updateState, setNavigationKey]);

  const handleBillingClick = useCallback((option) => {
    console.log('[DashboardContent] handleBillingClick called with option:', option);
    resetAllStates();
    // Set view to the correct billing section
    setView(option || 'invoices');
  }, [resetAllStates, setView]);

  const handleSalesClick = useCallback((value) => {
    console.log('[DashboardContent] Sales option selected:', value);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const salesNavKey = `sales-${Date.now()}`;
    
    switch(value) {
      case 'dashboard':
        updateState({ 
          view: 'sales-dashboard',
          navigationKey: salesNavKey
        });
        break;
      case 'products':
        updateState({ 
          view: 'sales-products',
          showProductManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'services':
        updateState({ 
          view: 'sales-services',
          showServiceManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'customers':
        updateState({ 
          view: 'customers',
          showCustomerList: true,
          navigationKey: salesNavKey
        });
        break;
      case 'estimates':
        updateState({ 
          view: 'estimate-management',
          showEstimateManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'orders':
        updateState({ 
          view: 'order-management',
          showSalesOrderManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'invoices':
        updateState({ 
          view: 'invoice-management',
          showInvoiceManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'reports':
        updateState({ 
          view: 'sales-reports',
          showReports: true,
          selectedReport: 'sales',
          navigationKey: salesNavKey
        });
        break;
      default:
        // Default to sales dashboard
        updateState({ 
          view: 'sales-dashboard',
          navigationKey: salesNavKey
        });
    }
    
    console.log(`[DashboardContent] Navigating to Sales ${value} with key ${salesNavKey}`);
  }, [resetAllStates, updateState]);

  const handleShowCreateOptions = useCallback((option) => {
    console.log('🎯 [DashboardContent] handleShowCreateOptions called with:', option);
    // No special handling for Sales option anymore - it will be rendered inline
    
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
    console.log('[DashboardContent] handleMenuItemClick called with option:', option);
    handleCloseCreateMenu();
    
    // Generate a unique navigation key for smooth transitions
    const navKey = `create-${option.toLowerCase()}-${Date.now()}`;
    
    // Handle navigation without full state reset for better UX
    if (option === 'Product') {
      console.log('[DashboardContent] Navigating to Products management');
      updateState({ 
        view: 'sales-products',
        showProductManagement: true,
        navigationKey: navKey
      });
    } else if (option === 'Service') {
      console.log('[DashboardContent] Navigating to Services management');
      updateState({ 
        view: 'sales-services',
        showServiceManagement: true,
        navigationKey: navKey
      });
    } else if (option === 'Estimate') {
      console.log('[DashboardContent] Navigating to Estimates management');
      updateState({ 
        view: 'estimate-management',
        showEstimateManagement: true,
        navigationKey: navKey
      });
    } else if (option === 'Job') {
      console.log('[DashboardContent] Navigating to Jobs management');
      updateState({ 
        view: 'job-management',
        showJobManagement: true,
        navigationKey: navKey
      });
    } else if (option === 'Customer') {
      console.log('[DashboardContent] Navigating to Customers management');
      updateState({ 
        view: 'customers',
        showCustomerList: true,
        navigationKey: navKey
      });
    } else if (option === 'Sales') {
      console.log('🎯 [DashboardContent] Sales menu clicked - Opening POS System');
      console.log('🎯 [DashboardContent] Current showPOSSystem state:', showPOSSystem);
      setShowPOSSystem(true);
    } else {
      console.log('[DashboardContent] Showing create options for:', option);
      handleShowCreateOptions(option);
    }
  }, [handleCloseCreateMenu, handleShowCreateOptions, updateState]);

  const handleUserProfileClick = useCallback(() => {
    console.log('[DashboardContent] User Profile clicked');
    resetAllStates();
    
    // Force a re-render with a new navigation key
    const newNavKey = `profile-${Date.now()}`;
    console.log(`[DashboardContent] Updating navigationKey to: ${newNavKey}`);
    
    // Use updateState to set all states at once
    updateState({
      showMyAccount: true,
      showHelpCenter: false,
      selectedSettingsOption: null,
      navigationKey: newNavKey
    });
    
    // Also update the navigation key separately to ensure component remounting
    setNavigationKey(newNavKey);
    
    handleClose();
  }, [resetAllStates, updateState, setNavigationKey, handleClose]);

  const handleSettingsClick = useCallback(() => {
    console.log('[DashboardContent] Settings button clicked - Starting Settings navigation');
    try {
      // Reset all other states first
      resetAllStates();
      
      // Force a re-render with a new navigation key
      const newNavKey = `settings-${Date.now()}`;
      console.log(`[DashboardContent] Updating navigationKey to: ${newNavKey}`);
      
      // Use updateState to set all states at once
      updateState({
        showMyAccount: false,
        showHelpCenter: false,
        selectedSettingsOption: 'Settings',
        navigationKey: newNavKey
      });
      
      // Also update the navigation key separately to ensure component remounting
      setNavigationKey(newNavKey);
      
      // Close the menu
      handleClose();
      
      console.log('[DashboardContent] Settings navigation completed');
    } catch (error) {
      console.error('[DashboardContent] Error in handleSettingsClick:', error);
    }
  }, [resetAllStates, updateState, setNavigationKey, handleClose]);

  const handleHelpClick = useCallback(() => {
    console.log('[DashboardContent] Help Center clicked');
    resetAllStates();
    
    // Force a re-render with a new navigation key
    const newNavKey = `help-center-${Date.now()}`;
    console.log(`[DashboardContent] Updating navigationKey to: ${newNavKey}`);
    
    // Use updateState to set all states at once
    updateState({
      showHelpCenter: true,
      navigationKey: newNavKey
    });
    
    // Also update the navigation key separately to ensure component remounting
    setNavigationKey(newNavKey);
    
    handleClose();
  }, [resetAllStates, updateState, setNavigationKey, handleClose]);

  const handlePrivacyClick = useCallback(() => {
    resetAllStates();
    updateState({
      showPrivacyPolicy: true,
      navigationKey: Date.now()
    });
    handleClose();
  }, [resetAllStates, updateState, handleClose]);

  const handleTermsClick = useCallback(() => {
    resetAllStates();
    updateState({
      showTermsAndConditions: true,
      navigationKey: Date.now()
    });
    handleClose();
  }, [resetAllStates, updateState, handleClose]);

  const handleCookieClick = useCallback(() => {
    // For now, we'll open in a new window since cookie policy might not have a dedicated state
    // You can add a setShowCookiePolicy state if needed
    window.open('/cookies', '_blank');
    handleClose();
  }, [handleClose]);

  const handleSignOut = useCallback(() => {
    // **CRITICAL FIX: Use browser redirect instead of XHR to avoid CORS errors**
    console.log('[DashboardContent] Logging out user with Auth0');
    window.location.href = '/api/auth/logout';
  }, []);

  // Handle drawer toggle with improved memory management
  const handleDrawerToggle = useCallback(() => {
    // Toggle the drawer state
    setDrawerOpen(prev => !prev);
  }, [setDrawerOpen]);

  // Handle specific click for employee management for direct access
  const handleEmployeeManagementClick = useCallback(() => {
    console.log('[DashboardContent] Employee Management directly clicked');
    resetAllStates();
    updateState({
      showHome: false,
      showKPIDashboard: false,
      showMainDashboard: false,
      showInventoryItems: false,
      showInventoryManagement: false,
      showHRDashboard: false,
      showEmployeeManagement: true,
      hrSection: 'employees'
    });
  }, [updateState, resetAllStates]);

  // Add the handleCRMClick function
  const handleCRMClick = useCallback((option) => {
    console.log('[DashboardContent] handleCRMClick called with option:', option);
    resetAllStates();
    // Set view to the correct CRM section format that RenderMainContent expects
    setView(`crm-${option}`);
  }, [resetAllStates, setView]);

  // Add the handleTaxesClick function
  const handleTaxesClick = useCallback((option) => {
    console.log('[DashboardContent] handleTaxesClick called with option:', option);
    resetAllStates();
    // Set view to the correct taxes section
    updateState({
      view: `taxes-${option}`
    });
  }, [resetAllStates, updateState]);

  // Add the handlePayrollClick function
  const handlePayrollClick = useCallback((option) => {
    console.log('[DashboardContent] handlePayrollClick called with option:', option);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const payrollNavKey = `payroll-${option}-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for payroll:', payrollNavKey);
    
    if (option === 'run-payroll') {
      // Specifically handle Run Payroll menu item
      updateState({ 
        view: 'payroll-management',
        showPayrollManagement: true,
        navigationKey: payrollNavKey
      });
    } else if (option === 'payroll-wizard') {
      // Handle Payroll Wizard menu item
      updateState({ 
        view: 'payroll-wizard',
        showPayrollWizard: true,
        navigationKey: payrollNavKey
      });
    } else if (option === 'transactions') {
      updateState({ 
        view: 'payroll-transactions',
        showPayrollTransactions: true,
        navigationKey: payrollNavKey
      });
    } else if (option === 'reports') {
      updateState({ 
        view: 'payroll-report',
        showPayrollReport: true,
        navigationKey: payrollNavKey
      });
    } else {
      // Default to payroll dashboard
      updateState({ 
        view: 'payroll',
        showPayrollDashboard: true,
        payrollSection: option || 'dashboard',
        navigationKey: payrollNavKey
      });
    }
  }, [resetAllStates, updateState]);

  // Add the handlePaymentsClick function
  const handlePaymentsClick = useCallback((option) => {
    console.log('[DashboardContent] handlePaymentsClick called with option:', option);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const paymentsNavKey = `payments-${option}-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for payments:', paymentsNavKey);
    
    // Set view based on the payment option selected
    switch(option) {
      case 'dashboard':
        updateState({ 
          view: 'payments-dashboard',
          navigationKey: paymentsNavKey
        });
        break;
      case 'receive-payments':
        updateState({ 
          view: 'receive-payments',
          navigationKey: paymentsNavKey
        });
        break;
      case 'make-payments':
        updateState({ 
          view: 'make-payments',
          navigationKey: paymentsNavKey
        });
        break;
      case 'payment-methods':
        updateState({ 
          view: 'payment-methods',
          navigationKey: paymentsNavKey
        });
        break;
      case 'recurring-payments':
        updateState({ 
          view: 'recurring-payments',
          navigationKey: paymentsNavKey
        });
        break;
      case 'refunds':
        updateState({ 
          view: 'refunds',
          navigationKey: paymentsNavKey
        });
        break;
      case 'reconciliation':
        updateState({ 
          view: 'payment-reconciliation',
          navigationKey: paymentsNavKey
        });
        break;
      case 'payment-gateways':
        updateState({ 
          view: 'payment-gateways',
          navigationKey: paymentsNavKey
        });
        break;
      case 'payment-plans':
        updateState({ 
          view: 'payment-plans',
          navigationKey: paymentsNavKey
        });
        break;
      case 'reports':
        updateState({ 
          view: 'payment-reports',
          navigationKey: paymentsNavKey
        });
        break;
      default:
        // Default to payments dashboard
        updateState({ 
          view: 'payments-dashboard',
          navigationKey: paymentsNavKey
        });
    }
    
    console.log(`[DashboardContent] Navigating to Payments ${option} with key ${paymentsNavKey}`);
  }, [resetAllStates, updateState]);

  // Add the handleCalendarClick function
  const handleCalendarClick = useCallback(() => {
    console.log('[DashboardContent] handleCalendarClick called');
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const calendarNavKey = `calendar-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for calendar:', calendarNavKey);
    
    // Update state to show calendar view
    updateState({ 
      view: 'calendar',
      navigationKey: calendarNavKey
    });
    
    console.log('[DashboardContent] Navigating to Calendar view with key', calendarNavKey);
  }, [resetAllStates, updateState]);

  // Add the handleAccountingClick function
  const handleAccountingClick = useCallback((option) => {
    console.log('[DashboardContent] handleAccountingClick called with option:', option);
    resetAllStates();
    
    // Generate a unique navigation key for component remounting
    const accountingNavKey = `accounting-${option}-${Date.now()}`;
    console.log('[DashboardContent] Setting navigationKey for accounting:', accountingNavKey);
    
    // Set view based on the accounting option selected
    switch(option) {
      case 'dashboard':
        updateState({ 
          view: 'accounting-dashboard',
          navigationKey: accountingNavKey
        });
        break;
      case 'chart-of-accounts':
        updateState({ 
          view: 'chart-of-accounts',
          navigationKey: accountingNavKey
        });
        break;
      case 'journal-entries':
        updateState({ 
          view: 'journal-entries',
          navigationKey: accountingNavKey
        });
        break;
      case 'general-ledger':
        updateState({ 
          view: 'general-ledger',
          navigationKey: accountingNavKey
        });
        break;
      case 'reconciliation':
        updateState({ 
          view: 'reconciliation',
          navigationKey: accountingNavKey
        });
        break;
      case 'financial-statements':
        updateState({ 
          view: 'financial-statements',
          navigationKey: accountingNavKey
        });
        break;
      case 'fixed-assets':
        updateState({ 
          view: 'fixed-assets',
          navigationKey: accountingNavKey
        });
        break;
      case 'reports':
        updateState({ 
          view: 'accounting-reports',
          navigationKey: accountingNavKey
        });
        break;
      default:
        // Default to accounting dashboard
        updateState({ 
          view: 'accounting-dashboard',
          navigationKey: accountingNavKey
        });
    }
    
    console.log(`[DashboardContent] Navigating to Accounting ${option} with key ${accountingNavKey}`);
  }, [resetAllStates, updateState]);

  // Memoize userData to prevent unnecessary re-renders
  const memoizedUserData = useMemo(() => {
    console.log('🔴 [DashboardContent] === MEMOIZED USERDATA DEBUG ===');
    console.log('🔴 [DashboardContent] Creating memoizedUserData with:');
    console.log('🔴 [DashboardContent] - userData:', userData);
    console.log('🔴 [DashboardContent] - initialUserData:', initialUserData);
    const result = userData || initialUserData || {};
    console.log('🔴 [DashboardContent] - result:', result);
    console.log('🔴 [DashboardContent] - result type:', typeof result);
    console.log('🔴 [DashboardContent] - result keys:', result ? Object.keys(result) : 'result is falsy');
    return result;
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
    handleDrawerToggle,
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
    handleCookieClick,
    handleLogout: handleSignOut,
    handleCloseCreateMenu,
    handleMenuItemClick,
    handleShowCreateOptions,
    setShowForm,
    setFormOption,
    tenantId: effectiveTenantId,
    handleHomeClick
  }), [
    anchorEl, settingsAnchorEl, openMenu, settingsMenuOpen, setAnchorEl, setSettingsAnchorEl,
    setShowMyAccount, setShowHelpCenter, memoizedUserData, userAttributes, setUserData, drawerOpen, handleDrawerToggle,
    resetAllStates, setShowHome, setShowCreateMenu, showCreateMenu, handleClick, handleClose,
    handleUserProfileClick, handleSettingsClick, handleHelpClick, handlePrivacyClick, handleTermsClick, handleCookieClick,
    handleShowCreateOptions,
    handleSignOut, handleCloseCreateMenu, handleMenuItemClick, setShowForm, setFormOption, effectiveTenantId, handleHomeClick
  ]);
  
  // Memoize Drawer props with handlePayrollClick included
  const drawerProps = useMemo(() => ({
    drawerOpen,
    handleDrawerToggle,
    width: drawerOpen ? drawerWidth : iconOnlyWidth,
    handleDrawerItemClick,
    userData: memoizedUserData,
    resetAllStates,
    handleHomeClick,
    handleMainDashboardClick,
    handleHRClick,
    handlePayrollClick,
    handlePaymentsClick,
    handleAccountingClick,
    handleBankingClick,
    handleInventoryClick,
    handleShowCreateOptions,
    handleShowCreateMenu,
    handleEmployeeManagementClick,
    handleCRMClick,
    handleBillingClick,
    handleSalesClick,
    handleTaxesClick,
    handleCalendarClick
  }), [
    drawerOpen, handleDrawerToggle, drawerWidth, handleDrawerItemClick, memoizedUserData,
    resetAllStates, handleHomeClick, handleMainDashboardClick, handleHRClick, handlePayrollClick, handlePaymentsClick, handleAccountingClick, handleBankingClick, handleInventoryClick,
    handleShowCreateOptions, handleShowCreateMenu, handleEmployeeManagementClick, handleCRMClick,
    handleBillingClick, handleSalesClick, handleTaxesClick, handleCalendarClick
  ]);
  
  // Memoize RenderMainContent props
  // Debug current state before creating mainContentProps
  console.log('[DEBUG] Creating mainContentProps with showBenefitsManagement:', uiState.showBenefitsManagement);
  
  // Debug current state before creating mainContentProps
  console.log('[DEBUG] Creating mainContentProps with showBenefitsManagement:', uiState.showBenefitsManagement);
  
  const mainContentProps = useMemo(() => {
    console.log('[DashboardContent] Creating mainContentProps with showMainDashboard:', showMainDashboard, 'view:', view);
    console.log('[DashboardContent] memoizedUserData being passed:', memoizedUserData);
    return {
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
    showTaxManagement: uiState.showTaxManagement,
    showTaxesDashboard: uiState.showTaxesDashboard,
    showTimesheetManagement: uiState.showTimesheetManagement,
    showPayManagement: uiState.showPayManagement,
    showBenefitsManagement: uiState.showBenefitsManagement,
    showReportsManagement: uiState.showReportsManagement,
    showPerformanceManagement: uiState.showPerformanceManagement,
    showCreateOptions,
    selectedOption,
    ...(() => {
      console.log('[DEBUG-REPORT] Setting mainContentProps with showReportsManagement:', uiState.showReportsManagement);
      return {};
    })(),
    setShowKPIDashboard,
    setShowMainDashboard,
    setSelectedReport: (selectedOption) => updateState({ selectedOption }),
    customContent,
    mockData,
    tenantId: effectiveTenantId,
    showCreateOptions,
    selectedOption,
    selectedSettingsOption,
    navigationKey,
    showProductManagement: view === 'inventory-products' || view === 'sales-products' || uiState.showProductManagement,
    showServiceManagement: view === 'services' || view === 'sales-services' || uiState.showServiceManagement,
    showInvoiceManagement: view === 'invoices' || view === 'invoice-management' || uiState.showInvoiceManagement,
    showBillManagement: view === 'bills',
    showEstimateManagement: view === 'estimates' || view === 'estimate-management',
    showSalesOrderManagement: view === 'order-management',
    showCustomerList: view === 'customers',
    showVendorManagement: view === 'vendors',
    showTransactionForm: view === 'transactions',
    showChartOfAccounts: view === 'chart-of-accounts',
    showJournalEntryManagement: view === 'journal-entries',
    showGeneralLedgerManagement: view === 'general-ledger',
    showAccountReconManagement: view === 'account-reconciliation',
    showMonthEndManagement: view === 'month-end',
    showFinancialStatements: view === 'financial-statements',
    showFixedAssetManagement: view === 'fixed-assets',
    showBudgetManagement: view === 'budget',
    showCostAccountingManagement: view === 'cost-accounting',
    showIntercompanyManagement: view === 'intercompany',
    showAuditTrailManagement: view === 'audit-trail',
    showProfitAndLossReport: view === 'profit-loss-report',
    showBalanceSheetReport: view === 'balance-sheet-report',
    showCashFlowReport: view === 'cash-flow-report',
    showIncomeByCustomer: view === 'income-by-customer',
    showAgedReceivables: view === 'aged-receivables',
    showAgedPayables: view === 'aged-payables',
    showAccountBalances: view === 'account-balances',
    showTrialBalances: view === 'trial-balances',
    showProfitAndLossAnalysis: view === 'profit-loss-analysis',
    showBalanceSheetAnalysis: view === 'balance-sheet-analysis',
    showCashFlowAnalysis: view === 'cash-flow-analysis',
    showBudgetVsActualAnalysis: view === 'budget-vs-actual',
    showSalesAnalysis: view === 'sales-analysis',
    showExpenseAnalysis: view === 'expense-analysis',
    showInventoryManagement: view === 'inventory',
    showProcurementManagement: view === 'procurement',
    showPurchaseOrderManagement: view === 'purchase-orders',
    showExpensesManagement: view === 'expenses',
    showPurchaseReturnManagement: view === 'purchase-returns',
    showReports: view === 'reports',
    showAnalysisPage: view === 'analysis',
    showBankingDashboard: view === 'banking',
    showPayrollDashboard: view === 'payroll',
    showPayrollTransactions: view === 'payroll-transactions',
    showBankRecon: view === 'bank-reconciliation',
    showPayrollReport: view === 'payroll-report',
    showBankReport: view === 'bank-report',
    showBankTransactions: view === 'bank-transactions',
    showDownloadTransactions: view === 'download-transactions',
    showConnectBank: view === 'connect-bank',
    showInventoryItems: view === 'inventory-items',
    showPayrollManagement: view === 'payroll-management',
    showPayrollWizard: view === 'payroll-wizard' || showPayrollWizard,
    handleCreateCustomer: () => console.log('Create customer flow'),
    showMyAccount,
    showHelpCenter,
    showTaxManagement: view === 'tax-settings' || view === 'tax-forms' || view === 'tax-payments' || view === 'tax-rates' || view === 'tax-exemptions' || view === 'tax-filing' || view === 'tax-reports' || uiState.showTaxManagement
  };
  }, [
    view, memoizedUserData, showKPIDashboard, showMainDashboard, showHome, setView,
    showForm, formOption, showHRDashboard, hrSection, showEmployeeManagement,
    setShowKPIDashboard, setShowMainDashboard, updateState, customContent, mockData,
    effectiveTenantId, showCreateOptions, selectedOption, showMyAccount, showHelpCenter,
    navigationKey, selectedSettingsOption,
    // We already have view listed above, but it's critical for all the conditional flags
    // that depend on it like showDownloadTransactions: view === 'download-transactions'
    showBenefitsManagement, showPayrollWizard, uiState]);

  // Listen for menu navigation events
  useEffect(() => {
    const handleMenuNavigation = (event) => {
      console.log('[DEBUG] handleMenuNavigation event received:', event.detail);
      const { item, navigationKey: newKey } = event.detail;
      console.log(`[DashboardContent] Menu navigation event received: ${item}, key: ${newKey}`);
      
      // Reset all states first to clear any user menu pages
      resetAllStates();
      
      // Update navigation key to force remounting of components
      setNavigationKey(newKey);
      
      // Handle special cases
      if (item === 'dashboard') {
        // For dashboard, trigger the main dashboard click handler
        handleMainDashboardClick();
      } else if (item) {
        // For other items, set the view
        setView(item);
      }
      
      // Reset scroll position for the main content area
      if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
      }
    };
    
    window.addEventListener('menuNavigation', handleMenuNavigation);
    
    return () => {
      window.removeEventListener('menuNavigation', handleMenuNavigation);
    };
  }, [setView, setNavigationKey, handleMainDashboardClick, resetAllStates]);

  // Just use a single useEffect for fetching employees on mount
  useEffect(() => {
    // Create an async function inside the effect to call our async fetchEmployees
    const loadEmployees = async () => {
      try {
        // Add backend connection test
        console.log("[DashboardDebugger] Testing backend connection...");
        try {
                  // Disabled backend connection check to prevent CORS errors in production
        // const { verifyBackendConnection } = await import('@/lib/axiosConfig');
        // const connectionResult = await verifyBackendConnection();
        const connectionResult = { success: true, message: 'Backend connection check disabled' };
          console.log("[DashboardDebugger] Backend connection test result:", connectionResult);
        } catch (connError) {
          console.error("[DashboardDebugger] Backend connection test failed:", connError);
        }
        
        // Ensure AUTH_CACHE provider is set before doing anything else
        ensureAuthProvider();
        
        // Check session status before fetching data
        // ... existing code ...
      } catch (error) {
        console.error('[DashboardContent] Error in loadEmployees:', error);
      }
    };
    
    loadEmployees();
  }, []);

  console.error('[DashboardContent] About to render main JSX');
  console.error('[DashboardContent] Current state:', {
    view,
    showCustomerList: uiState.showCustomerList,
    navigationKey,
    drawerOpen
  });
  
  const dashboardContent = (
    <DashboardErrorBoundary>
      <ErrorBoundary>
        <NotificationProvider>
          <ToastProvider>
          <div className="flex min-h-screen flex-col">
            {console.error('[DashboardContent] Rendering DashAppBar')}
            <DashAppBar {...dashAppBarProps} />
            <div className="flex flex-grow pt-16 relative">
              {console.error('[DashboardContent] Rendering Drawer')}
              <Drawer {...drawerProps} />
              
              <div 
                ref={mainContentRef}
                style={{
                  position: 'absolute',
                  top: '64px',
                  left: drawerOpen ? `${drawerWidth}px` : `${iconOnlyWidth}px`,
                  right: '0',
                  width: 'auto',
                  minHeight: 'calc(100vh - 64px)',
                  backgroundColor: '#F8FAFC',
                  padding: '24px',
                  transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: '0'
                }}
                key={`content-container-${navigationKey}`}
              >
                {console.error('[DashboardContent] About to render RenderMainContent in Suspense')}
                <Suspense fallback={<LoadingComponent />}>
                  {(() => {
                    try {
                      console.error('[DashboardContent] Rendering RenderMainContent with props:', mainContentProps);
                      return (
                        <RenderMainContent 
                          {...mainContentProps} 
                          navigationKey={navigationKey}
                          selectedSettingsOption={selectedSettingsOption} 
                        />
                      );
                    } catch (error) {
                      console.error('[DashboardContent] ERROR rendering RenderMainContent:', error);
                      console.error('[DashboardContent] Error stack:', error.stack);
                      return <div>Error rendering content: {error.message}</div>;
                    }
                  })()}
                </Suspense>
              </div>
            </div>
          </div>
        </ToastProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </DashboardErrorBoundary>
  );
  
  // Render the POS System outside the error boundary
  return (
    <>
      {dashboardContent}
      
      {/* POS System is now rendered inline in RenderMainContent */}
    </>
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