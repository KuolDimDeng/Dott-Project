///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardContent.jsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import {
  CssBaseline,
  Box,
  Container,
  Typography,
} from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { UserMessageProvider, useUserMessageContext } from '@/contexts/userMessageContext';
// Component imports
import Drawer from './components/Drawer';
import AppBar from './components/AppBar';
import ConsoleMessages from './components/components/ConsoleMessages';
import RenderMainContent from './components/RenderMainContent';
import ErrorBoundary from './components/ErrorBoundary';
import AlertsComponent from '../alerts/components/AlertsComponents';
import CustomerDetails from './components/forms/CustomerDetails';
import ProductList from './components/lists/ProductList';
import ServiceList from './components/lists/ServiceList';
import InvoiceDetails from './components/forms/InvoiceDetails';
import ChartContainer from '../chart/component/ChartContainer';
import IntegrationSettings from '../Settings/integrations/components/IntegrationSettings';
import APIIntegrations from './components/APIIntegrations';
import AlertsPage from '../alerts/components/AlertsPage';
import SendGlobalAlert from '../alerts/components/SendGlobalAlert';
import SetupInProgress from '@/app/dashboard/components/SetupInProgress';



const theme = createTheme({
  palette: {
    primary: { main: '#b3e5fc' },
    secondary: { main: '#81d4fa' },
  },
});

