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
import IntegrationSettings from '../Settings/integrations/components/IntegrationSettings';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import APIIntegrations from './components/APIIntegrations';
import AlertsPage from '../alerts/components/AlertsPage';
import SendGlobalAlert from '../alerts/components/SendGlobalAlert';
import AlertsComponent from '../alerts/components/AlertsComponents';





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
  const [showEstimateManagement, setShowEstimateManagement] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSalesAnalysis, setShowSalesAnalysis] = useState(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const settingsMenuOpen = Boolean(settingsAnchorEl);
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const [isShopifyConnected, setIsShopifyConnected] = useState(false);
  const [showAPIIntegrations, setShowAPIIntegrations] = useState(false);
  const [showECommercePlatformAPI, setShowECommercePlatformAPI] = useState(false);
  const [showUserProfileSettings, setShowUserProfileSettings] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showSendGlobalAlert, setShowSendGlobalAlert] = useState(false);
  const [showSalesOrderManagement, setShowSalesOrderManagement] = useState(false);
  const [showInvoiceManagement, setShowInvoiceManagement] = useState(false);
  const [showVendorManagement, setShowVendorManagement] = useState(false);
  const [showBillManagement, setShowBillManagement] = useState(false);
  const [showPurchaseOrderManagement, setShowPurchaseOrderManagement] = useState(false);
  const [showExpensesManagement, setShowExpensesManagement] = useState(false);
  const [showPurchaseReturnManagement, setShowPurchaseReturnManagement] = useState(false);
  const [showProcurementManagement, setShowProcurementManagement] = useState(false);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [showPayrollManagement, setShowPayrollManagement] = useState(false);
  const [showTimesheetManagement, setShowTimeSheetManagement] = useState(false);
  const [showChartOfAccounts, setShowChartOfAccounts] = useState(false);
  const [showJournalEntryManagement, setShowJournalEntryManagement] = useState(false);
  const [showGeneralLedgerManagement, setShowGeneralLedger] = useState(false);
  const [showAccountReconManagement, setShowAccountReconManagement] = useState(false);
  const [showMonthEndManagement, setShowMonthEndManagement] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);

  const router = useRouter();

  const handleUserProfileClick = () => {
    setShowUserProfileSettings(true);
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
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
  };

  const handleUserProfileUpdate = (updatedUserData) => {
    setUserData(updatedUserData);
    addMessage('info', 'User profile updated successfully');
  };

  const handleAPIIntegrationsClick = () => {
    setShowAPIIntegrations(true);
    setShowIntegrationSettings(false);
    setShowECommercePlatformAPI(false);
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
    setShowECommercePlatformAPI(false);
  };

  const handleECommercePlatformAPIClick = () => {
    setShowECommercePlatformAPI(true);
    setShowAPIIntegrations(false);
    
  };

  const handleCRMAPIClick = () => {
    // Implement CRM API functionality here
    console.log('CRM API clicked');
  };

  const handleSettingsClick = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleIntegrationsClick = () => {
    console.log('handleIntegrationsClick called');
    setShowAPIIntegrations(true);
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
    setShowIntegrationSettings(false);
  };
  



  const handleSalesClick = (section) => {
    console.log('handleSalesClick called with section:', section);
    setShowCustomerList(false);
    setShowProductManagement(false);
    setShowServiceManagement(false);
    setShowEstimateManagement(false);
    setShowSalesOrderManagement(false);

    switch(section) {
      case 'customers':
        setShowCustomerList(true);
        setView('customerList');
        break;
      case 'products':
        setShowProductManagement(true);
        break;
      case 'services':
        setShowServiceManagement(true);
        break;
      case 'estimates':
        setShowEstimateManagement(true);
        break;
      case 'orders':
        setShowSalesOrderManagement(true);
        break;
        case 'invoices':
      setShowInvoiceManagement(true);
      break;
      
      default:
        break;
    }

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
    console.log('handleHRClick called with section:', section);
    
    // Reset all HR-related states
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setShowBankingDashboard(false);
    setShowEmployeeManagement(false);
    
    // Reset other general states
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
  
    switch(section) {
      case 'employees':
        setShowEmployeeManagement(true);
        break;
      case 'recruitment':
        // Set state for recruitment management
        break;
      case 'onboarding':
        // Set state for onboarding management
        break;
      case 'performance':
        // Set state for performance management
        break;
      case 'training':
        // Set state for training management
        break;
      case 'time-attendance':
        // Set state for time and attendance management
        break;
      case 'benefits':
        // Set state for benefits administration
        break;
      case 'compensation':
        // Set state for compensation management
        break;
      case 'employee-relations':
        // Set state for employee relations management
        break;
      case 'compliance':
        // Set state for compliance management
        break;
      case 'hr-reports':
        // Set state for HR reporting and analytics
        break;
      default:
        console.log('Unknown HR section:', section);
        break;
    }
  };

  const handleCreateCustomer = () => {
    setShowCreateOptions(true);
    setSelectedOption('Customer');
    setShowCustomerList(false);
  };

  const handlePayrollClick = (section) => {
    console.log('handlePayrollClick called with section:', section);
  
    // Reset all payroll-related states
    setShowPayrollDashboard(false);
    setShowPayrollManagement(false);
    setShowTimeSheetManagement(false);
  
    // Reset other general states
    setShowBankingDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowHRDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowDashboard(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
  
    switch(section) {
      case 'run':
        setShowPayrollManagement(true);
        setPayrollSection('run');
        break;
      case 'timesheets':
        setShowTimeSheetManagement(true);
        setPayrollSection('timesheets');
        break;
      case 'transactions':
        setShowPayrollManagement(true);
        setPayrollSection('transactions');
        break;
      case 'taxes':
        setShowPayrollManagement(true);
        setPayrollSection('taxes');
        break;
      case 'taxForms':
        setShowPayrollManagement(true);
        setPayrollSection('taxForms');
        break;
      case 'payroll-reports':
        setShowPayrollManagement(true);
        setPayrollSection('reports');
        break;
      case 'dashboard':
        setShowPayrollDashboard(true);
        break;
      default:
        console.log('Unknown payroll section:', section);
        break;
    }
  };

  const handlePurchasesClick = (section) => {
    console.log('handlePurchasesClick called with section:', section);
    setShowVendorManagement(false);
    setShowBillManagement(false);
    setShowPurchaseOrderManagement(false);
    setShowExpensesManagement(false);
    setShowPurchaseReturnManagement(false);
    setShowProcurementManagement(false);  

    switch(section) {
      case 'vendors':
        setShowVendorManagement(true);
        break;
      case 'bills':
        setShowBillManagement(true);
        break;
      case 'purchase-orders':
        setShowPurchaseOrderManagement(true);
        break;
      case 'expenses':
        setShowExpensesManagement(true);
        break;
      case 'purchase-returns':
        setShowPurchaseReturnManagement(true);
        break;
      case 'procurement':
        setShowProcurementManagement(true);
        break;
      // ... other cases ...
    }
  
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
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
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
    setShowEstimateManagement(false);
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

  const handleAccountingClick = (section) => {
    console.log('handleAccountingClick called with section:', section);
    
    // Reset all accounting-related states
    setShowChartOfAccounts(false);
    setShowJournalEntryManagement(false);
    setShowGeneralLedger(false);
    setShowAccountReconManagement(false);
    setShowMonthEndManagement(false);
    setShowFinancialStatements(false);
    
    // Reset other general states
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
  
    switch(section) {
      case 'chart-of-accounts':
        setShowChartOfAccounts(true);
        setShowDashboard(false);
        break;
      case 'journal-entries':
        // Set state for journal entries management
        setShowJournalEntryManagement(true);
        setShowDashboard(false);
        break;
        case 'general-ledger':
          setShowGeneralLedger(true);
          setShowDashboard(false);
          break;
      case 'reconciliation':
        // Set state for account reconciliation
        setShowAccountReconManagement(true);
        setShowDashboard(false);
        break;
      case 'month-end-closing':
        // Set state for fixed assets management
        setShowMonthEndManagement(true);
        setShowDashboard(false);
        break;
      case 'financial-statements':
        // Set state for financial statements
        setShowFinancialStatements(true);
        setShowDashboard(false);
        break;
      case 'fixed-assets':
        // Set state for fixed assets management
        break;
      case 'budgeting':
        // Set state for budgeting
        break;
      case 'cost-accounting':
        // Set state for cost accounting
        break;
      case 'accounting-reports':
        // Set state for accounting reports
        break;
      default:
        console.log('Unknown accounting section:', section);
        break;
    }
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

  const handleAlertClick = async () => {
    try {
      const response = await axiosInstance.get('/api/alerts/user_alerts/');
      setAlerts(response.data);
      setShowAlerts(true);
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
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error', error.message);
    }
    addMessage('error', 'Failed to fetch alerts');
  }
};

  const handleMarkAsRead = async (alertId) => {
    try {
      await axiosInstance.post(`/api/alerts/${alertId}/mark_as_read/`);
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };
  
  const handleSendGlobalAlertClick = () => {
    setShowSendGlobalAlert(true);
    // Reset other view states
    setShowAlerts(false);
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

  useEffect(() => {
    // Check Shopify connection status on component mount
    checkShopifyConnectionStatus();
  }, []);

  const checkShopifyConnectionStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/integrations/shopify-status/');
      setIsShopifyConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Shopify connection status:', error);
    }
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
      const response = await axiosInstance.get('/api/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const data = response.data;
        console.log('Dashboard User data:', data);
        logger.log('Dashboard User data:', data);
        data.first_name = data.first_name || data.email.split('@')[0];
        data.full_name = data.full_name || `${data.first_name} ${data.last_name}`;
        setUserData(data);
        addMessage('info', `Hello, ${data.full_name}.`);
      } else {
        logger.error('Error fetching user data:', response.statusText);
        addMessage('error', `Error fetching user data: ${response.statusText}`);
        localStorage.removeItem('token');
        router.push('/login');
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      addMessage('error', `Error fetching user data: ${error.message}`);
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [addMessage, router]);


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
          handleAccountingClick={handleAccountingClick}
          handleSettingsClick={handleSettingsClick}
          settingsAnchorEl={settingsAnchorEl}
          settingsMenuOpen={settingsMenuOpen}
          handleSettingsMenuClose={handleSettingsMenuClose}
          handleIntegrationsClick={handleIntegrationsClick}
          isShopifyConnected={isShopifyConnected}
          handleUserProfileClick={handleUserProfileClick}
          handleAlertClick={handleAlertClick}
        >
          <AlertsComponent onAlertClick={handleAlertClick} />
        </AppBar>
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
          handlePurchasesClick={handlePurchasesClick}
          handleAccountingClick={handleAccountingClick}
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
              mt: 2,
              mb: 2,
              ml: drawerOpen ? 2 : 1, 
              height: 'calc(100% - 32px)',
              display: 'flex', 
              flexDirection: 'column', 
              pl: drawerOpen ? 2 : 3, 
              pr: 2, 
              transition: theme.transitions.create(['margin-left', 'padding-left'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              })
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {console.log('Before rendering content, showDashboard: ', showDashboard)}
              {showAlerts && (
                <AlertsPage alerts={alerts} onMarkAsRead={handleMarkAsRead} />
              )}
              {showSendGlobalAlert && (
                <SendGlobalAlert />
              )}
              {showAPIIntegrations && (
                <APIIntegrations
                  onECommerceClick={handleECommercePlatformAPIClick}
                  onCRMClick={handleCRMAPIClick}
                />
              )}
              {showECommercePlatformAPI && (
                <IntegrationSettings
                  initialStatus={status}
                  initialPlatform={platform}
                  initialBusinessData={userData?.business}
                  title="E-Commerce Platform API"
                />
              )}
              {showDashboard && (
                <Typography variant="h4" component="h1" gutterBottom>
                  This is the dashboard area
                </Typography>
              )}
              {showIntegrationSettings && (
                <IntegrationSettings
                  initialStatus={status}
                  initialPlatform={platform}
                  initialBusinessData={userData?.business}
                />
              )}
              {showSalesAnalysis && <ChartContainer />}
              {view === 'invoiceDetails' && (
                <InvoiceDetails 
                  invoiceId={selectedInvoiceId} 
                  onBackToCustomerDetails={handleBackToCustomerDetails} 
                />
              )}
              {selectedCustomerId && (
                  <CustomerDetails 
                    customerId={selectedCustomerId}
                    onBackToList={handleBackToList}
                    onInvoiceSelect={handleInvoiceSelect}
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
                showEstimateManagement,
                showSalesOrderManagement,
                showInvoiceManagement,
                showVendorManagement,
                showBillManagement,
                showPurchaseOrderManagement,
                showExpensesManagement,
                showPurchaseReturnManagement,
                showProcurementManagement,
                showEmployeeManagement,
                showPayrollManagement,
                showTimesheetManagement,
                showChartOfAccounts,
                showJournalEntryManagement,
                showGeneralLedgerManagement,
                showAccountReconManagement,
                showMonthEndManagement,
                showFinancialStatements,
                showDashboard,
                showIntegrationSettings,
                showUserProfileSettings,
                handleUserProfileUpdate,
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