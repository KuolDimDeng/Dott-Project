'use client';

import React from 'react';
import DashboardRouter from '../router/DashboardRouter';

/**
 * RenderMainContent - Simplified routing component with complete legacy mappings
 */
const RenderMainContent = React.memo(function RenderMainContent({
  // Extract the view from props
  view = 'dashboard',
  subView,
  userData,
  // Pass through all other props to the router
  ...props
}) {
  // Determine the current view based on props
  let currentView = view;
  
  // Complete legacy prop mapping for backward compatibility
  // Products & Services
  if (props.showProductManagement) currentView = 'products';
  else if (props.showServiceManagement) currentView = 'sales-services';
  else if (props.showCreateProduct) currentView = 'create-product';
  
  // Customer Management
  else if (props.showCustomerList) currentView = 'customerList';
  else if (props.showCustomerManagement) currentView = 'customer-management';
  
  // Financial
  else if (props.showTransactionForm) currentView = 'transactions';
  else if (props.showInvoiceManagement) currentView = 'invoices';
  else if (props.showInvoiceBuilder) currentView = 'invoice-builder';
  else if (props.showBillManagement) currentView = 'bills';
  else if (props.showEstimateManagement) currentView = 'estimates';
  
  // Banking
  else if (props.showBankingDashboard) currentView = 'banking';
  else if (props.showBankTransactions) currentView = 'bank-transactions';
  else if (props.showPaymentGateways) currentView = 'payment-gateways';
  
  // HR & Payroll
  else if (props.showHRDashboard) currentView = 'hr';
  else if (props.showEmployeeManagement) currentView = 'employees';
  else if (props.showPayManagement) currentView = 'payroll';
  else if (props.showTimesheetManagement) currentView = 'timesheets';
  
  // Analytics & Reports
  else if (props.showAnalysisPage) currentView = 'analytics';
  else if (props.showKPIDashboard) currentView = 'analytics';
  else if (props.showReports) currentView = 'reports';
  
  // Inventory
  else if (props.showInventoryManagement) currentView = 'inventory';
  else if (props.showSuppliersManagement) currentView = 'suppliers';
  else if (props.showVendorManagement) currentView = 'vendors';
  
  // Taxes
  else if (props.showTaxManagement) currentView = 'taxes';
  else if (props.showEmployeeTaxes) currentView = 'employee-taxes';
  
  // CRM
  else if (props.showCRMDashboard) currentView = 'crm';
  else if (props.showContactsManagement) currentView = 'contacts';
  
  // Jobs
  else if (props.showJobManagement) currentView = 'jobs';
  else if (props.showJobDashboard) currentView = 'job-dashboard';
  
  // Settings
  else if (props.showUserProfileSettings) currentView = 'settings';
  else if (props.showImportExport) currentView = 'import-export';
  
  // POS
  else if (props.showPOSSystem) currentView = 'pos';
  
  // Transport
  else if (props.showTransportDashboard) currentView = 'transport';
  
  // Calendar
  else if (props.showCalendar) currentView = 'calendar';
  
  // Default views
  else if (props.showMainDashboard) currentView = 'dashboard';
  else if (props.showHome || !currentView) currentView = 'home';

  console.log('[RenderMainContent] Current view:', currentView, 'from props:', {
    view,
    hasShowProps: Object.keys(props).filter(k => k.startsWith('show')).join(', ')
  });

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
