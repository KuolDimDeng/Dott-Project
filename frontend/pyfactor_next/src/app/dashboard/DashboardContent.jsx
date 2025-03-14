'use client';

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useStore } from '@/store/authStore';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container, Typography, CircularProgress } from '@mui/material';
import AppBar from './components/AppBar';
import Drawer from './components/Drawer';
import { logger } from '@/utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import renderForm from './components/RenderForm';

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
    primary: { main: '#b3e5fc' }, // Navy blue color
    secondary: { main: '#81d4fa' } // Light blue color
  },
});

function DashboardContent() {
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
    
    // Form visibility
    showForm: false,
    formOption: null,
  });
  
  // Destructure state for easier access
  const {
    anchorEl, settingsAnchorEl, drawerOpen, userData, view,
    selectedOption, selectedReport, selectedInvoiceId, selectedCustomer,
    selectedInvoice, selectedCustomerId, selectedAnalysis, selectedSettingsOption,
    products, services, showKPIDashboard, showMainDashboard, showHome,
    showForm, formOption
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
  
  const router = useRouter();

  // Simplified reset state function to avoid memory issues
  const resetAllStates = useCallback(() => {
    // Reset all view states to false except for the ones we want to keep
    const resetState = {
      showKPIDashboard: false,
      showMainDashboard: false,
      showHome: false,
      showForm: false,
      formOption: null,
      // Keep other state values
      anchorEl: null,
      settingsAnchorEl: null,
    };
    
    updateState(resetState);
  }, [updateState]);

  const drawerWidth = 220; // Match the width in Drawer.jsx

  const fetchUserData = useCallback(async () => {
    try {
      // Check if we have pending schema setup
      const pendingSetupStr = sessionStorage.getItem('pendingSchemaSetup');
      const isPendingSetup = !!pendingSetupStr;
      
      // Get user data
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      logger.debug('Dashboard User data:', { currentUser, attributes });
      
      const userData = {
        ...currentUser,
        ...attributes,
        first_name: attributes.given_name || attributes.email?.split('@')[0],
        last_name: attributes.family_name || '',
        full_name: `${attributes.given_name || ''} ${attributes.family_name || ''}`.trim(),
        subscription_type: attributes['custom:subplan'] || 'free',
        business_name: attributes['custom:businessname'] || 'My Business',
      };
      
      setUserData(userData);
      
      // Always load the Home page, regardless of setup status
      // This ensures the dashboard is visible while setup happens in the background
      setShowHome(true);
    } catch (error) {
      logger.error('Error fetching user data:', error);
      router.push('/auth/signin');
    }
  }, [router, setUserData, setShowKPIDashboard, setShowMainDashboard, setShowHome]);

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

  // Handler for showing create options
  const handleShowCreateOptions = useCallback((option) => {
    resetAllStates();
    setShowForm(true);
    setFormOption(option);
    logger.debug(`Selected create option: ${option}`);
  }, [resetAllStates, setShowForm, setFormOption]);

  // Load user data on mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <AppBar 
            mainBackground="#fafafa"
            textAppColor="#263238"
            drawerOpen={drawerOpen}
            handleDrawerToggle={handleDrawerToggle}
            userData={userData}
            anchorEl={anchorEl}
            openMenu={openMenu}
            handleClick={setAnchorEl}
            handleClose={() => setAnchorEl(null)}
            settingsAnchorEl={settingsAnchorEl}
            settingsMenuOpen={settingsMenuOpen}
            handleSettingsClick={setSettingsAnchorEl}
            handleSettingsClose={() => setSettingsAnchorEl(null)}
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
            handleHRClick={() => {}}
            handlePayrollClick={() => {}}
            handleAnalysisClick={() => {}}
            showCustomerList={false}
            setShowCustomerList={() => {}}
            handleCreateCustomer={() => {}}
            handleSalesClick={() => {}}
            handleDashboardClick={handleMainDashboardClick}
            handlePurchasesClick={() => {}}
            handleAccountingClick={() => {}}
            handleInventoryClick={() => {}}
            handleCRMClick={handleCRMClick}
          />
          
          <Box
            component="main"
            sx={{
              marginLeft: drawerOpen ? `${drawerWidth}px` : '0px',
              width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
              transition: 'margin-left 0.3s ease, width 0.3s ease',
              padding: 0, // No padding
              paddingTop: '66px',
              height: '100vh',
              overflow: 'auto',
            }}
          >
            <Suspense fallback={<LoadingComponent />}>
              {showForm && formOption ? (
                renderForm(formOption, userData)
              ) : (
                view !== 'invoiceDetails' && view !== 'customerDetails' &&
                view !== 'productList' && view !== 'serviceList' && RenderMainContent && (
                  <RenderMainContent
                    showKPIDashboard={showKPIDashboard}
                    showMainDashboard={showMainDashboard}
                    showHome={showHome}
                    userData={userData}
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

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}