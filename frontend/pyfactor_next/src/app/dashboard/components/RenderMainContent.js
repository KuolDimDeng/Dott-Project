'use client';

import React, { useEffect, useState } from 'react';
import DashboardRouter from '../router/DashboardRouter';

/**
 * Map event items to route views
 */
const eventToRouteMap = {
  // Products & Services
  'product-management': 'products',
  'service-management': 'services',
  
  // Customers
  'customer-list': 'customers',
  
  // Sales
  'estimate-management': 'estimates',
  'order-management': 'orders',
  'invoice-management': 'invoices',
  'sales-reports-management': 'sales-reports',
  
  // Jobs
  'jobs-dashboard': 'job-dashboard',
  'jobs-list': 'jobs-list',
  'job-costing': 'job-costing',
  'job-materials': 'job-materials',
  'job-labor': 'job-labor',
  'job-profitability': 'job-profitability',
  'vehicles': 'vehicles',
  'jobs-reports': 'jobs-reports',
  
  // Payments
  'payments-dashboard': 'payments-dashboard',
  'receive-payment': 'receive-payment',
  'make-payment': 'make-payment',
  'payment-methods': 'payment-methods',
  'recurring-payments': 'recurring-payments',
  'refunds': 'refunds',
  'payment-reconciliation': 'payment-reconciliation',
  'payment-gateways': 'payment-gateways',
  'payment-reports': 'payment-reports',
  
  // Purchases
  'purchases-dashboard': 'purchases-dashboard',
  'vendor-management': 'vendors',
  'purchase-orders': 'purchase-orders',
  'bill-management': 'bills',
  'expense-management': 'expenses',
  'purchase-returns': 'purchase-returns',
  'procurement': 'procurement',
  'purchases-reports': 'purchases-reports',
  
  // Accounting
  'accounting-dashboard': 'accounting-dashboard',
  'chart-of-accounts': 'chart-of-accounts',
  'journal-entries': 'journal-entries',
  'general-ledger': 'general-ledger',
  'reconciliation': 'reconciliation',
  'financial-statements': 'financial-statements',
  'fixed-assets': 'fixed-assets',
  'accounting-reports': 'accounting-reports',
  
  // Banking
  'banking-dashboard': 'banking-dashboard',
  'bank-transactions': 'bank-transactions',
  'bank-reconciliation': 'bank-reconciliation',
  'banking-reports': 'banking-reports',
  
  // Payroll
  'payroll-dashboard': 'payroll-dashboard',
  'payroll-wizard': 'payroll-wizard',
  'payroll-transactions': 'payroll-transactions',
  'payroll-reports': 'payroll-reports',
  
  // Taxes
  'taxes-dashboard': 'taxes-dashboard',
  'sales-tax-filing': 'sales-tax-filing',
  'file-tax-return': 'file-tax-return',
  'filing-history': 'filing-history',
  'country-requirements': 'country-requirements',
  'payroll-tax-filing': 'payroll-tax-filing',
  'file-payroll-tax': 'file-payroll-tax',
  'payroll-tax-history': 'payroll-tax-history',
  'payroll-tax-setup': 'payroll-tax-setup',
  'tax-reports': 'tax-reports',
  
  // Reports
  'reports-dashboard': 'reports-dashboard',
  
  // Analytics
  'analytics-dashboard': 'analytics',
  'smart-insight': 'smart-insights',
  
  // Other
  'whatsapp-business': 'whatsapp-business',
  'import-export': 'import-export',
  'invite-friend': 'invite-friend',
  'dott-status': 'dott-status'
};

/**
 * RenderMainContent - Enhanced routing component with event support
 */
