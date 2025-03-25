'use client';

import React, { Suspense, lazy } from 'react';
import { Box, Button, CircularProgress, Typography, Tabs, Tab } from '@mui/material';
import { TransportDashboard, VehicleManagement } from './transport';

// Empty loading component (removed spinner)
const LoadingComponent = () => null;

// Content Wrapper component
const ContentWrapper = ({ children }) => (
  <Box
    sx={{
      flexGrow: 1,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
      margin: '0',
      padding: { xs: '0.5rem', sm: '0.75rem', md: '1rem' },
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      '& .MuiContainer-root': {
        paddingLeft: { xs: '0.5rem', sm: '1rem' },
        paddingRight: { xs: '0.5rem', sm: '1rem' },
      },
      '& .MuiTable-root': {
        minWidth: { xs: '100%', sm: '650px' },
      },
      '& .MuiTableCell-root': {
        padding: { xs: '0.5rem', sm: '1rem' },
      },
      '& .MuiCardContent-root': {
        padding: { xs: '0.75rem', sm: '1rem', md: '1.25rem' },
      },
      '& .MuiInputBase-root': {
        width: '100%',
      },
    }}
  >
    {children}
  </Box>
);

// Lazy load all components
const CustomerList = lazy(() => import('./lists/CustomerList.js'));
const InvoiceTemplateBuilder = lazy(() => import('./forms/InvoiceTemplateBuilder.js'));
const TransactionForm = lazy(() => import('../../createNew/forms/TransactionForm.js'));
const TransactionList = lazy(() => import('./lists/TransactionList.js'));
const ReportDisplay = lazy(() => import('./forms/ReportDisplay.js'));
const BankingDashboard = lazy(() => import('./forms/BankingDashboard.js'));
const AnalysisPage = lazy(() => import('./forms/AnalysisPage.js'));
const InvoiceDetails = lazy(() => import('./forms/InvoiceDetails.js'));
const CustomerDetails = lazy(() => import('./forms/CustomerDetails.js'));
const RenderForm = lazy(() => import('./RenderForm.js').then(m => ({ default: m.default || m })));
const ProductManagement = lazy(() => import('./forms/ProductManagement.js'));
const ServiceManagement = lazy(() => import('./forms/ServiceManagement.js'));
const EstimateManagement = lazy(() => import('./forms/EstimateManagement.js'));
const SalesOrderManagement = lazy(() => import('./forms/SalesOrderManagement.js'));
const InvoiceManagement = lazy(() => import('./forms/InvoiceManagement.js'));
const VendorManagement = lazy(() => import('./forms/VendorManagement.js'));
const BillManagement = lazy(() => import('./forms/BillManagement.js'));
const PurchaseOrderManagement = lazy(() => import('./forms/PurchaseOrderManagement.js'));
const ExpensesManagement = lazy(() => import('./forms/ExpensesManagement.js'));
const PurchaseReturnsManagement = lazy(() => import('./forms/PurchaseReturnsManagement.js'));
const ProcurementManagement = lazy(() => import('./forms/ProcurementManagement.js'));
const EmployeeManagement = lazy(() => import('./forms/EmployeeManagement.js'));
const PayrollManagement = lazy(() => import('./forms/PayrollManagement.js'));
const TimesheetManagement = lazy(() => import('./forms/TimesheetManagement.js'));
const ChartOfAccountsManagement = lazy(() => import('./forms/ChartOfAccountsManagement.js'));
const JournalEntryManagement = lazy(() => import('./forms/JournalEntryManagement.js'));
const GeneralLedgerManagement = lazy(() => import('./forms/GeneralLedgerManagement.js'));
const AccountReconManagement = lazy(() => import('./forms/AccountReconManagement.js'));
const MonthEndManagement = lazy(() => import('./forms/MonthEndManagement.js'));
const FinancialManagement = lazy(() => import('./forms/FinancialStatementsManagement.js'));
const FixedAssetManagement = lazy(() => import('./forms/FixedAssetManagement.js'));
const BudgetManagement = lazy(() => import('./forms/BudgetManagement.js'));
const CostAccountingManagement = lazy(() => import('./forms/CostAccountingManagement.js'));
const IntercompanyManagement = lazy(() => import('./forms/IntercompanyManagement.js'));
const AuditTrailManagement = lazy(() => import('./forms/AuditTrailManagement.js'));
const ProfitAndLossReport = lazy(() => import('./forms/ProfitAndLossReport.js'));
const BalanceSheetReport = lazy(() => import('./forms/BalanceSheetReport.js'));
const CashFlowReport = lazy(() => import('./forms/CashFlowReport.js'));
const IncomeByCustomer = lazy(() => import('./forms/IncomeByCustomer.js'));
const AgedReceivables = lazy(() => import('./forms/AgedReceivables.js'));
const AgedPayables = lazy(() => import('./forms/AgedPayables.js'));
const AccountBalances = lazy(() => import('./forms/AccountBalances.js'));
const TrialBalances = lazy(() => import('./forms/TrialBalances.js'));
const ProfitAndLossAnalysis = lazy(() => import('./forms/ProfitAndLossAnalysis.js'));
const CashFlowAnalysis = lazy(() => import('./forms/CashFlowAnalysis.js'));
const BudgetVsActualAnalysis = lazy(() => import('./forms/BudgetVsActualAnalysis.js'));
const SalesAnalysis = lazy(() => import('./forms/SalesAnalysis.js'));
const ExpenseAnalysis = lazy(() => import('./forms/ExpenseAnalysis.js'));
const KPIDashboard = lazy(() => import('./dashboards/KPIDashboard'));
const BalanceSheetAnalysis = lazy(() => import('./forms/BalanceSheetAnalysis.js'));
const IntegrationSettings = lazy(() => import('../../Settings/integrations/components/IntegrationSettings.js'));
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
const InventoryManagement = lazy(() => import('@/app/inventory/components/InventoryManagement.js'));
const Home = lazy(() => import('./Home'));
const HRDashboard = lazy(() => import('./forms/HRDashboard.js'));

