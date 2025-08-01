'use client';


import React, { Suspense, lazy, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
// Remove the direct imports and replace with lazy loading
// import { TransportDashboard, VehicleManagement } from './transport';

// Empty loading component (removed spinner)
import StandardSpinner from '@/components/ui/StandardSpinner';
import { captureEvent, capturePageView } from '@/lib/posthog';

const LoadingComponent = () => (
  <div className="py-4 flex items-center justify-center">
    <StandardSpinner size="default" showText={false} />
    <span className="ml-2 text-gray-600">Loading component...</span>
  </div>
);

// Add a custom error fallback component
const ErrorFallback = ({ error, componentName, retry }) => (
  <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800">
    <h2 className="text-lg font-medium">Failed to load {componentName}</h2>
    <p className="text-sm mt-2">{error.message}</p>
    {retry && (
      <button 
        onClick={retry} 
        className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try Again
      </button>
    )}
  </div>
);

// Check component availability in a safer way without using direct imports
console.log('[RenderMainContent] Preparing to load components');

// JobVehicleManagement removed due to MUI dependencies

// Enhanced lazy load with retry
const enhancedLazy = (importFn, componentName) => {
  console.log(`🎯 [Lazy Loading] Creating lazy component for: ${componentName}`);
  return React.lazy(() => {
    const startTime = performance.now();
    console.log(`🎯 [Lazy Loading] Starting import for ${componentName}...`);
    return importFn()
      .then(module => {
        const loadTime = performance.now() - startTime;
        console.log(`✅ [Lazy Loading] Successfully loaded ${componentName} in ${loadTime.toFixed(2)}ms`);
        console.log(`📦 [Lazy Loading] Module content for ${componentName}:`, module);
        return module;
      })
      .catch(err => {
        console.error(`❌ [Lazy Loading] Error loading ${componentName}:`, err);
        console.error(`❌ [Lazy Loading] Error stack:`, err.stack);
        console.error(`❌ [Lazy Loading] Import path that failed:`, importFn.toString());
        return {
          default: (props) => (
            <ErrorFallback 
              error={err} 
              componentName={componentName} 
              retry={() => window.location.reload()}
            />
          )
        };
      });
  });
};

// Content Wrapper component
const ContentWrapper = ({ children, className = '' }) => {
  console.error('[RenderMainContent] ContentWrapper rendering');
  try {
    return (
      <div className={`flex-grow w-full h-full m-0 p-2 sm:p-3 md:p-4 flex flex-col box-border overflow-auto relative z-10 main-content-wrapper ${className}`}>
        {children}
      </div>
    );
  } catch (error) {
    console.error('[RenderMainContent] ERROR in ContentWrapper:', error);
    console.error('[RenderMainContent] Error stack:', error.stack);
    return <div>Error in ContentWrapper: {error.message}</div>;
  }
};

// Lazy load all components with enhanced error handling
console.error('[RenderMainContent] About to lazy load components');
const CustomerList = enhancedLazy(() => import('./lists/CustomerList.js'), 'Customer List');
const CustomerManagement = enhancedLazy(() => import('./forms/CustomerManagement.js'), 'Customer Management');
console.error('[RenderMainContent] CustomerManagement lazy component created');
const InvoiceTemplateBuilder = enhancedLazy(() => import('./forms/InvoiceTemplateBuilder.js'), 'Invoice Template Builder');
const TransactionForm = enhancedLazy(() => import('../../createNew/forms/TransactionForm.js'), 'Transaction Form');
const TransactionList = enhancedLazy(() => import('./lists/TransactionList.js'), 'Transaction List');
const TransactionManagement = enhancedLazy(() => import('./forms/TransactionManagement.js'), 'Transaction Management');
const ReportDisplay = enhancedLazy(() => import('./forms/ReportDisplay.js'), 'Report Display');
const BankingDashboard = enhancedLazy(() => import('./forms/BankingDashboard.js'), 'Banking Dashboard');
const BankingTools = enhancedLazy(() => import('./forms/BankingTools.js'), 'Banking Tools');
const AnalysisPage = enhancedLazy(() => import('./forms/AnalysisPage.js'), 'Analysis Page');
const InvoiceDetails = enhancedLazy(() => import('./forms/InvoiceDetails.js'), 'Invoice Details');
const CustomerDetails = enhancedLazy(() => import('./forms/CustomerDetails.js'), 'Customer Details');
const RenderForm = enhancedLazy(() => import('./RenderForm.js').then(m => ({ default: m.default || m })), 'Render Form');
const CreateProductManagement = enhancedLazy(() => import('./forms/CreateProductManagement.js'), 'Create Product Management');
const SalesProductManagement = enhancedLazy(() => import('./forms/SalesProductManagement.js'), 'Sales Product Management');
const ServiceManagement = enhancedLazy(() => import('./forms/ServiceManagement.js'), 'Service Management');
const ServicesList = enhancedLazy(() => import('../../services/components/ServicesList.js'), 'Services List');
const VendorsList = enhancedLazy(() => import('../../vendors/components/VendorsList.js'), 'Vendors List');
const BillsList = enhancedLazy(() => import('../../bills/components/BillsList.js'), 'Bills List');
const EstimatesList = enhancedLazy(() => import('../../estimates/components/EstimatesList.js'), 'Estimates List');
const CustomersList = enhancedLazy(() => import('../../customers/components/CustomersList.js'), 'Customers List');
const EstimateManagement = enhancedLazy(() => import('./forms/EstimateManagement.js'), 'Estimate Management');
const SalesOrderManagement = enhancedLazy(() => import('./forms/SalesOrderManagement.js'), 'Sales Order Management');
const InvoiceManagement = enhancedLazy(() => import('./forms/InvoiceManagement.js'), 'Invoice Management');
const VendorManagement = enhancedLazy(() => import('./forms/VendorManagement.js'), 'Vendor Management');
const BillManagement = enhancedLazy(() => import('./forms/BillManagement.js'), 'Bill Management');
const PurchaseOrderManagement = enhancedLazy(() => import('./forms/PurchaseOrderManagement.js'), 'Purchase Order Management');
const ExpensesManagement = enhancedLazy(() => import('./forms/ExpensesManagement.js'), 'Expenses Management');
const PurchaseReturnsManagement = enhancedLazy(() => import('./forms/PurchaseReturnsManagement.js'), 'Purchase Returns Management');
const ProcurementManagement = enhancedLazy(() => import('./forms/ProcurementManagement.js'), 'Procurement Management');
const PurchasesReports = enhancedLazy(() => import('./forms/PurchasesReports.js'), 'Purchases Reports');
const EmployeeManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load EmployeeManagement component');
  return import('./forms/EmployeeManagement.js')
    .then(module => {
      console.log('[RenderMainContent] EmployeeManagement component loaded successfully', module);
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading EmployeeManagement component:', err);
      return { 
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Employee Management</h1>
            <p className="mb-4">Manage your employees</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) 
      };
    });
}, 'Employee Management');
const PayrollManagement = enhancedLazy(() => import('./forms/PayrollManagement.js'), 'Payroll Management');
const PayrollWizard = enhancedLazy(() => import('./forms/payroll/PayrollWizard.js'), 'Payroll Wizard');
const TimesheetManagement = enhancedLazy(() => import('./forms/TimesheetManagement.js'), 'Timesheet Management');
const ChartOfAccountsManagement = enhancedLazy(() => import('./forms/ChartOfAccountsManagement.js'), 'Chart of Accounts Management');
const JournalEntryManagement = enhancedLazy(() => import('./forms/JournalEntryManagement.js'), 'Journal Entry Management');
const GeneralLedgerManagement = enhancedLazy(() => import('./forms/GeneralLedgerManagement.js'), 'General Ledger Management');
const AccountReconManagement = enhancedLazy(() => import('./forms/AccountReconManagement.js'), 'Account Reconciliation Management');
const MonthEndManagement = enhancedLazy(() => import('./forms/MonthEndManagement.js'), 'Month End Management');
const FinancialManagement = enhancedLazy(() => import('./forms/FinancialStatementsManagement.js'), 'Financial Statements Management');
const FixedAssetManagement = enhancedLazy(() => import('./forms/FixedAssetManagement.js'), 'Fixed Asset Management');
const BudgetManagement = enhancedLazy(() => import('./forms/BudgetManagement.js'), 'Budget Management');
const CostAccountingManagement = enhancedLazy(() => import('./forms/CostAccountingManagement.js'), 'Cost Accounting Management');
const IntercompanyManagement = enhancedLazy(() => import('./forms/IntercompanyManagement.js'), 'Intercompany Management');
const AuditTrailManagement = enhancedLazy(() => import('./forms/AuditTrailManagement.js'), 'Audit Trail Management');
const ProfitAndLossReport = enhancedLazy(() => import('./forms/ProfitAndLossReport.js'), 'Profit and Loss Report');
const BalanceSheetReport = enhancedLazy(() => import('./forms/BalanceSheetReport.js'), 'Balance Sheet Report');
const CashFlowReport = enhancedLazy(() => import('./forms/CashFlowReport.js'), 'Cash Flow Report');
const IncomeByCustomer = enhancedLazy(() => import('./forms/IncomeByCustomer.js'), 'Income by Customer');
const AgedReceivables = enhancedLazy(() => import('./forms/AgedReceivables.js'), 'Aged Receivables');
const AgedPayables = enhancedLazy(() => import('./forms/AgedPayables.js'), 'Aged Payables');
const AccountBalances = enhancedLazy(() => import('./forms/AccountBalances.js'), 'Account Balances');
const TrialBalances = enhancedLazy(() => import('./forms/TrialBalances.js'), 'Trial Balances');
const ProfitAndLossAnalysis = enhancedLazy(() => import('./forms/ProfitAndLossAnalysis.js'), 'Profit and Loss Analysis');
const CashFlowAnalysis = enhancedLazy(() => import('./forms/CashFlowAnalysis.js'), 'Cash Flow Analysis');
const BudgetVsActualAnalysis = enhancedLazy(() => import('./forms/BudgetVsActualAnalysis.js'), 'Budget vs Actual Analysis');
const SalesAnalysis = enhancedLazy(() => import('./forms/SalesAnalysis.js'), 'Sales Analysis');
const SalesDashboard = enhancedLazy(() => import('./forms/SalesDashboard.js'), 'Sales Dashboard');
const BusinessOverview = enhancedLazy(() => import('./forms/BusinessOverview.js'), 'Business Overview');
const ExpenseAnalysis = enhancedLazy(() => import('./forms/ExpenseAnalysis.js'), 'Expense Analysis');
const KPIDashboard = enhancedLazy(() => import('./dashboards/KPIDashboard'), 'KPI Dashboard');
const BalanceSheetAnalysis = enhancedLazy(() => import('./forms/BalanceSheetAnalysis.js'), 'Balance Sheet Analysis');
const IntegrationSettings = enhancedLazy(() => import('../../Settings/integrations/components/IntegrationSettings.js'), 'Integration Settings');
const UserProfileSettings = enhancedLazy(() => import('@/app/Settings/UserProfile/components/UserProfileSettings'), 'User Profile Settings');
const ProfileSettings = enhancedLazy(() => import('@/app/Settings/components/ProfileSettings'), 'Profile Settings');
const BusinessSettings = enhancedLazy(() => import('@/app/Settings/components/BusinessSettings'), 'Business Settings');
const AccountingSettings = enhancedLazy(() => import('@/app/Settings/components/AccountingSettings'), 'Accounting Settings');
const PayrollSettings = enhancedLazy(() => import('@/app/Settings/components/PayrollSettings'), 'Payroll Settings');
const DeviceSettings = enhancedLazy(() => import('@/app/Settings/components/DeviceSettings'), 'Device Settings');
const SettingsManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load SettingsManagement component');
  return import('@/app/Settings/components/SettingsManagement')
    .then(module => {
      console.log('[RenderMainContent] SettingsManagement component loaded successfully');
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading SettingsManagement component:', err);
      return { 
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Settings Management</h1>
            <p className="mb-4">Manage your account settings</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) 
      };
    });
}, 'Settings Management');
const Profile = enhancedLazy(() => import('@/app/profile/page'), 'Profile');
const HelpCenter = enhancedLazy(() => import('@/app/Settings/components/HelpCenter'), 'Help Center');
const TermsAndConditions = enhancedLazy(() => import('@/app/Terms&Privacy/components/TermsOfUse'), 'Terms and Conditions');
const PrivacyPolicy = enhancedLazy(() => import('@/app/Terms&Privacy/components/PrivacyPolicy'), 'Privacy Policy');
const DownloadTransactions = enhancedLazy(() => import('./forms/DownloadTransactions'), 'Download Transactions');
const ConnectBank = enhancedLazy(() => import('./forms/ConnectBank'), 'Connect Bank');
const PayrollDashboard = enhancedLazy(() => import('./forms/PayrollDashboard'), 'Payroll Dashboard');
const PayrollTransactions = enhancedLazy(() => import('./forms/PayrollTransactions'), 'Payroll Transactions');
const BankReconciliation = enhancedLazy(() => import('./forms/BankReconciliation'), 'Bank Reconciliation');
const PayrollReport = enhancedLazy(() => import('./forms/PayrollReport'), 'Payroll Report');
const BankReport = enhancedLazy(() => import('./forms/BankReport'), 'Bank Report');
const InventoryItems = enhancedLazy(() => import('@/app/inventory/components/InventoryItemList'), 'Inventory Items');
const SupplierManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load SupplierManagement component');
  return import('@/app/inventory/components/SupplierManagement')
    .then(module => {
      console.log('[RenderMainContent] SupplierManagement component loaded successfully');
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading SupplierManagement component:', err);
      return {
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Supplier Management</h1>
            <p className="mb-4">Manage your suppliers and vendors</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      };
    });
}, 'Supplier Management');
const InventoryManagement = enhancedLazy(() => import('@/app/inventory/components/InventoryManagement.js'), 'Inventory Management');
const InventoryDashboard = enhancedLazy(() => import('./forms/InventoryDashboard.js'), 'Inventory Dashboard');
const InventoryReports = enhancedLazy(() => import('./forms/InventoryReports.js'), 'Inventory Reports');
const LocationsManagement = enhancedLazy(() => import('./forms/LocationsManagement.js'), 'Locations Management');
const StockAdjustmentsManagement = enhancedLazy(() => import('./forms/StockAdjustmentsManagement.js'), 'Stock Adjustments Management');
const SuppliersManagement = enhancedLazy(() => import('./forms/SuppliersManagement.js'), 'Suppliers Management');
const ProductManagement = enhancedLazy(() => import('./forms/ProductManagement.js'), 'Product Management');
const SuppliesManagement = enhancedLazy(() => import('./forms/inventory/SuppliesManagement.js'), 'Supplies Management');
const BillOfMaterialsManagement = enhancedLazy(() => import('./forms/inventory/BillOfMaterialsManagement.js'), 'Bill of Materials Management');
const JobManagement = enhancedLazy(() => import('./jobs/JobManagement.js'), 'Job Management');
const JobDashboard = enhancedLazy(() => import('./jobs/JobDashboard.js'), 'Job Dashboard');
const JobReportsManagement = enhancedLazy(() => import('./jobs/JobReportsManagement.js'), 'Job Reports Management');
const POSSystem = enhancedLazy(() => import('./pos/POSSystem.js'), 'POS System');
const MainDashboard = enhancedLazy(() => import('./dashboards/MainDashboard'), 'Main Dashboard');
const BankTransactions = enhancedLazy(() => import('./forms/BankTransactionPage'), 'Bank Transactions');
const HRDashboard = enhancedLazy(() => import('./forms/HRDashboard.js'), 'HR Dashboard');
const PurchasesDashboard = enhancedLazy(() => import('./forms/PurchasesDashboard.js'), 'Purchases Dashboard');
const TaxManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load TaxManagement component');
  return import('./forms/TaxManagement.js')
    .then(module => {
      console.log('[RenderMainContent] TaxManagement component loaded successfully');
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading TaxManagement component:', err);
      return { 
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Tax Management</h1>
            <p className="mb-4">Manage employee tax forms</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) 
      };
    });
}, 'Tax Management');
const BenefitsManagement = enhancedLazy(() => import('./forms/BenefitsManagement.js'), 'Benefits Management');
const PayManagement = enhancedLazy(() => import('./forms/PayManagement.js'), 'Pay Management');
const HRReportsManagement = enhancedLazy(() => import('./forms/ReportsManagement.js'), 'HR Reports Management');
const PerformanceManagement = enhancedLazy(() => import('./forms/PerformanceManagement.js'), 'Performance Management');