const RenderMainContent = React.memo(function RenderMainContent({
  view = 'dashboard',
  subView,
  userData,
  ...props
}) {
  const [currentView, setCurrentView] = useState(view);
  
  // Listen for navigation events
  useEffect(() => {
    const handleNavigationEvent = (event) => {
      const { item } = event.detail;
      console.log('[RenderMainContent] Navigation event:', item);
      
      // Map the event item to a route
      const mappedView = eventToRouteMap[item] || item;
      setCurrentView(mappedView);
    };
    
    // Listen to both event types
    window.addEventListener('menuNavigation', handleNavigationEvent);
    window.addEventListener('navigationChange', handleNavigationEvent);
    
    return () => {
      window.removeEventListener('menuNavigation', handleNavigationEvent);
      window.removeEventListener('navigationChange', handleNavigationEvent);
    };
  }, []);
  
  // Handle legacy props
  useEffect(() => {
    let mappedView = view;
    
    // Handle create options
    if (props.showCreateOptions && props.selectedOption) {
      const createMappings = {
        'Product': 'create-product',
        'Service': 'create-service',
        'Customer': 'create-customer',
        'Vendor': 'create-vendor',
        'Invoice': 'create-invoice',
        'Estimate': 'create-estimate',
        'Bill': 'create-bill',
        'Job': 'create-job',
        'Transaction': 'create-transaction',
        'Sales': 'pos'
      };
      mappedView = createMappings[props.selectedOption] || view;
    }
    // Complete legacy prop mapping
    else if (props.showProductManagement) mappedView = 'products';
    else if (props.showServiceManagement) mappedView = 'services';
    else if (props.showCreateProduct) mappedView = 'create-product';
    else if (props.showCustomerList) mappedView = 'customers';
    else if (props.showCustomerManagement) mappedView = 'customer-management';
    else if (props.showTransactionForm) mappedView = 'transactions';
    else if (props.showInvoiceManagement) mappedView = 'invoices';
    else if (props.showInvoiceBuilder) mappedView = 'invoice-builder';
    else if (props.showBillManagement) mappedView = 'bills';
    else if (props.showEstimateManagement) mappedView = 'estimates';
    else if (props.showBankingDashboard) mappedView = 'banking';
    else if (props.showBankTransactions) mappedView = 'bank-transactions';
    else if (props.showPaymentGateways) mappedView = 'payment-gateways';
    else if (props.showHRDashboard) mappedView = 'hr';
    else if (props.showEmployeeManagement) mappedView = 'employees';
    else if (props.showPayManagement) mappedView = 'payroll';
    else if (props.showTimesheetManagement) mappedView = 'timesheets';
    else if (props.showAnalysisPage) mappedView = 'analytics';
    else if (props.showKPIDashboard) mappedView = 'analytics';
    else if (props.showReports) mappedView = 'reports';
    else if (props.showInventoryManagement) mappedView = 'inventory';
    else if (props.showSuppliersManagement) mappedView = 'suppliers';
    else if (props.showVendorManagement) mappedView = 'vendors';
    else if (props.showTaxManagement) mappedView = 'taxes';
    else if (props.showEmployeeTaxes) mappedView = 'employee-taxes';
    else if (props.showCRMDashboard) mappedView = 'crm';
    else if (props.showContactsManagement) mappedView = 'contacts';
    else if (props.showJobManagement) mappedView = 'jobs';
    else if (props.showJobDashboard) mappedView = 'job-dashboard';
    else if (props.showUserProfileSettings) mappedView = 'settings';
    else if (props.showImportExport) mappedView = 'import-export';
    else if (props.showPOSSystem) mappedView = 'pos';
    else if (props.showTransportDashboard) mappedView = 'transport';
    else if (props.showCalendar) mappedView = 'calendar';
    else if (props.showMainDashboard) mappedView = 'dashboard';
    else if (props.showHome || !mappedView) mappedView = 'home';
    
    setCurrentView(mappedView);
  }, [view, props, props.showCreateOptions, props.selectedOption]);

  console.log('[RenderMainContent] Current view:', currentView);

  return (
    <div className="h-full">
      <DashboardRouter
        view={currentView}
        subView={subView}
        userData={userData}
        {...props}
      />
    </div>
  );
});

export default RenderMainContent;
