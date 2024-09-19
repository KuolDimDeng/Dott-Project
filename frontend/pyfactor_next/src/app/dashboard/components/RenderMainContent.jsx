// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.jsx

import React from 'react';
import CustomerList from './lists/CustomerList';
import Grid from '@mui/material/Grid';
import { useState, useCallback, useEffect } from 'react';
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
import Chart from '../Chart';
import Deposits from '../Deposits';
import Orders from '../Orders';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import DateTime from './components/DateTime.jsx';
import ConsoleMessages from './components/ConsoleMessages.jsx';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import InvoiceTemplateBuilder from './forms/InvoiceTemplateBuilder';
import ProductForm from './forms/ProductForm';
import ServiceForm from './forms/ServiceForm';
import logger from '@utils/logger';
import CustomerForm from '@components/CustomerForm';
import BillForm from './forms/BillForm';
import InvoiceForm from './forms/InvoiceForm';
import VendorForm from './forms/VendorForm';
import EstimateForm from './forms/EstimateForm';
import SalesOrderForm from './forms/SalesOrderForm';
import TransactionForm from '../../CreateNew/forms/TransactionForm';
import TransactionList from './lists/TransactionList';
import ReportDisplay from './forms/ReportDisplay';
import MenuIcon from '@mui/icons-material/Menu';
import BankingDashboard from './forms/BankingDashboard';
import Reports from './components/Reports';
import Chatbot from './forms/ChatBot.jsx';
import InvoiceDetails from './forms/InvoiceDetails';
import CustomerDetails from './forms/CustomerDetails';
//import BankingDashboard from './forms/BankingDashboard';
//import HRDashboard from './forms/HRDashboard';
//import PayrollDashboard from './forms/PayrollDashboard';
import AnalysisPage from './forms/AnalysisPage';
import HomeIcon from '@mui/icons-material/Home';
//import AccountPage from './forms/AccountPage';
//import ReportPage from './forms/ReportPage';
import renderForm from './RenderForm';
import ProductManagement from './forms/ProductManagement';
import ServiceManagement from './forms/ServiceManagement';
import EstimateManagement from './forms/EstimateManagement';
import SalesOrderManagement from './forms/SalesOrderManagement';
import InvoiceManagement from './forms/InvoiceManagement'
import VendorManagement from './forms/VendorManagement';
import BillManagement from './forms/BillManagement';
import PurchaseOrderManagement from './forms/PurchaseOrderManagement';
import ExpensesManagement from './forms/ExpensesManagement';
import PurchaseReturnsManagement from './forms/PurchaseReturnsManagement';
import ProcurementManagement from './forms/ProcurementManagement';
import EmployeeManagement from './forms/EmployeeManagement';
import PayrollManagement from './forms/PayrollManagement';
import TimesheetManagement from './forms/TimesheetManagement';
import ChartOfAccountsManagement from './forms/ChartOfAccountsManagement';
import JournalEntryManagement from './forms/JournalEntryManagement';
import GeneralLedgerManagement from './forms/GeneralLedgerManagement';
import AccountReconManagement from './forms/AccountReconManagement';
import MonthEndManagement from './forms/MonthEndManagement';
import FinancialManagement from './forms/FinancialStatementsManagement';
import FixedAssetManagement from './forms/FixedAssetManagement'
import BudgetManagement from './forms/BudgetManagement.jsx';
import CostAccountingManagement from './forms/CostAccountingManagement';
import IntercompanyManagement from './forms/IntercompanyManagement';
import AuditTrailManagement from './forms/AuditTrailManagement';
import ProfitAndLossReport from './forms/ProfitAndLossReport';
import BalanceSheetReport from './forms/BalanceSheetReport';
import CashFlowReport from './forms/CashFlowReport';
import IncomeByCustomer from './forms/IncomeByCustomer';
import AgedReceivables from './forms/AgedReceivables';
import AgedPayables from './forms/AgedPayables';
import AccountBalances from './forms/AccountBalances';
import TrialBalances from './forms/TrialBalances';
import ProfitAndLossAnalysis from './forms/ProfitAndLossAnalysis';
import CashFlowAnalysis from './forms/CashFlowAnalysis';
import BudgetVsActualAnalysis from './forms/BudgetVsActualAnalysis';
import SalesAnalysis from './forms/SalesAnalysis';
import ExpenseAnalysis from './forms/ExpenseAnalysis';
import KPIDashboard from './forms/KPIDashboard';
import BalanceSheet from './forms/BalanceSheetAnalysis';
import ChartContainer from '@/app/chart/component/ChartContainer';
import IntegrationSettings from '../../Settings/integrations/components/IntegrationSettings';
import UserProfileSettings from '@/app/Settings/UserProfile/components/UserProfileSettings';

import StatusMessage from './components/StatusMessage';
import BalanceSheetAnalysis from './forms/BalanceSheetAnalysis';


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

  }) => {
    const renderContent = () => {
      if (showUserProfileSettings) {
        return <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />;
      }
      if (showIntegrationSettings) return null;
      if (showDashboard) {

      return (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1">
            Welcome to your dashboard. Here you can view an overview of your business activities.
          </Typography>
        </Box>
      );
    }
  
      if (showProductManagement) {
        return <ProductManagement />;
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

      if (showCashFlowAnalysis) {
        return <CashFlowAnalysis/>;
      }

      if (showBudgetVsActualAnalysis) {
        return <BudgetVsActualAnalysis/>;
      }

      if (showSalesAnalysis) {
        return <SalesAnalysis/>;
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
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            height: '100%', 
            overflow: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}
        >
          {renderContent()}
        </Paper>
      );
    };
  
  export default RenderMainContent;