import React, { useState } from 'react';
import { Box, Paper, Grid, Button, Tabs, Tab } from '@mui/material';
import CustomerList from './lists/CustomerList.js';
import InvoiceTemplateBuilder from './forms/InvoiceTemplateBuilder.jsx';
import TransactionForm from '../../createNew/forms/TransactionForm.jsx';
import TransactionList from './lists/TransactionList.jsx';
import ReportDisplay from './forms/ReportDisplay.jsx';
import BankingDashboard from './forms/BankingDashboard.jsx';
import AnalysisPage from './forms/AnalysisPage.jsx';
import InvoiceDetails from './forms/InvoiceDetails.jsx';
import CustomerDetails from './forms/CustomerDetails.js';
import renderForm from './RenderForm.jsx';
import ProductManagement from './forms/ProductManagement.jsx';
import ServiceManagement from './forms/ServiceManagement.jsx';
import EstimateManagement from './forms/EstimateManagement.jsx';
import SalesOrderManagement from './forms/SalesOrderManagement.jsx';
import InvoiceManagement from './forms/InvoiceManagement.jsx';
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
import FixedAssetManagement from './forms/FixedAssetManagement.jsx';
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
import BalanceSheetAnalysis from './forms/BalanceSheetAnalysis.jsx';
import ChartContainer from '@/app/chart/component/ChartContainer';
import IntegrationSettings from '../../Settings/integrations/components/IntegrationSettings.jsx';
import UserProfileSettings from '@/app/Settings/UserProfile/components/UserProfileSettings';
import ProfileSettings from '@/app/settings/components/ProfileSettings';
import BusinessSettings from '@/app/settings/components/BusinessSettings';
import AccountingSettings from '@/app/settings/components/AccountingSettings';
import PayrollSettings from '@/app/settings/components/PayrollSettings';
import DeviceSettings from '@/app/settings/components/DeviceSettings';
import HelpCenter from '@/app/helpcenter/components/HelpCenter';
import TermsAndConditions from '@/app/Terms&Privacy/components/TermsOfUse';
import PrivacyPolicy from '@/app/Terms&Privacy/components/PrivacyPolicy';
import DownloadTransactions from './forms/DownloadTransactions';
import ConnectBank from './forms/ConnectBank';
import PayrollTransactions from './forms/PayrollTransactions';
import BankReconciliation from './forms/BankReconciliation';
import PayrollReport from './forms/PayrollReport';
import BankReport from './forms/BankReport';
import InventoryItems from '@/app/inventory/components/InventoryItemList';
import MainDashboard from './forms/MainDashboard.jsx';
import BankTransactions from './forms/BankTransactionPage';
//import PayrollDashboard from './forms/PayrollDashboard';
import InventoryManagement from '@/app/inventory/components/InventoryManagement.jsx';
import Home from './forms/Home';

const ContentWrapper = ({ children }) => (
  <Box
    sx={{
      flexGrow: 1,
      width: '100%',
      maxWidth: '1200px',
      height: '100%',
      margin: '0',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </Box>
);
const SettingsTabPanel = ({ selectedSettingsOption }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  let tabs = [];
  let content = null;

    switch (selectedSettingsOption) {
      case 'Profile Settings':
        tabs = [
          'Personal Information',
          'Password and Security',
          'Notifications',
          'Businesses',
          'Billing and Subscriptions',
        ];
        content = <ProfileSettings selectedTab={selectedTab} />;
        break;
      case 'Business Settings':
        tabs = [
          'User Management',
          'Invoices and Estimates',
          'Payments',
          'Email Templates',
          'Custom Charge Settings',
        ];
        content = <BusinessSettings selectedTab={selectedTab} />;
        break;
      case 'Accounting Settings':
        tabs = ['Dates and Currency', 'Sales Tax'];
        content = <AccountingSettings selectedTab={selectedTab} />;
        break;
      case 'Payroll Settings':
        tabs = [
          'Business Profile',
          'Company Signatory',
          'Source Bank Account',
          'Tax Profile',
          'Payroll Setup',
        ];
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
        <Box sx={{ p: 1 }}>{content}</Box>
      </Box>
    );
  };


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
  showMainDashboard,
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
  showBankTransactions,
  showInventoryManagement,
  showHome,
}) => {
  console.log('RenderMainContent: Rendering with selectedSettingsOption:', selectedSettingsOption);

  
  const renderContent = () => {
    let content = null;

    if (selectedSettingsOption) {
      content = <SettingsTabPanel selectedSettingsOption={selectedSettingsOption} />;
    } else if (showUserProfileSettings) {
      content = <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />;
    } else if (showIntegrationSettings) {
      return null;
    } else if (showProductManagement) {
      content = <ProductManagement />;
    } else if (showServiceManagement) {
      content = <ServiceManagement />;
    } else if (showConnectBank) {
      content = <ConnectBank />;
    } else if (showInventoryItems) {
      content = <InventoryItems />;
    } else if (showPayrollReport) {
      content = <PayrollReport />;
    } else if (showBankReport) {
      content = <BankReport />;
    } else if (showMainDashboard) {
      content = <MainDashboard />;
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
    } else if (showInventoryManagement) {
      content = <InventoryManagement />;
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
    } else if (showBankTransactions) {
      content = <BankTransactions />;
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
      content = (
        <CustomerDetails
          customer={selectedCustomer}
          onInvoiceSelect={handleInvoiceSelect}
          onBack={handleBackToCustomerDetails}
        />
      );
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
    } else if (showHome) {
      content = <Home />;
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
        <InvoiceTemplateBuilder handleClose={handleCloseInvoiceBuilder} userData={userData} />
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

    return content;
  };

  return <ContentWrapper>{renderContent()}</ContentWrapper>;
};

export default RenderMainContent;
