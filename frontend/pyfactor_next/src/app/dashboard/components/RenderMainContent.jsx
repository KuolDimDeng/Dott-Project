// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.jsx

import React from 'react';
import CustomerList from './lists/CustomerList.js';
import Grid from '@mui/material/Grid';
import { useState, useCallback, useEffect } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CssBaseline from '@mui/material/CssBaseline';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chart from '../Chart.jsx';
import Deposits from '../Deposits.jsx';
import Orders from '../Orders.jsx';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import DateTime from './components/DateTime.jsx';
import ConsoleMessages from './components/ConsoleMessages.jsx';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import InvoiceTemplateBuilder from './forms/InvoiceTemplateBuilder.jsx';
import ProductForm from './forms/ProductForm.jsx';
import ServiceForm from './forms/ServiceForm.jsx';
import logger from '@utils/logger';
import CustomerForm from '@components/CustomerForm';
import BillForm from './forms/BillForm.jsx';
import InvoiceForm from './forms/InvoiceForm.jsx';
import VendorForm from './forms/VendorForm.jsx';
import EstimateForm from './forms/EstimateForm.jsx';
import SalesOrderForm from './forms/SalesOrderForm.jsx';
import TransactionForm from '../../CreateNew/forms/TransactionForm.jsx';
import TransactionList from './lists/TransactionList.jsx';
import ReportDisplay from './forms/ReportDisplay.jsx';
import MenuIcon from '@mui/icons-material/Menu';
import BankingDashboard from './forms/BankingDashboard.jsx';
import Reports from './components/Reports.jsx';
import Chatbot from './forms/ChatBot.jsx';
import InvoiceDetails from './forms/InvoiceDetails.jsx';
import CustomerDetails from './forms/CustomerDetails.js';
//import BankingDashboard from './forms/BankingDashboard';
//import HRDashboard from './forms/HRDashboard';
//import PayrollDashboard from './forms/PayrollDashboard';
import AnalysisPage from './forms/AnalysisPage.jsx';
import HomeIcon from '@mui/icons-material/Home';
//import AccountPage from './forms/AccountPage';
//import ReportPage from './forms/ReportPage';
import renderForm from './RenderForm.jsx';
import ProductManagement from './forms/ProductManagement.jsx';
import ServiceManagement from './forms/ServiceManagement.jsx';
import EstimateManagement from './forms/EstimateManagement.jsx';
import SalesOrderManagement from './forms/SalesOrderManagement.jsx';
import InvoiceManagement from './forms/InvoiceManagement.jsx'
import VendorManagement from './forms/VendorManagement.jsx';
import BillManagement from './forms/BillManagement.jsx';
import PurchaseOrderManagement from './forms/PurchaseOrderManagement.jsx';
import ExpensesManagement from './forms/ExpensesManagement.jsx';
import PurchaseReturnsManagement from './forms/PurchaseReturnsManagement.jsx';
import ProcurementManagement from './forms/ProcurementManagement.jsx';
import EmployeeManagement from './forms/EmployeeManagement.jsx';
import PayrollManagement from './forms/PayrollManagement.jsx';
import TimesheetManagement from './forms/TimesheetManagement.jsx';
import ChartOfAccountsManagement from './forms/ChartOfAccountsManagement.jsx';
import JournalEntryManagement from './forms/JournalEntryManagement.jsx';
import GeneralLedgerManagement from './forms/GeneralLedgerManagement.jsx';
import AccountReconManagement from './forms/AccountReconManagement.jsx';
import MonthEndManagement from './forms/MonthEndManagement.jsx';
import FinancialManagement from './forms/FinancialStatementsManagement.jsx';
import FixedAssetManagement from './forms/FixedAssetManagement.jsx'
import BudgetManagement from './forms/BudgetManagement.jsx';
import CostAccountingManagement from './forms/CostAccountingManagement.jsx';
import IntercompanyManagement from './forms/IntercompanyManagement.jsx';
import AuditTrailManagement from './forms/AuditTrailManagement.jsx';
import ProfitAndLossReport from './forms/ProfitAndLossReport.jsx';
import BalanceSheetReport from './forms/BalanceSheetReport.jsx';
import CashFlowReport from './forms/CashFlowReport.jsx';
import IncomeByCustomer from './forms/IncomeByCustomer.jsx';
import AgedReceivables from './forms/AgedReceivables.jsx';
import AgedPayables from './forms/AgedPayables.jsx';
import AccountBalances from './forms/AccountBalances.jsx';
import TrialBalances from './forms/TrialBalances.jsx';
import ProfitAndLossAnalysis from './forms/ProfitAndLossAnalysis.jsx';
import CashFlowAnalysis from './forms/CashFlowAnalysis.jsx';
import BudgetVsActualAnalysis from './forms/BudgetVsActualAnalysis.jsx';
import SalesAnalysis from './forms/SalesAnalysis.jsx';
import ExpenseAnalysis from './forms/ExpenseAnalysis.jsx';
import KPIDashboard from './forms/KPIDashboard.jsx';
import BalanceSheet from './forms/BalanceSheetAnalysis.jsx';
import ChartContainer from '@/app/chart/component/ChartContainer';
import IntegrationSettings from '../../Settings/integrations/components/IntegrationSettings.jsx';
import UserProfileSettings from '@/app/Settings/UserProfile/components/UserProfileSettings';
import ProfileSettings from '@/app/settings/components/ProfileSettings';
import BusinessSettings from '@/app/settings/components/BusinessSettings';
import AccountingSettings from '@/app/settings/components/AccountingSettings';
import PayrollSettings from '@/app/settings/components/PayrollSettings';
import DeviceSettings from '@/app/settings/components/DeviceSettings';
import HelpCenter from '@app/helpcenter/components/HelpCenter';
import TermsAndConditions from '@app/Terms&Privacy/components/TermsOfUse';
import PrivacyPolicy from '@app/Terms&Privacy/components/PrivacyPolicy';
import DownloadTransactions from './forms/DownloadTransactions';
import ConnectBank from './forms/ConnectBank';
import PayrollTransactions from './forms/PayrollTransactions';
import BankReconciliation from './forms/BankReconciliation';
import PayrollReport from './forms/PayrollReport';
import BankReport from './forms/BankReport';
import InventoryItems from '@/app/inventory/components/InventoryItemList';
import Dashboard from './forms/Dashboard';