// Add lazy loading for Transport components
const TransportDashboard = enhancedLazy(() => import('./transport/TransportDashboard.js'), 'Transport Dashboard');
const TransportVehicleManagement = enhancedLazy(() => import('./transport/TransportVehicleManagement.js'), 'Transport Vehicle Management');

// Add lazy loading for Jobs components
const JobVehicleManagement = enhancedLazy(() => import('./jobs/VehicleManagement.js'), 'Job Vehicle Management');

// CRM Components
const CRMDashboard = enhancedLazy(() => import('./crm/CRMDashboard'), 'CRM Dashboard');
const ContactsManagement = enhancedLazy(() => import('./crm/ContactsManagement'), 'Contacts Management');
const CustomersManagement = enhancedLazy(() => import('./crm/CustomersManagement'), 'Customers Management');
const LeadsManagement = enhancedLazy(() => import('./crm/LeadsManagement'), 'Leads Management');
const OpportunitiesManagement = enhancedLazy(() => import('./crm/OpportunitiesManagement'), 'Opportunities Management');
const DealsManagement = enhancedLazy(() => import('./crm/DealsManagement'), 'Deals Management');
const ActivitiesManagement = enhancedLazy(() => import('./crm/ActivitiesManagement'), 'Activities Management');
const CampaignsManagement = enhancedLazy(() => import('./crm/CampaignsManagement'), 'Campaigns Management');
const ReportsManagement = enhancedLazy(() => import('./crm/ReportsManagement'), 'Reports Management');

// Analytics Components
const SmartInsight = enhancedLazy(() => import('./forms/SmartInsight.js'), 'Smart Insight AI');
const ImportExport = enhancedLazy(() => import('./forms/ImportExport.js'), 'Import/Export');

// Calendar Component
const Calendar = enhancedLazy(() => import('./forms/Calendar.js'), 'Calendar');

// Notifications
const NotificationsPage = enhancedLazy(() => import('../notifications/page.js'), 'Notifications');

// Social Components
const InviteAFriend = enhancedLazy(() => import('./invite/InviteAFriend.js'), 'Invite a Friend');
const DottStatus = enhancedLazy(() => import('./status/DottStatus.js'), 'Dott Status');

