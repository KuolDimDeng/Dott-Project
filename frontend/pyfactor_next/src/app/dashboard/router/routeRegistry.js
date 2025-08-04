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
 * Route Registry - Central place for all dashboard routes
 * Each route maps a view name to a lazy-loaded component
 */
export const routeRegistry = {
  // Dashboard & Analytics
  'dashboard': {
    component: enhancedLazy(() => import('../components/dashboards/MainDashboard'), 'Main Dashboard'),
    title: 'Dashboard',
    description: 'Main dashboard overview'
  },
  
  'analytics': {
    component: enhancedLazy(() => import('../components/forms/AnalysisPage'), 'Analysis Page'),
    title: 'Analytics',
    description: 'Business analytics and insights'
  },

  'smart-insights': {
    component: enhancedLazy(() => import('../components/forms/SmartInsight.js'), 'Smart Insights'),
    title: 'Smart Insights',
    description: 'AI-powered business insights'
  },

  // Product Management (using our new modular structure)
  'products': {
    component: enhancedLazy(() => import('@/domains/products/components/ProductManagement'), 'Product Management'),
    title: 'Products',
    description: 'Manage your product inventory'
  },

  'create-product': {
    component: enhancedLazy(() => import('../components/forms/CreateProductManagement.js'), 'Create Product'),
    title: 'Create Product',
    description: 'Add new products'
  },

  'sales-products': {
    component: enhancedLazy(() => import('../components/forms/SalesProductManagement.js'), 'Sales Products'),
    title: 'Sales Products',
    description: 'Manage sales products'
  },

  // Customer Management
  'customers': {
    component: enhancedLazy(() => import('../components/lists/CustomerList.js'), 'Customer List'),
    title: 'Customers',
    description: 'Manage customer relationships'
  },

  'customer-management': {
    component: enhancedLazy(() => import('../components/forms/CustomerManagement.js'), 'Customer Management'),
    title: 'Customer Management',
    description: 'Advanced customer management'
  },

  // Financial Management
  'transactions': {
    component: enhancedLazy(() => import('../components/lists/TransactionList.js'), 'Transaction List'),
    title: 'Transactions',
    description: 'View all transactions'
  },

  'invoices': {
    component: enhancedLazy(() => import('../components/forms/InvoiceManagement.js'), 'Invoice Management'),
    title: 'Invoices',
    description: 'Manage invoices and billing'
  },

  'invoice-builder': {
    component: enhancedLazy(() => import('../components/forms/InvoiceTemplateBuilder.js'), 'Invoice Builder'),
    title: 'Invoice Builder',
    description: 'Create custom invoices'
  },

  // Banking
  'banking': {
    component: enhancedLazy(() => import('../components/forms/BankingDashboard.js'), 'Banking Dashboard'),
    title: 'Banking',
    description: 'Banking and financial tools'
  },

  'bank-transactions': {
    component: enhancedLazy(() => import('../components/forms/BankTransactionPage'), 'Bank Transactions'),
    title: 'Bank Transactions',
    description: 'View bank transaction history'
  },

  // HR & Payroll
  'hr': {
    component: enhancedLazy(() => import('../components/forms/HRDashboard.js'), 'HR Dashboard'),
    title: 'Human Resources',
    description: 'HR management tools'
  },

  'employees': {
    component: enhancedLazy(() => import('../components/forms/EmployeeManagement.js'), 'Employee Management'),
    title: 'Employees',
    description: 'Manage employee information'
  },

  'payroll': {
    component: enhancedLazy(() => import('../components/forms/PayManagement.js'), 'Payroll Management'),
    title: 'Payroll',
    description: 'Payroll processing and management'
  },

  'timesheets': {
    component: enhancedLazy(() => import('../components/forms/TimesheetManagement.js'), 'Timesheet Management'),
    title: 'Timesheets',
    description: 'Employee time tracking'
  },

  // Tax Management
  'taxes': {
    component: enhancedLazy(() => import('../components/forms/TaxManagement.js'), 'Tax Management'),
    title: 'Tax Management',
    description: 'Tax filing and compliance'
  },

  'employee-taxes': {
    component: enhancedLazy(() => import('../components/forms/taxes/EmployeeTaxManagement.js'), 'Employee Tax Management'),
    title: 'Employee Taxes',
    description: 'Employee tax information'
  },

  // Inventory
  'inventory': {
    component: enhancedLazy(() => import('../../inventory/components/InventoryManagement.js'), 'Inventory Management'),
    title: 'Inventory',
    description: 'Stock and inventory management'
  },

  'suppliers': {
    component: enhancedLazy(() => import('../components/forms/SuppliersManagement.js'), 'Suppliers Management'),
    title: 'Suppliers',
    description: 'Supplier relationship management'
  },

  // POS System
  'pos': {
    component: enhancedLazy(() => import('../components/pos/POSSystem.js'), 'POS System'),
    title: 'Point of Sale',
    description: 'Sales terminal and POS'
  },

  // Reports
  'reports': {
    component: enhancedLazy(() => import('../components/forms/ReportDisplay.js'), 'Reports'),
    title: 'Reports',
    description: 'Business reports and analytics'
  },

  // Settings & Tools
  'settings': {
    component: enhancedLazy(() => import('../../Settings/UserProfile/components/UserProfileSettings.js'), 'Settings'),
    title: 'Settings',
    description: 'Account and system settings'
  },

  'import-export': {
    component: enhancedLazy(() => import('../components/forms/ImportExport.js'), 'Import/Export'),
    title: 'Import/Export',
    description: 'Data import and export tools'
  },

  'calendar': {
    component: enhancedLazy(() => import('../components/forms/Calendar.js'), 'Calendar'),
    title: 'Calendar',
    description: 'Schedule and calendar management'
  },

  // CRM
  'crm': {
    component: enhancedLazy(() => import('../components/crm/CRMDashboard'), 'CRM Dashboard'),
    title: 'CRM',
    description: 'Customer relationship management'
  },

  'contacts': {
    component: enhancedLazy(() => import('../components/crm/ContactsManagement'), 'Contacts Management'),
    title: 'Contacts',
    description: 'Contact management'
  },

  // Jobs & Projects
  'jobs': {
    component: enhancedLazy(() => import('../components/jobs/JobManagement.js'), 'Job Management'),
    title: 'Jobs',
    description: 'Project and job management'
  },

  'job-dashboard': {
    component: enhancedLazy(() => import('../components/jobs/JobDashboard.js'), 'Job Dashboard'),
    title: 'Job Dashboard',
    description: 'Job overview and tracking'
  },

  // Transport
  'transport': {
    component: enhancedLazy(() => import('../components/transport/TransportDashboard.js'), 'Transport Dashboard'),
    title: 'Transport',
    description: 'Fleet and transport management'
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
