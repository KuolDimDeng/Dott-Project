'use client';

import { lazy } from 'react';

// Enhanced lazy loading with error handling
const enhancedLazy = (importFn, componentName) => {
  return lazy(() =>
    importFn().then(module => {
      console.log(`[RouteRegistry] Successfully loaded: ${componentName}`);
      return module;
    }).catch(error => {
      console.error(`[RouteRegistry] Failed to load ${componentName}:`, error);
      // Return a fallback component
      return {
        default: () => (
          <div className="p-6 border border-red-200 rounded-md bg-red-50">
            <h2 className="text-lg font-medium text-red-800">
              Failed to load {componentName}
            </h2>
            <p className="text-sm mt-2 text-red-600">
              {error.message || 'Unknown error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        )
      };
    })
  );
};

/**
 * Complete Route Registry - ALL menu items mapped to components
 */
export const routeRegistry = {
  // Dashboard Views
  'dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/BusinessOverviewDashboard'), 'Business Overview'),
    title: 'Dashboard',
    description: 'Business overview dashboard'
  },
  'sales-overview': {
    component: enhancedLazy(() => import('../components/sales/SalesOverview'), 'Sales Overview'),
    title: 'Sales',
    description: 'Sales management overview'
  },
  'inventory-overview': {
    component: enhancedLazy(() => import('../components/inventory/InventoryOverview'), 'Inventory Overview'),
    title: 'Inventory',
    description: 'Inventory management overview'
  },
  'jobs-overview': {
    component: enhancedLazy(() => import('../components/jobs/JobsOverview'), 'Jobs Overview'),
    title: 'Jobs',
    description: 'Jobs and projects overview'
  },
  'payments-overview': {
    component: enhancedLazy(() => import('../components/payments/PaymentsOverview'), 'Payments Overview'),
    title: 'Payments',
    description: 'Payments management overview'
  },
  'purchases-overview': {
    component: enhancedLazy(() => import('../components/purchases/PurchasesOverview'), 'Purchases Overview'),
    title: 'Purchases',
    description: 'Purchases management overview'
  },
  'accounting-overview': {
    component: enhancedLazy(() => import('../components/accounting/AccountingOverview'), 'Accounting Overview'),
    title: 'Accounting',
    description: 'Accounting management overview'
  },
  'sales-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/SalesDashboardEnhanced'), 'Sales Dashboard'),
    title: 'Sales Dashboard',
    description: 'Sales overview and metrics'
  },
  'inventory-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/InventoryDashboard'), 'Inventory Dashboard'),
    title: 'Inventory Dashboard',
    description: 'Inventory overview'
  },
  'jobs-dashboard': {
    component: enhancedLazy(() => import('../components/jobs/JobDashboard'), 'Jobs Dashboard'),
    title: 'Jobs Dashboard',
    description: 'Jobs and projects overview'
  },
  'payments-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/PaymentsDashboard'), 'Payments Dashboard'),
    title: 'Payments Dashboard',
    description: 'Payment processing overview'
  },
  'purchases-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/PurchasesDashboard'), 'Purchases Dashboard'),
    title: 'Purchases Dashboard',
    description: 'Purchase management overview'
  },
  'accounting-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/AccountingDashboard'), 'Accounting Dashboard'),
    title: 'Accounting Dashboard',
    description: 'Accounting overview'
  },
  'banking-dashboard': {
    component: enhancedLazy(() => import('../components/forms/BankingDashboard'), 'Banking Dashboard'),
    title: 'Banking Dashboard',
    description: 'Banking and financial tools'
  },
  'hr-dashboard': {
    component: enhancedLazy(() => import('../components/forms/HRDashboard'), 'HR Dashboard'),
    title: 'HR Dashboard',
    description: 'Human resources overview'
  },
  'payroll-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/PayrollDashboard'), 'Payroll Dashboard'),
    title: 'Payroll Dashboard',
    description: 'Payroll overview'
  },
  'taxes-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/TaxesDashboard'), 'Taxes Dashboard'),
    title: 'Taxes Dashboard',
    description: 'Tax management overview'
  },
  'banking-overview': {
    component: enhancedLazy(() => import('../components/banking/BankingOverview'), 'Banking Overview'),
    title: 'Banking',
    description: 'Banking management overview'
  },
  'hr-overview': {
    component: enhancedLazy(() => import('../components/hr/HROverview'), 'HR Overview'),
    title: 'Human Resources',
    description: 'HR management overview'
  },
  'payroll-overview': {
    component: enhancedLazy(() => import('../components/payroll/PayrollOverview'), 'Payroll Overview'),
    title: 'Payroll',
    description: 'Payroll management overview'
  },
  'taxes-overview': {
    component: enhancedLazy(() => import('../components/taxes/TaxesOverview'), 'Taxes Overview'),
    title: 'Taxes',
    description: 'Tax management overview'
  },
  'reports-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/ReportsDashboard'), 'Reports Dashboard'),
    title: 'Reports Dashboard',
    description: 'All reports overview'
  },
  
  // Analytics & Insights
  'analytics': {
    component: enhancedLazy(() => import('../components/forms/AnalysisPage'), 'Analytics'),
    title: 'Analytics',
    description: 'Business analytics and insights'
  },
  'analytics-dashboard': {
    component: enhancedLazy(() => import('../components/forms/AnalyticsDashboard'), 'Analytics Dashboard'),
    title: 'Analytics Dashboard',
    description: 'Analytics overview'
  },
  'smart-insights': {
    component: enhancedLazy(() => import('../components/forms/SmartInsight'), 'Smart Insights'),
    title: 'Smart Insights',
    description: 'AI-powered business insights'
  },
  'smart-insight': {
    component: enhancedLazy(() => import('../components/forms/SmartInsight'), 'Smart Insight'),
    title: 'Smart Insight',
    description: 'AI-powered business insights'
  },

  // Sales Management
  'pos': {
    component: enhancedLazy(() => import('../components/pos/POSSystemWrapper'), 'POS System'),
    title: 'Point of Sale',
    description: 'Sales terminal and checkout'
  },
  'products': {
    component: enhancedLazy(() => import('../components/forms/ProductManagementClientOnly'), 'Product Management'),
    title: 'Products',
    description: 'Manage product catalog'
  },
  'product-management': {
    component: enhancedLazy(() => import('../components/forms/ProductManagementClientOnly'), 'Product Management'),
    title: 'Product Management',
    description: 'Manage products'
  },
  'services': {
    component: enhancedLazy(() => import('../components/forms/ServiceManagement'), 'Service Management'),
    title: 'Services',
    description: 'Manage services'
  },
  'service-management': {
    component: enhancedLazy(() => import('../components/forms/ServiceManagement'), 'Service Management'),
    title: 'Service Management',
    description: 'Manage services'
  },
  'sales-services': {
    component: enhancedLazy(() => import('../components/forms/ServiceManagement'), 'Sales Services'),
    title: 'Services',
    description: 'Manage services'
  },
  'create-product': {
    component: enhancedLazy(() => import('../components/forms/ProductManagement'), 'Create Product'),
    title: 'Create Product',
    description: 'Add new products'
  },
  'create-service': {
    component: enhancedLazy(() => import('../components/forms/ServiceManagement'), 'Create Service'),
    title: 'Create Service',
    description: 'Add new services'
  },
  'create-customer': {
    component: enhancedLazy(() => import('../components/forms/CustomerManagement'), 'Create Customer'),
    title: 'Create Customer',
    description: 'Add new customers'
  },
  'create-vendor': {
    component: enhancedLazy(() => import('../components/forms/VendorManagement'), 'Create Vendor'),
    title: 'Create Vendor',
    description: 'Add new vendors'
  },
  'create-invoice': {
    component: enhancedLazy(() => import('../components/forms/InvoiceManagement'), 'Create Invoice'),
    title: 'Create Invoice',
    description: 'Create new invoice'
  },
  'create-estimate': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagementWrapper'), 'Create Estimate'),
    title: 'Create Estimate',
    description: 'Create new estimate'
  },
  'create-bill': {
    component: enhancedLazy(() => import('../components/forms/BillManagement'), 'Create Bill'),
    title: 'Create Bill',
    description: 'Create new bill'
  },
  'create-job': {
    component: enhancedLazy(() => import('../components/jobs/JobManagement'), 'Create Job'),
    title: 'Create Job',
    description: 'Create new job'
  },
  'create-transaction': {
    component: enhancedLazy(() => import('../components/forms/TransactionManagement'), 'Create Transaction'),
    title: 'Create Transaction',
    description: 'Create new transaction'
  },
  'sales-products': {
    component: enhancedLazy(() => import('../components/forms/SalesProductManagement'), 'Sales Products'),
    title: 'Sales Products',
    description: 'Manage sales products'
  },
  'sales-transactions': {
    component: enhancedLazy(() => import('../components/sales/Transactions'), 'Sales Transactions'),
    title: 'Sales Transactions',
    description: 'View completed POS transactions'
  },
  'estimates': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagementWrapper'), 'Estimate Management'),
    title: 'Estimates',
    description: 'Create and manage estimates'
  },
  'estimate-management': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagementWrapper'), 'Estimate Management'),
    title: 'Estimates',
    description: 'Manage estimates'
  },
  'orders': {
    component: enhancedLazy(() => import('../components/forms/SalesOrderManagement'), 'Sales Order Management'),
    title: 'Orders',
    description: 'Manage customer orders'
  },
  'order-management': {
    component: enhancedLazy(() => import('../components/forms/SalesOrderManagement'), 'Sales Order Management'),
    title: 'Orders',
    description: 'Manage orders'
  },
  'sales-reports-management': {
    component: enhancedLazy(() => import('../components/forms/SalesReportsManagement'), 'Sales Reports'),
    title: 'Sales Reports',
    description: 'Sales analytics and reports'
  },

  // Customer Management
  'customers': {
    component: enhancedLazy(() => import('../components/forms/CustomerManagement'), 'Customer Management'),
    title: 'Customers',
    description: 'Manage customers'
  },
  'customerList': {
    component: enhancedLazy(() => import('../components/lists/CustomerList'), 'Customer List'),
    title: 'Customers',
    description: 'Customer list view'
  },
  'customer-list': {
    component: enhancedLazy(() => import('../components/lists/CustomerList'), 'Customer List'),
    title: 'Customers',
    description: 'View all customers'
  },
  'customer-management': {
    component: enhancedLazy(() => import('../components/forms/CustomerManagement'), 'Customer Management'),
    title: 'Customer Management',
    description: 'Advanced customer management'
  },

  // Financial Management
  'invoices': {
    component: enhancedLazy(() => import('../components/forms/InvoiceManagement'), 'Invoice Management'),
    title: 'Invoices',
    description: 'Manage invoices and billing'
  },
  'invoice-management': {
    component: enhancedLazy(() => import('../components/forms/InvoiceManagement'), 'Invoice Management'),
    title: 'Invoices',
    description: 'Manage invoices'
  },
  'invoice-builder': {
    component: enhancedLazy(() => import('../components/forms/InvoiceTemplateBuilder'), 'Invoice Builder'),
    title: 'Invoice Builder',
    description: 'Create custom invoices'
  },
  'bills': {
    component: enhancedLazy(() => import('../components/forms/BillManagement'), 'Bill Management'),
    title: 'Bills',
    description: 'Manage bills and payables'
  },
  'bill-management': {
    component: enhancedLazy(() => import('../components/forms/BillManagement'), 'Bill Management'),
    title: 'Bills',
    description: 'Manage bills'
  },
  'transactions': {
    component: enhancedLazy(() => import('../components/lists/TransactionList'), 'Transaction List'),
    title: 'Transactions',
    description: 'View all transactions'
  },

  // Payment Processing
  'receive-payment': {
    component: enhancedLazy(() => import('../components/forms/ReceivePayment'), 'Receive Payment'),
    title: 'Receive Payment',
    description: 'Process incoming payments'
  },
  'make-payment': {
    component: enhancedLazy(() => import('../components/forms/MakePayment'), 'Make Payment'),
    title: 'Make Payment',
    description: 'Process outgoing payments'
  },
  'payment-methods': {
    component: enhancedLazy(() => import('../components/forms/PaymentMethods'), 'Payment Methods'),
    title: 'Payment Methods',
    description: 'Manage payment methods'
  },
  'payment-gateways': {
    component: enhancedLazy(() => import('../components/forms/PaymentGateways'), 'Payment Gateways'),
    title: 'Payment Gateways',
    description: 'Configure payment gateways'
  },
  'recurring-payments': {
    component: enhancedLazy(() => import('../components/forms/RecurringPayments'), 'Recurring Payments'),
    title: 'Recurring Payments',
    description: 'Manage subscriptions'
  },
  'refunds': {
    component: enhancedLazy(() => import('../components/forms/RefundManagement'), 'Refund Management'),
    title: 'Refunds',
    description: 'Process refunds'
  },
  'payment-reconciliation': {
    component: enhancedLazy(() => import('../components/forms/PaymentReconciliation'), 'Payment Reconciliation'),
    title: 'Payment Reconciliation',
    description: 'Reconcile payments'
  },
  'payment-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Payment Reports'),
    title: 'Payment Reports',
    description: 'Payment analytics'
  },

  // Purchasing
  'vendors': {
    component: enhancedLazy(() => import('../components/forms/VendorManagement'), 'Vendor Management'),
    title: 'Vendors',
    description: 'Manage vendor relationships'
  },
  'vendor-management': {
    component: enhancedLazy(() => import('../components/forms/VendorManagement'), 'Vendor Management'),
    title: 'Vendors',
    description: 'Manage vendors'
  },
  'purchase-orders': {
    component: enhancedLazy(() => import('../components/forms/PurchaseOrderManagement'), 'Purchase Orders'),
    title: 'Purchase Orders',
    description: 'Create and manage POs'
  },
  'expenses': {
    component: enhancedLazy(() => import('../components/forms/ExpenseManagement'), 'Expense Management'),
    title: 'Expenses',
    description: 'Track business expenses'
  },
  'purchase-returns': {
    component: enhancedLazy(() => import('../components/forms/PurchaseReturns'), 'Purchase Returns'),
    title: 'Purchase Returns',
    description: 'Manage returns to vendors'
  },
  'procurement': {
    component: enhancedLazy(() => import('../components/forms/ProcurementManagement'), 'Procurement'),
    title: 'Procurement',
    description: 'Procurement management'
  },
  'purchases-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Purchase Reports'),
    title: 'Purchase Reports',
    description: 'Purchasing analytics'
  },

  // Accounting
  'chart-of-accounts': {
    component: enhancedLazy(() => import('../components/forms/ChartOfAccounts'), 'Chart of Accounts'),
    title: 'Chart of Accounts',
    description: 'Manage account structure'
  },
  'journal-entries': {
    component: enhancedLazy(() => import('../components/forms/JournalEntries'), 'Journal Entries'),
    title: 'Journal Entries',
    description: 'Create journal entries'
  },
  'general-ledger': {
    component: enhancedLazy(() => import('../components/forms/GeneralLedger'), 'General Ledger'),
    title: 'General Ledger',
    description: 'View ledger entries'
  },
  'reconciliation': {
    component: enhancedLazy(() => import('../components/forms/AccountReconciliation'), 'Account Reconciliation'),
    title: 'Reconciliation',
    description: 'Reconcile accounts'
  },
  'financial-statements': {
    component: enhancedLazy(() => import('../components/forms/FinancialStatements'), 'Financial Statements'),
    title: 'Financial Statements',
    description: 'View financial reports'
  },
  'fixed-assets': {
    component: enhancedLazy(() => import('../components/forms/FixedAssets'), 'Fixed Assets'),
    title: 'Fixed Assets',
    description: 'Manage fixed assets'
  },
  'accounting-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Accounting Reports'),
    title: 'Accounting Reports',
    description: 'Accounting analytics'
  },

  // Banking
  'banking': {
    component: enhancedLazy(() => import('../components/forms/BankingDashboard'), 'Banking Dashboard'),
    title: 'Banking',
    description: 'Banking overview'
  },
  'bank-transactions': {
    component: enhancedLazy(() => import('../components/forms/BankTransactionPage'), 'Bank Transactions'),
    title: 'Bank Transactions',
    description: 'View bank transactions'
  },
  'bank-reconciliation': {
    component: enhancedLazy(() => import('../components/forms/BankReconciliation'), 'Bank Reconciliation'),
    title: 'Bank Reconciliation',
    description: 'Reconcile bank accounts'
  },
  'banking-reports': {
    component: enhancedLazy(() => import('../components/forms/BankReport'), 'Banking Reports'),
    title: 'Banking Reports',
    description: 'Banking analytics'
  },

  // HR & Payroll
  'hr': {
    component: enhancedLazy(() => import('../components/forms/HRDashboard'), 'HR Dashboard'),
    title: 'Human Resources',
    description: 'HR management tools'
  },
  'hr-dashboard': {
    component: enhancedLazy(() => import('../components/forms/HRDashboard'), 'HR Dashboard'),
    title: 'HR Dashboard',
    description: 'HR overview'
  },
  'employees': {
    component: enhancedLazy(() => import('../components/forms/EmployeeManagement'), 'Employee Management'),
    title: 'Employees',
    description: 'Manage employees'
  },
  'hr-employees': {
    component: enhancedLazy(() => import('../components/forms/EmployeeManagement'), 'Employee Management'),
    title: 'Employees',
    description: 'Manage employees'
  },
  'timesheets': {
    component: enhancedLazy(() => import('../components/forms/TimesheetManagement'), 'Timesheet Management'),
    title: 'Timesheets',
    description: 'Time tracking'
  },
  'hr-timesheets': {
    component: enhancedLazy(() => import('../components/forms/TimesheetManagement'), 'Timesheet Management'),
    title: 'Timesheets',
    description: 'Time tracking'
  },
  'payroll': {
    component: enhancedLazy(() => import('../components/forms/pay/PayForm'), 'Pay Form'),
    title: 'Payroll',
    description: 'Process payroll'
  },
  'pay': {
    component: enhancedLazy(() => import('../components/forms/pay/PayForm'), 'Pay Form'),
    title: 'Payroll',
    description: 'Manage payroll'
  },
  'hr-pay': {
    component: enhancedLazy(() => import('../components/forms/pay/PayForm'), 'Pay Form'),
    title: 'Payroll',
    description: 'Manage payroll'
  },
  'benefits': {
    component: enhancedLazy(() => import('../components/forms/BenefitsManagement'), 'Benefits Management'),
    title: 'Benefits',
    description: 'Employee benefits'
  },
  'hr-benefits': {
    component: enhancedLazy(() => import('../components/forms/BenefitsManagement'), 'Benefits Management'),
    title: 'Benefits',
    description: 'Employee benefits'
  },
  'performance': {
    component: enhancedLazy(() => import('../components/forms/PerformanceManagement'), 'Performance Management'),
    title: 'Performance',
    description: 'Performance reviews'
  },
  'hr-performance': {
    component: enhancedLazy(() => import('../components/forms/PerformanceManagement'), 'Performance Management'),
    title: 'Performance',
    description: 'Performance reviews'
  },
  'hr-reports': {
    component: enhancedLazy(() => import('../components/forms/HRReportManagement'), 'HR Reports'),
    title: 'HR Reports',
    description: 'Human resources reports'
  },
  'payroll-wizard': {
    component: enhancedLazy(() => import('../components/forms/PayrollWizard'), 'Payroll Wizard'),
    title: 'Payroll Wizard',
    description: 'Run payroll step by step'
  },
  'payroll-transactions': {
    component: enhancedLazy(() => import('../components/forms/PayrollTransactions'), 'Payroll Transactions'),
    title: 'Payroll Transactions',
    description: 'View payroll history'
  },
  'payroll-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Payroll Reports'),
    title: 'Payroll Reports',
    description: 'Payroll analytics'
  },

  // Tax Management
  'taxes': {
    component: enhancedLazy(() => import('../components/forms/TaxManagement'), 'Tax Management'),
    title: 'Tax Management',
    description: 'Tax filing and compliance'
  },
  'tax-management': {
    component: enhancedLazy(() => import('../components/forms/TaxManagement'), 'Tax Management'),
    title: 'Taxes',
    description: 'Manage taxes'
  },
  'sales-tax-filing': {
    component: enhancedLazy(() => import('../components/forms/SalesTaxFiling'), 'Sales Tax Filing'),
    title: 'Sales Tax Filing',
    description: 'File sales taxes'
  },
  'file-tax-return': {
    component: enhancedLazy(() => import('../components/forms/FileTaxReturn'), 'File Tax Return'),
    title: 'File Tax Return',
    description: 'Submit tax returns'
  },
  'filing-history': {
    component: enhancedLazy(() => import('../components/forms/FilingHistory'), 'Filing History'),
    title: 'Filing History',
    description: 'View past filings'
  },
  'country-requirements': {
    component: enhancedLazy(() => import('../components/forms/CountryRequirements'), 'Country Requirements'),
    title: 'Country Requirements',
    description: 'Tax requirements by country'
  },
  'payroll-tax-filing': {
    component: enhancedLazy(() => import('../components/forms/PayrollTaxFiling'), 'Payroll Tax Filing'),
    title: 'Payroll Tax Filing',
    description: 'File payroll taxes'
  },
  'file-payroll-tax': {
    component: enhancedLazy(() => import('../components/forms/FilePayrollTax'), 'File Payroll Tax'),
    title: 'File Payroll Tax',
    description: 'Submit payroll taxes'
  },
  'payroll-tax-history': {
    component: enhancedLazy(() => import('../components/forms/PayrollTaxHistory'), 'Payroll Tax History'),
    title: 'Payroll Tax History',
    description: 'View payroll tax filings'
  },
  'payroll-tax-setup': {
    component: enhancedLazy(() => import('../components/forms/PayrollTaxSetup'), 'Payroll Tax Setup'),
    title: 'Payroll Tax Setup',
    description: 'Configure payroll taxes'
  },
  'employee-taxes': {
    component: enhancedLazy(() => import('../components/forms/taxes/EmployeeTaxManagement'), 'Employee Tax Management'),
    title: 'Employee Taxes',
    description: 'Employee tax info'
  },
  'tax-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Tax Reports'),
    title: 'Tax Reports',
    description: 'Tax analytics'
  },

  // Inventory
  'inventory': {
    component: enhancedLazy(() => import('../../inventory/components/InventoryManagement'), 'Inventory Management'),
    title: 'Inventory',
    description: 'Stock management'
  },
  'inventory-supplies': {
    component: enhancedLazy(() => import('../components/forms/inventory/SuppliesManagement'), 'Supplies Management'),
    title: 'Supplies Management',
    description: 'Manage materials and supplies'
  },
  'inventory-suppliers': {
    component: enhancedLazy(() => import('../components/forms/ProductSupplierManagement'), 'Product Supplier Management'),
    title: 'Product Suppliers',
    description: 'Manage product suppliers and vendor relationships'
  },
  'inventory-locations': {
    component: enhancedLazy(() => import('../components/forms/LocationsManagement'), 'Locations Management'),
    title: 'Locations Management',
    description: 'Manage inventory locations'
  },
  'inventory-stock-adjustments': {
    component: enhancedLazy(() => import('../components/forms/StockAdjustmentsManagement'), 'Stock Adjustments'),
    title: 'Stock Adjustments',
    description: 'Manage stock adjustments'
  },
  'suppliers': {
    component: enhancedLazy(() => import('../components/forms/SuppliersManagement'), 'Suppliers Management'),
    title: 'Suppliers',
    description: 'Supplier relationships'
  },
  'inventory-reports': {
    component: enhancedLazy(() => import('../components/forms/InventoryReportsManagement'), 'Inventory Reports'),
    title: 'Inventory Reports',
    description: 'Inventory analytics'
  },

  // Jobs & Projects
  'jobs': {
    component: enhancedLazy(() => import('../components/jobs/JobManagement'), 'Job Management'),
    title: 'Jobs',
    description: 'Project and job management'
  },
  'job-dashboard': {
    component: enhancedLazy(() => import('../components/jobs/JobDashboard'), 'Job Dashboard'),
    title: 'Job Dashboard',
    description: 'Job overview'
  },
  'jobs-list': {
    component: enhancedLazy(() => import('../components/jobs/JobManagement'), 'All Jobs'),
    title: 'All Jobs',
    description: 'View and manage all jobs'
  },
  'job-costing': {
    component: enhancedLazy(() => import('../components/jobs/JobCosting'), 'Job Costing'),
    title: 'Job Costing',
    description: 'Track job costs'
  },
  'job-materials': {
    component: enhancedLazy(() => import('../components/jobs/JobMaterials'), 'Job Materials'),
    title: 'Materials Usage',
    description: 'Track materials'
  },
  'job-labor': {
    component: enhancedLazy(() => import('../components/jobs/JobLabor'), 'Job Labor'),
    title: 'Labor Tracking',
    description: 'Track labor hours'
  },
  'job-profitability': {
    component: enhancedLazy(() => import('../components/jobs/JobProfitability'), 'Job Profitability'),
    title: 'Profitability',
    description: 'Analyze job profits'
  },
  'vehicles': {
    component: enhancedLazy(() => import('../components/jobs/VehicleManagement'), 'Vehicle Management'),
    title: 'Vehicles',
    description: 'Fleet management'
  },
  'jobs-reports': {
    component: enhancedLazy(() => import('../components/jobs/JobReportsManagement'), 'Jobs Reports'),
    title: 'Jobs Reports',
    description: 'Project analytics'
  },

  // Transport
  'transport': {
    component: enhancedLazy(() => import('../components/transport/TransportDashboard'), 'Transport Dashboard'),
    title: 'Transport',
    description: 'Fleet and transport'
  },
  'transport-dashboard': {
    component: enhancedLazy(() => import('../components/transport/TransportDashboard'), 'Transport Dashboard'),
    title: 'Transport',
    description: 'Transport overview'
  },

  // Reports
  'reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Reports'),
    title: 'Reports',
    description: 'Business reports'
  },

  // CRM
  'crm': {
    component: enhancedLazy(() => import('../components/crm/CRMDashboard'), 'CRM Dashboard'),
    title: 'CRM',
    description: 'Customer relationships'
  },
  'contacts': {
    component: enhancedLazy(() => import('../components/crm/ContactsManagement'), 'Contacts Management'),
    title: 'Contacts',
    description: 'Contact management'
  },

  // Tools & Settings
  'profile': {
    component: enhancedLazy(() => import('../components/profile/ProfileWrapper'), 'Profile'),
    title: 'My Profile',
    description: 'View and edit your profile'
  },
  'settings': {
    component: enhancedLazy(() => import('../../Settings/components/SettingsManagement'), 'Settings'),
    title: 'Settings',
    description: 'Account settings'
  },
  'help-center': {
    component: enhancedLazy(() => import('../components/forms/HelpCenter'), 'Help Center'),
    title: 'Help Center',
    description: 'Get help and support'
  },
  'import-export': {
    component: enhancedLazy(() => import('../components/forms/ImportExport'), 'Import/Export'),
    title: 'Import/Export',
    description: 'Data tools'
  },
  'calendar': {
    component: enhancedLazy(() => import('../components/forms/Calendar'), 'Calendar'),
    title: 'Calendar',
    description: 'Schedule management'
  },
  'whatsapp-business': {
    component: enhancedLazy(() => import('../components/forms/WhatsAppBusiness'), 'WhatsApp Business'),
    title: 'WhatsApp Business',
    description: 'WhatsApp integration'
  },
  'invite-friend': {
    component: enhancedLazy(() => import('../components/invite/InviteAFriend'), 'Invite Friend'),
    title: 'Invite Business Owner',
    description: 'Invite others'
  },
  'dott-status': {
    component: enhancedLazy(() => import('../components/status/DottStatus'), 'Dott Status'),
    title: 'Dott Status',
    description: 'System status'
  },
  
  // HR Test Component (temporary for debugging)
  'hr-test': {
    component: enhancedLazy(() => import('../components/HRComponentTest'), 'HR Test'),
    title: 'HR Component Test',
    description: 'Test HR components'
  },

  // Default fallback
  'home': {
    component: enhancedLazy(() => import('../components/Home'), 'Home'),
    title: 'Home',
    description: 'Welcome home'
  }
};

/**
 * Get route information by view name
 */
export const getRouteInfo = (view) => {
  return routeRegistry[view] || routeRegistry['home'];
};

/**
 * Get all available routes
 */
export const getAllRoutes = () => {
  return Object.keys(routeRegistry);
};
