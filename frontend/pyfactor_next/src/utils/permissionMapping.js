/**
 * Permission ID to Path Mapping Utility
 * 
 * This utility handles the conversion between frontend page IDs (e.g., 'sales-products')
 * and backend paths (e.g., '/dashboard/products') to ensure proper permission checking.
 */

// Complete mapping of page IDs to their corresponding paths
export const PAGE_ID_TO_PATH_MAP = {
  // Create New items
  'create-new-transaction': '/dashboard/transactions/new',
  'create-new-pos': '/dashboard/pos',
  'create-new-product': '/dashboard/products/new',
  'create-new-service': '/dashboard/services/new',
  'create-new-invoice': '/dashboard/invoices/new',
  'create-new-bill': '/dashboard/bills/new',
  'create-new-estimate': '/dashboard/estimates/new',
  'create-new-customer': '/dashboard/customers/new',
  'create-new-vendor': '/dashboard/vendors/new',
  
  // Dashboard
  'dashboard': '/dashboard',
  'calendar': '/dashboard/calendar',
  
  // Sales
  'sales-dashboard': '/dashboard/sales',
  'sales-products': '/dashboard/products',
  'sales-services': '/dashboard/services',
  'sales-customers': '/dashboard/customers',
  'sales-estimates': '/dashboard/estimates',
  'sales-orders': '/dashboard/orders',
  'sales-invoices': '/dashboard/invoices',
  'sales-reports': '/dashboard/sales/reports',
  
  // Inventory
  'inventory-dashboard': '/dashboard/inventory',
  'inventory-stock': '/dashboard/inventory/stock',
  'inventory-locations': '/dashboard/inventory/locations',
  'inventory-suppliers': '/dashboard/inventory/suppliers',
  'inventory-reports': '/dashboard/inventory/reports',
  
  // Payments
  'payments-dashboard': '/dashboard/payments',
  'payments-receive': '/dashboard/payments/receive',
  'payments-make': '/dashboard/payments/make',
  'payments-methods': '/dashboard/payments/methods',
  'payments-recurring': '/dashboard/payments/recurring',
  'payments-refunds': '/dashboard/payments/refunds',
  
  // HR
  'hr-dashboard': '/dashboard/hr',
  'hr-employees': '/dashboard/employees',
  'hr-timesheets': '/dashboard/timesheets',
  'hr-benefits': '/dashboard/benefits',
  'hr-performance': '/dashboard/performance',
  
  // Banking
  'banking-dashboard': '/dashboard/banking',
  'banking-connect': '/dashboard/banking/connect',
  'banking-transactions': '/dashboard/banking/transactions',
  'banking-reconciliation': '/dashboard/banking/reconciliation',
  'banking-reports': '/dashboard/banking/bank-reports',
  
  // Purchases
  'purchases-dashboard': '/dashboard/purchases',
  'purchases-orders': '/dashboard/purchases/orders',
  'purchases-bills': '/dashboard/bills',
  'purchases-expenses': '/dashboard/expenses',
  'purchases-vendors': '/dashboard/vendors',
  'purchases-reports': '/dashboard/purchases/reports',
  
  // Payroll
  'payroll-dashboard': '/dashboard/payroll',
  'payroll-run': '/dashboard/payroll/run',
  'payroll-schedule': '/dashboard/payroll/schedule',
  'payroll-settings': '/dashboard/payroll/settings',
  'payroll-reports': '/dashboard/payroll/reports',
  'payroll-export': '/dashboard/payroll/export-report',
  
  // Taxes
  'taxes-dashboard': '/dashboard/taxes',
  'taxes-forms': '/dashboard/taxes/forms',
  'taxes-filing': '/dashboard/taxes/filing',
  'taxes-deadlines': '/dashboard/taxes/deadlines',
  'taxes-settings': '/dashboard/taxes/settings',
  'taxes-reports': '/dashboard/taxes/reports',
  
  // Analytics
  'analytics-dashboard': '/dashboard/analytics',
  'analytics-business': '/dashboard/analytics/business',
  'analytics-financial': '/dashboard/analytics/financial',
  'analytics-sales': '/dashboard/analytics/sales',
  'analytics-customer': '/dashboard/analytics/customer',
  'analytics-inventory': '/dashboard/analytics/inventory',
  
  // Smart Insights
  'smart-insights-dashboard': '/dashboard/smart-insights',
  'smart-insights-claude': '/dashboard/smart-insights/claude',
  'smart-insights-query': '/dashboard/smart-insights/query',
  'smart-insights-packages': '/dashboard/smart-insights/packages',
  'smart-insights-credits': '/dashboard/smart-insights/credits',
  'smart-insights-purchase': '/dashboard/smart-insights/purchase',
  
  // Reports
  'reports-dashboard': '/dashboard/reports',
  'reports-financial': '/dashboard/reports/financial',
  'reports-sales': '/dashboard/reports/sales',
  'reports-inventory': '/dashboard/reports/inventory',
  'reports-custom': '/dashboard/reports/custom'
};

/**
 * Convert an array of page IDs to an array of page permission objects with paths
 * @param {Array} pageIds - Array of page IDs (e.g., ['sales-products', 'hr-employees'])
 * @param {Object} permissions - Object with page permissions { pageId: { canAccess: true, canWrite: false } }
 * @returns {Array} Array of permission objects for backend
 */
export function convertPageIdsToPermissions(permissions) {
  const result = [];
  
  Object.keys(permissions).forEach(pageId => {
    const permission = permissions[pageId];
    if (permission.canAccess) {
      const path = PAGE_ID_TO_PATH_MAP[pageId];
      if (path) {
        result.push({
          page_id: pageId,
          path: path,
          can_read: true,
          can_write: permission.canWrite || false,
          can_edit: permission.canWrite || false,
          can_delete: permission.canWrite || false
        });
      }
    }
  });
  
  return result;
}

/**
 * Convert backend permissions array to frontend format
 * @param {Array} backendPermissions - Array from backend with paths
 * @returns {Object} Object with pageId keys for frontend
 */
export function convertBackendPermissionsToFrontend(backendPermissions) {
  const result = {};
  
  if (Array.isArray(backendPermissions)) {
    backendPermissions.forEach(perm => {
      // Find the page ID for this path
      const pageId = Object.keys(PAGE_ID_TO_PATH_MAP).find(
        id => PAGE_ID_TO_PATH_MAP[id] === perm.path
      );
      
      if (pageId) {
        result[pageId] = {
          canAccess: perm.can_read || false,
          canWrite: perm.can_write || false
        };
      }
    });
  }
  
  return result;
}