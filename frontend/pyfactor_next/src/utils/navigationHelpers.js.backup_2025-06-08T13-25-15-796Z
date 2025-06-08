/**
 * Navigation helper utility for consistent redirection to customer management
 */

/**
 * Navigate to the customer management page, respecting the tenant ID pattern if present
 * @param {string|null} tenantId - Optional tenant ID for tenant-specific routes
 * @param {string} tab - Optional tab to activate (list, add, details)
 * @param {string|null} customerId - Optional customer ID for details tab
 */
export const navigateToCustomers = (tenantId, tab = 'list', customerId = null) => {
  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.set('tab', tab);
  
  if (customerId && tab === 'details') {
    queryParams.set('id', customerId);
  }
  
  // Build the redirect URL with or without tenant ID
  const queryString = queryParams.toString();
  const redirectUrl = tenantId
    ? `/${tenantId}/dashboard/customers?${queryString}`
    : `/dashboard/customers?${queryString}`;
  
  // Redirect to the appropriate URL
  window.location.href = redirectUrl;
};

/**
 * Handle redirection when CRM "Customers" is clicked from the menu
 * @param {string|null} tenantId - Optional tenant ID for tenant-specific routes
 */
export const handleCRMCustomersClick = (tenantId) => {
  navigateToCustomers(tenantId, 'list');
};

/**
 * Detect if we're in a tenant-specific route and extract the tenant ID
 * @returns {string|null} The tenant ID or null if not in a tenant-specific route
 */
export const getCurrentTenantId = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check if the URL matches a tenant-specific pattern
  const pathMatch = window.location.pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/);
  
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }
  
  // Check cookies for tenant ID
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'tenantId') {
      return value;
    }
  }
  
  return null;
}; 