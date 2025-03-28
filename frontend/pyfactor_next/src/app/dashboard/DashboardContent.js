// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardContent.js
'use client';

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useStore } from '@/store/authStore';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { Box, Container, Typography, CircularProgress } from '@/components/ui/TailwindComponents';
import AppBar from './components/AppBar';
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

// Lazy load components to reduce initial memory usage
const RenderMainContent = lazy(() =>
  import('./components/RenderMainContent').then(module => ({
    default: module.default
  }))
);

// Create an empty loading component (removed spinner)
const LoadingComponent = () => null;

const theme = createTheme({
  palette: {
    primary: { main: '#0a3977' }, // Navy blue color
    secondary: { main: '#1a5bc0' }, // Standard blue color
    background: {
      default: '#ffffff', // Pure white background
      paper: '#ffffff',   // White paper elements
    },
    divider: 'rgba(0, 0, 0, 0.12)', // Standardized divider color
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff', // Ensure body background is also white
        },
      },
    },
  },
});

function DashboardContent({ setupStatus, customContent }) {
  // Use a single state object for UI visibility flags to reduce memory overhead
  const [uiState, setUiState] = useState({
    // Menu state
    anchorEl: null,
    settingsAnchorEl: null,
    drawerOpen: true,
    
    // User data
    userData: null,
    
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
    
    // User menu options visibility
    showMyAccount: false,
    showHelpCenter: false,
  });
  
  // Destructure state for easier access
  const {
    anchorEl, settingsAnchorEl, drawerOpen, userData, view,
    selectedOption, selectedReport, selectedInvoiceId, selectedCustomer,
    selectedInvoice, selectedCustomerId, selectedAnalysis, selectedSettingsOption,
    products, services, showKPIDashboard, showMainDashboard, showHome,
    showInventoryItems, showInventoryManagement, showForm, formOption,
    showHRDashboard, showEmployeeManagement, hrSection, showMyAccount, showHelpCenter
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
  
  const router = useRouter();

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
    };
    
    updateState(resetState);
  }, [updateState]);

  const drawerWidth = 260; // Match the increased width in Drawer.js

  const fetchUserData = useCallback(async () => {
    try {
      // Check for authentication first to handle sign-out cases properly
      try {
        // Check if we have pending schema setup
        const pendingSetupStr = sessionStorage.getItem('pendingSchemaSetup');
        const isPendingSetup = !!pendingSetupStr;
        
        // Get user data with try/catch to handle auth errors
        let currentUser, attributes;
        
        try {
          currentUser = await getCurrentUser();
          attributes = await fetchUserAttributes();
        } catch (authError) {
          // Authentication error - redirect to sign-in
          logger.debug('Authentication check failed:', authError);
          throw new Error('User not authenticated');
        }
        
        if (!currentUser || !attributes) {
          throw new Error('Failed to get user data');
        }
        
        logger.debug('Dashboard User data:', { currentUser, attributes });
        
        // Get subscription plan and normalize it
        // Check multiple possible sources with fallbacks
        const cognitoSubplan = attributes['custom:subplan'];
        const profileSubscription = attributes.subscription_plan;
        const cookieSubscription = document.cookie
          .split('; ')
          .find(row => row.startsWith('subscriptionPlan='))
          ?.split('=')[1];
          
        let subscriptionPlan = cognitoSubplan || profileSubscription || cookieSubscription || 'free';
        
        // Ensure subscription plan is correctly formatted for display
        // This handles case inconsistencies between backend and frontend
        const originalPlan = subscriptionPlan;
        subscriptionPlan = typeof subscriptionPlan === 'string' ? subscriptionPlan.toLowerCase() : 'free';
        
        // Get onboarding status with similar fallback approach
        const cognitoOnboarding = attributes['custom:onboarding'] || 'NOT_STARTED';
        const cookieOnboarding = document.cookie
          .split('; ')
          .find(row => row.startsWith('onboardedStatus='))
          ?.split('=')[1];
        
        const onboardingStatus = cookieOnboarding || cognitoOnboarding;
        
        // Check if subscription expired (from login token)
        // Extract from sessionStorage if available
        const authData = JSON.parse(sessionStorage.getItem('authData') || '{}');
        const subscriptionExpired = authData?.subscription_expired || false;
        const previousPlan = authData?.previous_plan || '';
        
        // Process name attributes properly for display and avatar initials
        const givenName = attributes.given_name ? attributes.given_name.trim() : '';
        const familyName = attributes.family_name ? attributes.family_name.trim() : '';
        
        // Add extra logging to debug name extraction
        logger.debug('User name attributes:', {
          given_name: attributes.given_name,
          family_name: attributes.family_name,
          processed_given_name: givenName,
          processed_family_name: familyName,
          email: attributes.email
        });
        
        // Additional debug for subscription plan
        logger.debug('Subscription plan debug:', {
          rawValue: attributes['custom:subplan'],
          normalizedValue: subscriptionPlan,
          originalValue: originalPlan,
          fromAttributes: !!attributes['custom:subplan'],
          fromCookie: !!cookieSubscription,
          onboardingStatus,
          cognitoOnboarding,
          cookieOnboarding,
          subscriptionExpired,
          previousPlan
        });
        
        const userData = {
          ...currentUser,
          ...attributes,
          first_name: givenName || attributes.email?.split('@')[0]?.trim(),
          last_name: familyName || '',
          full_name: `${givenName || ''} ${familyName || ''}`.trim(),
          subscription_type: subscriptionPlan,
          original_subscription_type: originalPlan, // Keep original for debugging
          business_name: attributes['custom:businessname'] || 'My Business',
          onboarding_status: onboardingStatus,
          subscription_expired: subscriptionExpired,
          previous_plan: previousPlan
        };
        
        logger.debug('Normalized user data:', { 
          subscriptionPlan,
          originalPlan: attributes['custom:subplan'],
          onboardingStatus,
          subscriptionExpired,
          previousPlan
        });
        
        setUserData(userData);
        
        // Always load the Home page, regardless of setup status
        // This ensures the dashboard is visible while setup happens in the background
        setShowHome(true);
        
      } catch (innerError) {
        // Any authentication or data retrieval error should redirect
        throw innerError;
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      
      // If this is an authentication error, redirect
      if (error.message === 'User not authenticated' || 
          error.message.includes('authenticate') ||
          error.name === 'UserUnAuthenticatedException') {
        router.push('/auth/signin');
      } else {
        // For other errors, still redirect but with a delay
        setTimeout(() => {
          router.push('/auth/signin');
        }, 100);
      }
    }
  }, [router, setUserData, setShowHome]);

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(!drawerOpen);
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

  // Handler for showing create options
  const handleShowCreateOptions = useCallback((option) => {
    resetAllStates();
    setShowForm(true);
    setFormOption(option);
    logger.debug(`Selected create option: ${option}`);
  }, [resetAllStates, setShowForm, setFormOption]);

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

  // Handler for Settings click
  const handleSettingsClick = useCallback(() => {
    resetAllStates();
    setSelectedSettingsOption('Profile Settings');
    console.log('Settings clicked');
  }, [resetAllStates, setSelectedSettingsOption]);

  // Handler for Help Center click
  const handleHelpCenterClick = useCallback(() => {
    resetAllStates();
    setShowHelpCenter(true);
    console.log('Help Center clicked');
  }, [resetAllStates, setShowHelpCenter]);

  // Load user data on mount with auth check
  useEffect(() => {
    let isMounted = true;
    
    const checkAuthAndFetchData = async () => {
      try {
        // Check if the user is logged in before fetching data
        const auth = await import('aws-amplify/auth');
        
        try {
          // Try getting the current session first as a lightweight check
          await auth.getCurrentUser();
          
          // If the above didn't throw, fetch the user data
          if (isMounted) {
            fetchUserData();
          }
        } catch (authError) {
          // User is not authenticated, redirect to sign in
          logger.debug('User not authenticated, redirecting to sign-in page');
          if (isMounted) {
            router.push('/auth/signin');
          }
        }
      } catch (error) {
        logger.error('Error checking auth state:', error);
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
  }, [fetchUserData, router]);
  
  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      logger.debug('Signing out user');
      
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
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', width: '100vw', overflow: 'hidden' }}>
          <AppBar 
            mainBackground="#ffffff"
            textAppColor="#0a3977"
            drawerOpen={drawerOpen}
            handleDrawerToggle={handleDrawerToggle}
            userData={userData}
            anchorEl={anchorEl}
            openMenu={openMenu}
            handleClick={setAnchorEl}
            handleClose={() => setAnchorEl(null)}
            settingsAnchorEl={settingsAnchorEl}
            settingsMenuOpen={settingsMenuOpen}
            handleSettingsClick={handleSettingsClick}
            handleSettingsClose={() => setSettingsAnchorEl(null)}
            handleHomeClick={handleHomeClick}
            handleLogout={handleSignOut}
            handleUserProfileClick={handleMyAccountClick}
            handleHelpClick={handleHelpCenterClick}
          />
          
          <Drawer
            drawerOpen={drawerOpen}
            handleDrawerToggle={handleDrawerToggle}
            handleMainDashboardClick={handleMainDashboardClick}
            handleKPIDashboardClick={handleKPIDashboardClick}
            handleHomeClick={handleHomeClick}
            handleShowInvoiceBuilder={() => {}}
            handleCloseInvoiceBuilder={() => {}}
            handleShowCreateOptions={handleShowCreateOptions}
            handleShowTransactionForm={() => {}}
            handleReportClick={() => {}}
            handleBankingClick={() => {}}
            handleHRClick={handleHRClick}
            handlePayrollClick={() => {}}
            handleAnalysisClick={handleAnalysisClick}
            showCustomerList={false}
            setShowCustomerList={() => {}}
            handleCreateCustomer={() => {}}
            handleSalesClick={handleSalesClick}
            handleDashboardClick={handleMainDashboardClick}
            handlePurchasesClick={() => {}}
            handleAccountingClick={() => {}}
            handleInventoryClick={handleInventoryClick}
            handleCRMClick={handleCRMClick}
          />
          
          <Box
            component="main"
            sx={{
              marginLeft: drawerOpen ? { xs: '0', sm: `${drawerWidth}px` } : '0px',
              width: drawerOpen ? { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` } : '100%',
              transition: 'margin-left 0.3s ease, width 0.3s ease',
              padding: { xs: '1rem', sm: '1.5rem' },
              paddingTop: { xs: '80px', sm: '86px' },
              height: '100vh',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              maxWidth: '100vw',
              boxSizing: 'border-box',
              overflowX: 'hidden',
              backgroundColor: 'background.default', // Ensure consistent background color
              position: 'relative',
              // Remove any overlay/backdrop that might be causing the dark shade
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent', // Ensure no overlay
                zIndex: -1,
              },
            }}
          >
            <Suspense fallback={<LoadingComponent />}>
              {customContent ? (
                // Render the custom content that was passed as children
                customContent
              ) : (
                view !== 'invoiceDetails' && view !== 'customerDetails' &&
                view !== 'productList' && view !== 'serviceList' && RenderMainContent && (
                  <RenderMainContent
                    showKPIDashboard={showKPIDashboard}
                    showMainDashboard={showMainDashboard}
                    showHome={showHome}
                    showInventoryItems={showInventoryItems}
                    showInventoryManagement={showInventoryManagement}
                    userData={userData}
                    showHRDashboard={showHRDashboard}
                    hrSection={hrSection}
                    showEmployeeManagement={showEmployeeManagement}
                    view={view}
                    showMyAccount={showMyAccount}
                    showHelpCenter={showHelpCenter}
                    selectedSettingsOption={selectedSettingsOption}
                    showCreateOptions={showForm}
                    selectedOption={formOption}
                  />
                )
              )}
            </Suspense>
          </Box>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default function Dashboard({ children, setupStatus }) {
  return (
    <ErrorBoundary>
      <DashboardContent setupStatus={setupStatus} customContent={children} />
    </ErrorBoundary>
  );
}