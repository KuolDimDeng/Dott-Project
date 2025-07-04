/**
 * PostHog Tracking Utilities
 * Provides consistent page naming and event tracking across the application
 */

/**
 * Get a human-readable page name from the pathname
 * @param {string} pathname - The URL pathname
 * @returns {string} Human-readable page name
 */
export function getPageName(pathname) {
  // Remove leading/trailing slashes and split by /
  const parts = pathname.replace(/^\/|\/$/g, '').split('/');
  
  // Special cases for specific pages
  const pageNameMap = {
    '': 'Landing Page',
    'auth/signin': 'Sign In',
    'auth/signup': 'Sign Up',
    'auth/email-signin': 'Email Sign In',
    'auth/session-loading': 'Session Loading',
    'onboarding': 'Onboarding - Start',
    'onboarding/business-info': 'Onboarding - Business Info',
    'onboarding/subscription': 'Onboarding - Subscription',
    'onboarding/complete': 'Onboarding - Complete',
    'dashboard': 'Dashboard - Home',
    'dashboard/products': 'Dashboard - Products',
    'dashboard/services': 'Dashboard - Services',
    'dashboard/customers': 'Dashboard - Customers',
    'dashboard/sales': 'Dashboard - Sales',
    'dashboard/invoices': 'Dashboard - Invoices',
    'dashboard/estimates': 'Dashboard - Estimates',
    'dashboard/payments': 'Dashboard - Payments',
    'dashboard/reports': 'Dashboard - Reports',
    'dashboard/inventory': 'Dashboard - Inventory',
    'dashboard/taxes': 'Dashboard - Taxes',
    'dashboard/employees': 'Dashboard - Employees',
    'dashboard/settings': 'Dashboard - Settings',
    'Settings': 'Settings',
    'Settings/MyAccount': 'Settings - My Account',
    'Settings/PlanAndBilling': 'Settings - Plan & Billing',
    'Settings/Notifications': 'Settings - Notifications',
    'Settings/Security': 'Settings - Security',
    'Settings/BusinessInfo': 'Settings - Business Info',
    'Settings/TeamMembers': 'Settings - Team Members',
    'Settings/Integrations': 'Settings - Integrations',
    'Settings/APIKeys': 'Settings - API Keys',
    'Settings/TaxSettings': 'Settings - Tax Configuration'
  };

  // Join parts to create a path key
  const pathKey = parts.join('/');
  
  // Return mapped name or generate from parts
  if (pageNameMap[pathKey]) {
    return pageNameMap[pathKey];
  }
  
  // For dynamic routes (e.g., /dashboard/products/123)
  if (parts.length > 2 && parts[0] === 'dashboard') {
    const section = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return `Dashboard - ${section} - Detail`;
  }
  
  // Default: capitalize and join parts
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' - ') || 'Landing Page';
}

/**
 * Track a custom event with consistent structure
 * @param {object} posthog - PostHog instance
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties
 */
export function trackEvent(posthog, eventName, properties = {}) {
  if (!posthog) return;
  
  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    source: 'web_app'
  });
}

/**
 * Track user actions on specific features
 */
export const EVENTS = {
  // Auth Events
  SIGN_IN_STARTED: 'Sign In Started',
  SIGN_IN_COMPLETED: 'Sign In Completed',
  SIGN_UP_STARTED: 'Sign Up Started',
  SIGN_UP_COMPLETED: 'Sign Up Completed',
  SIGN_OUT: 'Sign Out',
  
  // Onboarding Events
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_COMPLETED: 'Onboarding Completed',
  SUBSCRIPTION_SELECTED: 'Subscription Plan Selected',
  
  // Dashboard Events
  FEATURE_ACCESSED: 'Feature Accessed',
  PRODUCT_CREATED: 'Product Created',
  SERVICE_CREATED: 'Service Created',
  CUSTOMER_CREATED: 'Customer Created',
  INVOICE_CREATED: 'Invoice Created',
  PAYMENT_RECORDED: 'Payment Recorded',
  
  // Settings Events
  SETTINGS_UPDATED: 'Settings Updated',
  TEAM_MEMBER_INVITED: 'Team Member Invited',
  INTEGRATION_CONNECTED: 'Integration Connected'
};

/**
 * Get user properties for identification
 * @param {object} user - User object from session
 * @returns {object} User properties for PostHog
 */
export function getUserProperties(user) {
  if (!user) return {};
  
  return {
    email: user.email,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    role: user.role,
    tenantId: user.tenantId,
    subscriptionPlan: user.subscriptionPlan,
    createdAt: user.createdAt
  };
}