import StatusMessage from './components/StatusMessage.jsx';
import BalanceSheetAnalysis from './forms/BalanceSheetAnalysis.jsx';


const ContentWrapper = ({ children }) => (
  <Box
    sx={{
      flexGrow: 1,
      width: '100%',
      maxWidth: '1200px', // Adjust this value to change the maximum width
      height: '100%', // This will make it take full height of its parent
      margin: '0 auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </Box>
);

const FormWrapper = ({ children }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: '1000px', // Adjust this for form width
      minHeight: '600px', // Adjust this for minimum form height
      margin: '0 auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </Box>
);


const RenderMainContent = ({
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
    handleCustomerSelect,
    handleBackToCustomerDetails,
    showProductManagement,
    showServiceManagement,
    showEstimateManagement,
    showDashboard,
    showIntegrationSettings,
    showUserProfileSettings,
    handleUserProfileUpdate,
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
  


  }) => {
    console.log('RenderMainContent: Rendering with selectedSettingsOption:', selectedSettingsOption);

    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = (event, newValue) => {
      setSelectedTab(newValue);
    };
    
    const renderSettingsTabs = () => {
      console.log('RenderMainContent: renderSettingsTabs called with selectedSettingsOption:', selectedSettingsOption);

      let tabs = [];
      let content = null;
  
      switch (selectedSettingsOption) {
        case 'Profile Settings':
          tabs = ['Personal Information', 'Password and Security', 'Notifications', 'Businesses', 'Billing and Subscriptions'];
          content = <ProfileSettings selectedTab={selectedTab} />;
          break;
        case 'Business Settings':
          tabs = ['User Management', 'Invoices and Estimates', 'Payments', 'Email Templates', 'Custom Charge Settings'];
          content = <BusinessSettings selectedTab={selectedTab} />;
          break;
        case 'Accounting Settings':
          tabs = ['Dates and Currency', 'Sales Tax'];
          content = <AccountingSettings selectedTab={selectedTab} />;
          break;
        case 'Payroll Settings':
          tabs = ['Business Profile', 'Company Signatory', 'Source Bank Account', 'Tax Profile', 'Payroll Setup'];
          content = <PayrollSettings selectedTab={selectedTab} />;
          break;
        case 'Device Settings':
          content = <DeviceSettings />;
          break;
        default:
          return null;
      }
  
      return (
        <Box sx={{ width: '100%' }}>
          {tabs.length > 0 && (
            <Tabs value={selectedTab} onChange={handleTabChange}>
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab} />
              ))}
            </Tabs>
          )}
          <Box sx={{ p: 1 }}>
            {content}
          </Box>
        </Box>
      );
    };


    const renderContent = () => {
      let content = null;
  
      if (selectedSettingsOption) {
        content = renderSettingsTabs();
      } else if (showUserProfileSettings) {
        content = <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />;
      } else if (showIntegrationSettings) {
        return null;
      } else if (showProductManagement) {
        content = (
          <FormWrapper>
            <ProductManagement />
          </FormWrapper>
        );
      } else if (showServiceManagement) {
        content = (
          <FormWrapper>
            <ServiceManagement />
          </FormWrapper>
        );
      } else if (showConnectBank) {
        content = <ConnectBank />;
      } else if (showInventoryItems) {
        content = <InventoryItems />;
      } else if (showPayrollReport) {
        content = <PayrollReport />;
      } else if (showBankReport) {
        content = <BankReport />;
      } else if (showDashboard) {
        content = <Dashboard />;
      } else if (showEstimateManagement) {
        content = <EstimateManagement />;
      } else if (showSalesOrderManagement) {
        content = <SalesOrderManagement />;
      } else if (showInvoiceManagement) {
        content = <InvoiceManagement />;
      } else if (showVendorManagement) {
        content = <VendorManagement />;
      } else if (showBillManagement) {
        content = <BillManagement />;
      } else if (showPurchaseOrderManagement) {
        content = <PurchaseOrderManagement />;
      } else if (showTermsAndConditions) {
        content = <TermsAndConditions />;
      } else if (showBankRecon) {
        content = <BankReconciliation />;
      } else if (showPrivacyPolicy) {
        content = <PrivacyPolicy />;
      } else if (showExpensesManagement) {
        content = <ExpensesManagement />;
      } else if (showPurchaseReturnManagement) {
        content = <PurchaseReturnsManagement />;
      } else if (showProcurementManagement) {
        content = <ProcurementManagement />;
      } else if (showPayrollManagement) {
        content = <PayrollManagement />;
      } else if (showPayrollTransactions) {
        content = <PayrollTransactions />;
      } else if (showDownloadTransactions) {
        content = <DownloadTransactions />;
      } else if (showTimesheetManagement) {
        content = <TimesheetManagement />;
      } else if (showChartOfAccounts) {
        content = <ChartOfAccountsManagement />;
      } else if (showGeneralLedgerManagement) {
        content = <GeneralLedgerManagement />;
      } else if (showAccountReconManagement) {
        content = <AccountReconManagement />;
      } else if (showMonthEndManagement) {
        content = <MonthEndManagement />;
      } else if (showFinancialStatements) {
        content = <FinancialManagement />;
      } else if (showFixedAssetManagement) {
        content = <FixedAssetManagement />;
      } else if (showBudgetManagement) {
        content = <BudgetManagement />;
      } else if (showCostAccountingManagement) {
        content = <CostAccountingManagement />;
      } else if (showIntercompanyManagement) {
        content = <IntercompanyManagement />;
      } else if (showAuditTrailManagement) {
        content = <AuditTrailManagement />;
      } else if (showProfitAndLossReport) {
        content = <ProfitAndLossReport />;
      } else if (showBalanceSheetReport) {
        content = <BalanceSheetReport />;
      } else if (showCashFlowReport) {
        content = <CashFlowReport />;
      } else if (showIncomeByCustomer) {
        content = <IncomeByCustomer />;
      } else if (showAgedReceivables) {
        content = <AgedReceivables />;
      } else if (showAgedPayables) {
        content = <AgedPayables />;
      } else if (showAccountBalances) {
        content = <AccountBalances />;
      } else if (showTrialBalances) {
        content = <TrialBalances />;
      } else if (showProfitAndLossAnalysis) {
        content = <ProfitAndLossAnalysis />;
      } else if (showBalanceSheetAnalysis) {
        content = <BalanceSheetAnalysis />;
      } else if (showHelpCenter) {
        content = <HelpCenter />;
      } else if (showCashFlowAnalysis) {
        content = <CashFlowAnalysis />;
      } else if (showBudgetVsActualAnalysis) {
        content = <BudgetVsActualAnalysis />;
      } else if (showSalesAnalysis) {
        content = <SalesAnalysis />;
      } else if (showDeviceSettings) {
        content = <DeviceSettings />;
      } else if (showExpenseAnalysis) {
        content = <ExpenseAnalysis />;
      } else if (showKPIDashboard) {
        content = <KPIDashboard />;
      } else if (showEmployeeManagement) {
        console.log('Rendering EmployeeManagement component');
        content = <EmployeeManagement />;
      } else if (showJournalEntryManagement) {
        console.log('Rendering Journal Entry Management Component');
        content = <JournalEntryManagement />;
      } else if (selectedInvoiceId !== null) {
        content = <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackFromInvoice} />;
      } else if (showCustomerDetails && selectedCustomer) {
        content = <CustomerDetails customer={selectedCustomer} onInvoiceSelect={handleInvoiceSelect} onBack={handleBackToCustomerDetails} />;
      } else if (showAnalysisPage) {
        content = <AnalysisPage />;
      } else if (showCustomerList) {
        content = (
          <CustomerList 
            onCreateCustomer={handleCreateCustomer} 
            onInvoiceSelect={handleInvoiceSelect}
            onCustomerSelect={handleCustomerSelect}
          />
        );
      } else if (showReports && selectedReport) {
        content = <ReportDisplay reportType={selectedReport} />;
      } else if (showBankingDashboard) {
        content = <BankingDashboard />;
      } else if (showHRDashboard) {
        content = <HRDashboard section={hrSection} />;
      } else if (showPayrollDashboard) {
        content = <PayrollDashboard section={payrollSection} />;
      } else if (showAccountPage) {
        content = (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button variant="contained" color="error" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </Grid>
          </Grid>
        );
      } else if (showTransactionForm) {
        content = (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TransactionForm />
            </Grid>
            <Grid item xs={12}>
              <TransactionList />
            </Grid>
          </Grid>
        );
      } else if (showInvoiceBuilder) {
        content = (
          <InvoiceTemplateBuilder
            handleClose={handleCloseInvoiceBuilder}
            userData={userData}
          />
        );
      } else if (showCreateOptions) {
        content = (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {renderForm(selectedOption, userData)}
            </Grid>
          </Grid>
        );
      }
  
      return content ? <ContentWrapper>{content}</ContentWrapper> : null;
    };
    
    return (
      <Box
        sx={{
          height: 'calc(100vh - 60px)',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            backgroundColor: 'transparent',
            borderRadius: 2,
            m: 1,
          }}
        >
          {renderContent()}
        </Paper>
      </Box>
    );
  };
  
  export default RenderMainContent;