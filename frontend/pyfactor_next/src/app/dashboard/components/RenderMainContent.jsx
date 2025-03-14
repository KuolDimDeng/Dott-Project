'use client';

import React, { Suspense, lazy } from 'react';
import { Box, Button, CircularProgress, Typography, Tabs, Tab } from '@mui/material';

// Empty loading component (removed spinner)
const LoadingComponent = () => null;

// Content Wrapper component
const ContentWrapper = ({ children }) => (
  <Box
    sx={{
      flexGrow: 1,
      width: '100%',
      maxWidth: '1200px',
      height: '100%',
      margin: '0',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </Box>
);

// Lazy load all components
const CustomerList = lazy(() => import('./lists/CustomerList.js'));
const InvoiceTemplateBuilder = lazy(() => import('./forms/InvoiceTemplateBuilder.jsx'));
const TransactionForm = lazy(() => import('../../createNew/forms/TransactionForm.jsx'));
const TransactionList = lazy(() => import('./lists/TransactionList.jsx'));
const ReportDisplay = lazy(() => import('./forms/ReportDisplay.jsx'));
const BankingDashboard = lazy(() => import('./forms/BankingDashboard.jsx'));
const AnalysisPage = lazy(() => import('./forms/AnalysisPage.jsx'));
const InvoiceDetails = lazy(() => import('./forms/InvoiceDetails.jsx'));
const CustomerDetails = lazy(() => import('./forms/CustomerDetails.js'));
const RenderForm = lazy(() => import('./RenderForm.jsx').then(m => ({ default: m.default || m })));
const ProductManagement = lazy(() => import('./forms/ProductManagement.jsx'));
const ServiceManagement = lazy(() => import('./forms/ServiceManagement.jsx'));
const EstimateManagement = lazy(() => import('./forms/EstimateManagement.jsx'));
const SalesOrderManagement = lazy(() => import('./forms/SalesOrderManagement.jsx'));
const InvoiceManagement = lazy(() => import('./forms/InvoiceManagement.jsx'));
const VendorManagement = lazy(() => import('./forms/VendorManagement.jsx'));
const BillManagement = lazy(() => import('./forms/BillManagement.jsx'));
const PurchaseOrderManagement = lazy(() => import('./forms/PurchaseOrderManagement.jsx'));
const ExpensesManagement = lazy(() => import('./forms/ExpensesManagement.jsx'));
const PurchaseReturnsManagement = lazy(() => import('./forms/PurchaseReturnsManagement.jsx'));
const ProcurementManagement = lazy(() => import('./forms/ProcurementManagement.jsx'));
const EmployeeManagement = lazy(() => import('./forms/EmployeeManagement.jsx'));
const PayrollManagement = lazy(() => import('./forms/PayrollManagement.jsx'));
const TimesheetManagement = lazy(() => import('./forms/TimesheetManagement.jsx'));
const ChartOfAccountsManagement = lazy(() => import('./forms/ChartOfAccountsManagement.jsx'));
const JournalEntryManagement = lazy(() => import('./forms/JournalEntryManagement.jsx'));
const GeneralLedgerManagement = lazy(() => import('./forms/GeneralLedgerManagement.jsx'));
const AccountReconManagement = lazy(() => import('./forms/AccountReconManagement.jsx'));
const MonthEndManagement = lazy(() => import('./forms/MonthEndManagement.jsx'));
const FinancialManagement = lazy(() => import('./forms/FinancialStatementsManagement.jsx'));
const FixedAssetManagement = lazy(() => import('./forms/FixedAssetManagement.jsx'));
const BudgetManagement = lazy(() => import('./forms/BudgetManagement.jsx'));
const CostAccountingManagement = lazy(() => import('./forms/CostAccountingManagement.jsx'));
const IntercompanyManagement = lazy(() => import('./forms/IntercompanyManagement.jsx'));
const AuditTrailManagement = lazy(() => import('./forms/AuditTrailManagement.jsx'));
const ProfitAndLossReport = lazy(() => import('./forms/ProfitAndLossReport.jsx'));
const BalanceSheetReport = lazy(() => import('./forms/BalanceSheetReport.jsx'));
const CashFlowReport = lazy(() => import('./forms/CashFlowReport.jsx'));
const IncomeByCustomer = lazy(() => import('./forms/IncomeByCustomer.jsx'));
const AgedReceivables = lazy(() => import('./forms/AgedReceivables.jsx'));
const AgedPayables = lazy(() => import('./forms/AgedPayables.jsx'));
const AccountBalances = lazy(() => import('./forms/AccountBalances.jsx'));
const TrialBalances = lazy(() => import('./forms/TrialBalances.jsx'));
const ProfitAndLossAnalysis = lazy(() => import('./forms/ProfitAndLossAnalysis.jsx'));
const CashFlowAnalysis = lazy(() => import('./forms/CashFlowAnalysis.jsx'));
const BudgetVsActualAnalysis = lazy(() => import('./forms/BudgetVsActualAnalysis.jsx'));
const SalesAnalysis = lazy(() => import('./forms/SalesAnalysis.jsx'));
const ExpenseAnalysis = lazy(() => import('./forms/ExpenseAnalysis.jsx'));
const KPIDashboard = lazy(() => import('./dashboards/KPIDashboard'));
const BalanceSheetAnalysis = lazy(() => import('./forms/BalanceSheetAnalysis.jsx'));
const IntegrationSettings = lazy(() => import('../../Settings/integrations/components/IntegrationSettings.jsx'));
const UserProfileSettings = lazy(() => import('@/app/Settings/UserProfile/components/UserProfileSettings'));
const ProfileSettings = lazy(() => import('@/app/Settings/components/ProfileSettings'));
const BusinessSettings = lazy(() => import('@/app/Settings/components/BusinessSettings'));
const AccountingSettings = lazy(() => import('@/app/Settings/components/AccountingSettings'));
const PayrollSettings = lazy(() => import('@/app/Settings/components/PayrollSettings'));
const DeviceSettings = lazy(() => import('@/app/Settings/components/DeviceSettings'));
const HelpCenter = lazy(() => import('@/app/helpcenter/components/HelpCenter'));
const TermsAndConditions = lazy(() => import('@/app/Terms&Privacy/components/TermsOfUse'));
const PrivacyPolicy = lazy(() => import('@/app/Terms&Privacy/components/PrivacyPolicy'));
const DownloadTransactions = lazy(() => import('./forms/DownloadTransactions'));
const ConnectBank = lazy(() => import('./forms/ConnectBank'));
const PayrollTransactions = lazy(() => import('./forms/PayrollTransactions'));
const BankReconciliation = lazy(() => import('./forms/BankReconciliation'));
const PayrollReport = lazy(() => import('./forms/PayrollReport'));
const BankReport = lazy(() => import('./forms/BankReport'));
const InventoryItems = lazy(() => import('@/app/inventory/components/InventoryItemList'));
const MainDashboard = lazy(() => import('./dashboards/MainDashboard'));
const BankTransactions = lazy(() => import('./forms/BankTransactionPage'));
const InventoryManagement = lazy(() => import('@/app/inventory/components/InventoryManagement.jsx'));
const Home = lazy(() => import('./Home'));

/**
 * Renders the main content of the dashboard based on the current view
 * This component uses lazy loading to reduce memory usage
 */
function RenderMainContent({
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
}) {
  const [selectedTab, setSelectedTab] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const renderSettingsTabs = () => {
    console.log('RenderMainContent: renderSettingsTabs called with selectedSettingsOption:', selectedSettingsOption);

    let tabs = [];
    let content = null;

    return (
      <Suspense fallback={<LoadingComponent />}>
        {(() => {
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
        })()}
      </Suspense>
    );
  };

  const renderContent = () => {
    if (selectedSettingsOption) {
      return renderSettingsTabs();
    }

    return (
      <Suspense fallback={<LoadingComponent />}>
        {showUserProfileSettings && <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />}
        {showIntegrationSettings && <IntegrationSettings />}
        {showProductManagement && <ProductManagement />}
        {showServiceManagement && <ServiceManagement />}
        {showConnectBank && <ConnectBank />}
        {showInventoryItems && <InventoryItems />}
        {showPayrollReport && <PayrollReport />}
        {showBankReport && <BankReport />}
        {showMainDashboard && <MainDashboard userData={userData} />}
        {showEstimateManagement && <EstimateManagement />}
        {showSalesOrderManagement && <SalesOrderManagement />}
        {showInvoiceManagement && <InvoiceManagement />}
        {showVendorManagement && <VendorManagement />}
        {showBillManagement && <BillManagement />}
        {showPurchaseOrderManagement && <PurchaseOrderManagement />}
        {showTermsAndConditions && <TermsAndConditions />}
        {showBankRecon && <BankReconciliation />}
        {showInventoryManagement && <InventoryManagement />}
        {showPrivacyPolicy && <PrivacyPolicy />}
        {showExpensesManagement && <ExpensesManagement />}
        {showPurchaseReturnManagement && <PurchaseReturnsManagement />}
        {showProcurementManagement && <ProcurementManagement />}
        {showPayrollManagement && <PayrollManagement />}
        {showPayrollTransactions && <PayrollTransactions />}
        {showDownloadTransactions && <DownloadTransactions />}
        {showTimesheetManagement && <TimesheetManagement />}
        {showChartOfAccounts && <ChartOfAccountsManagement />}
        {showGeneralLedgerManagement && <GeneralLedgerManagement />}
        {showAccountReconManagement && <AccountReconManagement />}
        {showMonthEndManagement && <MonthEndManagement />}
        {showFinancialStatements && <FinancialManagement />}
        {showFixedAssetManagement && <FixedAssetManagement />}
        {showBudgetManagement && <BudgetManagement />}
        {showBankTransactions && <BankTransactions />}
        {showCostAccountingManagement && <CostAccountingManagement />}
        {showIntercompanyManagement && <IntercompanyManagement />}
        {showAuditTrailManagement && <AuditTrailManagement />}
        {showProfitAndLossReport && <ProfitAndLossReport />}
        {showBalanceSheetReport && <BalanceSheetReport />}
        {showCashFlowReport && <CashFlowReport />}
        {showIncomeByCustomer && <IncomeByCustomer />}
        {showAgedReceivables && <AgedReceivables />}
        {showAgedPayables && <AgedPayables />}
        {showAccountBalances && <AccountBalances />}
        {showTrialBalances && <TrialBalances />}
        {showProfitAndLossAnalysis && <ProfitAndLossAnalysis />}
        {showBalanceSheetAnalysis && <BalanceSheetAnalysis />}
        {showHelpCenter && <HelpCenter />}
        {showCashFlowAnalysis && <CashFlowAnalysis />}
        {showBudgetVsActualAnalysis && <BudgetVsActualAnalysis />}
        {showSalesAnalysis && <SalesAnalysis />}
        {showDeviceSettings && <DeviceSettings />}
        {showExpenseAnalysis && <ExpenseAnalysis />}
        {showKPIDashboard && <KPIDashboard userData={userData} />}
        {showEmployeeManagement && <EmployeeManagement />}
        {showJournalEntryManagement && <JournalEntryManagement />}
        {selectedInvoiceId !== null && <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackFromInvoice} />}
        {showCustomerDetails && selectedCustomer && <CustomerDetails customer={selectedCustomer} onInvoiceSelect={handleInvoiceSelect} onBack={handleBackToCustomerDetails} />}
        {showAnalysisPage && <AnalysisPage />}
        {showCustomerList && <CustomerList onCreateCustomer={handleCreateCustomer} onInvoiceSelect={handleInvoiceSelect} onCustomerSelect={handleCustomerSelect} />}
        {showReports && selectedReport && <ReportDisplay reportType={selectedReport} />}
        {showBankingDashboard && <BankingDashboard />}
        {showHRDashboard && <div>HR Dashboard content goes here</div>}
        {showPayrollDashboard && <div>Payroll Dashboard content goes here</div>}
        {showHome && <Home userData={userData} />}
        {showAccountPage && (
          <Box>
            <Button variant="contained" color="error" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </Box>
        )}
        {showTransactionForm && (
          <>
            <TransactionForm />
            <TransactionList />
          </>
        )}
        {showInvoiceBuilder && <InvoiceTemplateBuilder handleClose={handleCloseInvoiceBuilder} userData={userData} />}
        {showCreateOptions && <RenderForm selectedOption={selectedOption} userData={userData} />}
      </Suspense>
    );
  };

  return (
    <ContentWrapper>
      {renderContent()}
    </ContentWrapper>
  );
}

export default RenderMainContent;