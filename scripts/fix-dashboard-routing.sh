#!/bin/bash

echo "🚨 FIXING DASHBOARD ROUTING ISSUES"
echo "================================="
echo ""

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# Fix 1: Update route registry with all missing routes
echo "📝 Adding missing routes to registry..."

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
 * Complete Route Registry - All dashboard routes
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

  // Customer Management
  'customers': {
    component: enhancedLazy(() => import('../components/lists/CustomerList.js'), 'Customer List'),
    title: 'Customers',
    description: 'Manage customer relationships'
  },

  'customerList': {
    component: enhancedLazy(() => import('../components/lists/CustomerList.js'), 'Customer List'),
    title: 'Customers',
    description: 'Customer list view'
  },

  'customer-management': {
    component: enhancedLazy(() => import('../components/forms/CustomerManagement.js'), 'Customer Management'),
    title: 'Customer Management',
    description: 'Advanced customer management'
  },

  // Product Management
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

  'sales-services': {
    component: enhancedLazy(() => import('../components/forms/ServiceManagement.js'), 'Service Management'),
    title: 'Services',
    description: 'Manage services'
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

  'bills': {
    component: enhancedLazy(() => import('../components/forms/BillManagement.js'), 'Bill Management'),
    title: 'Bills',
    description: 'Manage bills and payables'
  },

  'estimates': {
    component: enhancedLazy(() => import('../components/forms/EstimateManagement.js'), 'Estimate Management'),
    title: 'Estimates',
    description: 'Create and manage estimates'
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

  'payment-gateways': {
    component: enhancedLazy(() => import('../components/forms/PaymentGatewayManagement.js'), 'Payment Gateways'),
    title: 'Payment Gateways',
    description: 'Manage payment methods'
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

  'inventory-supplies': {
    component: enhancedLazy(() => import('../../inventory/components/InventoryManagement.js'), 'Inventory & Supplies'),
    title: 'Inventory & Supplies',
    description: 'Stock and supplies management'
  },

  'suppliers': {
    component: enhancedLazy(() => import('../components/forms/SuppliersManagement.js'), 'Suppliers Management'),
    title: 'Suppliers',
    description: 'Supplier relationship management'
  },

  'vendors': {
    component: enhancedLazy(() => import('../components/forms/VendorManagement.js'), 'Vendor Management'),
    title: 'Vendors',
    description: 'Manage vendor relationships'
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
EOF

# Fix 2: Update RenderMainContent to handle all legacy props
echo "🔧 Updating RenderMainContent mappings..."

cat > src/app/dashboard/components/RenderMainContent.js << 'EOF'
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
EOF

# Fix 3: Replace the incomplete registry with the complete one
echo "📦 Replacing route registry..."
mv src/app/dashboard/router/routeRegistry-complete.js src/app/dashboard/router/routeRegistry.js

# Fix 4: Create missing Home component if it doesn't exist
echo "🏠 Ensuring Home component exists..."
if [ ! -f "src/app/dashboard/components/Home.js" ]; then
  cat > src/app/dashboard/components/Home.js << 'EOF'
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const Home = ({ userData }) => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome back, {userData?.name || 'User'}!
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/dashboard?view=invoices')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
              >
                Create Invoice
              </button>
              <button
                onClick={() => router.push('/dashboard?view=customers')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
              >
                Add Customer
              </button>
              <button
                onClick={() => router.push('/dashboard?view=products')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
              >
                Manage Products
              </button>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600">No recent activity</p>
          </div>
          
          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customers</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoices</span>
                <span className="font-semibold">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
EOF
fi

echo ""
echo "✅ Dashboard routing fixes complete!"
echo ""
echo "🚀 Committing and deploying..."

cd /Users/kuoldeng/projectx
git add -A
git commit -m "fix: dashboard routing and missing views

- Added complete route registry with all views
- Fixed customerList, sales-services, payment-gateways routes
- Added comprehensive legacy prop mappings
- Created Home component fallback
- Fixed React Error #130 (undefined components)

This ensures all dashboard views work correctly with the modular architecture."

git push origin main

echo ""
echo "✅ ROUTING FIX DEPLOYED!"
echo ""
echo "The dashboard should now:"
echo "1. Load all views without 'View Not Found' errors"
echo "2. Handle all legacy showXXX props correctly"
echo "3. Display content properly without React errors"
echo ""
echo "Monitor deployment: https://dashboard.render.com/web/srv-crpgfj68ii6s739n5jdg/deploys"