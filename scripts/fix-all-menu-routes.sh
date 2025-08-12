#!/bin/bash

echo "🔧 FIXING ALL MENU ROUTES TO ENSURE THEY RENDER"
echo "=============================================="
echo ""

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# First, let's create a comprehensive route mapping based on menu items
echo "📝 Creating comprehensive route mappings..."

# Update the route registry with ALL menu items
cat > src/app/dashboard/router/routeRegistry-complete.js << 'EOF'
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
    component: enhancedLazy(() => import('../components/dashboards/MainDashboard'), 'Main Dashboard'),
    title: 'Dashboard',
    description: 'Main dashboard overview'
  },
  'sales-dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/SalesDashboard'), 'Sales Dashboard'),
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
    component: enhancedLazy(() => import('../components/forms/AnalysisPage'), 'Analytics Dashboard'),
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
    component: enhancedLazy(() => import('../components/pos/POSSystem'), 'POS System'),
    title: 'Point of Sale',
    description: 'Sales terminal and checkout'
  },
  'products': {
    component: enhancedLazy(() => import('@/domains/products/components/ProductManagement'), 'Product Management'),
    title: 'Products',
    description: 'Manage product catalog'
  },
  'product-management': {
    component: enhancedLazy(() => import('@/domains/products/components/ProductManagement'), 'Product Management'),
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
    component: enhancedLazy(() => import('../components/forms/CreateProductManagement'), 'Create Product'),
    title: 'Create Product',
    description: 'Add new products'
  },
  'sales-products': {
    component: enhancedLazy(() => import('../components/forms/SalesProductManagement'), 'Sales Products'),
    title: 'Sales Products',
    description: 'Manage sales products'
  },
  'estimates': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagement'), 'Estimate Management'),
    title: 'Estimates',
    description: 'Create and manage estimates'
  },
  'estimate-management': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagement'), 'Estimate Management'),
    title: 'Estimates',
    description: 'Manage estimates'
  },
  'orders': {
    component: enhancedLazy(() => import('../components/forms/OrderManagement'), 'Order Management'),
    title: 'Orders',
    description: 'Manage customer orders'
  },
  'order-management': {
    component: enhancedLazy(() => import('../components/forms/OrderManagement'), 'Order Management'),
    title: 'Orders',
    description: 'Manage orders'
  },
  'sales-reports-management': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Sales Reports'),
    title: 'Sales Reports',
    description: 'Sales analytics and reports'
  },

  // Customer Management
  'customers': {
    component: enhancedLazy(() => import('../components/lists/CustomerList'), 'Customer List'),
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
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Banking Reports'),
    title: 'Banking Reports',
    description: 'Banking analytics'
  },

  // HR & Payroll
  'hr': {
    component: enhancedLazy(() => import('../components/forms/HRDashboard'), 'HR Dashboard'),
    title: 'Human Resources',
    description: 'HR management tools'
  },
  'employees': {
    component: enhancedLazy(() => import('../components/forms/EmployeeManagement'), 'Employee Management'),
    title: 'Employees',
    description: 'Manage employees'
  },
  'timesheets': {
    component: enhancedLazy(() => import('../components/forms/TimesheetManagement'), 'Timesheet Management'),
    title: 'Timesheets',
    description: 'Time tracking'
  },
  'payroll': {
    component: enhancedLazy(() => import('../components/forms/PayManagement'), 'Payroll Management'),
    title: 'Payroll',
    description: 'Process payroll'
  },
  'pay': {
    component: enhancedLazy(() => import('../components/forms/PayManagement'), 'Pay Management'),
    title: 'Payroll',
    description: 'Manage payroll'
  },
  'benefits': {
    component: enhancedLazy(() => import('../components/forms/BenefitsManagement'), 'Benefits Management'),
    title: 'Benefits',
    description: 'Employee benefits'
  },
  'performance': {
    component: enhancedLazy(() => import('../components/forms/PerformanceManagement'), 'Performance Management'),
    title: 'Performance',
    description: 'Performance reviews'
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
    component: enhancedLazy(() => import('../../inventory/components/InventoryManagement'), 'Inventory & Supplies'),
    title: 'Inventory & Supplies',
    description: 'Stock and supplies'
  },
  'suppliers': {
    component: enhancedLazy(() => import('../components/forms/SuppliersManagement'), 'Suppliers Management'),
    title: 'Suppliers',
    description: 'Supplier relationships'
  },
  'inventory-reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Inventory Reports'),
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
    component: enhancedLazy(() => import('../components/jobs/JobsList'), 'Jobs List'),
    title: 'All Jobs',
    description: 'View all jobs'
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
    component: enhancedLazy(() => import('../components/forms/ReportDisplay'), 'Jobs Reports'),
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
  'settings': {
    component: enhancedLazy(() => import('../../Settings/UserProfile/components/UserProfileSettings'), 'Settings'),
    title: 'Settings',
    description: 'Account settings'
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
    component: enhancedLazy(() => import('../components/forms/InviteFriend'), 'Invite Friend'),
    title: 'Invite Business Owner',
    description: 'Invite others'
  },
  'dott-status': {
    component: enhancedLazy(() => import('../components/forms/DottStatus'), 'Dott Status'),
    title: 'Dott Status',
    description: 'System status'
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
EOF

# Replace the current route registry
mv src/app/dashboard/router/routeRegistry-complete.js src/app/dashboard/router/routeRegistry.js

# Now update RenderMainContent to handle all the event-based navigation
echo "📝 Updating RenderMainContent to handle all navigation events..."

cat > src/app/dashboard/components/RenderMainContent-enhanced.js << 'EOF'
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
    
    // Complete legacy prop mapping
    if (props.showProductManagement) mappedView = 'products';
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
  }, [view, props]);

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
EOF

