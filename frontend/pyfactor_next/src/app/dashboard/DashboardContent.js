// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardContent.js
'use client';

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import useClientEffect from '@/hooks/useClientEffect';
import { useStore } from '@/store/authStore';
import { Box, Container, Typography, Alert, Button } from '@/components/ui/TailwindComponents';
import DashAppBar from './components/DashAppBar';
import Drawer from './components/Drawer';
import { logger } from '@/utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import renderForm from './components/RenderForm';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { fetchAuthSession } from '@aws-amplify/auth';
import { NotificationProvider, useNotification } from '@/context/NotificationContext';
import useEnsureTenant from '@/hooks/useEnsureTenant';
import { useAuth } from '@/hooks/auth';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import DashboardLoader from '@/components/DashboardLoader';

// Import React components only - removed debug components

// Lazy load components to reduce initial memory usage
const RenderMainContent = lazy(() =>
  import('./components/RenderMainContent').then(module => ({
    default: module.default
  }))
);

// Create an empty loading component (removed spinner)
const LoadingComponent = () => null;

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
  
  // Computed values
  const openMenu = Boolean(anchorEl);
  const settingsMenuOpen = Boolean(settingsAnchorEl);
  
  // Create optimized state setters to reduce re-renders
  const updateState = useCallback((updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Create individual setters for commonly used state properties
  const setAnchorEl = useCallback((value) => updateState({ anchorEl: value }), [updateState]);
  const setSettingsAnchorEl = useCallback((value) => updateState({ settingsAnchorEl: value }), [updateState]);
  const setDrawerOpen = useCallback((value) => updateState({ drawerOpen: value }), [updateState]);
  const setUserData = useCallback((value) => updateState({ userData: value }), [updateState]);
  const setView = useCallback((value) => updateState({ view: value }), [updateState]);
  const setShowKPIDashboard = useCallback((value) => updateState({ showKPIDashboard: value }), [updateState]);
  const setShowMainDashboard = useCallback((value) => updateState({ showMainDashboard: value }), [updateState]);
  const setShowHome = useCallback((value) => updateState({ showHome: value }), [updateState]);
  const setShowForm = useCallback((value) => updateState({ showForm: value }), [updateState]);
  const setFormOption = useCallback((value) => updateState({ formOption: value }), [updateState]);
  const setShowMyAccount = useCallback((value) => updateState({ showMyAccount: value }), [updateState]);
  const setShowHelpCenter = useCallback((value) => updateState({ showHelpCenter: value }), [updateState]);
  const setSelectedSettingsOption = useCallback((value) => updateState({ selectedSettingsOption: value }), [updateState]);
  const setShowCreateMenu = useCallback((value) => updateState({ showCreateMenu: value }), [updateState]);
  
  // Simplified reset state function to avoid memory issues
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

  // Fetch user data from API
  const fetchUserData = useCallback(async () => {
    setLoadingData(true);
    setUserData(null);
    setProfileData(null);
    
    try {
      // Remove development mode bypass
      const profile = await fetch('/api/user/profile').then(res => {
        if (!res.ok) throw new Error(`Profile API error: ${res.status}`);
        return res.json();
      });
      
      logger.debug('[Dashboard] Loaded user profile data:', profile);
      
      if (profile?.profile) {
        setProfileData(profile.profile);
      }
      
      setUserData({
        ...profile?.user || {},
        ...profile?.profile || {}
      });
    } catch (error) {
      logger.error('[Dashboard] Error fetching user data:', error);
      // Don't set mock user data in production mode
    } finally {
      setLoadingData(false);
    }
  }, [setLoadingData, setUserData, setProfileData]);

  // Handle drawer item clicks for navigation
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
      case 'hr-dashboard':
        updateState({
          showHRDashboard: true,
          hrSection: 'dashboard'
        });
        break;
      case 'employee-management':
        updateState({
          showEmployeeManagement: true,
          hrSection: 'employees'
        });
        break;
      case 'inventory-management':
        updateState({
          view: 'inventory-management',
          showInventoryManagement: true
        });
        break;
      default:
        // For other options, update the view directly
        setView(option);
    }
  }, [resetAllStates, setShowHome, setShowMainDashboard, setShowKPIDashboard, updateState, setView]);

  // Add proper drawer toggle handler if it doesn't exist
  const handleDrawerToggle = useCallback(() => {
    // Explicitly set to the opposite of current state for clarity
    const newDrawerState = !drawerOpen;
    setDrawerOpen(newDrawerState);
    
    // Log for debugging
    console.log('Drawer toggled: ', newDrawerState ? 'opened' : 'closed');
    
    // Force a window resize event to ensure content reflows properly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300); // Wait for the animation to complete
  }, [drawerOpen, setDrawerOpen]);

  const handleMainDashboardClick = useCallback(() => {
    resetAllStates();
    setShowMainDashboard(true);
    setShowKPIDashboard(false);
  }, [resetAllStates, setShowMainDashboard, setShowKPIDashboard]);

  const handleKPIDashboardClick = useCallback(() => {
    resetAllStates();
    setShowKPIDashboard(true);
  }, [resetAllStates, setShowKPIDashboard]);

  const handleHomeClick = useCallback(() => {
    resetAllStates();
    setShowHome(true);
  }, [resetAllStates, setShowHome]);

  // Handler for CRM options
  const handleCRMClick = useCallback((value) => {
    resetAllStates();
    // Implement navigation or state changes based on the selected CRM option
    console.log('CRM option selected:', value);
    
    // Example implementation
    switch(value) {
      case 'dashboard':
        updateState({ view: 'crm-dashboard' });
        break;
      case 'contacts':
        updateState({ view: 'crm-contacts' });
        break;
      case 'leads':
        updateState({ view: 'crm-leads' });
        break;
      case 'opportunities':
        updateState({ view: 'crm-opportunities' });
        break;
      case 'deals':
        updateState({ view: 'crm-deals' });
        break;
      case 'activities':
        updateState({ view: 'crm-activities' });
        break;
      case 'campaigns':
        updateState({ view: 'crm-campaigns' });
        break;
      case 'reports':
        updateState({ view: 'crm-reports' });
        break;
      default:
        console.log('Unknown CRM option:', value);
    }
  }, [resetAllStates, updateState]);

  // Add the missing handleItemClick function
  const handleItemClick = useCallback((option) => {
    resetAllStates();
    // Update view based on the selected option
    console.log('Navigation item selected:', option);
    
    // Set the view based on the option
    if (option) {
      setView(option);
    }
  }, [resetAllStates, setView]);

  // Add HR click handler
  const handleHRClick = useCallback((value) => {
    resetAllStates();
    console.log('HR option selected:', value);
    
    switch(value) {
      case 'dashboard':
        updateState({ 
          showHRDashboard: true,
          hrSection: 'dashboard'
        });
        break;
      case 'employees':
        updateState({ 
          showEmployeeManagement: true,
          hrSection: 'employees'
        });
        break;
      case 'timesheets':
        updateState({ 
          showHRDashboard: true,
          hrSection: 'timesheets'
        });
        break;
      case 'taxes':
        updateState({ 
          showHRDashboard: true,
          hrSection: 'taxes'
        });
        break;
      case 'benefits':
        updateState({ 
          showHRDashboard: true,
          hrSection: 'benefits'
        });
        break;
      case 'reports':
        updateState({ 
          showHRDashboard: true,
          hrSection: 'reports'
        });
        break;
      default:
        updateState({ 
          showHRDashboard: true,
          hrSection: 'dashboard'
        });
    }
  }, [resetAllStates, updateState]);

  // Add the missing handleHRSectionToggle function
  const handleHRSectionToggle = useCallback((section) => {
    console.log('HR section toggled:', section);
    updateState({ hrSection: section });
  }, [updateState]);

  // Add the missing handleEmployeeManagementClick function
  const handleEmployeeManagementClick = useCallback(() => {
    resetAllStates();
    updateState({
      showEmployeeManagement: true,
      hrSection: 'employees'
    });
    console.log('Employee Management clicked');
  }, [resetAllStates, updateState]);

  // Add the missing handleHRDashboardClick function
  const handleHRDashboardClick = useCallback(() => {
    resetAllStates();
    updateState({
      showHRDashboard: true,
      hrSection: 'dashboard'
    });
    console.log('HR Dashboard clicked');
  }, [resetAllStates, updateState]);

  // Handler for Sales options
  const handleSalesClick = useCallback((value) => {
    resetAllStates();
    console.log('Sales option selected:', value);
    
    switch(value) {
      case 'dashboard':
        updateState({ view: 'sales-dashboard' });
        break;
      case 'products':
        updateState({ view: 'sales-products' });
        break;
      case 'services':
        updateState({ view: 'sales-services' });
        break;
      case 'estimates':
        updateState({ showEstimateManagement: true });
        break;
      case 'orders':
        updateState({ showSalesOrderManagement: true });
        break;
      case 'invoices':
        updateState({ showInvoiceManagement: true });
        break;
      case 'reports':
        updateState({ view: 'sales-reports' });
        break;
      default:
        updateState({ view: 'sales-dashboard' });
    }
  }, [resetAllStates, updateState]);

  // Handler for Transport options
  const handleTransportClick = useCallback((value) => {
    resetAllStates();
    // Implement navigation or state changes based on the selected Transport option
    console.log('Transport option selected:', value);
    
    // Example implementation
    switch(value) {
      case 'dashboard':
        updateState({ view: 'transport-dashboard' });
        break;
      case 'loads':
        updateState({ view: 'transport-loads' });
        break;
      case 'equipment':
        updateState({ view: 'transport-equipment' });
        break;
      case 'routes':
        updateState({ view: 'transport-routes' });
        break;
      case 'expenses':
        updateState({ view: 'transport-expenses' });
        break;
      case 'maintenance':
        updateState({ view: 'transport-maintenance' });
        break;
      case 'compliance':
        updateState({ view: 'transport-compliance' });
        break;
      case 'reports':
        updateState({ view: 'transport-reports' });
        break;
      default:
        console.log('Unknown Transport option:', value);
    }
  }, [resetAllStates, updateState]);

  // Handler for Inventory options
  const handleInventoryClick = useCallback((value) => {
    resetAllStates();
    // Implement navigation or state changes based on the selected inventory option
    console.log('Inventory option selected:', value);
    
    // For the products view, redirect to our new unified inventory page
    if (value === 'items') {
      window.location.href = '/inventory';
      return;
    }
    
    switch(value) {
      case 'inventorydashboard':
        updateState({ view: 'inventory-dashboard' });
        break;
      case 'stock-adjustments':
        updateState({ view: 'inventory-stock-adjustments' });
        break;
      case 'locations':
        updateState({ view: 'inventory-locations' });
        break;
      case 'suppliers':
        updateState({ view: 'inventory-suppliers' });
        break;
      case 'transactions':
        updateState({ view: 'inventory-transactions' });
        break;
      case 'reports':
        updateState({ view: 'inventory-reports' });
        break;
      default:
        // If no specific option is selected, show the inventory management page
        updateState({
          view: 'inventory-management',
          showInventoryManagement: true
        });
    }
  }, [resetAllStates, updateState]);

  // Add the missing handleInventoryManagementClick function
  const handleInventoryManagementClick = useCallback(() => {
    resetAllStates();
    updateState({
      view: 'inventory-management',
      showInventoryManagement: true
    });
    console.log('Inventory Management clicked');
  }, [resetAllStates, updateState]);

  // Handle showing the create menu
  const handleShowCreateMenu = useCallback(() => {
    console.log("Showing create menu from DashboardContent");
    // Use updateState to consistently update state values
    updateState({
      showCreateMenu: true,
      showForm: false,
      formOption: null
    });
  }, [updateState]);

  // Handle closing the create menu
  const handleCloseCreateMenu = useCallback(() => {
    updateState({ showCreateMenu: false });
  }, [updateState]);

  // Define handleShowCreateOptions first since it's used by handleMenuItemClick
  const handleShowCreateOptions = useCallback((formType) => {
    console.log(`Showing create options for: ${formType}`);
    
    // Common state reset
    updateState({
      showCreateMenu: false,
      showForm: true,
      formOption: formType,
      showCreateOptions: true,
      selectedOption: formType
    });
    
    // Switch specific view setting based on formType
    switch(formType) {
      case 'Product':
        // Product needs special handling for create mode
        updateState({ 
          showProductManagement: true,
          showCreateOptions: true,
          view: 'create-product' // Custom view for create product
        });
        break;
      case 'Service':
        updateState({ 
          showServiceManagement: true,
          view: 'create-service'
        });
        break;
      case 'Invoice':
        updateState({ 
          showInvoiceManagement: true,
          view: 'create-invoice'
        });
        break;
      case 'Bill':
        updateState({ 
          showBillManagement: true,
          view: 'create-bill'
        });
        break;
      case 'Estimate':
        updateState({ 
          showEstimateManagement: true,
          view: 'create-estimate'
        });
        break;
      case 'Customer':
        updateState({ 
          showCustomerList: true,
          view: 'create-customer'
        });
        break;
      case 'Vendor':
        updateState({ 
          showVendorManagement: true,
          view: 'create-vendor'
        });
        break;
      case 'Transaction':
        updateState({ 
          showTransactionForm: true,
          view: 'create-transaction'
        });
        break;
      default:
        // Default behavior - no specific view change
        break;
    }
  }, [updateState]);

  // Now define handleMenuItemClick which depends on the above functions
  const handleMenuItemClick = useCallback((option) => {
    console.log(`Menu item clicked: ${option}`);
    handleCloseCreateMenu();
    handleShowCreateOptions(option);
  }, [handleCloseCreateMenu, handleShowCreateOptions]);

  // Handler for Analysis options
  const handleAnalysisClick = useCallback((value) => {
    resetAllStates();
    console.log('Analysis option selected:', value);
    
    switch(value) {
      case 'kpi-data':
        updateState({ view: 'analytics-dashboard' });
        break;
      case 'ai-query':
        updateState({ view: 'ai-query' });
        break;
      default:
        updateState({ view: 'analytics-dashboard' });
    }
  }, [resetAllStates, updateState]);

  // Handler for My Account click
  const handleMyAccountClick = useCallback(() => {
    resetAllStates();
    setShowMyAccount(true);
    console.log('My Account clicked');
  }, [resetAllStates, setShowMyAccount]);

  // Handler for Help Center click
  const handleHelpCenterClick = useCallback(() => {
    resetAllStates();
    setShowHelpCenter(true);
    console.log('Help Center clicked');
  }, [resetAllStates, setShowHelpCenter]);

  // Handler for closing user profile menu - define this first since other handlers depend on it
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  // Handler for opening user profile menu
  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, [setAnchorEl]);

  // Handler for user profile click
  const handleUserProfileClick = useCallback(() => {
    setShowMyAccount(true);
    setShowHelpCenter(false);
    handleClose();
  }, [setShowMyAccount, setShowHelpCenter, handleClose]);

  // Handler for Settings click
  const handleSettingsClick = useCallback(() => {
    resetAllStates();
    setSelectedSettingsOption('general');
    console.log('Settings clicked');
    handleClose();
  }, [resetAllStates, setSelectedSettingsOption, handleClose]);

  // Handler for help click
  const handleHelpClick = useCallback(() => {
    setShowHelpCenter(true);
    setShowMyAccount(false);
    handleClose();
  }, [setShowHelpCenter, setShowMyAccount, handleClose]);

  // Handler for privacy policy click
  const handlePrivacyClick = useCallback(() => {
    window.open('/privacy', '_blank');
    handleClose();
  }, [handleClose]);

  // Handler for terms of service click
  const handleTermsClick = useCallback(() => {
    window.open('/terms', '_blank');
    handleClose();
  }, [handleClose]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      logger.debug('Signing out user');
      
      // Close the menu before signing out
      handleClose();
      
      // First clear all storage before sign-out to prevent fetch loops and orphaned state
      sessionStorage.clear();
      localStorage.removeItem('lastAuthUser');
      
      // Clear cookies that might be related to auth
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      
      // Set a variable to prevent fetch data attempts after signout
      window.isSigningOut = true;
      
      try {
        // Import auth hooks and functions dynamically to avoid circular dependencies
        const authModule = await import('@/hooks/auth');
        
        // Access the signOut function from the module
        if (typeof authModule.signOut === 'function') {
          // Sign out the user
          await authModule.signOut();
        } else {
          // Fallback to using Amplify directly
          const { signOut } = await import('aws-amplify/auth');
          await signOut();
        }
      } catch (signOutError) {
        logger.error('Error during sign out operation:', signOutError);
        // Continue with redirect even if signOut fails
      }
      
      // Delay briefly to allow state cleanup
      setTimeout(() => {
        // Use direct location change for most reliable navigation after sign-out
        window.location.href = '/auth/signin';
      }, 50);
    } catch (error) {
      logger.error('Error in sign out process:', error);
      // Fallback redirect even if there's an error - use direct location for page reload
      window.location.href = '/auth/signin';
    }
  }, [handleClose]);

  // Ensure tenant record exists in production database (AWS RDS)
  const ensureTenantRecord = async () => {
    try {
      logger.info('[Dashboard] Verifying tenant record in AWS RDS');
      
      // Get tenant ID from various sources
      const tenantId = localStorage.getItem('tenantId') || 
                      document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1] ||
                      effectiveTenantId;
      
      if (!tenantId) {
        logger.warn('[Dashboard] No tenant ID found - skipping record verification');
        return;
      }
                       
      // Ensure tenant record exists
      const response = await fetch('/api/tenant/ensure-db-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: localStorage.getItem('userId'),
          email: localStorage.getItem('userEmail'),
          businessName: localStorage.getItem('businessName') || ''
        })
      });
      
      if (!response.ok) {
        let errorDetails = "Unknown error";
        try {
          errorDetails = await response.text();
        } catch (textError) {
          errorDetails = `Status: ${response.status}`;
        }
        logger.warn('[Dashboard] Tenant record verification failed:', errorDetails);
      } else {
        try {
          const data = await response.json();
          logger.info('[Dashboard] Tenant record verified in AWS RDS:', data);
        } catch (jsonError) {
          logger.warn('[Dashboard] Tenant record verified but invalid JSON response:', jsonError);
        }
      }
    } catch (error) {
      logger.error('[Dashboard] Error verifying tenant record:', error);
    }
  };
  
  // Initial auth check and data fetching
  useEffect(() => {
    let isMounted = true;
    let authCheckRetries = 0;
    const MAX_AUTH_RETRIES = 3;
    
    // Verify tenant record exists in the AWS RDS database
    ensureTenantRecord();
    
    const checkAuthAndFetchData = async () => {
      try {
        // First check if we have session cookies that indicate we're authenticated
        const hasSessionCookie = document.cookie.includes('hasSession=true');
        const hasTenantId = 
          document.cookie.includes('tenantId=') || 
          document.cookie.includes('businessid=') ||
          localStorage.getItem('tenantId');
        const hasIdToken = document.cookie.includes('idToken=') || 
                          document.cookie.includes('CognitoIdentityServiceProvider') &&
                          document.cookie.includes('.idToken');
        
        // Log the auth check attempt for debugging
        logger.debug(`[Dashboard] Auth check attempt ${authCheckRetries + 1}/${MAX_AUTH_RETRIES}. Has cookies: session=${hasSessionCookie}, tenantId=${hasTenantId}, token=${hasIdToken}`);
        
        try {
          // Try getting the current user session
          await getCurrentUser();
          
          // If the above didn't throw, fetch the user data
          if (isMounted) {
            fetchUserData();
          }
          return; // Successfully authenticated
        } catch (authError) {
          logger.warn('[Dashboard] Auth check failed:', authError);
          
          // If we have cookies indicating a previous session, retry a few times
          if ((hasSessionCookie || hasTenantId || hasIdToken) && authCheckRetries < MAX_AUTH_RETRIES) {
            authCheckRetries++;
            logger.info(`Auth check attempt ${authCheckRetries}/${MAX_AUTH_RETRIES} - Failed but trying again`);
            
            // Try with a fallback method using cookies
            try {
              const session = await fetchAuthSession();
              if (session?.tokens?.idToken) {
                logger.debug('[Dashboard] Session recovered using fetchAuthSession');
                if (isMounted) {
                  fetchUserData();
                }
                return; // Successfully recovered session
              }
            } catch (sessionError) {
              logger.warn('[Dashboard] Session recovery attempt failed:', sessionError);
            }
            
            // Wait longer for each retry
            const delay = 1500 * (authCheckRetries);
            setTimeout(checkAuthAndFetchData, delay);
            return;
          }
          
          // Use cookies as fallback if they exist
          if (hasSessionCookie && hasTenantId) {
            logger.info('[Dashboard] Using cookie fallback for authentication');
            // Create fallback fetching mechanism
            fetchUserData();
            return;
          }
          
          // User is not authenticated after retries, redirect to sign in
          logger.debug('[Dashboard] User not authenticated, redirecting to sign-in page');
          if (isMounted) {
            router.push('/auth/signin');
          }
        }
      } catch (error) {
        logger.error('Error checking auth state:', error);
        
        // Fallback with cookies if available before redirect
        const hasSessionCookie = document.cookie.includes('hasSession=true');
        const hasTenantId = document.cookie.includes('tenantId=') || 
                           document.cookie.includes('businessid=');
        
        if (hasSessionCookie && hasTenantId) {
          logger.info('[Dashboard] Using cookie fallback after error');
          fetchUserData();
          return;
        }
        
        // Redirect on error as a fallback
        if (isMounted) {
          router.push('/auth/signin');
        }
      }
    };
    
    checkAuthAndFetchData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [fetchUserData, router, tenantStatus]);

  // Use useLayoutEffect to update the layout before browser painting
  useClientEffect(() => {
    // Function to update main content dimensions
    const updateMainContentLayout = () => {
      if (mainContentRef.current) {
        const isMobile = window.innerWidth < 640;
        mainContentRef.current.style.width = isMobile ? '100%' : `calc(100% - ${drawerOpen ? drawerWidth : iconOnlyWidth}px)`;
        mainContentRef.current.style.marginLeft = isMobile ? '0' : `${drawerOpen ? drawerWidth : iconOnlyWidth}px`;
        
        // Force a reflow by accessing offset properties
        void mainContentRef.current.offsetWidth;
      }
    };
    
    // Update immediately when drawerOpen state changes
    updateMainContentLayout();
    
    // Listen for custom drawer state change events from the Drawer component
    const handleDrawerStateChange = () => {
      updateMainContentLayout();
    };
    
    // Setup resize listener
    const handleResize = () => {
      updateMainContentLayout();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('drawerStateChanged', handleDrawerStateChange);
    
    // Trigger a resize event after a short delay to ensure layout updates
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('drawerStateChanged', handleDrawerStateChange);
    };
  }, [drawerOpen, drawerWidth, iconOnlyWidth]);

  // Update the CreateMenu component to match the style with icons
  const CreateMenu = () => {
    // Import the NavIcons
    const NavIcons = {
      Payments: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      Inventory: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      Receipt: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      Description: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      Cart: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      Reports: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      People: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      Contacts: (props) => (
        <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    };

    const menuOptions = [
      { label: 'Transaction', icon: NavIcons.Payments, value: 'Transaction' },
      { label: 'Product', icon: NavIcons.Inventory, value: 'Product' },
      { label: 'Service', icon: NavIcons.Receipt, value: 'Service' },
      { label: 'Invoice', icon: NavIcons.Description, value: 'Invoice' },
      { label: 'Bill', icon: NavIcons.Cart, value: 'Bill' },
      { label: 'Estimate', icon: NavIcons.Reports, value: 'Estimate' },
      { label: 'Customer', icon: NavIcons.People, value: 'Customer' },
      { label: 'Vendor', icon: NavIcons.Contacts, value: 'Vendor' },
    ];

    const getMenuPosition = () => {
      // Check if we're on desktop or mobile
      const isDesktop = window.innerWidth >= 768;
      
      if (isDesktop) {
        // On desktop, position it next to the sidebar
        return drawerOpen ? "left-64" : "left-16";
      } else {
        // On mobile, center it
        return "left-1/2 -translate-x-1/2";
      }
    };

    return (
      <>
        {/* Overlay to catch clicks outside the menu */}
        <div 
          className="fixed inset-0 bg-black/20 z-50" 
          onClick={handleCloseCreateMenu}
        />
        
        {/* Menu positioned based on screen size and drawer state */}
        <div className={`fixed top-16 ${getMenuPosition()} bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-64`}>
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="text-lg font-semibold">Create New</h3>
            <button 
              onClick={handleCloseCreateMenu}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <ul className="space-y-1">
            {menuOptions.map(option => (
              <li key={option.value}>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick(option.value)}
                >
                  <span className="mr-2 text-primary-main">
                    {option.icon && <option.icon className="w-5 h-5" />}
                  </span>
                  <span>{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  };

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <DashAppBar
              anchorEl={anchorEl}
              settingsAnchorEl={settingsAnchorEl}
              openMenu={openMenu}
              settingsMenuOpen={settingsMenuOpen}
              setAnchorEl={setAnchorEl}
              setSettingsAnchorEl={setSettingsAnchorEl}
              setShowMyAccount={setShowMyAccount}
              setShowHelpCenter={setShowHelpCenter}
              userData={userData}
              drawerOpen={drawerOpen}
              handleDrawerToggle={handleDrawerToggle}
              resetAllStates={resetAllStates}
              setShowHome={setShowHome}
              setShowCreateMenu={setShowCreateMenu}
              showCreateMenu={showCreateMenu}
              handleClose={handleCloseCreateMenu}
              handleMenuItemClick={handleMenuItemClick}
              setShowForm={setShowForm}
              setFormOption={setFormOption}
              tenantId={effectiveTenantId}
            />
            <div className="flex flex-grow pt-16">
              <Drawer
                drawerOpen={drawerOpen}
                handleDrawerToggle={handleDrawerToggle}
                width={drawerWidth}
                handleDrawerItemClick={handleDrawerItemClick}
                userData={userData}
                resetAllStates={resetAllStates}
                handleHomeClick={handleHomeClick}
                handleHRClick={handleHRClick}
                handleInventoryClick={handleInventoryClick}
                handleShowCreateOptions={handleShowCreateOptions}
                handleShowCreateMenu={handleShowCreateMenu}
              />
              
              <div 
                ref={mainContentRef}
                className="flex-grow bg-[#F8FAFC] min-h-[calc(100vh-64px)] p-6" 
                style={{
                  transition: 'margin-left 0.3s ease, width 0.3s ease',
                  marginLeft: drawerOpen ? `${drawerWidth}px` : '0px',
                  width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
                }}
              >
                <Suspense fallback={<LoadingComponent />}>
                  <RenderMainContent 
                    view={view}
                    userData={userData || initialUserData}
                    showKPIDashboard={showKPIDashboard}
                    showMainDashboard={showMainDashboard}
                    showHome={showHome}
                    handleSetView={setView}
                    showForm={showForm}
                    formOption={formOption}
                    showHRDashboard={showHRDashboard}
                    hrSection={hrSection}
                    showEmployeeManagement={showEmployeeManagement}
                    setShowKPIDashboard={setShowKPIDashboard}
                    setShowMainDashboard={setShowMainDashboard}
                    setSelectedReport={selectedOption => updateState({ selectedOption })}
                    customContent={customContent}
                    mockData={mockData}
                    tenantId={effectiveTenantId}
                    showCreateOptions={showCreateOptions}
                    selectedOption={selectedOption}
                    showProductManagement={view === 'inventory-products'}
                    showServiceManagement={view === 'services'}
                    showInvoiceManagement={view === 'invoices'}
                    showBillManagement={view === 'bills'}
                    showEstimateManagement={view === 'estimates'}
                    showCustomerList={view === 'customers'}
                    showVendorManagement={view === 'vendors'}
                    showTransactionForm={view === 'transactions'}
                    handleCreateCustomer={() => console.log('Create customer flow')}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </ToastProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

// Wrap DashboardContent with React.memo to prevent unnecessary re-renders
const MemoizedDashboardContent = React.memo(DashboardContent);

export default function Dashboard({ newAccount, plan, mockData, setupStatus, userAttributes, tenantId }) {
  // Use a ref to track if this is the first render to limit logging to just the initial render
  const isFirstRender = React.useRef(true);
  
  // Only log on first render, then disable the logging
  if (isFirstRender.current) {
    console.log('Dashboard initial render with props:', { newAccount, plan, mockData, setupStatus });
    isFirstRender.current = false;
  }
  
  // Always use production behavior regardless of environment
  return (
    <NotificationProvider>
      <ErrorBoundary>
        <ToastProvider>
          <Suspense fallback={<DashboardLoader message="Loading dashboard content..." />}>
            <MemoizedDashboardContent 
              setupStatus={setupStatus} 
              userAttributes={userAttributes}
              tenantId={tenantId}
            />
          </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </NotificationProvider>
  );
}