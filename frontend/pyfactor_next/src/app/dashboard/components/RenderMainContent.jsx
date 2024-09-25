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
      if (selectedSettingsOption) {
        return renderSettingsTabs();
      }



      if (showUserProfileSettings) {
        return <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />;
      }
      if (showIntegrationSettings) return null;
      
  
      if (showProductManagement) {
        return <ProductManagement />;
      }

      if (showConnectBank) {
        return <ConnectBank />;
      }

      if (showInventoryItems) {
        return <InventoryItems />;
      }

      if (showPayrollReport) {
        return <PayrollReport/>;
      }

      if (showBankReport) {
        return <BankReport/>;
      }

      if (showDashboard) {
        return <Dashboard />;
      }

  
  
      if (showServiceManagement) {
        return <ServiceManagement />;
      }
      if (showEstimateManagement) {
        return <EstimateManagement />;
      }

      if (showSalesOrderManagement) {
        return <SalesOrderManagement />;
      }

      if (showInvoiceManagement) {
        return <InvoiceManagement />;
      }

      if (showVendorManagement) {
        return <VendorManagement />;
      }

      if (showBillManagement) {
        return <BillManagement />;
      }
      if (showPurchaseOrderManagement) {
        return <PurchaseOrderManagement />;
      }

      if (showTermsAndConditions) {
        return <TermsAndConditions />;
      }

      if (showBankRecon) {
        return <BankReconciliation />;
      }
      
      if (showPrivacyPolicy) {
        return <PrivacyPolicy />;
      }

      if (showExpensesManagement) {
        return <ExpensesManagement />;
      }

      if (showPurchaseReturnManagement) {
        return <PurchaseReturnsManagement/>;
      }

      if (showProcurementManagement) {
        return <ProcurementManagement />;
      }

      if (showPayrollManagement) {
        return <PayrollManagement/>;
      }

      if (showPayrollTransactions) {
        return <PayrollTransactions />;
      }

      if (showDownloadTransactions) {
        return <DownloadTransactions />;
      }

      if (showTimesheetManagement) {
        return <TimesheetManagement/>;
      }

      if (showChartOfAccounts) {
        return <ChartOfAccountsManagement/>;
      }

      if (showGeneralLedgerManagement) {
        return <GeneralLedgerManagement/>
      }

      if (showAccountReconManagement) {
        return <AccountReconManagement />;
      }

      if (showMonthEndManagement) {
        return <MonthEndManagement />;

      }

      if (showFinancialStatements) {
        return <FinancialManagement/>;
      }

      if (showFixedAssetManagement) {
        return <FixedAssetManagement/>;
      }

      if (showBudgetManagement) {
        return <BudgetManagement/>;
      }

      if (showCostAccountingManagement) {
        return <CostAccountingManagement/>;
      }

      if (showIntercompanyManagement) {
        return <IntercompanyManagement />;
      }

      if (showAuditTrailManagement) {
        return <AuditTrailManagement />;
      }

      if (showProfitAndLossReport) {
        return <ProfitAndLossReport />;
      }

      if (showBalanceSheetReport) {
        return <BalanceSheetReport/>;
      }

      if (showCashFlowReport) {
        return <CashFlowReport/>;
      }

      if (showIncomeByCustomer) {
        return <IncomeByCustomer />;
      }

      if (showAgedReceivables) {
        return <AgedReceivables />;
      }

      if (showAgedPayables) {
        return <AgedPayables />;
      }

      if (showAccountBalances) {
        return <AccountBalances />;
      }

      if (showTrialBalances) {
        return <TrialBalances />;
      }

      if (showProfitAndLossAnalysis) {
        return < ProfitAndLossAnalysis/>;
      }

      if (showBalanceSheetAnalysis) {
        return <BalanceSheetAnalysis/>;
      }

      if (showHelpCenter) {
        return <HelpCenter />;
      }

      if (showCashFlowAnalysis) {
        return <CashFlowAnalysis/>;
      }

      if (showBudgetVsActualAnalysis) {
        return <BudgetVsActualAnalysis/>;
      }

      if (showSalesAnalysis) {
        return <SalesAnalysis/>;
      }

      if (showDeviceSettings) {
        return <DeviceSettings/>;
      }

      if (showExpenseAnalysis) {
        return <ExpenseAnalysis/>;
      }

      if (showKPIDashboard) {
        return <KPIDashboard/>
      }

      if (showEmployeeManagement) {
        console.log('Rendering EmployeeManagement component');
        return <EmployeeManagement />;
      }

      if (showJournalEntryManagement) {
        console.log('Rendering Journal Entry Management Component')
        return <JournalEntryManagement/>;
      }
  
      if (selectedInvoiceId !== null) {
        return <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackFromInvoice} />;
      }
  
      if (showCustomerDetails && selectedCustomer) {
        return <CustomerDetails customer={selectedCustomer} onInvoiceSelect={handleInvoiceSelect} onBack={handleBackToCustomerDetails} />;
      }
  
      if (showAnalysisPage) {
        return <AnalysisPage />;
      }

   
      if (showCustomerList) {
        return (
          <CustomerList 
            onCreateCustomer={handleCreateCustomer} 
            onInvoiceSelect={handleInvoiceSelect}
            onCustomerSelect={handleCustomerSelect}
          />
        );
      }
  
      if (showReports && selectedReport) {
        return <ReportDisplay reportType={selectedReport} />;
      }
  
      if (showBankingDashboard) {
        return <BankingDashboard />;
      }
  
      if (showHRDashboard) {
        return <HRDashboard section={hrSection} />;
      }
  
      if (showPayrollDashboard) {
        return <PayrollDashboard section={payrollSection} />;
      }
  
      if (showAccountPage) {
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button variant="contained" color="error" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </Grid>
          </Grid>
        );
      }
  
      if (showTransactionForm) {
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TransactionForm />
            </Grid>
            <Grid item xs={12}>
              <TransactionList />
            </Grid>
          </Grid>
        );
      }
  
      if (showInvoiceBuilder) {
        return (
          <InvoiceTemplateBuilder
            handleClose={handleCloseInvoiceBuilder}
            userData={userData}
          />
        );
      }
  
      if (showCreateOptions) {
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {renderForm(selectedOption, userData)}
            </Grid>
          </Grid>
        );
      }
  
      return null;
    };
  
    
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          top: '10px',
          overflow: 'auto',
          //background: 'linear-gradient(to bottom, #e3f2fd, #ffffff)', // Light blue to white gradient
        }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            backgroundColor: 'transparent', // Make paper transparent to show gradient
            borderRadius: 2,
            m: 1, // Add margin to show gradient around the paper
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              p: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white
            }}
          >
            {renderContent()}
          </Box>
        </Paper>
      </Box>
    );
  };
  
  export default RenderMainContent;