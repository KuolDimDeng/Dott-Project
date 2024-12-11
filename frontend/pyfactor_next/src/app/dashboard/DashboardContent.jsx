///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardContent.jsx
'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import {
  CssBaseline,
  Box,
  Container,
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
} from '@mui/material';
import ConsoleMessages from './components/components/ConsoleMessages';
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
import { axiosInstance } from '@/lib/axiosConfig';
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
    primary: { main: '#b3e5fc' }, // Navy blue color
    secondary: { main: '#81d4fa' }, // Light blue color
  },
});

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
  const [showFixedAssetManagement, setShowFixedAssetManagement] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
  const [showCostAccountingManagement, setShowCostAccountingManagement] = useState(false);
  const [showIntercompanyManagement, setShowIntercompanyManagement] = useState(false);
  const [showAuditTrailManagement, setShowAuditTrailManagement] = useState(false);
  const [showProfitAndLossReport, setShowProfitAndLossReport] = useState(false);
  const [showBalanceSheetReport, setShowBalanceSheetReport] = useState(false);
  const [showCashFlowReport, setShowCashFlowReport] = useState(false);
  const [showIncomeByCustomer, setShowIncomeByCustomer] = useState(false);
  const [showAgedReceivables, setShowAgedReceivables] = useState(false);
  const [showAgedPayables, setShowAgedPayables] = useState(false);
  const [showAccountBalances, setShowAccountBalances] = useState(false);
  const [showTrialBalances, setShowTrialBalances] = useState(false);
  const [showProfitAndLossAnalysis, setShowProfitAndLossAnalysis] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showBalanceSheetAnalysis, setShowBalanceSheetAnalysis] = useState(false);
  const [showCashFlowAnalysis, setShowCashFlowAnalysis] = useState(false);
  const [showBudgetVsActualAnalysis, setShowBudgetVsActualAnalysis] = useState(false);
  const [showExpenseAnalysis, setShowExpenseAnalysis] = useState(false);
  const [showKPIDashboard, setShowKPIDashboard] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [selectedSettingsOption, setSelectedSettingsOption] = useState(null);
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
  const [showInventoryManagement, setShowInventoryManagement] = useState(false);
  const [showMainDashboard, setShowMainDashboard] = useState(false);
  const [showBankTransactions, setShowBankTransactions] = useState(false);
  const [showHome, setShowHome] = useState(false);

  const router = useRouter();

  const AllResetState = [
    setShowInvoiceBuilder,
    setShowCreateOptions,
    setShowTransactionForm,
    setShowAccountPage,
    setShowReports,
    setShowBankingDashboard,
    setShowHRDashboard,
    setShowPayrollDashboard,
    setShowAnalysisPage,
    setShowCustomerList,
    setShowCustomerDetails,
    setShowProductList,
    setShowServiceList,
    setShowProductManagement,
    setShowServiceManagement,
    setShowEstimateManagement,
    setShowChart,
    setShowSalesAnalysis,
    setShowIntegrationSettings,
    setShowAPIIntegrations,
    setShowECommercePlatformAPI,
    setShowUserProfileSettings,
    setShowAlerts,
    setShowSendGlobalAlert,
    setShowSalesOrderManagement,
    setShowInvoiceManagement,
    setShowVendorManagement,
    setShowBillManagement,
    setShowPurchaseOrderManagement,
    setShowExpensesManagement,
    setShowPurchaseReturnManagement,
    setShowProcurementManagement,
    setShowEmployeeManagement,
    setShowPayrollManagement,
    setShowTimeSheetManagement,
    setShowChartOfAccounts,
    setShowJournalEntryManagement,
    setShowGeneralLedger,
    setShowAccountReconManagement,
    setShowMonthEndManagement,
    setShowFinancialStatements,
    setShowFixedAssetManagement,
    setShowBudgetManagement,
    setShowCostAccountingManagement,
    setShowIntercompanyManagement,
    setShowAuditTrailManagement,
    setShowProfitAndLossReport,
    setShowBalanceSheetReport,
    setShowCashFlowReport,
    setShowIncomeByCustomer,
    setShowAgedReceivables,
    setShowAgedPayables,
    setShowAccountBalances,
    setShowTrialBalances,
    setShowProfitAndLossAnalysis,
    setShowBalanceSheetAnalysis,
    setShowCashFlowAnalysis,
    setShowBudgetVsActualAnalysis,
    setShowExpenseAnalysis,
    setShowKPIDashboard,
    setShowDeviceSettings,
    setSelectedSettingsOption,
    setShowHelpCenter,
    setShowTermsAndConditions,
    setShowPrivacyPolicy,
    setShowDownloadTransactions,
    setShowConnectBank,
    setShowPayrollTransactions,
    setShowBankRecon,
    setShowPayrollReport,
    setShowBankReport,
    setShowInventoryItems,
    setShowMainDashboard,
    setShowBankTransactions,
    setShowInventoryManagement,
    setShowHome,
  ];

  const drawerWidth = 225; // or whatever width you want for your drawer

  const resetAllStatesExcept = (exceptionSetter) => {
    AllResetState.forEach((setter) => {
      if (typeof setter === 'function' && setter !== exceptionSetter) {
        setter(false);
      } else if (typeof setter !== 'function') {
        console.warn('Non-function setter found in AllResetState:', setter);
      }
    });
  };

  const resetAllStates = () => {
    AllResetState.forEach((setter) => {
      if (typeof setter === 'function') {
        setter(false);
      } else {
        console.warn('Non-function setter found in AllResetState:', setter);
      }
    });
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
        const activeSubscription = data.active_subscription;
        const subscriptionType = activeSubscription ? activeSubscription.subscription_type : 'free';

        setUserData({
          ...data,
          subscription_type: subscriptionType,
        });
      } else {
        logger.error('Error fetching user data:', response.statusText);
        addMessage('error', `Error fetching user data: ${response.statusText}`);
        localStorage.removeItem('token');
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      addMessage('error', `Error fetching user data: ${error.message}`);
      localStorage.removeItem('token');
      router.push('/auth/signin');
    }
  }, [addMessage, router]);

  const handleUserProfileClick = () => {
    resetAllStates();
    setShowUserProfileSettings(true);
  };

  const handleDeviceSettingsClick = () => {
    resetAllStates();
    setShowDeviceSettings(true);
  };

  const handleBankingClick = (section) => {
    console.log('handleBankingClick called with section:', section);

    resetAllStates();

    switch (section) {
      case 'dashboard':
        setShowBankingDashboard(true);
        break;
      case 'connect':
        setShowConnectBank(true);
        break;
      case 'reconciliation':
        // Handle reconciliation
        setShowBankRecon(true);
        break;
      case 'transactions':
        // Handle bank balances
        setShowBankTransactions(true);
        break;
      case 'bank-reports':
        // Handle bank reports
        setShowBankReport(true);
        break;
      default:
        console.log('Unknown banking section:', section);
        break;
    }
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    // Clear any user-related data from local storage
    localStorage.removeItem('token');
    // Redirect to the landing page
    router.push('/');
  };

  const handleTermsClick = () => {
    console.log('Terms clicked');
    // Implement Terms and Conditions functionality here
    resetAllStates();
    setShowTermsAndConditions(true);
  };

  const handlePrivacyClick = () => {
    console.log('Privacy clicked');
    // Implement Privacy Policy functionality here
    resetAllStates();
    setShowPrivacyPolicy(true);
  };

  const handleUserProfileUpdate = (updatedUserData) => {
    setUserData(updatedUserData);
    addMessage('info', 'User profile updated successfully');
  };

  const handleHelpClick = () => {
    resetAllStates();
    setShowHelpCenter(true);
  };

  const handleAPIIntegrationsClick = () => {
    resetAllStates();
    setShowAPIIntegrations(true);
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

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleSettingsOptionSelect = (option) => {
    console.log('Selected option:', option);
    resetAllStates(); // Reset all other states
    setSelectedSettingsOption(option); // Update the selected settings option
    handleSettingsClose(); // Close the settings menu after selecting an option
  };

  const handleIntegrationsClick = () => {
    console.log('handleIntegrationsClick called');
    setShowAPIIntegrations(true);
    handleSettingsMenuClose();
    // Reset other view states as needed
    setShowBankingDashboard(false);
    setShowKPIDashboard(false);
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
  };

  const handleSalesClick = (section) => {
    console.log('handleSalesClick called with section:', section);
    resetAllStatesExcept(setShowCustomerList);

    switch (section) {
      case 'customers':
        setShowCustomerList(true);
        setView('customerList');
        break;
      case 'products':
        resetAllStatesExcept(setShowProductManagement);
        setShowProductManagement(true);
        break;
      case 'services':
        resetAllStatesExcept(setShowServiceManagement);
        setShowServiceManagement(true);
        break;
      case 'estimates':
        resetAllStatesExcept(setShowEstimateManagement);
        setShowEstimateManagement(true);
        break;
      case 'orders':
        resetAllStatesExcept(setShowSalesOrderManagement);
        setShowSalesOrderManagement(true);
        break;
      case 'invoices':
        resetAllStatesExcept(setShowInvoiceManagement);
        setShowInvoiceManagement(true);
        break;
      default:
        resetAllStates();
        break;
    }

    // Reset other view states
    setShowBankingDashboard(false);
    setShowKPIDashboard(false);
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
  };

  const handleInventoryClick = (section) => {
    console.log('handleInventoryClick called with section:', section);
    resetAllStates();
    switch (section) {
      case 'inventorydashboard':
        setShowInventoryManagement(true);
        break;
      case 'items':
        setShowInventoryItems(true);
        break;
      case 'categories':
        setShowInventoryCategories(true);
        break;
      // ... handle other cases
      default:
        console.log('Unknown inventory section:', section);
    }
  };

  const handleMainDashboardClick = () => {
    console.log('handleDashboardClick called.');
    resetAllStates();
    setShowMainDashboard(true);
    console.log('view set to: dashboard');
    setShowKPIDashboard(false); // Ensure KPI Dashboard is not visible
  };

  const handleKPIDashboardClick = () => {
    console.log('handleDashboardClick called.');
    resetAllStates();
    console.log('view set to: dashboard');
    setShowKPIDashboard(true); // Ensure KPI Dashboard is not visible
  };

  const handleCustomerSelect = (customerId) => {
    console.log('handleCustomerSelect called with customerId:', customerId);
    setSelectedCustomerId(customerId);
    console.log('selectedCustomerId set to:', customerId);
    setView('customerDetails');
    console.log('view set to: customerDetails');
  };

  const handleInvoiceSelect = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleAnalysisClick = (analysisType) => {
    console.log('handleAnalysisClick called with analysisType:', analysisType);

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
      case 'kpi-data':
        setShowKPIDashboard(true);
        break;
      default:
        console.log('Unknown analysis type:', analysisType);
        break;
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

  const handleHomeClick = () => {
    resetAllStates();
    setShowHome(true);
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
    setShowKPIDashboard(false);
    setShowCreateOptions(false);
    setShowAnalysisPage(false);
    setShowPayrollDashboard(false);
    setSelectedInvoiceId(null);
    setShowInvoiceBuilder(false);
    setShowReports(false);
    setShowTransactionForm(false);
    setShowAccountPage(false);
    setShowSalesAnalysis(false);
    setShowIntegrationSettings(false);

    switch (section) {
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

    resetAllStates();

    switch (section) {
      case 'employees':
        setShowEmployeeManagement(true);
        setPayrollSection('employees');
        break;
      case 'payroll':
      case 'run':
        setShowPayrollManagement(true);
        setPayrollSection('run');
        break;
      case 'timesheets':
        setShowTimeSheetManagement(true);
        setPayrollSection('timesheets');
        break;
      case 'transactions':
        setShowPayrollTransactions(true);
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
        setShowPayrollReport(true);
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
      default:
        console.log('Unknown purchases section:', section);
        break;
    }

    // Reset other view states
    setShowBankingDashboard(false);
    setShowKPIDashboard(false);
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
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleReportClick = (reportType) => {
    console.log('handleReportClick called with reportType:', reportType);

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
      case 'sales_tax_report':
        // setShowSalesTaxReport(true);
        break;
      case 'payroll_wage_tax_report':
        // setShowPayrollWageTaxReport(true);
        break;
      case 'income_by_customer':
        setShowIncomeByCustomer(true);
        break;
      case 'aged_receivables':
        setShowAgedReceivables(true);
        break;
      case 'purchases_by_vendor':
        // setShowPurchasesByVendor(true);
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
      default:
        console.log('Unknown report type:', reportType);
        break;
    }
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
    console.log('Selected Option:', option); // Add this line
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

  const handleAccountingClick = (section) => {
    console.log('handleAccountingClick called with section:', section);

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
      'Are you sure you want to close your account permanently?'
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
      resetAllStates();
      setShowAlerts(true);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      addMessage('error', 'Failed to fetch alerts');
    }
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await axiosInstance.post(`/api/alerts/${alertId}/mark_as_read/`);
      setAlerts(
        alerts.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert))
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleSendGlobalAlertClick = () => {
    resetAllStates();
    setShowSendGlobalAlert(true);
  };

  useEffect(() => {
    fetchUserData();
    setShowKPIDashboard(true);
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
    // ... reset any other view states as necessary
  }, [fetchUserData]);

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
        handleMainDashboardClick={handleMainDashboardClick}
        handlePurchasesClick={handlePurchasesClick}
        handleAccountingClick={handleAccountingClick}
        handleInventoryClick={handleInventoryClick}
        handleKPIDashboardClick={handleKPIDashboardClick}
        handleHomeClick={handleHomeClick}
      />

      <Container
        sx={{
          marginLeft: drawerOpen ? `${drawerWidth}px` : '0px', // Adjust margin based on drawer state
          width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%', // Adjust width based on drawer state
          transition: 'margin-left 0.3s ease, width 0.3s ease', // Smooth transition for drawer
          padding: 2,
          paddingTop: '66px', // Adjust padding-top based on the AppBar height
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
            showFixedAssetManagement,
            showBudgetManagement,
            showCostAccountingManagement,
            showIntercompanyManagement,
            showAuditTrailManagement,
            showProfitAndLossReport,
            showBalanceSheetReport,
            showCashFlowReport,
            showIncomeByCustomer,
            showAgedReceivables,
            showAgedPayables,
            showAccountBalances,
            showTrialBalances,
            showProfitAndLossAnalysis,
            showBalanceSheetAnalysis,
            showCashFlowAnalysis,
            showBudgetVsActualAnalysis,
            showSalesAnalysis,
            showExpenseAnalysis,
            showKPIDashboard,
            showIntegrationSettings,
            showUserProfileSettings,
            handleUserProfileUpdate,
            showDeviceSettings,
            selectedSettingsOption,
            showHelpCenter,
            showPrivacyPolicy,
            showTermsAndConditions,
            showDownloadTransactions,
            showConnectBank,
            showPayrollTransactions,
            showBankRecon,
            showPayrollReport,
            showBankReport,
            showInventoryItems,
            showMainDashboard,
            showBankTransactions,
            showInventoryManagement,
          })}
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