// Add a custom error boundary component
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[LazyLoadErrorBoundary] Error caught by boundary:', error);
    console.error('[LazyLoadErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Additional debugging info
    if (error.message) {
      console.error('[LazyLoadErrorBoundary] Error message:', error.message);
    }
    
    if (error.stack) {
      console.error('[LazyLoadErrorBoundary] Error stack:', error.stack);
    }
    
    console.error('[LazyLoadErrorBoundary] Props:', this.props);
    
    // Log to back-end error tracking system if available
    try {
      // Log to console for now, could be replaced with a proper error logging service
      const errorDetails = {
        error: {
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
        location: window.location.href,
        timestamp: new Date().toISOString()
      };
      console.error('[LazyLoadErrorBoundary] Detailed error:', JSON.stringify(errorDetails, null, 2));
    } catch (e) {
      console.error('[LazyLoadErrorBoundary] Error while logging error details:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <h2 className="text-lg font-medium text-red-800">Failed to load component</h2>
          <p className="text-sm mt-2 text-red-800">{this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use this wrapper around suspense components
const SuspenseWithErrorBoundary = ({ children, fallback }) => (
  <LazyLoadErrorBoundary>
    <Suspense fallback={fallback || <LoadingComponent />}>
      {children}
    </Suspense>
  </LazyLoadErrorBoundary>
);

// Adding error handling to chunk loading
const Home = enhancedLazy(() => import('./Home'), 'Home');

const EmployeeTaxManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load EmployeeTaxManagement component');
  return import('./forms/taxes/EmployeeTaxManagement.js')
    .then(module => {
      console.log('[RenderMainContent] EmployeeTaxManagement component loaded successfully', module);
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading EmployeeTaxManagement component:', err);
      return { 
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Employee Tax Management</h1>
            <p className="mb-4">Manage your employee tax information</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) 
      };
    });
}, 'Employee Tax Management');

/**
 * Renders the main content of the dashboard based on the current view
 * This component uses lazy loading to reduce memory usage
 */
const RenderMainContent = React.memo(function RenderMainContent({
  showTransactionForm,
  showInvoiceBuilder,
  showCreateOptions,
  selectedOption,
  userData,
  handleCloseInvoiceBuilder,
  showAccountPage,
  handleDeleteAccount,
  handleSetView,
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
  // Financial management props
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
  // Banking and transaction props
  showDownloadTransactions,
  showConnectBank,
  showPayrollTransactions,
  showBankRecon,
  showPayrollReport,
  showBankReport,
  showBankTransactions,
  showInventoryItems,
  showInventoryManagement,
  // HR management props
  showEmployeeManagement,
  showPayrollManagement,
  showTimesheetManagement,
  showPayManagement,
  showTaxManagement,
  showBenefitsManagement,
  showReportsManagement,
  showPerformanceManagement,
  // Other props
  selectedSettingsOption,
  showMyAccount,
  showHelpCenter,
  showDeviceSettings,
  showTermsAndConditions,
  showPrivacyPolicy,
  showHome,
  showKPIDashboard,
  // CRM view states
  view,
  // Tenant status props
  tenantStatus,
  tenantError,
  tenantId,
  // Drawer state props
  drawerOpen,
  drawerWidth,
  iconOnlyWidth,
  // Custom Content prop
  customContent,
  // Navigation key for component cleanup and remounting
  navigationKey = 'default'
}) {
  // Safety check - ensure userData is defined
  const safeUserData = userData || {};
  console.log('[RenderMainContent] userData safety check:', { 
    received: userData, 
    using: safeUserData,
    type: typeof userData 
  });
  
  // Debug log to see what view is being passed
  console.error('[RenderMainContent] Component rendered with view:', view, 'navigationKey:', navigationKey);
  console.error('[RenderMainContent] All props:', {
    showCustomerList,
    view,
    navigationKey,
    showMainDashboard,
    showHome,
    selectedSettingsOption
  });
  
  // Store current view state for cleanup on navigation
  const [lastView, setLastView] = useState(view);
  const [componentKey, setComponentKey] = useState(`component-${Date.now()}`);
  
  // Add a ref to store component mount information at the top level
  const mountedComponentInfoRef = useRef(null);
  
  // Log when showTaxManagement changes
  useEffect(() => {
    console.log('[RenderMainContent] showTaxManagement changed to:', showTaxManagement);
  }, [showTaxManagement]);
  
  // Update component key when navigation key changes
  useEffect(() => {
    if (navigationKey && navigationKey !== 'default') {
      console.log(`[RenderMainContent] Navigation key changed to: ${navigationKey}, updating component key`);
      setComponentKey(`component-${navigationKey}`);
      
      // Clean up previous view state when view changes
      if (view !== lastView) {
        console.log(`[RenderMainContent] View changed from ${lastView} to ${view}, cleaning up`);
        cleanupViewState(lastView);
        setLastView(view);
      }
    }
  }, [navigationKey, view, lastView]);
  
  // Function to clean up any state from previous views
  const cleanupViewState = (previousView) => {
    console.log(`[RenderMainContent] Cleaning up state for previous view: ${previousView}`);
    
    // Clear any cached data or state for the previous view
    try {
      // Safely clear any relevant localStorage/sessionStorage data
      if (previousView === 'inventory') {
        sessionStorage.removeItem('inventoryState');
        sessionStorage.removeItem('inventoryFilters');
        sessionStorage.removeItem('inventoryScroll');
      } else if (previousView === 'billing' || (previousView && previousView.includes('invoice'))) {
        sessionStorage.removeItem('billingState');
        sessionStorage.removeItem('invoiceFilters');
        sessionStorage.removeItem('invoiceScroll');
      }
      
      // Dispatch an event to notify any listeners that view is changing
      window.dispatchEvent(new CustomEvent('viewCleanup', {
        detail: { previousView, newView: view }
      }));
    } catch (err) {
      console.error(`[RenderMainContent] Error during cleanup for ${previousView}:`, err);
    }
  };

  // Add the componentKey to the SuspenseWithCleanup component
  const SuspenseWithCleanup = ({ children, fallback, componentKey }) => {
    return (
      <LazyLoadErrorBoundary>
        <Suspense fallback={fallback || <LoadingComponent />}>
          <React.Fragment key={componentKey || `suspense-${Date.now()}`}>
            {children}
          </React.Fragment>
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  // State to track drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(drawerOpen);
  
  // Use ref to store content wrapper element
  const contentWrapperRef = useRef(null);
  
  // Update local state when drawer state changes from props
  useEffect(() => {
    setIsDrawerOpen(drawerOpen);
  }, [drawerOpen]);
  
  // Use memo to avoid unnecessary re-renders
  const CustomContentWrapper = useMemo(() => {
    // Return content wrapper function
    const ContentWrapper = ({ children, className = '' }) => (
      <div className={`flex-grow w-full h-full m-0 p-2 sm:p-3 md:p-4 flex flex-col box-border overflow-auto relative z-10 main-content-wrapper ${className}`}>
        {children}
      </div>
    );
    ContentWrapper.displayName = 'ContentWrapper';
    return ContentWrapper;
  }, []);
  
  // Use memo to avoid unnecessary re-renders
  const WrapperComponent = useMemo(() => {
    return CustomContentWrapper;
  }, [CustomContentWrapper]);
  
  // Add useRef for render count and previous props for logging
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Add a cache ref to throttle logging with longer interval (reduced logging frequency)
  const logCacheRef = useRef({
    lastLogTime: 0,
    logInterval: 10000, // Log at most once every 10 seconds (increased from 2s)
  });
  
  // Use useEffect to track renders, but throttle the logging
  useEffect(() => {
    renderCountRef.current += 1;
    
    // Only log if it's been more than logInterval since the last log and only in development
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      if (now - logCacheRef.current.lastLogTime > logCacheRef.current.logInterval) {
        // Update last log time
        logCacheRef.current.lastLogTime = now;
        
        // Create a simplified props representation for comparison
        const keyProps = { view, tenantId };
        const prevKeyProps = prevPropsRef.current;
        
        // Check if key props have changed
        const propsChanged = !prevKeyProps || 
          prevKeyProps.view !== view || 
          prevKeyProps.tenantId !== tenantId;
        
        // Update previous props reference
        prevPropsRef.current = keyProps;
        
        // Log only if props changed or every 20th render (reduced frequency)
        if (propsChanged || renderCountRef.current % 20 === 0) {
          console.log(`RenderMainContent rerender #${renderCountRef.current}:`, {
            view, 
            tenantId,
            hasUserData: !!safeUserData,
          });
        }
      }
    }
  }, [view, tenantId, safeUserData]);
  
  // Memoize the handlers to prevent re-renders
  const handleTabChange = useCallback((event, newValue) => {
    setSelectedTab(newValue);
  }, []);

  // Memoize the settings tabs renderer to prevent unnecessary re-renders
  const renderSettingsTabs = useMemo(() => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('RenderMainContent: renderSettingsTabs called with selectedSettingsOption:', selectedSettingsOption);
    }

    let tabs = [];
    let content = null;

    // If no option is selected, don't render anything
    if (!selectedSettingsOption) {
      return null;
    }

    // Handle the case where selectedSettingsOption is exactly 'Settings'
    if (selectedSettingsOption === 'Settings') {
      console.log('[renderSettingsTabs] Settings option handled elsewhere now');
      return null;
    }

    switch (selectedSettingsOption) {
      case 'Profile Settings':
        tabs = ['Personal Information', 'Password and Security', 'Notifications', 'Businesses', 'Billing and Subscriptions'];
        content = <ProfileSettings selectedTab={selectedTab} />;
        break;
      case 'Business Settings':
        tabs = ['User Management', 'Invoices and Estimates', 'Payments', 'Email Templates', 'Custom Charge Settings', 'WhatsApp Business'];
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
      <SuspenseWithErrorBoundary>
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
      </SuspenseWithErrorBoundary>
    );
  }, [selectedSettingsOption, selectedTab, handleTabChange]);

  // Add internal state cleanup tracking
  const [mountedComponents, setMountedComponents] = useState({});
  const previousViewRef = useRef(view);
  
  // Clean up previous component resources when view changes
  useEffect(() => {
    if (previousViewRef.current !== view) {
      // Track that we're changing views for cleanup purposes
      console.log(`[RenderMainContent] View changing from ${previousViewRef.current} to ${view}`);
      
      // Track page view and feature usage
      if (view) {
        capturePageView(`Dashboard - ${view}`, {
          previous_view: previousViewRef.current,
          tenant_id: tenantId,
          has_user_data: !!safeUserData
        });
        
        captureEvent('dashboard_feature_accessed', {
          feature: view,
          previous_feature: previousViewRef.current,
          tenant_id: tenantId
        });
      }
      
      // Force cleanup of any previous component
      setMountedComponents(prev => ({
        ...prev,
        [previousViewRef.current]: false,
        [view]: true
      }));
      
      // Update ref after state update
      previousViewRef.current = view;
    }
  }, [view, tenantId, safeUserData]);
  
  // Define the content wrapper with key instead of redefining WrapperComponent
  const ContentWrapperWithKey = useCallback(({ children, className = '' }) => (
    <div 
      key={`content-${view}`} 
      className={`flex-grow w-full h-full m-0 p-2 sm:p-3 md:p-4 flex flex-col box-border overflow-auto relative z-10 main-content-wrapper ${className}`}
    >
      {children}
    </div>
  ), [view]);
  ContentWrapperWithKey.displayName = 'ContentWrapperWithKey';

  // Now render components with the componentKey
  const renderContent = useMemo(() => {
    // Use a unique component key for each render cycle to enforce proper cleanup
    const componentKey = `component-${navigationKey || 'default'}`;
    console.log('[RenderMainContent] renderContent called, showTaxManagement:', showTaxManagement);
    
    // Define sectionComponentKey early so it's available throughout the function
    const sectionComponentKey = view || 'default';
    
    // Extract mount information for the component we're about to render
    // DO NOT use React.useRef here - this violates React's rules of hooks
    // Instead, use the mountedComponentInfoRef that we defined at the top level
    
    // Forced cleanup helper - important for component transitions
    const cleanupPreviousComponent = () => {
      // This helps ensure resources from previous components are released
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Ignore errors, gc isn't available in all browsers
        }
      }
    };
    
    try {
      // Check for custom content first
      if (customContent) {
        return (
          <ContentWrapperWithKey>
            {customContent}
          </ContentWrapperWithKey>
        );
      }
      
      // Handle Payments views
      if (view && view.startsWith('payments-') || view && view.startsWith('payment-') || view === 'receive-payments' || view === 'make-payments' || view === 'refunds' || view === 'recurring-payments') {
        console.log('[RenderMainContent] Rendering payments view:', view);
        
        let PaymentComponent = null;
        let componentName = '';
        
        switch(view) {
          case 'payments-dashboard':
            componentName = 'PaymentsDashboard';
            PaymentComponent = lazy(() => import('./forms/PaymentsDashboard.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentsDashboard:', err);
              return { default: () => <div className="p-4">Error loading Payments Dashboard</div> };
            }));
            break;
          case 'receive-payments':
            componentName = 'ReceivePayments';
            PaymentComponent = lazy(() => import('./forms/ReceivePayments.js').catch(err => {
              console.error('[RenderMainContent] Error loading ReceivePayments:', err);
              return { default: () => <div className="p-4">Error loading Receive Payments</div> };
            }));
            break;
          case 'make-payments':
            componentName = 'MakePayments';
            PaymentComponent = lazy(() => import('./forms/MakePayments.js').catch(err => {
              console.error('[RenderMainContent] Error loading MakePayments:', err);
              return { default: () => <div className="p-4">Error loading Make Payments</div> };
            }));
            break;
          case 'payment-methods':
            componentName = 'PaymentMethods';
            PaymentComponent = lazy(() => import('./forms/PaymentMethods.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentMethods:', err);
              return { default: () => <div className="p-4">Error loading Payment Methods</div> };
            }));
            break;
          case 'recurring-payments':
            componentName = 'RecurringPayments';
            PaymentComponent = lazy(() => import('./forms/RecurringPayments.js').catch(err => {
              console.error('[RenderMainContent] Error loading RecurringPayments:', err);
              return { default: () => <div className="p-4">Error loading Recurring Payments</div> };
            }));
            break;
          case 'refunds':
            componentName = 'RefundsManagement';
            PaymentComponent = lazy(() => import('./forms/RefundsManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading RefundsManagement:', err);
              return { default: () => <div className="p-4">Error loading Refunds Management</div> };
            }));
            break;
          case 'payment-reconciliation':
            componentName = 'PaymentReconciliation';
            PaymentComponent = lazy(() => import('./forms/PaymentReconciliation.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentReconciliation:', err);
              return { default: () => <div className="p-4">Error loading Payment Reconciliation</div> };
            }));
            break;
          case 'payment-gateways':
            componentName = 'PaymentGateways';
            PaymentComponent = lazy(() => import('./forms/PaymentGateways.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentGateways:', err);
              return { default: () => <div className="p-4">Error loading Payment Gateways</div> };
            }));
            break;
          case 'payment-plans':
            componentName = 'PaymentPlans';
            PaymentComponent = lazy(() => import('./forms/PaymentPlans.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentPlans:', err);
              return { default: () => <div className="p-4">Error loading Payment Plans</div> };
            }));
            break;
          case 'payment-reports':
            componentName = 'PaymentReports';
            PaymentComponent = lazy(() => import('./forms/PaymentReports.js').catch(err => {
              console.error('[RenderMainContent] Error loading PaymentReports:', err);
              return { default: () => <div className="p-4">Error loading Payment Reports</div> };
            }));
            break;
          default:
            console.warn('[RenderMainContent] Unknown payment view:', view);
            return (
              <ContentWrapperWithKey>
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Payment Feature</h1>
                  <p>This payment feature is not yet implemented: {view}</p>
                </div>
              </ContentWrapperWithKey>
            );
        }
        
        if (PaymentComponent) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup 
                componentKey={`${componentKey}-${view}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <PaymentComponent />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // HR view handling
      if (view && view.startsWith('hr-')) {
        const hrComponentKey = `hr-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={hrComponentKey}>
              {view === 'hr-dashboard' && <HRDashboard />}
              {view === 'hr-employees' && <EmployeeManagement />}
              {view === 'hr-timesheets' && <TimesheetManagement />}
              {view === 'hr-pay' && <PayManagement />}
              {view === 'hr-benefits' && <BenefitsManagement />}
              {view === 'hr-reports' && <ReportDisplay type="hr" />}
              {view === 'hr-performance' && <PerformanceManagement />}
              {/* Legacy view support */}
              {(view === 'employees' || view === 'timesheets' || view === 'pay' || view === 'benefits' || view === 'performance') && (
                <>
                  {view === 'employees' && <EmployeeManagement />}
                  {view === 'timesheets' && <TimesheetManagement />}
                  {view === 'pay' && <PayManagement />}
                  {view === 'benefits' && <BenefitsManagement />}
                  {view === 'performance' && <PerformanceManagement />}
                </>
              )}
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      // Handle Payroll views
      if (view && view.startsWith('payroll-') || view === 'run-payroll' || view === 'payroll-transactions' || view === 'payroll-reports' || showPayrollManagement || showPayrollDashboard || showPayrollTransactions || showPayrollReport) {
        console.log('[RenderMainContent] Rendering payroll view:', view);
        
        let PayrollComponent = null;
        let componentName = '';
        
        // Handle view-based routing first
        if (view) {
          switch(view) {
            case 'payroll':
            case 'payroll-dashboard':
              componentName = 'PayrollDashboard';
              PayrollComponent = lazy(() => import('./forms/PayrollDashboard.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollDashboard:', err);
                return { default: () => <div className="p-4">Error loading Payroll Dashboard</div> };
              }));
              break;
            case 'run-payroll':
            case 'payroll-run':
              componentName = 'PayrollManagement';
              PayrollComponent = lazy(() => import('./forms/PayrollManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollManagement:', err);
                return { default: () => <div className="p-4">Error loading Run Payroll</div> };
              }));
              break;
            case 'payroll-wizard':
              componentName = 'PayrollWizard';
              PayrollComponent = lazy(() => import('./forms/payroll/PayrollWizard.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollWizard:', err);
                return { default: () => <div className="p-4">Error loading Payroll Wizard</div> };
              }));
              break;
            case 'payroll-transactions':
              componentName = 'PayrollTransactions';
              PayrollComponent = lazy(() => import('./forms/PayrollTransactions.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollTransactions:', err);
                return { default: () => <div className="p-4">Error loading Payroll Transactions</div> };
              }));
              break;
            case 'payroll-reports':
              componentName = 'PayrollReport';
              PayrollComponent = lazy(() => import('./forms/PayrollReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollReport:', err);
                return { default: () => <div className="p-4">Error loading Payroll Reports</div> };
              }));
              break;
          }
          
          if (PayrollComponent) {
            return (
              <ContentWrapperWithKey>
                <SuspenseWithCleanup 
                  componentKey={`${componentKey}-${view}`}
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <StandardSpinner size="large" />
                    </div>
                  }
                >
                  <PayrollComponent />
                </SuspenseWithCleanup>
              </ContentWrapperWithKey>
            );
          }
        }
        
        // Direct render for specific payroll states (backwards compatibility)
        if (showPayrollManagement) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`payroll-management-${navigationKey || 'default'}`}>
                <PayrollManagement />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
        
        if (showPayrollDashboard) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`payroll-dashboard-${navigationKey || 'default'}`}>
                <PayrollDashboard />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
        
        if (showPayrollTransactions) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`payroll-transactions-${navigationKey || 'default'}`}>
                <PayrollTransactions />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
        
        if (showPayrollReport) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`payroll-report-${navigationKey || 'default'}`}>
                <PayrollReport />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Handle Taxes views
      if (view && view.startsWith('taxes-') || view === 'sales-tax' || view === 'income-tax' || view === 'payroll-tax' || view === 'tax-payments' || view === 'tax-forms' || view === 'tax-reports' || view === 'tax-settings' || showTaxManagement) {
        console.log('[RenderMainContent] Rendering taxes view:', view);
        
        let TaxesComponent = null;
        let componentName = '';
        
        // Handle view-based routing first
        if (view) {
          switch(view) {
            case 'taxes':
            case 'taxes-dashboard':
              componentName = 'TaxesDashboard';
              TaxesComponent = lazy(() => import('./forms/TaxesDashboard.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxesDashboard:', err);
                return { default: () => <div className="p-4">Error loading Taxes Dashboard</div> };
              }));
              break;
            case 'sales-tax':
            case 'taxes-sales-tax':
              componentName = 'SalesTaxManagement';
              TaxesComponent = lazy(() => import('./forms/SalesTaxManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading SalesTaxManagement:', err);
                return { default: () => <div className="p-4">Error loading Sales Tax Management</div> };
              }));
              break;
            case 'income-tax':
            case 'taxes-income-tax':
              componentName = 'IncomeTaxManagement';
              TaxesComponent = lazy(() => import('./forms/IncomeTaxManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading IncomeTaxManagement:', err);
                return { default: () => <div className="p-4">Error loading Income Tax Management</div> };
              }));
              break;
            case 'payroll-tax':
            case 'taxes-payroll-tax':
              componentName = 'PayrollTaxManagement';
              TaxesComponent = lazy(() => import('./forms/PayrollTaxManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollTaxManagement:', err);
                return { default: () => <div className="p-4">Error loading Payroll Tax Management</div> };
              }));
              break;
            case 'tax-payments':
            case 'taxes-payments':
              componentName = 'TaxPaymentsManagement';
              TaxesComponent = lazy(() => import('./forms/TaxPaymentsManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxPaymentsManagement:', err);
                return { default: () => <div className="p-4">Error loading Tax Payments</div> };
              }));
              break;
            case 'tax-forms':
            case 'taxes-forms':
              componentName = 'TaxFormsManagement';
              TaxesComponent = lazy(() => import('./forms/TaxFormsManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxFormsManagement:', err);
                return { default: () => <div className="p-4">Error loading Tax Forms</div> };
              }));
              break;
            case 'tax-reports':
            case 'taxes-reports':
              componentName = 'TaxReportsManagement';
              TaxesComponent = lazy(() => import('./forms/TaxReportsManagement.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxReportsManagement:', err);
                return { default: () => <div className="p-4">Error loading Tax Reports</div> };
              }));
              break;
            case 'tax-settings':
            case 'taxes-settings':
              componentName = 'TaxSettingsWizard';
              TaxesComponent = lazy(() => import('./forms/TaxSettingsWizard.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxSettingsWizard:', err);
                return { default: () => <div className="p-4">Error loading Tax Settings Wizard</div> };
              }));
              break;
            case 'tax-filing':
            case 'tax-filing-service':
              componentName = 'TaxFilingService';
              TaxesComponent = lazy(() => import('./forms/TaxFilingService.js').catch(err => {
                console.error('[RenderMainContent] Error loading TaxFilingService:', err);
                return { default: () => <div className="p-4">Error loading Tax Filing Service</div> };
              }));
              break;
          }
          
          if (TaxesComponent) {
            return (
              <ContentWrapperWithKey>
                <SuspenseWithCleanup 
                  componentKey={`${componentKey}-${view}`}
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <StandardSpinner size="large" />
                    </div>
                  }
                >
                  <TaxesComponent />
                </SuspenseWithCleanup>
              </ContentWrapperWithKey>
            );
          }
        }
        
        // Direct render for TaxManagement (backwards compatibility)
        if (showTaxManagement) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`tax-management-${navigationKey || 'default'}`}>
                <TaxManagement />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Handle Reports views
      if (view && (view.startsWith('report-') || view === 'income_statement' || view === 'balance_sheet' || view === 'cash_flow' || 
          view === 'sales_tax_report' || view === 'payroll_wage_tax_report' || view === 'income_by_customer' || 
          view === 'aged_receivables' || view === 'purchases_by_vendor' || view === 'aged_payables' || 
          view === 'account_balances' || view === 'trial_balance' || view === 'general_ledger') || 
          (showReports && selectedReport)) {
        console.log('[RenderMainContent] Rendering report view:', view || selectedReport);
        
        let ReportComponent = null;
        let componentName = '';
        let reportType = view || selectedReport;
        
        // Handle view-based routing first
        if (reportType) {
          switch(reportType) {
            case 'reports':
            case 'reports-dashboard':
              componentName = 'ReportsDashboard';
              ReportComponent = lazy(() => import('./forms/ReportsDashboard.js').catch(err => {
                console.error('[RenderMainContent] Error loading ReportsDashboard:', err);
                return { default: () => <div className="p-4">Error loading Reports Dashboard</div> };
              }));
              break;
            case 'income_statement':
            case 'report-income-statement':
              componentName = 'IncomeStatementReport';
              ReportComponent = lazy(() => import('./forms/reports/IncomeStatementReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading IncomeStatementReport:', err);
                return { default: () => <div className="p-4">Error loading Income Statement Report</div> };
              }));
              break;
            case 'balance_sheet':
            case 'report-balance-sheet':
              componentName = 'BalanceSheetReport';
              ReportComponent = lazy(() => import('./forms/reports/BalanceSheetReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading BalanceSheetReport:', err);
                return { default: () => <div className="p-4">Error loading Balance Sheet Report</div> };
              }));
              break;
            case 'cash_flow':
            case 'report-cash-flow':
              componentName = 'CashFlowReport';
              ReportComponent = lazy(() => import('./forms/reports/CashFlowReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading CashFlowReport:', err);
                return { default: () => <div className="p-4">Error loading Cash Flow Report</div> };
              }));
              break;
            case 'sales_tax_report':
            case 'report-sales-tax':
              componentName = 'SalesTaxReport';
              ReportComponent = lazy(() => import('./forms/reports/SalesTaxReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading SalesTaxReport:', err);
                return { default: () => <div className="p-4">Error loading Sales Tax Report</div> };
              }));
              break;
            case 'payroll_wage_tax_report':
            case 'report-payroll-tax':
              componentName = 'PayrollTaxReport';
              ReportComponent = lazy(() => import('./forms/reports/PayrollTaxReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading PayrollTaxReport:', err);
                return { default: () => <div className="p-4">Error loading Payroll Tax Report</div> };
              }));
              break;
            case 'income_by_customer':
            case 'report-income-by-customer':
              componentName = 'IncomeByCustomerReport';
              ReportComponent = lazy(() => import('./forms/reports/IncomeByCustomerReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading IncomeByCustomerReport:', err);
                return { default: () => <div className="p-4">Error loading Income by Customer Report</div> };
              }));
              break;
            case 'aged_receivables':
            case 'report-aged-receivables':
              componentName = 'AgedReceivablesReport';
              ReportComponent = lazy(() => import('./forms/reports/AgedReceivablesReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading AgedReceivablesReport:', err);
                return { default: () => <div className="p-4">Error loading Aged Receivables Report</div> };
              }));
              break;
            case 'purchases_by_vendor':
            case 'report-purchases-by-vendor':
              componentName = 'PurchasesByVendorReport';
              ReportComponent = lazy(() => import('./forms/reports/PurchasesByVendorReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading PurchasesByVendorReport:', err);
                return { default: () => <div className="p-4">Error loading Purchases by Vendor Report</div> };
              }));
              break;
            case 'aged_payables':
            case 'report-aged-payables':
              componentName = 'AgedPayablesReport';
              ReportComponent = lazy(() => import('./forms/reports/AgedPayablesReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading AgedPayablesReport:', err);
                return { default: () => <div className="p-4">Error loading Aged Payables Report</div> };
              }));
              break;
            case 'account_balances':
            case 'report-account-balances':
              componentName = 'AccountBalancesReport';
              ReportComponent = lazy(() => import('./forms/reports/AccountBalancesReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading AccountBalancesReport:', err);
                return { default: () => <div className="p-4">Error loading Account Balances Report</div> };
              }));
              break;
            case 'trial_balance':
            case 'report-trial-balance':
              componentName = 'TrialBalanceReport';
              ReportComponent = lazy(() => import('./forms/reports/TrialBalanceReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading TrialBalanceReport:', err);
                return { default: () => <div className="p-4">Error loading Trial Balance Report</div> };
              }));
              break;
            case 'general_ledger':
            case 'report-general-ledger':
              componentName = 'GeneralLedgerReport';
              ReportComponent = lazy(() => import('./forms/reports/GeneralLedgerReport.js').catch(err => {
                console.error('[RenderMainContent] Error loading GeneralLedgerReport:', err);
                return { default: () => <div className="p-4">Error loading General Ledger Report</div> };
              }));
              break;
            default:
              // Fallback to generic ReportDisplay
              componentName = 'ReportDisplay';
              ReportComponent = lazy(() => import('./forms/ReportDisplay.js').catch(err => {
                console.error('[RenderMainContent] Error loading ReportDisplay:', err);
                return { default: () => <div className="p-4">Error loading Report</div> };
              }));
              break;
          }
          
          if (ReportComponent) {
            return (
              <ContentWrapperWithKey>
                <SuspenseWithCleanup 
                  componentKey={`${componentKey}-${reportType}`}
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <StandardSpinner size="large" />
                    </div>
                  }
                >
                  <ReportComponent reportType={reportType} />
                </SuspenseWithCleanup>
              </ContentWrapperWithKey>
            );
          }
        }
      }
      
      // Handle Banking views
      if (view && view.startsWith('banking') || view === 'connect-bank' || view === 'bank-transactions' || view === 'bank-reconciliation' || view === 'bank-reports' || view === 'banking-tools') {
        console.log('[RenderMainContent] Rendering banking view:', view);
        
        let BankingComponent = null;
        let componentName = '';
        
        switch(view) {
          case 'banking':
            componentName = 'BankingDashboard';
            BankingComponent = lazy(() => import('./forms/BankingDashboard.js').catch(err => {
              console.error('[RenderMainContent] Error loading BankingDashboard:', err);
              return { default: () => <div className="p-4">Error loading Banking Dashboard</div> };
            }));
            break;
          case 'connect-bank':
            componentName = 'ConnectBankManagement';
            BankingComponent = lazy(() => import('./forms/ConnectBankManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading ConnectBankManagement:', err);
              return { default: () => <div className="p-4">Error loading Connect to Bank</div> };
            }));
            break;
          case 'bank-transactions':
            componentName = 'BankTransactionPage';
            BankingComponent = lazy(() => import('./forms/BankTransactionPage.js').catch(err => {
              console.error('[RenderMainContent] Error loading BankTransactionPage:', err);
              return { default: () => <div className="p-4">Error loading Bank Transactions</div> };
            }));
            break;
          case 'bank-reconciliation':
            componentName = 'BankReconciliation';
            BankingComponent = lazy(() => import('./forms/BankReconciliation.js').catch(err => {
              console.error('[RenderMainContent] Error loading BankReconciliation:', err);
              return { default: () => <div className="p-4">Error loading Bank Reconciliation</div> };
            }));
            break;
          case 'bank-reports':
            componentName = 'BankReport';
            BankingComponent = lazy(() => import('./forms/BankReport.js').catch(err => {
              console.error('[RenderMainContent] Error loading BankReport:', err);
              return { default: () => <div className="p-4">Error loading Banking Reports</div> };
            }));
            break;
          case 'banking-tools':
            componentName = 'BankingTools';
            BankingComponent = lazy(() => import('./forms/BankingTools.js').catch(err => {
              console.error('[RenderMainContent] Error loading BankingTools:', err);
              return { default: () => <div className="p-4">Error loading Banking Tools</div> };
            }));
            break;
          default:
            console.warn('[RenderMainContent] Unknown banking view:', view);
            return (
              <ContentWrapperWithKey>
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Banking Feature</h1>
                  <p>This banking feature is not yet implemented: {view}</p>
                </div>
              </ContentWrapperWithKey>
            );
        }
        
        if (BankingComponent) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup 
                componentKey={`${componentKey}-${view}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <BankingComponent />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Handle Purchases views
      if (view && (view === 'purchases-dashboard' || view === 'vendor-management' || view === 'purchase-order-management' || view === 'bill-management' || view === 'expenses-management' || view === 'purchase-returns-management' || view === 'procurement-management' || view === 'purchases-reports')) {
        console.log('[RenderMainContent] Rendering purchases view:', view);
        
        let PurchaseComponent = null;
        let componentName = '';
        
        switch(view) {
          case 'purchases-dashboard':
            componentName = 'PurchasesDashboard';
            PurchaseComponent = lazy(() => import('./forms/PurchasesDashboard.js').catch(err => {
              console.error('[RenderMainContent] Error loading PurchasesDashboard:', err);
              return { default: () => <div className="p-4">Error loading Purchases Dashboard</div> };
            }));
            break;
          case 'vendor-management':
            componentName = 'VendorManagement';
            PurchaseComponent = lazy(() => import('./forms/VendorManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading VendorManagement:', err);
              return { default: () => <div className="p-4">Error loading Vendor Management</div> };
            }));
            break;
          case 'purchase-order-management':
            componentName = 'PurchaseOrderManagement';
            PurchaseComponent = lazy(() => import('./forms/PurchaseOrderManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading PurchaseOrderManagement:', err);
              return { default: () => <div className="p-4">Error loading Purchase Order Management</div> };
            }));
            break;
          case 'purchase-returns-management':
            componentName = 'PurchaseReturnsManagement';
            PurchaseComponent = lazy(() => import('./forms/PurchaseReturnsManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading PurchaseReturnsManagement:', err);
              return { default: () => <div className="p-4">Error loading Purchase Returns Management</div> };
            }));
            break;
          case 'procurement-management':
            componentName = 'ProcurementManagement';
            PurchaseComponent = lazy(() => import('./forms/ProcurementManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading ProcurementManagement:', err);
              return { default: () => <div className="p-4">Error loading Procurement Management</div> };
            }));
            break;
          case 'bill-management':
            componentName = 'BillManagement';
            PurchaseComponent = lazy(() => import('./forms/BillManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading BillManagement:', err);
              return { default: () => <div className="p-4">Error loading Bill Management</div> };
            }));
            break;
          case 'expenses-management':
            componentName = 'ExpensesManagement';
            PurchaseComponent = lazy(() => import('./forms/ExpensesManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading ExpensesManagement:', err);
              return { default: () => <div className="p-4">Error loading Expenses Management</div> };
            }));
            break;
          case 'purchases-reports':
            componentName = 'PurchasesReports';
            PurchaseComponent = PurchasesReports;
            break;
          default:
            console.warn('[RenderMainContent] Unknown purchases view:', view);
            return (
              <ContentWrapperWithKey>
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Purchases Feature</h1>
                  <p>This purchases feature is not yet implemented: {view}</p>
                </div>
              </ContentWrapperWithKey>
            );
        }
        
        if (PurchaseComponent) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup 
                componentKey={`${componentKey}-${view}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <PurchaseComponent />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Handle Accounting views
      if (view && view.startsWith('accounting-') || view === 'chart-of-accounts' || view === 'journal-entries' || view === 'general-ledger' || view === 'reconciliation' || view === 'financial-statements' || view === 'fixed-assets') {
        console.log('[RenderMainContent] Rendering accounting view:', view);
        
        let AccountingComponent = null;
        let componentName = '';
        
        switch(view) {
          case 'accounting-dashboard':
            componentName = 'AccountingDashboard';
            AccountingComponent = lazy(() => import('./forms/AccountingDashboard.js').catch(err => {
              console.error('[RenderMainContent] Error loading AccountingDashboard:', err);
              return { default: () => <div className="p-4">Error loading Accounting Dashboard</div> };
            }));
            break;
          case 'chart-of-accounts':
            componentName = 'ChartOfAccountsManagement';
            AccountingComponent = lazy(() => import('./forms/ChartOfAccountsManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading ChartOfAccountsManagement:', err);
              return { default: () => <div className="p-4">Error loading Chart of Accounts</div> };
            }));
            break;
          case 'journal-entries':
            componentName = 'JournalEntryManagement';
            AccountingComponent = lazy(() => import('./forms/JournalEntryManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading JournalEntryManagement:', err);
              return { default: () => <div className="p-4">Error loading Journal Entries</div> };
            }));
            break;
          case 'general-ledger':
            componentName = 'GeneralLedgerManagement';
            AccountingComponent = lazy(() => import('./forms/GeneralLedgerManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading GeneralLedgerManagement:', err);
              return { default: () => <div className="p-4">Error loading General Ledger</div> };
            }));
            break;
          case 'reconciliation':
            componentName = 'AccountReconManagement';
            AccountingComponent = lazy(() => import('./forms/AccountReconManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading AccountReconManagement:', err);
              return { default: () => <div className="p-4">Error loading Reconciliation</div> };
            }));
            break;
          case 'financial-statements':
            componentName = 'FinancialStatementsManagement';
            AccountingComponent = lazy(() => import('./forms/FinancialStatementsManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading FinancialStatementsManagement:', err);
              return { default: () => <div className="p-4">Error loading Financial Statements</div> };
            }));
            break;
          case 'fixed-assets':
            componentName = 'FixedAssetManagement';
            AccountingComponent = lazy(() => import('./forms/FixedAssetManagement.js').catch(err => {
              console.error('[RenderMainContent] Error loading FixedAssetManagement:', err);
              return { default: () => <div className="p-4">Error loading Fixed Assets</div> };
            }));
            break;
          case 'accounting-reports':
            componentName = 'AccountingReports';
            AccountingComponent = lazy(() => import('./forms/AccountingReports.js').catch(err => {
              console.error('[RenderMainContent] Error loading AccountingReports:', err);
              return { default: () => <div className="p-4">Error loading Accounting Reports</div> };
            }));
            break;
          default:
            console.warn('[RenderMainContent] Unknown accounting view:', view);
            return (
              <ContentWrapperWithKey>
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Accounting Feature</h1>
                  <p>This accounting feature is not yet implemented: {view}</p>
                </div>
              </ContentWrapperWithKey>
            );
        }
        
        if (AccountingComponent) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup 
                componentKey={`${componentKey}-${view}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <AccountingComponent />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Special handling for inventory views
      if (view === 'inventory-suppliers') {
        console.log('[RenderMainContent] Rendering inventory-suppliers view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-suppliers`}>
              <SuppliersManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-locations') {
        console.log('[RenderMainContent] Rendering inventory-locations view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-locations`}>
              <LocationsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-stock-adjustments') {
        console.log('[RenderMainContent] Rendering inventory-stock-adjustments view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-stock-adjustments`}>
              <StockAdjustmentsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-dashboard') {
        console.log('[RenderMainContent] Rendering inventory-dashboard view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-dashboard`}>
              <InventoryDashboard />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-stock-adjustments') {
        console.log('[RenderMainContent] Rendering inventory-stock-adjustments view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-stock-adjustments`}>
              <StockAdjustmentsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-products') {
        console.log('[RenderMainContent] Rendering inventory-products view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-products`}>
              <ProductManagement inventoryType="product" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-supplies') {
        console.log('[RenderMainContent] Rendering inventory-supplies view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-supplies`}>
              <SuppliesManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-bill-of-materials') {
        console.log('[RenderMainContent] Rendering inventory-bill-of-materials view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-bill-of-materials`}>
              <BillOfMaterialsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'inventory-locations') {
        console.log('[RenderMainContent] Rendering inventory-locations view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-locations`}>
              <LocationsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      // Jobs views
      if (view === 'jobs-list') {
        console.log('[RenderMainContent] Rendering jobs-list view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-jobs-list`}>
              <JobManagement view="jobs-list" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'job-costing') {
        console.log('[RenderMainContent] Rendering job-costing view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-job-costing`}>
              <JobManagement view="job-costing" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'job-materials') {
        console.log('[RenderMainContent] Rendering job-materials view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-job-materials`}>
              <JobManagement view="job-materials" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'job-labor') {
        console.log('[RenderMainContent] Rendering job-labor view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-job-labor`}>
              <JobManagement view="job-labor" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'job-profitability') {
        console.log('[RenderMainContent] Rendering job-profitability view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-job-profitability`}>
              <JobManagement view="job-profitability" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'vehicles') {
        console.log('[RenderMainContent] Rendering vehicles view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-vehicles`}>
              <JobVehicleManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'jobs-dashboard') {
        console.log('[RenderMainContent] Rendering jobs-dashboard view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-jobs-dashboard`}>
              <JobManagement view="jobs-dashboard" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'jobs-reports') {
        console.log('[RenderMainContent] Rendering jobs-reports view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-jobs-reports`}>
              <JobManagement view="jobs-reports" />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      if (view === 'inventory-reports') {
        console.log('[RenderMainContent] Rendering inventory-reports view');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${componentKey}-inventory-reports`}>
              <InventoryReports />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      // Then proceed with the existing logic
      if (tenantStatus === 'error' && tenantError) {
        return (
          <ContentWrapperWithKey>
            <div className="p-6 max-w-4xl mx-auto bg-red-50 rounded-lg border border-red-200 text-red-800">
              <h2 className="text-xl font-semibold mb-3">Tenant Error</h2>
              <p className="mb-4">{tenantError}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </ContentWrapperWithKey>
        );
      }
      
      // Check for employee management first to avoid conflict with settings
      if (showEmployeeManagement) {
        console.log('[RenderMainContent] EmployeeManagement component should render now', { 
          showEmployeeManagement,
          showHRDashboard,
          hrSection,
          ActiveComponent: 'EmployeeManagement'
        });
        
        try {
          console.log('[RenderMainContent] About to return EmployeeManagement render result');
          
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup fallback={
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Employee Management</h1>
                  <div className="flex items-center justify-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                </div>
              } componentKey={`employee-management-${navigationKey || 'default'}`}>
                <div className="mb-8">
                  <EmployeeManagement />
                </div>
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        } catch (error) {
          console.error('[RenderMainContent] Error rendering EmployeeManagement:', error);
          return (
            <ContentWrapperWithKey>
              <div className="p-4">
                <h1 className="text-xl font-semibold mb-2">Employee Management</h1>
                <p className="mb-4">Manage your employees</p>
                <div className="bg-red-100 p-3 rounded">
                  <p>Error loading employee management component: {error.message}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </ContentWrapperWithKey>
          );
        }
      }
      
      // Is this a settings or help related view?
      const isSettingsOrHelp = showMyAccount || showHelpCenter || 
        showDeviceSettings || selectedSettingsOption || 
        showTermsAndConditions || showPrivacyPolicy;
      
      // Allow access to these sections regardless of tenant status
      if (isSettingsOrHelp) {
        // Create a component key for settings components
        const settingsComponentKey = `component-${navigationKey || 'default'}`;
        
        // Add additional debug logging to track the selectedSettingsOption value
        console.log('[RenderMainContent] DEBUG - Settings rendering check:', {
          selectedSettingsOption,
          isSettingsOrHelp,
          settingsComponentKey,
          showMyAccount,
          navigationKey
        });
        
        // For Settings Management, render it directly without nested conditions
        // This fixes the issue where Settings Management wasn't rendering properly
        if (selectedSettingsOption === 'Settings') {
          console.log('[RenderMainContent] Rendering Settings Management directly with navigationKey:', navigationKey);
          
          // Ensure we're creating a fresh component with a unique key
          const uniqueKey = `settings-management-${navigationKey}-${Date.now()}`;
          
          // Render the actual SettingsManagement component
          return (
            <ContentWrapperWithKey className="settings-management-wrapper">
              <SuspenseWithCleanup componentKey={uniqueKey} fallback={
                <div className="p-4">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Settings Management</h2>
                  <div className="flex items-center justify-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                </div>
              }>
                <SettingsManagement />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
        
        return (
          <ContentWrapperWithKey>
            {selectedSettingsOption && selectedSettingsOption !== 'Settings' && (
              <SuspenseWithCleanup componentKey={`settings-tabs-${settingsComponentKey}`}>
                {renderSettingsTabs()}
              </SuspenseWithCleanup>
            )}
            {showMyAccount && (
              <SuspenseWithCleanup componentKey={`my-account-${settingsComponentKey}`}>
                <Profile userData={safeUserData} />
              </SuspenseWithCleanup>
            )}
            {showHelpCenter && (
              <SuspenseWithCleanup componentKey={`help-center-${settingsComponentKey}`}>
                <HelpCenter />
              </SuspenseWithCleanup>
            )}
            {showTermsAndConditions && (
              <SuspenseWithCleanup componentKey={`terms-${settingsComponentKey}`}>
                <TermsAndConditions />
              </SuspenseWithCleanup>
            )}
            {showPrivacyPolicy && (
              <SuspenseWithCleanup componentKey={`privacy-policy-${settingsComponentKey}`}>
                <PrivacyPolicy />
              </SuspenseWithCleanup>
            )}
          </ContentWrapperWithKey>
        );
      }
      
      // For all other features, check tenant status
      if (tenantStatus === 'pending') {
        return (
          <ContentWrapperWithKey>
            <div className="flex flex-col items-center justify-center h-[70vh]">
              <StandardSpinner size="large" />
              <h6 className="text-lg font-medium mt-2">
                Setting up your account data...
              </h6>
              <p className="text-sm text-gray-500 mt-1">
                This may take a few moments.
              </p>
            </div>
          </ContentWrapperWithKey>
        );
      }
      
      // Continue with the normal content if tenant status is good
      // CRM view handling
      if (view && view.startsWith('crm-')) {
        console.error('[RenderMainContent] Handling CRM view:', view);
        const crmComponentKey = `crm-${navigationKey || 'default'}`;
        try {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={crmComponentKey}>
                {console.error('[RenderMainContent] Rendering CRM component for view:', view)}
                {view === 'crm-dashboard' && <CRMDashboard />}
                {view === 'crm-contacts' && <ContactsManagement />}
                {view === 'crm-customers' && <CustomersManagement />}
                {view === 'crm-leads' && <LeadsManagement />}
                {view === 'crm-opportunities' && <OpportunitiesManagement />}
                {view === 'crm-deals' && <DealsManagement />}
                {view === 'crm-activities' && <ActivitiesManagement />}
                {view === 'crm-campaigns' && <CampaignsManagement />}
                {view === 'crm-reports' && <ReportsManagement />}
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        } catch (error) {
          console.error('[RenderMainContent] ERROR in CRM view handling:', error);
          console.error('[RenderMainContent] Error stack:', error.stack);
          return (
            <ContentWrapperWithKey>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-red-600">Error Loading CRM Component</h2>
                <p className="mt-2">View: {view}</p>
                <p className="mt-2">Error: {error.message}</p>
                <pre className="mt-2 text-sm">{error.stack}</pre>
              </div>
            </ContentWrapperWithKey>
          );
        }
      }

      // Handle Analytics views
      if (view && (view.startsWith('analytics-') || view === 'kpi-data' || view === 'smart-insight' || view === 'smart-business' || view === 'ai-query' || view === 'whatsapp-business' || view === 'import-export' || view === 'invite-friend' || view === 'dott-status') || showAnalysisPage || showKPIDashboard) {
        console.log('[RenderMainContent] Rendering analytics view:', view);
        
        let AnalyticsComponent = null;
        let componentName = '';
        
        // Handle view-based routing first
        if (view) {
          switch(view) {
            case 'analytics':
            case 'analytics-dashboard':
            case 'kpi-data':
              componentName = 'AnalyticsDashboard';
              AnalyticsComponent = lazy(() => import('./forms/AnalyticsDashboard.js').catch(err => {
                console.error('[RenderMainContent] Error loading AnalyticsDashboard:', err);
                return { default: () => <div className="p-4">Error loading Analytics Dashboard</div> };
              }));
              break;
            case 'smart-insight':
            case 'analytics-smart-insight':
            case 'smart-business': // Keep backward compatibility
            case 'analytics-smart-business':
            case 'ai-query': // Keep backward compatibility
            case 'analytics-ai-query':
              componentName = 'SmartInsight';
              AnalyticsComponent = lazy(() => import('./forms/SmartInsight.js').catch(err => {
                console.error('[RenderMainContent] Error loading SmartInsight:', err);
                return { default: () => <div className="p-4">Error loading Smart Insight AI</div> };
              }));
              break;
            case 'whatsapp-business':
              componentName = 'WhatsAppBusiness';
              AnalyticsComponent = lazy(() => import('./forms/WhatsAppBusinessDashboard.js').catch(err => {
                console.error('[RenderMainContent] Error loading WhatsAppBusiness:', err);
                return { default: () => <div className="p-4">Error loading WhatsApp Business</div> };
              }));
              break;
            case 'import-export':
              componentName = 'ImportExport';
              AnalyticsComponent = lazy(() => import('./forms/ImportExport.js').catch(err => {
                console.error('[RenderMainContent] Error loading ImportExport:', err);
                return { default: () => <div className="p-4">Error loading Import/Export</div> };
              }));
              break;
            case 'invite-friend':
              componentName = 'InviteAFriend';
              AnalyticsComponent = lazy(() => import('./invite/InviteAFriend.js').catch(err => {
                console.error('[RenderMainContent] Error loading InviteAFriend:', err);
                return { default: () => <div className="p-4">Error loading Invite a Friend</div> };
              }));
              break;
            case 'dott-status':
              componentName = 'DottStatus';
              AnalyticsComponent = lazy(() => import('./status/DottStatus.js').catch(err => {
                console.error('[RenderMainContent] Error loading DottStatus:', err);
                return { default: () => <div className="p-4">Error loading Dott Status</div> };
              }));
              break;
            default:
              console.warn('[RenderMainContent] Unknown analytics view:', view);
              return (
                <ContentWrapperWithKey>
                  <div className="p-4">Unknown analytics view: {view}</div>
                </ContentWrapperWithKey>
              );
          }
          
          if (AnalyticsComponent) {
            return (
              <ContentWrapperWithKey>
                <SuspenseWithCleanup 
                  componentKey={`${componentKey}-${view}`}
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <StandardSpinner size="large" />
                    </div>
                  }
                >
                  <AnalyticsComponent onNavigate={handleSetView} />
                </SuspenseWithCleanup>
              </ContentWrapperWithKey>
            );
          }
        }
        
        // Handle legacy showAnalysisPage and showKPIDashboard
        if (showAnalysisPage || showKPIDashboard) {
          const LegacyAnalyticsComponent = showKPIDashboard ? 
            lazy(() => import('./forms/AnalyticsDashboard.js')) : 
            lazy(() => import('./forms/SmartInsight.js'));
          
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup componentKey={`analytics-legacy-${navigationKey || 'default'}`}>
                <LegacyAnalyticsComponent onNavigate={handleSetView} />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }

      // Handle Jobs views
      if (view && (view.startsWith('jobs-') || view.startsWith('job-'))) {
        console.log('[RenderMainContent] Rendering jobs view:', view);
        
        let JobComponent = null;
        let componentName = '';
        
        switch(view) {
          case 'jobs-dashboard':
            componentName = 'JobDashboard';
            JobComponent = JobDashboard;
            break;
          case 'jobs-list':
          case 'job-list':
            componentName = 'JobManagement';
            JobComponent = JobManagement;
            break;
          case 'job-costing':
            componentName = 'JobManagement';
            JobComponent = () => <JobManagement view="job-costing" />;
            break;
          case 'job-materials':
            componentName = 'JobManagement';
            JobComponent = () => <JobManagement view="job-materials" />;
            break;
          case 'job-labor':
            componentName = 'JobManagement';
            JobComponent = () => <JobManagement view="job-labor" />;
            break;
          case 'job-profitability':
            componentName = 'JobManagement';
            JobComponent = () => <JobManagement view="job-profitability" />;
            break;
          case 'vehicles':
            componentName = 'JobManagement';
            JobComponent = () => <JobManagement view="vehicles" />;
            break;
          case 'jobs-reports':
            componentName = 'JobReportsManagement';
            JobComponent = JobReportsManagement;
            break;
          default:
            console.warn('[RenderMainContent] Unknown jobs view:', view);
            return (
              <ContentWrapperWithKey>
                <div className="p-4">
                  <h1 className="text-xl font-semibold mb-2">Jobs Feature</h1>
                  <p>This jobs feature is not yet implemented: {view}</p>
                </div>
              </ContentWrapperWithKey>
            );
        }
        
        if (JobComponent) {
          return (
            <ContentWrapperWithKey>
              <SuspenseWithCleanup 
                componentKey={`${componentKey}-${view}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <JobComponent />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      }

      // Additional case for createOptions
      if (showCreateOptions) {
        const createComponentKey = `create-${selectedOption}-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={createComponentKey}>
              {selectedOption === 'Transaction' && <TransactionManagement />}
              {selectedOption === 'Invoice' && <InvoiceManagement newInvoice={true} mode="create" />}
              {selectedOption === 'Bill' && <BillManagement newBill={true} />}
              {selectedOption === 'Estimate' && <EstimateManagement newEstimate={true} />}
              {selectedOption === 'Customer' && <CustomerManagement />}
              {selectedOption === 'Vendor' && <VendorManagement newVendor={true} />}
              {selectedOption === 'Sales' && <POSSystem isOpen={true} onClose={() => {
                // Clear the create options view to close the modal
                if (handleSetView) handleSetView(null);
                // This will trigger the parent to clear showCreateOptions
                window.dispatchEvent(new CustomEvent('clearCreateOptions'));
              }} onSaleCompleted={() => {}} />}
              {selectedOption === 'Job' && <JobManagement />}
              {selectedOption === 'Product' && <ProductManagement />}
              {selectedOption === 'Service' && <ServiceManagement />}
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Handle special create views
      if (view && view.startsWith('create-')) {
        const specialCreateComponentKey = `${view}-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={specialCreateComponentKey}>
              {view === 'create-product' && <CreateProductManagement />}
              {view === 'create-service' && <ServiceManagement mode="create" />}
              {view === 'create-invoice' && <InvoiceManagement mode="create" />}
              {view === 'create-bill' && <BillManagement mode="create" />}
              {view === 'create-estimate' && <EstimateManagement mode="create" />}
              {view === 'create-customer' && <CustomerList mode="create" onCreateCustomer={handleCreateCustomer} />}
              {view === 'create-vendor' && <VendorManagement mode="create" />}
              {view === 'create-transaction' && <TransactionForm />}
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Transport view handling
      if (view && view.startsWith('transport-')) {
        const transportComponentKey = `transport-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={transportComponentKey}>
              {view === 'transport-dashboard' && <TransportDashboard />}
              {view === 'transport-equipment' && <TransportVehicleManagement />}
              {view === 'transport-loads' && <div>Loads Management Component Coming Soon</div>}
              {view === 'transport-routes' && <div>Routes Management Component Coming Soon</div>}
              {view === 'transport-expenses' && <div>Transport Expenses Component Coming Soon</div>}
              {view === 'transport-maintenance' && <div>Maintenance Management Component Coming Soon</div>}
              {view === 'transport-compliance' && <div>Compliance Management Component Coming Soon</div>}
              {view === 'transport-reports' && <div>Transport Reports Component Coming Soon</div>}
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Notifications view handling
      if (view === 'notifications') {
        const notificationsComponentKey = `notifications-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={notificationsComponentKey}>
              <NotificationsPage />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Sales view handling
      if (view && view.startsWith('sales-')) {
        const salesComponentKey = `sales-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={salesComponentKey}>
              {view === 'sales-dashboard' && <SalesDashboard />}
              {view === 'sales-products' && <SalesProductManagement />}
              {view === 'sales-services' && <ServiceManagement />}
              {view === 'sales-reports' && <ReportDisplay type="sales" />}
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Calendar view handling
      if (view === 'calendar') {
        const calendarComponentKey = `calendar-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={calendarComponentKey}>
              <Calendar />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Analytics view handling (Smart Insights, Import/Export)
      if (view === 'smart-insights') {
        const smartInsightsComponentKey = `smart-insights-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={smartInsightsComponentKey}>
              <SmartInsight />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }


      // Social view handling (Invite a Friend, Dott Status)
      if (view === 'invite-a-friend') {
        const inviteComponentKey = `invite-a-friend-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={inviteComponentKey}>
              <InviteAFriend />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      if (view === 'dott-status') {
        const statusComponentKey = `dott-status-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={statusComponentKey}>
              <DottStatus />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // Main Dashboard view handling
      if (view === 'main-dashboard') {
        const mainDashboardComponentKey = `main-dashboard-${navigationKey || 'default'}`;
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={mainDashboardComponentKey}>
              <BusinessOverview userData={safeUserData} />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      if (showHome) {
        const homeComponentKey = `home-${navigationKey || 'default'}`;
        
        // Create navigation handler for Home component
        const handleHomeNavigate = (targetView, options = {}) => {
          console.log('[RenderMainContent] Home navigation to:', targetView, options);
          
          // Map navigation targets to appropriate views and states
          switch (targetView) {
            case 'customers':
              // Navigate to customer list
              handleSetView('customer-management');
              if (options.showCreateForm) {
                // You might need to pass additional state for showing create form
                console.log('[RenderMainContent] Should show customer create form');
              }
              break;
            case 'sales-products':
              handleSetView('sales-product-management');
              break;
            case 'sales-services':
              handleSetView('sales-service-management');
              break;
            case 'inventory-suppliers':
              handleSetView('inventory-suppliers');
              break;
            case 'invoices':
              handleSetView('invoice-management');
              break;
            case 'notifications':
              handleSetView('notifications');
              break;
            case 'settings':
              handleSetView('settings');
              break;
            default:
              handleSetView(targetView);
          }
        };
        
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={homeComponentKey}>
              <Home 
                userData={safeUserData}
                onNavigate={handleHomeNavigate}
              />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // For all other views, use a more selective approach to component loading
      // Instead of rendering all components conditionally, we'll choose just the one that needs to be displayed
      let ActiveComponent = null;
      let componentProps = {};

      console.log('[RenderMainContent] Checking component to render:', { 
        showEmployeeManagement,
        showHRDashboard,
        hrSection,
        view,
        showTimesheetManagement
      });

      if (showTimesheetManagement) {
        console.log('[RenderMainContent] Rendering TimesheetManagement component');
        
        // Use an error boundary to prevent the entire app from crashing
        return (
          <ContentWrapperWithKey>
            <LazyLoadErrorBoundary fallback={
              <div className="p-4">
                <h2 className="text-lg font-medium text-red-800">Error loading Timesheet Management</h2>
                <p className="mt-2">There was a problem loading the timesheet management component.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                >
                  Reload Page
                </button>
              </div>
            }>
              <SuspenseWithCleanup 
                componentKey={`timesheet-management-${navigationKey || 'default'}`}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <StandardSpinner size="large" />
                  </div>
                }
              >
                <TimesheetManagement />
              </SuspenseWithCleanup>
            </LazyLoadErrorBoundary>
          </ContentWrapperWithKey>
        );
      } else if (showTaxManagement) {
        console.log('[RenderMainContent] showTaxManagement is true, setting ActiveComponent to TaxManagement');
        // Instead of just setting ActiveComponent, return the component directly
        // This ensures we don't have any issues with hooks ordering
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup fallback={
              <div className="p-4">
                <h1 className="text-xl font-semibold mb-2">Employee Tax Management</h1>
                <div className="flex items-center justify-center h-64">
                  <StandardSpinner size="large" />
                </div>
              </div>
            } componentKey={`tax-management-${sectionComponentKey}`}>
              <div className="mb-8">
                <TaxManagement />
              </div>
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showBenefitsManagement) {
        console.log('[RenderMainContent] Rendering BenefitsManagement component');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup 
              componentKey={`benefits-management-${navigationKey || 'default'}`} 
              fallback={
                <div className="flex justify-center items-center h-64">
                  <StandardSpinner size="large" />
                </div>
              }
            >
              <BenefitsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showReportsManagement) {
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`hr-reports-${sectionComponentKey}`}>
              <HRReportsManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showPerformanceManagement) {
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`performance-${sectionComponentKey}`}>
              <PerformanceManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showPayManagement) {
        console.log('[RenderMainContent] Rendering PayManagement component');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup 
              componentKey={`pay-management-${navigationKey || 'default'}`} 
              fallback={
                <div className="flex justify-center items-center h-64">
                  <StandardSpinner size="large" />
                </div>
              }
            >
              <PayManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showHRDashboard) {
        ActiveComponent = HRDashboard;
        componentProps = { section: hrSection };
      } else if (showUserProfileSettings) {
        ActiveComponent = UserProfileSettings;
        componentProps = { userData: safeUserData, onUpdate: handleUserProfileUpdate };
      } else if (showMyAccount) {
        ActiveComponent = Profile;
        componentProps = {
          userData: safeUserData ? {
            ...safeUserData,
            firstName: safeUserData?.firstName,
            lastName: safeUserData?.lastName,
            first_name: safeUserData?.first_name,
            last_name: safeUserData?.last_name,
            email: safeUserData?.email,
            tenantId: safeUserData?.tenantId || tenantId,
          } : null
        };
      } else if (showIntegrationSettings) {
        ActiveComponent = IntegrationSettings;
      } else if (showMainDashboard) {
        ActiveComponent = BusinessOverview;
        componentProps = { userData };
      } else if (showKPIDashboard) {
        ActiveComponent = KPIDashboard;
      } else if (showTransactionForm) {
        ActiveComponent = TransactionForm;
      } else if (showInvoiceBuilder) {
        ActiveComponent = InvoiceTemplateBuilder;
        componentProps = { onClose: handleCloseInvoiceBuilder };
      } else if (showCustomerList) {
        console.error('[RenderMainContent] showCustomerList is true, rendering CustomerManagement');
        try {
          // Use CustomerManagement component for customer management
          return (
            <ContentWrapperWithKey>
              <ErrorBoundary fallback={
                <div className="p-4">
                  <h2 className="text-xl font-semibold text-red-600">Customer Management Error</h2>
                  <p className="mt-2">Failed to load the customer management component.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                </div>
              }>
                <SuspenseWithCleanup 
                  componentKey={`customer-management-${sectionComponentKey}`}
                  fallback={
                    <div className="p-4">
                      <h2 className="text-xl font-semibold">Loading Customer Management...</h2>
                      <StandardSpinner size="large" />
                    </div>
                  }
                >
                  {console.error('[RenderMainContent] About to render CustomerManagement component')}
                  <CustomerManagement />
                </SuspenseWithCleanup>
              </ErrorBoundary>
            </ContentWrapperWithKey>
          );
        } catch (error) {
          console.error('[RenderMainContent] ERROR rendering CustomerManagement:', error);
          console.error('[RenderMainContent] Error stack:', error.stack);
          return (
            <ContentWrapperWithKey>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-red-600">Error Loading Customer Management</h2>
                <p className="mt-2">Error: {error.message}</p>
                <pre className="mt-2 text-sm">{error.stack}</pre>
              </div>
            </ContentWrapperWithKey>
          );
        }
      } else if (showCustomerDetails && selectedCustomer) {
        ActiveComponent = CustomerDetails;
        componentProps = { customer: selectedCustomer, onBack: handleBackToCustomerDetails };
      } else if (selectedInvoiceId) {
        ActiveComponent = InvoiceDetails;
        componentProps = { invoiceId: selectedInvoiceId, onBack: handleBackFromInvoice };
      } else if (showProductManagement) {
        // Instead of just setting ActiveComponent, return the component directly
        // This ensures we don't have any issues with hooks ordering
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`product-management-${sectionComponentKey}`}>
              <ProductManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showServiceManagement) {
        // Use ServiceManagement component for service management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`service-management-${sectionComponentKey}`}>
              <ServiceManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showEstimateManagement) {
        // Use EstimateManagement component for estimate management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`estimate-management-${sectionComponentKey}`}>
              <EstimateManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showSalesOrderManagement) {
        // Use SalesOrderManagement component for order management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`sales-order-management-${sectionComponentKey}`}>
              <SalesOrderManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showInvoiceManagement) {
        // Use InvoiceManagement component for invoice management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`invoice-management-${sectionComponentKey}`}>
              <InvoiceManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showVendorManagement) {
        // Use VendorManagement component for vendor management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`vendor-management-${sectionComponentKey}`}>
              <VendorManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showBillManagement) {
        // Use BillManagement component for bill management
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`bill-management-${sectionComponentKey}`}>
              <BillManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      } else if (showPurchaseOrderManagement) {
        ActiveComponent = PurchaseOrderManagement;
      } else if (showExpensesManagement) {
        ActiveComponent = ExpensesManagement;
      } else if (showPurchaseReturnManagement) {
        ActiveComponent = PurchaseReturnsManagement;
      } else if (showProcurementManagement) {
        ActiveComponent = ProcurementManagement;
      } else if (showChartOfAccounts) {
        ActiveComponent = ChartOfAccountsManagement;
      } else if (showJournalEntryManagement) {
        ActiveComponent = JournalEntryManagement;
      } else if (showGeneralLedgerManagement) {
        ActiveComponent = GeneralLedgerManagement;
      } else if (showAccountReconManagement) {
        ActiveComponent = AccountReconManagement;
      } else if (showMonthEndManagement) {
        ActiveComponent = MonthEndManagement;
      } else if (showFinancialStatements) {
        ActiveComponent = FinancialManagement;
      } else if (showFixedAssetManagement) {
        ActiveComponent = FixedAssetManagement;
      } else if (showBudgetManagement) {
        ActiveComponent = BudgetManagement;
      } else if (showCostAccountingManagement) {
        ActiveComponent = CostAccountingManagement;
      } else if (showIntercompanyManagement) {
        ActiveComponent = IntercompanyManagement;
      } else if (showAuditTrailManagement) {
        ActiveComponent = AuditTrailManagement;
      } else if (showProfitAndLossReport) {
        ActiveComponent = ProfitAndLossReport;
      } else if (showBalanceSheetReport) {
        ActiveComponent = BalanceSheetReport;
      } else if (showCashFlowReport) {
        ActiveComponent = CashFlowReport;
      } else if (showIncomeByCustomer) {
        ActiveComponent = IncomeByCustomer;
      } else if (showAgedReceivables) {
        ActiveComponent = AgedReceivables;
      } else if (showAgedPayables) {
        ActiveComponent = AgedPayables;
      } else if (showAccountBalances) {
        ActiveComponent = AccountBalances;
      } else if (showTrialBalances) {
        ActiveComponent = TrialBalances;
      } else if (showProfitAndLossAnalysis) {
        ActiveComponent = ProfitAndLossAnalysis;
      } else if (showBalanceSheetAnalysis) {
        ActiveComponent = BalanceSheetAnalysis;
      } else if (showCashFlowAnalysis) {
        ActiveComponent = CashFlowAnalysis;
      } else if (showBudgetVsActualAnalysis) {
        ActiveComponent = BudgetVsActualAnalysis;
      } else if (showSalesAnalysis) {
        ActiveComponent = SalesAnalysis;
      } else if (showExpenseAnalysis) {
        ActiveComponent = ExpenseAnalysis;
      } else if (showReports && selectedReport) {
        ActiveComponent = ReportDisplay;
        componentProps = { reportType: selectedReport };
      } else if (showBankingDashboard) {
        ActiveComponent = BankingDashboard;
      } else if (showPayrollDashboard) {
        // Use a plain div for PayrollDashboard for now
        return (
          <ContentWrapperWithKey>
            <div>Payroll Dashboard content goes here</div>
          </ContentWrapperWithKey>
        );
      } else if (showAnalysisPage) {
        ActiveComponent = AnalysisPage;
      } else if (showHelpCenter) {
        ActiveComponent = HelpCenter;
      } else if (showPrivacyPolicy) {
        ActiveComponent = PrivacyPolicy;
      } else if (showTermsAndConditions) {
        ActiveComponent = TermsAndConditions;
      } else if (showDownloadTransactions) {
        ActiveComponent = DownloadTransactions;
      } else if (showConnectBank) {
        ActiveComponent = ConnectBank;
      } else if (showPayrollTransactions) {
        ActiveComponent = PayrollTransactions;
      } else if (showBankRecon) {
        ActiveComponent = BankReconciliation;
      } else if (showPayrollReport) {
        ActiveComponent = PayrollReport;
      } else if (showBankReport) {
        ActiveComponent = BankReport;
      } else if (showInventoryItems) {
        ActiveComponent = InventoryItems;
      } else if (showBankTransactions) {
        ActiveComponent = BankTransactions;
      } else if (showInventoryManagement) {
        ActiveComponent = InventoryManagement;
      } else if (showHome) {
        ActiveComponent = Home;
      } else if (view === 'inventory-suppliers') {
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${sectionComponentKey}-suppliers`}>
              <SupplierManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }

      // If we reached here and have an ActiveComponent, render it
      if (ActiveComponent) {
        console.log('[RenderMainContent] Rendering ActiveComponent:', {
          componentName: ActiveComponent.name || 'Unknown',
          componentType: typeof ActiveComponent,
          componentProps,
          sectionComponentKey,
          navigationKey
        });
        
        // Add extra safety check
        if (typeof ActiveComponent !== 'function') {
          console.error('[RenderMainContent] ActiveComponent is not a function!', {
            ActiveComponent,
            type: typeof ActiveComponent
          });
          return (
            <ContentWrapperWithKey>
              <div className="p-6 bg-red-50 border border-red-200 rounded">
                <h3 className="text-red-800 font-semibold">Component Loading Error</h3>
                <p className="text-red-600 mt-2">The selected component could not be loaded properly.</p>
              </div>
            </ContentWrapperWithKey>
          );
        }
        
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={`${sectionComponentKey}-${navigationKey}`}>
              <ActiveComponent {...componentProps} />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      // Fallback to show something if nothing else matched
      return (
        <ContentWrapperWithKey>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">No Content Selected</h2>
              <p className="mt-2 text-gray-600">Please select an option from the menu to view content.</p>
            </div>
          </div>
        </ContentWrapperWithKey>
      );

    } catch (error) {
      console.error('[RenderMainContent] Error in content rendering:', error);
      return (
        <ContentWrapperWithKey>
          <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800">
            <h2 className="text-lg font-medium">Error displaying content</h2>
            <p className="text-sm mt-2">{error.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </ContentWrapperWithKey>
      );
    }
  }, [
    // Essential dependencies
    view, 
    tenantStatus, 
    tenantError,
    showMyAccount, 
    showHelpCenter, 
    showDeviceSettings, 
    selectedSettingsOption, 
    showTermsAndConditions, 
    showPrivacyPolicy,
    showCreateOptions,
    selectedOption,
    showHome,
    showKPIDashboard,
    showMainDashboard,
    userData,
    tenantId,
    // HR section dependencies
    showHRDashboard,
    showEmployeeManagement,
    showTimesheetManagement,
    showPayManagement,
    showTaxManagement,
    showBenefitsManagement,
    showReportsManagement,
    showPerformanceManagement,
    // Financial management dependencies
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
    // Rendering decision variables
    renderSettingsTabs,
    // Other critical dependencies
    selectedInvoiceId,
    selectedCustomer,
    handleCreateCustomer,
    handleCustomerSelect,
    handleBackToCustomerDetails,
    handleBackFromInvoice,
    handleCloseInvoiceBuilder,
    handleUserProfileUpdate,
    selectedReport,
    hrSection,
    // Banking and transaction props
    showDownloadTransactions,
    showConnectBank,
    showPayrollTransactions,
    showBankRecon,
    showPayrollReport,
    showBankReport,
    showBankTransactions,
    showInventoryItems,
    showInventoryManagement,
    // Add mountedComponents to dependency array
    mountedComponents,
  ]);

  // Safe rendering with error boundary
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800">
          <h2 className="text-lg font-medium">Dashboard Content Error</h2>
          <p className="text-sm mt-2">{error?.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Dashboard
          </button>
        </div>
      )}
    >
      {renderContent}
    </ErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (component should NOT re-render)
  // Return false if props differ (component SHOULD re-render)
  
  // Define the most important props that should trigger a re-render when changed
  const criticalProps = [
    'view',
    'showMyAccount',
    'showHelpCenter',
    'tenantId',
    'tenantStatus',
    'showCreateOptions',
    'selectedOption',
    'showHome',
    'showMainDashboard',
    'showKPIDashboard'
  ];
  
  // Check if any critical props have changed
  for (const prop of criticalProps) {
    if (prevProps[prop] !== nextProps[prop]) {
      return false; // Props differ, should re-render
    }
  }

  // Special check for userData that's more intelligent
  if (prevProps.userData !== nextProps.userData) {
    // Compare actual userData content instead of reference
    if (!prevProps.userData || !nextProps.userData) {
      return false; // One is null/undefined but the other isn't, should re-render
    }
    
    // Only compare essential user data properties
    const userDataProps = ['email', 'firstName', 'lastName', 'businessName', 'tenantId'];
    for (const prop of userDataProps) {
      if (prevProps.userData[prop] !== nextProps.userData[prop]) {
        return false; // Should re-render because important user data changed
      }
    }
  }
  
  // For active components, check relevant props
  if (prevProps.view !== nextProps.view) {
    return false; // View changed, should re-render
  }
  
  if (prevProps.showCreateOptions && nextProps.showCreateOptions && 
      prevProps.selectedOption !== nextProps.selectedOption) {
    return false; // Selected option in create mode changed, should re-render
  }
  
  // If we're showing customer details, check if the customer changed
  if (prevProps.showCustomerDetails && nextProps.showCustomerDetails &&
      prevProps.selectedCustomer?.id !== nextProps.selectedCustomer?.id) {
    return false; // Selected customer changed, should re-render
  }
  
  // If we're showing invoice details, check if the invoice ID changed
  if (prevProps.selectedInvoiceId !== nextProps.selectedInvoiceId) {
    return false; // Selected invoice changed, should re-render
  }
  
  // Default to not re-rendering if no critical changes detected
  return true;
});

export default RenderMainContent;