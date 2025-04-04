'use client';

import React, { Suspense, lazy } from 'react';
// Remove the direct imports and replace with lazy loading
// import { TransportDashboard, VehicleManagement } from './transport';

// Empty loading component (removed spinner)
const LoadingComponent = () => null;

// Content Wrapper component
const ContentWrapper = ({ children }) => (
  <div className="flex-grow w-full h-full m-0 p-2 sm:p-3 md:p-4 flex flex-col box-border overflow-x-hidden">
    {children}
  </div>
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
const MyAccount = lazy(() => import('@/app/Settings/components/MyAccount'));
const HelpCenter = lazy(() => import('@/app/Settings/components/HelpCenter'));
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

// Add lazy loading for Transport components
const TransportDashboard = lazy(() => import('./transport/TransportDashboard.js'));
const VehicleManagement = lazy(() => import('./transport/VehicleManagement.js'));

// CRM Components
const CRMDashboard = lazy(() => import('./crm/CRMDashboard'));
const ContactsManagement = lazy(() => import('./crm/ContactsManagement'));
const LeadsManagement = lazy(() => import('./crm/LeadsManagement'));
const OpportunitiesManagement = lazy(() => import('./crm/OpportunitiesManagement'));
const DealsManagement = lazy(() => import('./crm/DealsManagement'));
const ActivitiesManagement = lazy(() => import('./crm/ActivitiesManagement'));
const CampaignsManagement = lazy(() => import('./crm/CampaignsManagement'));
const ReportsManagement = lazy(() => import('./crm/ReportsManagement'));

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
  showMyAccount,
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
  // Tenant status props
  tenantStatus,
  tenantError,
  tenantId,
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
            <div className="w-full">
              {tabs.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="flex space-x-4">
                    {tabs.map((tab, index) => (
                      <button
                        key={index}
                        className={`py-2 px-4 font-medium ${
                          selectedTab === index
                            ? 'text-blue-600 border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={(e) => handleTabChange(e, index)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-1">
                {content}
              </div>
            </div>
          );
        })()}
      </Suspense>
    );
  };

  const renderContent = () => {
    // If tenant status is pending or error, we still allow access to settings and help
    const isTenantStatusOk = !tenantStatus || tenantStatus === 'success';
    const isSettingsOrHelp = showMyAccount || showHelpCenter || 
      showDeviceSettings || selectedSettingsOption || 
      showTermsAndConditions || showPrivacyPolicy;
    
    // Allow access to these sections regardless of tenant status
    if (isSettingsOrHelp) {
      // Continue with existing settings rendering logic
      return (
        <ContentWrapper>
          {renderSettingsTabs()}
          {selectedSettingsOption === 'profile' && <ProfileSettings />}
          {selectedSettingsOption === 'business' && <BusinessSettings />}
          {selectedSettingsOption === 'accounting' && <AccountingSettings />}
          {selectedSettingsOption === 'payroll' && <PayrollSettings />}
          {showDeviceSettings && <DeviceSettings />}
          {showMyAccount && <MyAccount />}
          {showHelpCenter && <HelpCenter />}
          {showTermsAndConditions && <TermsAndConditions />}
          {showPrivacyPolicy && <PrivacyPolicy />}
        </ContentWrapper>
      );
    }
    
    // For all other features, check tenant status
    if (tenantStatus === 'pending') {
      return (
        <ContentWrapper>
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <h6 className="text-lg font-medium mt-2">
              Setting up your account data...
            </h6>
            <p className="text-sm text-gray-500 mt-1">
              This may take a few moments.
            </p>
          </div>
        </ContentWrapper>
      );
    }
    
    if (tenantStatus === 'error' || tenantStatus === 'invalid_tenant') {
      return (
        <ContentWrapper>
          <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-[600px] mx-auto">
            <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h5 className="text-xl font-medium mb-2">
              Account Setup Issue
            </h5>
            <p className="mb-3">
              We're having trouble setting up your account data. Some features may be unavailable at this time.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {tenantError || "Please try refreshing the page or contact support if this issue persists."}
            </p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </ContentWrapper>
      );
    }
    
    // Continue with the normal content if tenant status is good
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

    // Additional case for createOptions
    if (showCreateOptions) {
      return (
        <Suspense fallback={<LoadingComponent />}>
          <ContentWrapper>
            {/* Render components with proper props even when conditions aren't met
                to ensure hook ordering consistency */}
            <div style={{ display: selectedOption === 'Transaction' ? 'block' : 'none' }}>
              <TransactionForm />
            </div>
            <div style={{ display: selectedOption === 'Product' ? 'block' : 'none' }}>
              <ProductManagement mode="create" />
            </div>
            <div style={{ display: selectedOption === 'Service' ? 'block' : 'none' }}>
              <ServiceManagement mode="create" />
            </div>
            <div style={{ display: selectedOption === 'Invoice' ? 'block' : 'none' }}>
              <InvoiceManagement mode="create" />
            </div>
            <div style={{ display: selectedOption === 'Bill' ? 'block' : 'none' }}>
              <BillManagement mode="create" />
            </div>
            <div style={{ display: selectedOption === 'Estimate' ? 'block' : 'none' }}>
              <EstimateManagement mode="create" />
            </div>
            <div style={{ display: selectedOption === 'Customer' ? 'block' : 'none' }}>
              <CustomerList mode="create" onCreateCustomer={handleCreateCustomer} />
            </div>
            <div style={{ display: selectedOption === 'Vendor' ? 'block' : 'none' }}>
              <VendorManagement mode="create" />
            </div>
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
            <div style={{ display: view === 'sales-products' ? 'block' : 'none' }}>
              <ProductManagement salesContext={true} />
            </div>
            {view === 'sales-services' && <ServiceManagement salesContext={true} />}
            {view === 'sales-reports' && <ReportDisplay type="sales" />}
          </ContentWrapper>
        </Suspense>
      );
    }

    if (showHome) {
      return (
        <ContentWrapper>
          <Suspense fallback={<LoadingComponent />}>
            <Home />
          </Suspense>
        </ContentWrapper>
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
        {showMyAccount && <MyAccount userData={userData} />}
        {showIntegrationSettings && <IntegrationSettings />}
        {showMainDashboard && <MainDashboard userData={userData} />}
        {showKPIDashboard && <KPIDashboard />}
        {showTransactionForm && <TransactionForm />}
        {showInvoiceBuilder && <InvoiceTemplateBuilder onClose={handleCloseInvoiceBuilder} />}
        {showCustomerList && <CustomerList onCreateCustomer={handleCreateCustomer} onSelectCustomer={handleCustomerSelect} />}
        {showCustomerDetails && selectedCustomer && <CustomerDetails customer={selectedCustomer} onBack={handleBackToCustomerDetails} />}
        {selectedInvoiceId && <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackFromInvoice} />}
        <div style={{ display: showProductManagement ? 'block' : 'none' }}>
          <ProductManagement />
        </div>
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
        {showHome && <Home />}
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