const drawerWidth = 225;

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addMessage } = useUserMessageContext();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');


  // Core state
  const [userData, setUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [view, setView] = useState('main');

  // Reset state function
  const resetAllStates = () => {
    setShowInvoiceBuilder(false);
    setShowCreateOptions(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowReports(false);
    setShowBankingDashboard(false);
    setShowHRDashboard(false);
    setShowPayrollDashboard(false);
    setShowAnalysisPage(false);
    setShowCustomerList(false);
    setShowCustomerDetails(false);
    setShowProductList(false);
    setShowServiceList(false);
    setShowProductManagement(false);
    setShowServiceManagement(false);
    setShowEstimateManagement(false);
    setShowChart(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);
    setShowAPIIntegrations(false);
    setShowECommercePlatformAPI(false);
    setShowUserProfileSettings(false);
    setShowAlerts(false);
    setShowSendGlobalAlert(false);
    setShowSalesOrderManagement(false);
    setShowInvoiceManagement(false);
    setShowVendorManagement(false);
    setShowBillManagement(false);
    setShowPurchaseOrderManagement(false);
    setShowExpensesManagement(false);
    setShowPurchaseReturnManagement(false);
    setShowProcurementManagement(false);
    setShowEmployeeManagement(false);
    setShowPayrollManagement(false);
    setShowTimesheetManagement(false);
    setShowChartOfAccounts(false);
    setShowJournalEntryManagement(false);
    setShowFixedAssetManagement(false);
    setShowBudgetManagement(false);
    setShowMonthEndManagement(false);
    setShowAccountReconManagement(false);
    setShowAuditTrailManagement(false);
    setShowCostAccountingManagement(false);
    setShowAccountBalances(false);
    setShowTrialBalances(false);
    setShowGeneralLedger(false);
    setShowFinancialStatements(false);
    setShowIntercompanyManagement(false);
    setShowProfitAndLossReport(false);
    setShowBalanceSheetReport(false);
    setShowCashFlowReport(false);
    setShowIncomeByCustomer(false);
    setShowAgedReceivables(false);
    setShowAgedPayables(false);
    setShowProfitAndLossAnalysis(false);
    setShowBalanceSheetAnalysis(false);
    setShowCashFlowAnalysis(false);
    setShowBudgetVsActualAnalysis(false);
    setShowExpenseAnalysis(false);
    setShowKPIDashboard(false);
    setShowDeviceSettings(false);
    setShowHelpCenter(false);
    setShowTermsAndConditions(false);
    setShowPrivacyPolicy(false);
    setShowDownloadTransactions(false);
    setShowConnectBank(false);
    setShowPayrollTransactions(false);
    setShowBankRecon(false);
    setShowPayrollReport(false);
    setShowBankReport(false);
    setShowInventoryItems(false);
    setShowMainDashboard(false);
    setShowBankTransactions(false);
    setShowInventoryManagement(false);
    setShowHome(false);
  };

  // Event handlers
  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSettingsClose = () => setSettingsAnchorEl(null);
  const handleCloseInvoiceBuilder = () => setShowInvoiceBuilder(false);
  const handleShowInvoiceBuilder = () => {
    setShowInvoiceBuilder(true);
    setShowCreateOptions(false);
    setSelectedOption(null);
    setShowTransactionForm(false);
    setSelectedReport(null);
  };
  const handleShowCreateOptions = (option) => {
    resetAllStates();
    setShowCreateOptions(true);
    setSelectedOption(option);
  };
  const handleShowTransactionForm = () => {
    resetAllStates();
    setShowTransactionForm(true);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setSelectedOption(null);
    setSelectedReport(null);
  };
  const handleSettingsClick = (event) => setSettingsAnchorEl(event.currentTarget);
  const handleSettingsOptionSelect = (option) => {
    resetAllStates();
    setSelectedSettingsOption(option);
    handleSettingsClose();
  };
  const handleUserProfileClick = () => {
    resetAllStates();
    setShowUserProfileSettings(true);
  };
  const handleDeviceSettingsClick = () => {
    resetAllStates();
    setShowDeviceSettings(true);
  };
  const handleHelpClick = () => {
    resetAllStates();
    setShowHelpCenter(true);
  };
  const handlePrivacyClick = () => {
    resetAllStates();
    setShowPrivacyPolicy(true);
  };
  const handleTermsClick = () => {
    resetAllStates();
    setShowTermsAndConditions(true);
  };
  const handleAlertClick = async () => {
    try {
      const response = await axiosInstance.get('/api/alerts/user_alerts/');
      setAlerts(response.data);
      resetAllStates();
      setShowAlerts(true);
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      addMessage('error', 'Failed to fetch alerts');
    }
  };
  const handleIntegrationsClick = () => {
    setShowAPIIntegrations(true);
    handleSettingsClose();
  };
  const handleMainDashboardClick = () => {
    resetAllStates();
    setShowMainDashboard(true);
  };
  const handleKPIDashboardClick = () => {
    resetAllStates();
    setShowKPIDashboard(true);
  };
  const handleHomeClick = () => {
    resetAllStates();
    setShowHome(true);
  };
  const handleBankingClick = (section) => {
    resetAllStates();
    switch (section) {
      case 'dashboard':
        setShowBankingDashboard(true);
        break;
      case 'connect':
        setShowConnectBank(true);
        break;
      case 'reconciliation':
        setShowBankRecon(true);
        break;
      case 'transactions':
        setShowBankTransactions(true);
        break;
      case 'bank-reports':
        setShowBankReport(true);
        break;
    }
  };
  const handleHRClick = (section) => {
    resetAllStates();
    switch (section) {
      case 'employees':
        setShowEmployeeManagement(true);
        break;
      case 'dashboard':
        setShowHRDashboard(true);
        break;
    }
  };
  const handlePayrollClick = (section) => {
    resetAllStates();
    switch (section) {
      case 'dashboard':
        setShowPayrollDashboard(true);
        break;
      case 'run':
        setShowPayrollManagement(true);
        setPayrollSection('run');
        break;
      case 'transactions':
        setShowPayrollTransactions(true);
        setPayrollSection('transactions');
        break;
      case 'reports':
        setShowPayrollReport(true);
        setPayrollSection('reports');
        break;
      case 'timesheet':
        setShowTimesheetManagement(true);
        setPayrollSection('timesheet');
        break;
    }
  };
  const handleAnalysisClick = (analysisType) => {
    resetAllStates();
    setShowAnalysisPage(true);
    switch (analysisType) {
      case 'sales-analysis':
        setShowSalesAnalysis(true);
        break;
      case 'profit-loss-analysis':
        setShowProfitAndLossAnalysis(true);
        break;
      case 'balance-sheet':
        setShowBalanceSheetAnalysis(true);
        break;
      case 'cash-flow':
        setShowCashFlowAnalysis(true);
        break;
      case 'budget-vs-actual':
        setShowBudgetVsActualAnalysis(true);
        break;
      case 'expense-analysis':
        setShowExpenseAnalysis(true);
        break;
    }
  };
  const handleSalesClick = (section) => {
    resetAllStates();
    switch (section) {
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
    }
  };
  const handlePurchasesClick = (section) => {
    resetAllStates();
    switch (section) {
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
    }
  };
  const handleAccountingClick = (section) => {
    resetAllStates();
    switch (section) {
      case 'chart-of-accounts':
        setShowChartOfAccounts(true);
        break;
      case 'journal-entries':
        setShowJournalEntryManagement(true);
        break;
      case 'general-ledger':
        setShowGeneralLedger(true);
        break;
      case 'reconciliation':
        setShowAccountReconManagement(true);
        break;
      case 'month-end-closing':
        setShowMonthEndManagement(true);
        break;
      case 'financial-statements':
        setShowFinancialStatements(true);
        break;
      case 'fixed-assets':
        setShowFixedAssetManagement(true);
        break;
      case 'budgeting':
        setShowBudgetManagement(true);
        break;
      case 'cost-accounting':
        setShowCostAccountingManagement(true);
        break;
      case 'intercompany-transactions':
        setShowIntercompanyManagement(true);
        break;
      case 'audit-trail':
        setShowAuditTrailManagement(true);
        break;
    }
  };
  const handleInventoryClick = (section) => {
    resetAllStates();
    switch (section) {
      case 'inventorydashboard':
        setShowInventoryManagement(true);
        break;
      case 'items':
        setShowInventoryItems(true);
        break;
    }
  };
  const handleReportClick = (reportType) => {
    resetAllStates();
    setShowReports(true);
    setSelectedReport(reportType);
    switch (reportType) {
      case 'income_statement':
        setShowProfitAndLossReport(true);
        break;
      case 'balance_sheet':
        setShowBalanceSheetReport(true);
        break;
      case 'cash_flow':
        setShowCashFlowReport(true);
        break;
      case 'income_by_customer':
        setShowIncomeByCustomer(true);
        break;
      case 'aged_receivables':
        setShowAgedReceivables(true);
        break;
      case 'aged_payables':
        setShowAgedPayables(true);
        break;
      case 'account_balances':
        setShowAccountBalances(true);
        break;
      case 'trial_balance':
        setShowTrialBalances(true);
        break;
      case 'general_ledger':
        setShowGeneralLedger(true);
        break;
    }
  };
  const handleCreateCustomer = () => {
    setShowCreateOptions(true);
    setSelectedOption('Customer');
    setShowCustomerList(false);
  };
  const handleProductsClick = () => {
    setView('productList');
    setShowProductList(true);
    setShowServiceList(false);
    setShowCustomerList(false);
    fetchProducts();
  };
  const handleServicesClick = () => {
    setView('serviceList');
    setShowServiceList(true);
    setShowProductList(false);
    setShowCustomerList(false);
    fetchServices();
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
  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    setView('customerDetails');
  };
  const handleInvoiceSelect = (invoiceId) => setSelectedInvoiceId(invoiceId);
  const handleMarkAsRead = async (alertId) => {
    try {
      await axiosInstance.post(`/api/alerts/${alertId}/mark_as_read/`);
      setAlerts(alerts.map((alert) => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error) {
      logger.error('Error marking alert as read:', error);
    }
  };
  const handleCRMAPIClick = () => {
    console.log('CRM API clicked');
  };
  const handleECommercePlatformAPIClick = () => {
    setShowECommercePlatformAPI(true);
    setShowAPIIntegrations(false);
  };
  const handleUserProfileUpdate = async (data) => {
    try {
      const response = await axiosInstance.patch('/api/profile/', data);
      if (response.status === 200) {
        setUserData(prevData => ({
          ...prevData,
          ...response.data
        }));
        addMessage('success', 'Profile updated successfully');
      }
    } catch (error) {
      logger.error('Error updating profile:', error);
      addMessage('error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      setUserData(null);
      await signOut({ 
        callbackUrl: '/',
        redirect: true
      });
    } catch (error) {
      logger.error('Error during logout:', error);
      router.push('/');
    }
  };
  const handleDeleteAccount = async () => {
    try {
      const response = await axiosInstance.delete('/api/delete-account/');
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

  // Setup state
  const [setupStatus, setSetupStatus] = useState(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [setupError, setSetupError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const settingsMenuOpen = Boolean(settingsAnchorEl);

  // Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedSettingsOption, setSelectedSettingsOption] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Data state
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isShopifyConnected, setIsShopifyConnected] = useState(false);

  // Section state
  const [hrSection, setHRSection] = useState('');
  const [payrollSection, setPayrollSection] = useState('');

  // UI visibility states
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showBankingDashboard, setShowBankingDashboard] = useState(false);
  const [showHRDashboard, setShowHRDashboard] = useState(false);
  const [showPayrollDashboard, setShowPayrollDashboard] = useState(false);
  const [showAnalysisPage, setShowAnalysisPage] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [showServiceList, setShowServiceList] = useState(false);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showServiceManagement, setShowServiceManagement] = useState(false);
  const [showEstimateManagement, setShowEstimateManagement] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showSalesAnalysis, setShowSalesAnalysis] = useState(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = useState(false);
  const [showAPIIntegrations, setShowAPIIntegrations] = useState(false);
  const [showECommercePlatformAPI, setShowECommercePlatformAPI] = useState(false);
  const [showUserProfileSettings, setShowUserProfileSettings] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
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
  const [showTimesheetManagement, setShowTimesheetManagement] = useState(false);
  const [showChartOfAccounts, setShowChartOfAccounts] = useState(false);
  const [showJournalEntryManagement, setShowJournalEntryManagement] = useState(false);
  const [showFixedAssetManagement, setShowFixedAssetManagement] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
  const [showMonthEndManagement, setShowMonthEndManagement] = useState(false);
  const [showAccountReconManagement, setShowAccountReconManagement] = useState(false);
  const [showAuditTrailManagement, setShowAuditTrailManagement] = useState(false);
  const [showCostAccountingManagement, setShowCostAccountingManagement] = useState(false);
  const [showAccountBalances, setShowAccountBalances] = useState(false);
  const [showTrialBalances, setShowTrialBalances] = useState(false);
  const [showGeneralLedger, setShowGeneralLedger] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [showIntercompanyManagement, setShowIntercompanyManagement] = useState(false);
  const [showProfitAndLossReport, setShowProfitAndLossReport] = useState(false);
  const [showBalanceSheetReport, setShowBalanceSheetReport] = useState(false);
  const [showCashFlowReport, setShowCashFlowReport] = useState(false);
  const [showIncomeByCustomer, setShowIncomeByCustomer] = useState(false);
  const [showAgedReceivables, setShowAgedReceivables] = useState(false);
  const [showAgedPayables, setShowAgedPayables] = useState(false);
  const [showProfitAndLossAnalysis, setShowProfitAndLossAnalysis] = useState(false);
  const [showBalanceSheetAnalysis, setShowBalanceSheetAnalysis] = useState(false);
  const [showCashFlowAnalysis, setShowCashFlowAnalysis] = useState(false);
  const [showBudgetVsActualAnalysis, setShowBudgetVsActualAnalysis] = useState(false);
  const [showExpenseAnalysis, setShowExpenseAnalysis] = useState(false);
  const [showKPIDashboard, setShowKPIDashboard] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDownloadTransactions, setShowDownloadTransactions] = useState(false);
  const [showConnectBank, setShowConnectBank] = useState(false);
  const [showPayrollTransactions, setShowPayrollTransactions] = useState(false);
  const [showBankRecon, setShowBankRecon] = useState(false);
  const [showPayrollReport, setShowPayrollReport] = useState(false);
  const [showBankReport, setShowBankReport] = useState(false);
  const [showInventoryItems, setShowInventoryItems] = useState(false);
  const [showMainDashboard, setShowMainDashboard] = useState(false);
  const [showBankTransactions, setShowBankTransactions] = useState(false);
  const [showInventoryManagement, setShowInventoryManagement] = useState(false);
  const [showHome, setShowHome] = useState(false);

  // Data fetching functions
  const fetchProducts = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      logger.error('Error fetching products:', error);
      addMessage('error', 'Failed to fetch products');
    }
  }, [addMessage]);

  const fetchServices = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/services/');
      setServices(response.data);
    } catch (error) {
      logger.error('Error fetching services:', error);
      addMessage('error', 'Failed to fetch services');
    }
  }, [addMessage]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoadingProfile(true);
      
      const response = await axiosInstance.get('/api/profile/');
      
      if (response.status === 200) {
        const { data } = response;
        
        if (!data?.data) {
          logger.error('Invalid profile data structure:', data);
          addMessage('error', 'Invalid profile data received');
          return;
        }

        const { email, profile } = data.data;
        
        const userData = {
          email: email || '',
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          full_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
          business_name: profile?.business_name || '',
          profile: profile || {},
          subscription_type: profile?.active_subscription?.subscription_type || 'free'
        };

        console.log('Profile response:', data.data);
        console.log('Constructed userData:', userData);

        setUserData(userData);

        // Check database setup status
                // Allow dashboard to load immediately while checking setup status
                setIsInitialized(true);
                
                if (profile.database_status === 'pending' || profile.database_status === 'in_progress') {
                  setSetupStatus('in_progress');
                  checkSetupStatus();
                } else if (profile.database_status === 'error') {
                  setSetupStatus('error');
                  setSetupError(profile.setup_error_message || 'Database setup failed');
                } else if (profile.database_status === 'active') {
                  setSetupStatus('complete');
                }
      } else {
        throw new Error(response.statusText);
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      
      if (error.response?.status === 401) {
        await signOut({ 
          callbackUrl: '/'
        });
      } else {
        addMessage('error', `Error fetching user data: ${error.message}`);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [addMessage]);

  const checkSetupStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/onboarding/setup-status/');
      const { status, progress, current_step } = response.data;

      setSetupStatus(status);
      setSetupProgress(progress);
      setCurrentStep(current_step);

      if (status === 'in_progress') {
        // Poll every 3 seconds while setup is in progress
        setTimeout(checkSetupStatus, 3000);
      } else if (status === 'complete') {
        setIsInitialized(true);
      } else if (status === 'error') {
        setSetupError(response.data.error || 'Database setup failed');
      }
    } catch (error) {
      logger.error('Error checking setup status:', error);
      setSetupError('Failed to check setup status');
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Return loading state or content
  if (loadingProfile) {
    return (
      <Box sx={{ opacity: 0.7 }}>
        <Container
          sx={{
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: 'margin-left 0.3s ease, width 0.3s ease',
            padding: 2,
            paddingTop: '66px',
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <CircularProgress />
          <Typography>Loading dashboard...</Typography>
        </Container>
      </Box>
    );
  }

  // Show setup progress overlay if setup is in progress
  const setupOverlay = setupStatus === 'in_progress' && userData && (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: 3,
        padding: 2,
        maxWidth: 400,
      }}
    >
      <SetupInProgress 
        userData={userData}
        setupProgress={setupProgress}
        currentStep={currentStep}
        compact={true}
      />
    </Box>
  );

  // Show main dashboard
  return (
    <ThemeProvider theme={theme}>
      {setupOverlay}
      {session?.user?.onboarding_status === 'setup' && <DashboardSetupStatus />}
      <CssBaseline />
      <AppBar
        mainBackground="#fafafa"
        textAppColor="#263238"
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
        handleSettingsClose={handleSettingsClose}
        handleIntegrationsClick={handleIntegrationsClick}
        isShopifyConnected={isShopifyConnected}
        handleUserProfileClick={handleUserProfileClick}
        handleAlertClick={handleAlertClick}
        handleDeviceSettingsClick={handleDeviceSettingsClick}
        selectedSettingsOption={selectedSettingsOption}
        handleSettingsOptionSelect={handleSettingsOptionSelect}
        handleLogout={handleLogout}
        handleHelpClick={handleHelpClick}
        handlePrivacyClick={handlePrivacyClick}
        handleTermsClick={handleTermsClick}
      />
      <AlertsComponent onAlertClick={handleAlertClick} />
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
        handleMainDashboardClick={handleMainDashboardClick}
        handlePurchasesClick={handlePurchasesClick}
        handleAccountingClick={handleAccountingClick}
        handleInventoryClick={handleInventoryClick}
        handleKPIDashboardClick={handleKPIDashboardClick}
        handleHomeClick={handleHomeClick}
      />

      <Container
        sx={{
          marginLeft: drawerOpen ? `${drawerWidth}px` : '0px',
          width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          transition: 'margin-left 0.3s ease, width 0.3s ease',
          padding: 2,
          paddingTop: '66px',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {showAlerts && <AlertsPage alerts={alerts} onMarkAsRead={handleMarkAsRead} />}
        {showSendGlobalAlert && <SendGlobalAlert />}
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
        {view === 'customerDetails' && selectedCustomerId && (
          <CustomerDetails
            customerId={selectedCustomerId}
            onBackToList={handleBackToList}
            onInvoiceSelect={handleInvoiceSelect}
          />
        )}
        {view === 'productList' && <ProductList products={products} />}
        {view === 'serviceList' && <ServiceList services={services} />}
        {view !== 'invoiceDetails' &&
          view !== 'customerDetails' &&
          view !== 'productList' &&
          view !== 'serviceList' &&
          <RenderMainContent
            showTransactionForm={showTransactionForm}
            showInvoiceBuilder={showInvoiceBuilder}
            showCreateOptions={showCreateOptions}
            selectedOption={selectedOption}
            userData={userData}
            handleCloseInvoiceBuilder={handleCloseInvoiceBuilder}
            showAccountPage={showAccountPage}
            handleDeleteAccount={handleDeleteAccount}
            selectedReport={selectedReport}
            showReports={showReports}
            showBankingDashboard={showBankingDashboard}
            showHRDashboard={showHRDashboard}
            hrSection={hrSection}
            showPayrollDashboard={showPayrollDashboard}
            payrollSection={payrollSection}
            showAnalysisPage={showAnalysisPage}
            showCustomerList={showCustomerList}
            handleCreateCustomer={handleCreateCustomer}
            selectedInvoiceId={selectedInvoiceId}
            handleInvoiceSelect={handleInvoiceSelect}
            handleBackFromInvoice={handleBackFromInvoice}
            showCustomerDetails={showCustomerDetails}
            selectedCustomer={selectedCustomer}
            handleBackToCustomerDetails={handleBackToCustomerDetails}
            setView={setView}
            view={view}
            handleCustomerSelect={handleCustomerSelect}
            showProductManagement={showProductManagement}
            showServiceManagement={showServiceManagement}
            showEstimateManagement={showEstimateManagement}
            showSalesOrderManagement={showSalesOrderManagement}
            showInvoiceManagement={showInvoiceManagement}
            showVendorManagement={showVendorManagement}
            showBillManagement={showBillManagement}
            showPurchaseOrderManagement={showPurchaseOrderManagement}
            showExpensesManagement={showExpensesManagement}
            showPurchaseReturnManagement={showPurchaseReturnManagement}
            showProcurementManagement={showProcurementManagement}
            showEmployeeManagement={showEmployeeManagement}
            showPayrollManagement={showPayrollManagement}
            showTimesheetManagement={showTimesheetManagement}
            showChartOfAccounts={showChartOfAccounts}
            showJournalEntryManagement={showJournalEntryManagement}
            showGeneralLedger={showGeneralLedger}
            showAccountReconManagement={showAccountReconManagement}
            showMonthEndManagement={showMonthEndManagement}
            showFinancialStatements={showFinancialStatements}
            showFixedAssetManagement={showFixedAssetManagement}
            showBudgetManagement={showBudgetManagement}
            showCostAccountingManagement={showCostAccountingManagement}
            showIntercompanyManagement={showIntercompanyManagement}
            showAuditTrailManagement={showAuditTrailManagement}
            showProfitAndLossReport={showProfitAndLossReport}
            showBalanceSheetReport={showBalanceSheetReport}
            showCashFlowReport={showCashFlowReport}
            showIncomeByCustomer={showIncomeByCustomer}
            showAgedReceivables={showAgedReceivables}
            showAgedPayables={showAgedPayables}
            showAccountBalances={showAccountBalances}
            showTrialBalances={showTrialBalances}
            showProfitAndLossAnalysis={showProfitAndLossAnalysis}
            showBalanceSheetAnalysis={showBalanceSheetAnalysis}
            showCashFlowAnalysis={showCashFlowAnalysis}
            showBudgetVsActualAnalysis={showBudgetVsActualAnalysis}
            showSalesAnalysis={showSalesAnalysis}
            showExpenseAnalysis={showExpenseAnalysis}
            showKPIDashboard={showKPIDashboard}
            showIntegrationSettings={showIntegrationSettings}
            showUserProfileSettings={showUserProfileSettings}
            handleUserProfileUpdate={handleUserProfileUpdate}
            showDeviceSettings={showDeviceSettings}
            selectedSettingsOption={selectedSettingsOption}
            showHelpCenter={showHelpCenter}
            showPrivacyPolicy={showPrivacyPolicy}
            showTermsAndConditions={showTermsAndConditions}
            showDownloadTransactions={showDownloadTransactions}
            showConnectBank={showConnectBank}
            showPayrollTransactions={showPayrollTransactions}
            showBankRecon={showBankRecon}
            showPayrollReport={showPayrollReport}
            showBankReport={showBankReport}
            showInventoryItems={showInventoryItems}
            showMainDashboard={showMainDashboard}
            showBankTransactions={showBankTransactions}
            showInventoryManagement={showInventoryManagement}
          />
        }
      </Container>
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