// CRM Components
const CRMDashboard = lazy(() => import('./crm/CRMDashboard'));
const ContactsManagement = lazy(() => import('./crm/ContactsManagement'));
const LeadsManagement = lazy(() => import('./crm/LeadsManagement'));
const OpportunitiesManagement = lazy(() => import('./crm').then(m => ({ default: m.OpportunitiesManagement })));
const DealsManagement = lazy(() => import('./crm').then(m => ({ default: m.DealsManagement })));
const ActivitiesManagement = lazy(() => import('./crm').then(m => ({ default: m.ActivitiesManagement })));
const CampaignsManagement = lazy(() => import('./crm').then(m => ({ default: m.CampaignsManagement })));
const ReportsManagement = lazy(() => import('./crm').then(m => ({ default: m.ReportsManagement })));

// Analytics Components
const AIQueryPage = lazy(() => import('./forms/AIQueryPage.js'));

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
  // CRM view states
  view,
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

    // CRM view handling
    if (view && view.startsWith('crm-')) {
      return (
        <Suspense fallback={<LoadingComponent />}>
          <ContentWrapper>
            {view === 'crm-dashboard' && <CRMDashboard />}
            {view === 'crm-contacts' && <ContactsManagement />}
            {view === 'crm-leads' && <LeadsManagement />}
            {view === 'crm-opportunities' && <OpportunitiesManagement />}
            {view === 'crm-deals' && <DealsManagement />}
            {view === 'crm-activities' && <ActivitiesManagement />}
            {view === 'crm-campaigns' && <CampaignsManagement />}
            {view === 'crm-reports' && <ReportsManagement />}
          </ContentWrapper>
        </Suspense>
      );
    }

    // Analytics view handling
    if (view && view.startsWith('analytics-') || view === 'ai-query') {
      return (
        <Suspense fallback={<LoadingComponent />}>
          <ContentWrapper>
            {view === 'analytics-dashboard' && <KPIDashboard userData={userData} />}
            {view === 'ai-query' && <AIQueryPage userData={userData} />}
          </ContentWrapper>
        </Suspense>
      );
    }

    // Transport view handling
    if (view && view.startsWith('transport-')) {
      return (
        <Suspense fallback={<LoadingComponent />}>
          <ContentWrapper>
            {view === 'transport-dashboard' && <TransportDashboard />}
            {view === 'transport-equipment' && <VehicleManagement />}
            {view === 'transport-loads' && <div>Loads Management Component Coming Soon</div>}
            {view === 'transport-routes' && <div>Routes Management Component Coming Soon</div>}
            {view === 'transport-expenses' && <div>Transport Expenses Component Coming Soon</div>}
            {view === 'transport-maintenance' && <div>Maintenance Management Component Coming Soon</div>}
            {view === 'transport-compliance' && <div>Compliance Management Component Coming Soon</div>}
            {view === 'transport-reports' && <div>Transport Reports Component Coming Soon</div>}
          </ContentWrapper>
        </Suspense>
      );
    }

    // Sales view handling
    if (view && view.startsWith('sales-')) {
      return (
        <Suspense fallback={<LoadingComponent />}>
          <ContentWrapper>
            {view === 'sales-dashboard' && <SalesAnalysis />}
            {view === 'sales-products' && <ProductManagement salesContext={true} />}
            {view === 'sales-services' && <ServiceManagement salesContext={true} />}
            {view === 'sales-reports' && <ReportDisplay type="sales" />}
          </ContentWrapper>
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<LoadingComponent />}>
        {showEmployeeManagement && (
          <ContentWrapper>
            <EmployeeManagement />
          </ContentWrapper>
        )}
        {showHRDashboard && (
          <ContentWrapper>
            <HRDashboard section={hrSection} />
          </ContentWrapper>
        )}
        {showUserProfileSettings && <UserProfileSettings userData={userData} onUpdate={handleUserProfileUpdate} />}
        {showIntegrationSettings && <IntegrationSettings />}
        {showMainDashboard && <MainDashboard userData={userData} />}
        {showKPIDashboard && <KPIDashboard />}
        {showTransactionForm && <TransactionForm />}
        {showInvoiceBuilder && <InvoiceTemplateBuilder onClose={handleCloseInvoiceBuilder} />}
        {showCustomerList && <CustomerList onCreateCustomer={handleCreateCustomer} onSelectCustomer={handleCustomerSelect} />}
        {showCustomerDetails && selectedCustomer && <CustomerDetails customer={selectedCustomer} onBack={handleBackToCustomerDetails} />}
        {selectedInvoiceId && <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackFromInvoice} />}
        {showProductManagement && <ProductManagement />}
        {showServiceManagement && <ServiceManagement />}
        {showEstimateManagement && <EstimateManagement />}
        {showSalesOrderManagement && <SalesOrderManagement />}
        {showInvoiceManagement && <InvoiceManagement />}
        {showVendorManagement && <VendorManagement />}
        {showBillManagement && <BillManagement />}
        {showPurchaseOrderManagement && <PurchaseOrderManagement />}
        {showExpensesManagement && <ExpensesManagement />}
        {showPurchaseReturnManagement && <PurchaseReturnsManagement />}
        {showProcurementManagement && <ProcurementManagement />}
        {showChartOfAccounts && <ChartOfAccountsManagement />}
        {showJournalEntryManagement && <JournalEntryManagement />}
        {showGeneralLedgerManagement && <GeneralLedgerManagement />}
        {showAccountReconManagement && <AccountReconManagement />}
        {showMonthEndManagement && <MonthEndManagement />}
        {showFinancialStatements && <FinancialManagement />}
        {showFixedAssetManagement && <FixedAssetManagement />}
        {showBudgetManagement && <BudgetManagement />}
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
        {showCashFlowAnalysis && <CashFlowAnalysis />}
        {showBudgetVsActualAnalysis && <BudgetVsActualAnalysis />}
        {showSalesAnalysis && <SalesAnalysis />}
        {showExpenseAnalysis && <ExpenseAnalysis />}
        {showReports && selectedReport && <ReportDisplay reportType={selectedReport} />}
        {showBankingDashboard && <BankingDashboard />}
        {showPayrollDashboard && <div>Payroll Dashboard content goes here</div>}
        {showAnalysisPage && <AnalysisPage />}
        {showHelpCenter && <HelpCenter />}
        {showPrivacyPolicy && <PrivacyPolicy />}
        {showTermsAndConditions && <TermsAndConditions />}
        {showDownloadTransactions && <DownloadTransactions />}
        {showConnectBank && <ConnectBank />}
        {showPayrollTransactions && <PayrollTransactions />}
        {showBankRecon && <BankReconciliation />}
        {showPayrollReport && <PayrollReport />}
        {showBankReport && <BankReport />}
        {showInventoryItems && <InventoryItems />}
        {showBankTransactions && <BankTransactions />}
        {showInventoryManagement && <InventoryManagement />}
        {showHome && <Home userData={userData} />}
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