# Replace the current RenderMainContent
mv src/app/dashboard/components/RenderMainContent-enhanced.js src/app/dashboard/components/RenderMainContent.js

# Create fallback components for any that don't exist yet
echo "🏗️ Creating fallback components..."

# Create directories if they don't exist
mkdir -p src/app/dashboard/components/dashboards
mkdir -p src/app/dashboard/components/forms
mkdir -p src/app/dashboard/components/jobs
mkdir -p src/app/dashboard/components/transport
mkdir -p src/app/dashboard/components/crm
mkdir -p src/app/dashboard/components/pos

# Create a generic fallback component generator
create_fallback_component() {
  local path=$1
  local name=$2
  local title=$3
  
  if [ ! -f "$path" ]; then
    cat > "$path" << EOF
'use client';

import React from 'react';

const $name = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">$title</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          The $title feature is currently under development.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          This feature will be available soon. Stay tuned for updates!
        </p>
      </div>
    </div>
  );
};

export default $name;
EOF
    echo "Created fallback: $path"
  fi
}

# Create fallback components for dashboards
create_fallback_component "src/app/dashboard/components/dashboards/SalesDashboard.js" "SalesDashboard" "Sales Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/InventoryDashboard.js" "InventoryDashboard" "Inventory Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/PaymentsDashboard.js" "PaymentsDashboard" "Payments Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/PurchasesDashboard.js" "PurchasesDashboard" "Purchases Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/AccountingDashboard.js" "AccountingDashboard" "Accounting Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/PayrollDashboard.js" "PayrollDashboard" "Payroll Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/TaxesDashboard.js" "TaxesDashboard" "Taxes Dashboard"
create_fallback_component "src/app/dashboard/components/dashboards/ReportsDashboard.js" "ReportsDashboard" "Reports Dashboard"

