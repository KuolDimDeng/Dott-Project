///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardContent.jsx
'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container, AppBar as MuiAppBar, Toolbar, Typography } from '@mui/material';
import ConsoleMessages from './components/components/ConsoleMessages';
import Chatbot from './components/forms/ChatBot';
import Drawer from './components/Drawer';
import AppBar from './components/AppBar';
import renderMainContent from './components/RenderMainContent';
import { UserMessageProvider, useUserMessageContext } from '@/contexts/UserMessageContext';
import { logger } from '@/utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
import { secondary } from '../getLPTheme';
import InvoiceDetails from './components/forms/InvoiceDetails';
import CustomerDetails from './components/forms/CustomerDetails';
import ProductList from './components/lists/ProductList';
import ServiceList from './components/lists/ServiceList';
import axiosInstance from './components/components/axiosConfig';
import ChartContainer from '../chart/component/ChartContainer';
import { FamilyRestroomRounded } from '@mui/icons-material';
import IntegrationSettings from './components/components/IntegrationSettings';


const theme = createTheme({
  palette: {
    primary: { main: '#000080' }, // Navy blue color
    secondary: { main: '#81d4fa' } // Light blue color
  },
});

const BottomAppBar = styled(MuiAppBar)(({ theme }) => ({
    top: 'auto',
    bottom: 0,
    backgroundColor: '#81d4fa',
    height: '60px',
    minHeight: 'unset',
    display: 'flex',
    alignItems: 'left',
    position: 'fixed',
    left: 0,
    right: 0,
    width: '100%',
    zIndex: theme.zIndex.drawer + 1, // Ensure it's above the drawer
  }));

function DashboardContent() {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [userData, setUserData] = useState(null);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const { addMessage } = useUserMessageContext();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showBankingDashboard, setShowBankingDashboard] = useState(false);
  const [showHRDashboard, setShowHRDashboard] = useState(false);
  const [showPayrollDashboard, setShowPayrollDashboard] = useState(false);
  const [hrSection, setHRSection] = useState('');
  const [payrollSection, setPayrollSection] = useState('');
  const [showAnalysisPage, setShowAnalysisPage] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [view, setView] = useState('customerList');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showProductList, setShowProductList] = useState(false);
  const [showServiceList, setShowServiceList] = useState(false);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showServiceManagement, setShowServiceManagement] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSalesAnalysis, setShowSalesAnalysis] = useState(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const settingsMenuOpen = Boolean(settingsAnchorEl);


  const handleSettingsClick = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleIntegrationsClick = () => {
    setShowIntegrationSettings(true);
    handleSettingsMenuClose();
    // Reset other view states as needed
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowSalesAnalysis(false);
  };
  
 


  const handleSalesClick = (section) => {
    console.log('handleSalesClick called with section:', section);
    if (section === 'customers') {
        setView('customerList');
        setShowCustomerList(true);
        setShowProductManagement(false);
    } else if (section === 'products') {
        setShowProductManagement(true);
        setShowCustomerList(false);
        setShowServiceManagement(false);
    } else if (section ==='services') {
        setShowServiceManagement(true);
        setShowCustomerList(false);
        setShowProductManagement(false);
    }
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
  };

  const handleDashboardClick = () => {
    console.log('handleDashboardClick called.');
    setShowDashboard(true);
    console.log('showDashboard set to true');
    // Reset other view states
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
    setView('dashboard');
    console.log('view set to: dashboard');
  };

  const handleCustomerSelect = (customerId) => {
    console.log("handleCustomerSelect called with customerId:", customerId);
    setSelectedCustomerId(customerId);
    console.log("selectedCustomerId set to:", customerId);
    setView('customerDetails');
    console.log("view set to: customerDetails");
  };
  
  const handleInvoiceSelect = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleAnalysisClick = (section) => {
    if (section === 'sales-analysis') {
      setShowSalesAnalysis(true);
      setShowDashboard(false);
      // Reset other view states
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowProductManagement(false);
    setShowServiceManagement(false);
    }
  };

  const handleBackFromInvoice = () => {
    setSelectedInvoice(null);
    setView('customerDetails');
  };

  const handleBackToCustomerDetails = () => {
    setView('customerDetails');
    setSelectedInvoice(null);
  };

  const handleBackToList = () => {
    setView('customerList');
    setSelectedCustomerId(null);
    setSelectedInvoiceId(null);
  };

  const handleHRClick = (section) => {
    setShowHRDashboard(true);
    setHRSection(section);
    setShowPayrollDashboard(false);
    setShowBankingDashboard(false);
  };

  const handleCreateCustomer = () => {
    setShowCreateOptions(true);
    setSelectedOption('Customer');
    setShowCustomerList(false);
  };

  const handlePayrollClick = (section) => {
    setShowPayrollDashboard(true);
    setPayrollSection(section);
    setShowHRDashboard(false);
    setShowBankingDashboard(false);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleBankingClick = () => {
    setShowBankingDashboard(true);
    setShowTransactionForm(false);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setSelectedReport(null);
  };

  const handleReportClick = (reportType) => {
    setSelectedReport(reportType);
    setShowReports(true);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setShowTransactionForm(false);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShowInvoiceBuilder = () => {
    setShowInvoiceBuilder(true);
    setShowCreateOptions(false);
    setSelectedOption(null);
    setShowTransactionForm(false);
    setSelectedReport(null);
  };

  const handleCloseInvoiceBuilder = () => {
    setShowInvoiceBuilder(false);
  };

  const handleShowCreateOptions = (option) => {
    setShowCreateOptions(true);
    setShowInvoiceBuilder(false);
    setSelectedOption(option);
    setShowTransactionForm(false);
    setSelectedReport(null);
    setShowBankingDashboard(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowReports(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowProductManagement(false);
    setShowServiceManagement(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);

  };

  const handleShowTransactionForm = () => {
    setShowTransactionForm(true);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setSelectedOption(null);
    setSelectedReport(null);
  };

  const handleAccountClick = () => {
    setShowAccountPage(true);
    setAnchorEl(null);
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to close your account permanently?"
    );
    if (confirmDelete) {
      deleteUserAccount();
    }
  };

  const handleProductsClick = () => {
    setView('productList');
    setShowProductList(true);
    setShowServiceList(false);
    setShowCustomerList(false);
    // ... (reset other view states)
    fetchProducts();
  };

  const handleServicesClick = () => {
    setView('serviceList');
    setShowServiceList(true);
    setShowProductList(false);
    setShowCustomerList(false);
    // ... (reset other view states)
    fetchServices();
  };

  const deleteUserAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      localStorage.removeItem('token');
      window.location.href = '/';

      const response = await fetch('http://localhost:8000/api/delete-account/', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        logger.error('Error deleting account:', response.statusText);
        addMessage('error', `Error deleting account: ${response.statusText}`);
      } else {
        addMessage('info', 'Account deleted successfully');
      }
    } catch (error) {
      logger.error('Error deleting account:', error);
      addMessage('error', `Error deleting account: ${error.message}`);
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        logger.log('Dashboard User data:', data);
        data.first_name = data.first_name || data.email.split('@')[0];
        data.full_name = data.full_name || `${data.first_name} ${data.last_name}`;
        setUserData(data);
        addMessage('info', `Welcome, ${data.full_name}`);
      } else {
        logger.error('Error fetching user data:', response.statusText);
        addMessage('error', `Error fetching user data: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      addMessage('error', `Error fetching user data: ${error.message}`);
    }
  }, [addMessage]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const fetchProducts = async () => {
    try {
      console.log('fetchProducts called');
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      addMessage('error', 'Failed to fetch products');
    }
  };

  const fetchServices = async () => {
    try {
      console.log('fetchServices called');
      const response = await axiosInstance.get('/api/services/');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      addMessage('error', 'Failed to fetch services');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar 
          drawerOpen={drawerOpen}
          handleDrawerToggle={handleDrawerToggle}
          userData={userData}
          anchorEl={anchorEl}
          openMenu={openMenu}
          handleClick={handleClick}
          handleClose={handleClose}
          handleAccountClick={handleAccountClick}
          handleSettingsClick={handleSettingsClick}
          settingsAnchorEl={settingsAnchorEl}
          settingsMenuOpen={settingsMenuOpen}
          handleSettingsMenuClose={handleSettingsMenuClose}
          handleIntegrationsClick={handleIntegrationsClick}
        />
        <Drawer 
          drawerOpen={drawerOpen}
          handleDrawerToggle={handleDrawerToggle}
          handleShowInvoiceBuilder={handleShowInvoiceBuilder}
          handleCloseInvoiceBuilder={handleCloseInvoiceBuilder}
          handleShowCreateOptions={handleShowCreateOptions}
          handleShowTransactionForm={handleShowTransactionForm}
          handleReportClick={handleReportClick}
          handleBankingClick={handleBankingClick}
          handleHRClick={handleHRClick}
          handlePayrollClick={handlePayrollClick}
          handleAnalysisClick={handleAnalysisClick}
          showCustomerList={showCustomerList}
          setShowCustomerList={setShowCustomerList}
          handleCreateCustomer={handleCreateCustomer}
          handleSalesClick={handleSalesClick}
          handleProductsClick={handleProductsClick}
          handleServicesClick={handleServicesClick}
          handleDashboardClick={handleDashboardClick}

        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            width: '100%',
            marginLeft: drawerOpen ? `${270 - 290}px` : '-220px',
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            pt: '64px',
            pb: '60px',
            height: 'calc(100vh - 124px)',
            overflow: 'auto',
          }}
        >
          <Container 
            maxWidth={false}
            sx={{ 
              mt: 1, 
              mb: 0, 
              ml: drawerOpen ? 2 : 1, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              pl: drawerOpen ? 1 : 2, 
              pr: 1, 
              transition: theme.transitions.create(['margin-left', 'padding-left'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              })
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {console.log('Before rendering content, showDashboard: ', showDashboard)}
                {showDashboard && (
              <Typography variant="h4" component="h1" gutterBottom>
                This is the dashboard area
              </Typography>
            )}
            {showIntegrationSettings && <IntegrationSettings userData={userData} />}
            {showSalesAnalysis && <ChartContainer />}
              {view === 'invoiceDetails' && (
                <InvoiceDetails 
                  invoiceId={selectedInvoiceId} 
                  onBackToCustomerDetails={handleBackToCustomerDetails} 
                />
              )}
              {console.log('Rendering InvoiceDetails with ID: ', selectedInvoice)}
              {view === 'customerDetails' && selectedCustomerId && (
                <CustomerDetails 
                    customerId={selectedCustomerId}
                    onBackToList={handleBackToList}
                    onInvoiceSelect={handleInvoiceSelect}
                />
                )}
                {console.log('Rendering CustomerDetails with ID: ', selectedCustomerId)}
                {view === 'productList' && (
                <ProductList products={products} />
              )}
              {view === 'serviceList' && (
                <ServiceList services={services} />
              )}
              {view !== 'invoiceDetails' && view !== 'customerDetails' && 
               view !== 'productList' && view !== 'serviceList' &&  
               renderMainContent({
                showTransactionForm,
                showInvoiceBuilder,
                showCreateOptions,
                selectedOption,
                userData,
                handleCloseInvoiceBuilder,
                showAccountPage,
                handleDeleteAccount,
                selectedReport,
                showReports,
                showBankingDashboard,
                showHRDashboard,
                hrSection,
                showPayrollDashboard,
                payrollSection,
                showAnalysisPage,
                showCustomerList,
                handleCreateCustomer,
                selectedInvoiceId,
                handleInvoiceSelect,
                handleBackFromInvoice,
                showCustomerDetails,
                selectedCustomer,
                handleBackToCustomerDetails,
                setView,
                view,
                handleCustomerSelect,
                showProductManagement,
                showServiceManagement,
                showDashboard,
                showIntegrationSettings,
                
              })}
            </Box>
          </Container>
        </Box>
      
        <BottomAppBar>
          <Toolbar style={{ minHeight: '48px', padding: '0 10px' }}>
            <ConsoleMessages backgroundColor="#81d4fa" />
          </Toolbar>
        </BottomAppBar>
        <ErrorBoundary>
          <Chatbot userName={userData ? userData.first_name : 'Guest'} backgroundColor="#81d4fa" />
        </ErrorBoundary>
      </Box>
    </ThemeProvider>
  );
}

export default function Dashboard() {
  return (
    <UserMessageProvider>
      <DashboardContent />
    </UserMessageProvider>
  );
}