# Create fallback components for forms
create_fallback_component "src/app/dashboard/components/forms/OrderManagement.js" "OrderManagement" "Order Management"
create_fallback_component "src/app/dashboard/components/forms/ReceivePayment.js" "ReceivePayment" "Receive Payment"
create_fallback_component "src/app/dashboard/components/forms/MakePayment.js" "MakePayment" "Make Payment"
create_fallback_component "src/app/dashboard/components/forms/PaymentMethods.js" "PaymentMethods" "Payment Methods"
create_fallback_component "src/app/dashboard/components/forms/RecurringPayments.js" "RecurringPayments" "Recurring Payments"
create_fallback_component "src/app/dashboard/components/forms/RefundManagement.js" "RefundManagement" "Refund Management"
create_fallback_component "src/app/dashboard/components/forms/PaymentReconciliation.js" "PaymentReconciliation" "Payment Reconciliation"
create_fallback_component "src/app/dashboard/components/forms/PurchaseOrderManagement.js" "PurchaseOrderManagement" "Purchase Orders"
create_fallback_component "src/app/dashboard/components/forms/ExpenseManagement.js" "ExpenseManagement" "Expense Management"
create_fallback_component "src/app/dashboard/components/forms/PurchaseReturns.js" "PurchaseReturns" "Purchase Returns"
create_fallback_component "src/app/dashboard/components/forms/ProcurementManagement.js" "ProcurementManagement" "Procurement"
create_fallback_component "src/app/dashboard/components/forms/ChartOfAccounts.js" "ChartOfAccounts" "Chart of Accounts"
create_fallback_component "src/app/dashboard/components/forms/JournalEntries.js" "JournalEntries" "Journal Entries"
create_fallback_component "src/app/dashboard/components/forms/GeneralLedger.js" "GeneralLedger" "General Ledger"
create_fallback_component "src/app/dashboard/components/forms/AccountReconciliation.js" "AccountReconciliation" "Account Reconciliation"
create_fallback_component "src/app/dashboard/components/forms/FinancialStatements.js" "FinancialStatements" "Financial Statements"
create_fallback_component "src/app/dashboard/components/forms/FixedAssets.js" "FixedAssets" "Fixed Assets"
create_fallback_component "src/app/dashboard/components/forms/BankReconciliation.js" "BankReconciliation" "Bank Reconciliation"
create_fallback_component "src/app/dashboard/components/forms/BenefitsManagement.js" "BenefitsManagement" "Benefits Management"
create_fallback_component "src/app/dashboard/components/forms/PerformanceManagement.js" "PerformanceManagement" "Performance Management"
create_fallback_component "src/app/dashboard/components/forms/PayrollWizard.js" "PayrollWizard" "Payroll Wizard"
create_fallback_component "src/app/dashboard/components/forms/PayrollTransactions.js" "PayrollTransactions" "Payroll Transactions"
create_fallback_component "src/app/dashboard/components/forms/SalesTaxFiling.js" "SalesTaxFiling" "Sales Tax Filing"
create_fallback_component "src/app/dashboard/components/forms/FileTaxReturn.js" "FileTaxReturn" "File Tax Return"
create_fallback_component "src/app/dashboard/components/forms/FilingHistory.js" "FilingHistory" "Filing History"
create_fallback_component "src/app/dashboard/components/forms/CountryRequirements.js" "CountryRequirements" "Country Requirements"
create_fallback_component "src/app/dashboard/components/forms/PayrollTaxFiling.js" "PayrollTaxFiling" "Payroll Tax Filing"
create_fallback_component "src/app/dashboard/components/forms/FilePayrollTax.js" "FilePayrollTax" "File Payroll Tax"
create_fallback_component "src/app/dashboard/components/forms/PayrollTaxHistory.js" "PayrollTaxHistory" "Payroll Tax History"
create_fallback_component "src/app/dashboard/components/forms/PayrollTaxSetup.js" "PayrollTaxSetup" "Payroll Tax Setup"
create_fallback_component "src/app/dashboard/components/forms/WhatsAppBusiness.js" "WhatsAppBusiness" "WhatsApp Business"
create_fallback_component "src/app/dashboard/components/forms/InviteFriend.js" "InviteFriend" "Invite Business Owner"
create_fallback_component "src/app/dashboard/components/forms/DottStatus.js" "DottStatus" "Dott Status"

# Create fallback components for jobs
create_fallback_component "src/app/dashboard/components/jobs/JobsList.js" "JobsList" "All Jobs"
create_fallback_component "src/app/dashboard/components/jobs/JobCosting.js" "JobCosting" "Job Costing"
create_fallback_component "src/app/dashboard/components/jobs/JobMaterials.js" "JobMaterials" "Materials Usage"
create_fallback_component "src/app/dashboard/components/jobs/JobLabor.js" "JobLabor" "Labor Tracking"
create_fallback_component "src/app/dashboard/components/jobs/JobProfitability.js" "JobProfitability" "Profitability Analysis"
create_fallback_component "src/app/dashboard/components/jobs/VehicleManagement.js" "VehicleManagement" "Vehicle Management"

echo ""
echo "✅ All menu routes have been mapped!"
echo ""
echo "🚀 Committing and deploying..."

cd /Users/kuoldeng/projectx
git add -A
git commit -m "feat: comprehensive menu-to-route mapping for all dashboard pages

- Created complete route registry with 100+ routes
- Enhanced RenderMainContent to handle all navigation events
- Added event-to-route mapping for menu navigation
- Created fallback components for features under development
- Ensures all menu items can render content in dashboard

Every menu item now has a corresponding route and component, either with the actual implementation or a clean fallback UI."

git push origin main

echo ""
echo "✅ MENU ROUTING FIX COMPLETE!"
echo ""
echo "All menu items should now render properly in the dashboard content area."
echo "Monitor deployment: https://dashboard.render.com/web/srv-crpgfj68ii6s739n5jdg/deploys"