import { appCache } from '../utils/appCache';

/**
 * @file pageAccess.js
 * @description Utility functions for page-level access control
 */

import { logger } from './logger';
import api from './api';

// Page access levels and their corresponding required permissions
export const PAGE_ACCESS = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'inventory_products',
  INVENTORY: 'inventory_stock',
  SALES: 'sales_orders',
  PURCHASES: 'sales_customers',
  ACCOUNTING: 'billing_invoices',
  BANKING: 'banking',
  PAYROLL: 'hr_payroll',
  REPORTS: 'reports_sales',
  ANALYSIS: 'reports_financial',
  TAXES: 'billing_taxes',
  CRM: 'crm_contacts',
  TRANSPORT: 'transport',
  HR: 'hr_employees',
  EMPLOYEE_MANAGEMENT: 'hr_employees',
  SETTINGS: 'settings_business',
  BILLING: 'billing_invoices'
};

// Map page IDs to their corresponding categories for UI organization
export const PAGE_CATEGORIES = {
  'dashboard': 'Dashboard',
  'billing_invoices': 'Billing',
  'billing_estimates': 'Billing',
  'billing_payments': 'Billing',
  'billing_subscriptions': 'Billing',
  'billing_taxes': 'Billing',
  'sales_orders': 'Sales',
  'sales_customers': 'Sales',
  'sales_quotes': 'Sales',
  'sales_promotions': 'Sales',
  'inventory_products': 'Inventory',
  'inventory_categories': 'Inventory',
  'inventory_stock': 'Inventory',
  'crm_contacts': 'CRM',
  'crm_leads': 'CRM',
  'crm_deals': 'CRM',
  'crm_activities': 'CRM',
  'hr_employees': 'HR',
  'hr_attendance': 'HR',
  'hr_payroll': 'HR',
  'reports_sales': 'Reports',
  'reports_financial': 'Reports',
  'reports_inventory': 'Reports',
  'settings_business': 'Settings',
  'settings_users': 'Settings'
};

/**
 * Fetches the current user's page access privileges from the backend
 * and stores them in AppCache for use throughout the app
 */
export async function fetchUserPagePrivileges() {
  try {
    logger.info('[fetchPagePrivileges] Fetching user page privileges');
    
    // Check if there are already cached privileges (older than 5 minutes will be refreshed)
    const cachedPrivileges = getCacheValue('userPagePrivileges');
    const cacheTimestamp = getCacheValue('pagePrivilegesTimestamp');
    
    // If we have cached data and it's less than 5 minutes old, use it
    const now = Date.now();
    if (cachedPrivileges && cacheTimestamp && (now - parseInt(cacheTimestamp) < 5 * 60 * 1000)) {
      logger.info('[fetchPagePrivileges] Using cached page privileges');
      return cachedPrivileges;
    }
    
    // Check if the user is a business owner first
    const isOwner = await verifyTenantOwnership();
    if (isOwner) {
      // Business owners have access to all pages
      const allPageAccess = Object.values(PAGE_ACCESS);
      setCacheValue('userPagePrivileges', allPageAccess);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      setCacheValue('canManageUsers', true);
      return allPageAccess;
    }
    
    // For employees, fetch their specific privileges
    const response = await api.get('/users/api/page-privileges/current_user/');
    
    if (response?.page_access && Array.isArray(response.page_access)) {
      // Store privileges in AppCache
      setCacheValue('userPagePrivileges', response.page_access);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      setCacheValue('canManageUsers', !!response.can_manage_users);
      
      logger.info('[fetchPagePrivileges] Successfully fetched page privileges', response.page_access);
      return response.page_access;
    } else {
      // If response is empty or invalid, grant access only to dashboard
      const defaultAccess = ['dashboard'];
      setCacheValue('userPagePrivileges', defaultAccess);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      setCacheValue('canManageUsers', false);
      return defaultAccess;
    }
  } catch (error) {
    // Log error but don't break the application
    logger.error('[fetchPagePrivileges] Error fetching page privileges:', error);
    
    // Use default privileges if fetching fails
    const defaultAccess = ['dashboard'];
    const now = Date.now();
    setCacheValue('userPagePrivileges', defaultAccess);
    setCacheValue('pagePrivilegesTimestamp', now.toString());
    setCacheValue('canManageUsers', false);
    return defaultAccess;
  }
}

/**
 * Verifies if the current user is the owner of the current tenant
 * @returns {Promise<boolean>} True if the user is the owner, false otherwise
 */
export async function verifyTenantOwnership() {
  try {
    // Check if we already have the owner status cached
    const isBusinessOwner = getCacheValue('isBusinessOwner');
    const ownerCacheTimestamp = getCacheValue('ownerVerificationTimestamp');
    const now = Date.now();
    
    // Use cache if it's less than 5 minutes old
    if (isBusinessOwner !== undefined && ownerCacheTimestamp && 
        (now - parseInt(ownerCacheTimestamp) < 5 * 60 * 1000)) {
      logger.debug('[verifyTenantOwnership] Using cached owner status:', isBusinessOwner);
      return isBusinessOwner;
    }
    
    // Check Cognito user attributes for owner role
    const userAttributes = getCacheValue('auth')?.userAttributes || (typeof window !== 'undefined' && appCache.getAll()) || {};
    const userRole = userAttributes?.['custom:userrole'] || '';
    
    if (userRole.toLowerCase() === 'owner') {
      logger.info('[verifyTenantOwnership] User has owner role in Cognito attributes');
      setCacheValue('isBusinessOwner', true);
      setCacheValue('ownerVerificationTimestamp', now.toString());
      return true;
    }
    
    // Get tenant ID from cache
    const tenantId = getCacheValue('auth')?.tenantId || (typeof window !== 'undefined' && appCache.getAll()) ? getCacheValue('tenantId') : null;
    
    if (!tenantId) {
      logger.warn('[verifyTenantOwnership] No tenant ID found in cache');
      return false;
    }
    
    // Verify with backend API
    logger.info('[verifyTenantOwnership] Verifying owner status with backend');
    const response = await api.get(`/tenants/api/verify-owner/?tenant_id=${tenantId}`);
    
    if (response?.is_owner === true) {
      logger.info('[verifyTenantOwnership] Backend confirmed user is the owner');
      setCacheValue('isBusinessOwner', true);
      setCacheValue('ownerVerificationTimestamp', now.toString());
      return true;
    }
    
    // If we get here, user is not an owner
    logger.info('[verifyTenantOwnership] User is not the tenant owner');
    setCacheValue('isBusinessOwner', false);
    setCacheValue('ownerVerificationTimestamp', now.toString());
    return false;
    
  } catch (error) {
    logger.error('[verifyTenantOwnership] Error verifying tenant ownership:', error);
    return false;
  }
}

/**
 * Checks if the current user has access to a specific page
 * @param {string} pageName - The name/ID of the page to check
 * @returns {boolean} True if the user has access, false otherwise
 */
export function hasPageAccess(pageName) {
  try {
    // Business owners always have access to all pages
    const isOwner = getCacheValue('isBusinessOwner');
    if (isOwner === true) {
      return true;
    }
    
    // Check if this is one of the pages that should always be accessible
    if (pageName === PAGE_ACCESS.DASHBOARD || pageName === 'dashboard') {
      return true;
    }
    
    // For other users, check their specific privileges
    const userPrivileges = getCacheValue('userPagePrivileges') || [];
    
    // If privileges is empty, deny access to be safe
    if (!userPrivileges || userPrivileges.length === 0) {
      return false;
    }
    
    // Allow access if the user has permission for this specific page ID
    // or if they have access to a matching page category ID
    const pageId = PAGE_ACCESS[pageName] || pageName;
    return userPrivileges.includes(pageId.toLowerCase());
  } catch (error) {
    // Log error but default to restricting access for security
    logger.error(`[hasPageAccess] Error checking access for page ${pageName}:`, error);
    return false;
  }
}

/**
 * Checks if the current user has permission to manage users
 * @returns {boolean} True if the user can manage users, false otherwise
 */
export function canManageUsers() {
  try {
    // Business owners can always manage users
    const isOwner = getCacheValue('isBusinessOwner');
    if (isOwner === true) {
      return true;
    }
    
    // Check if the user has been explicitly granted user management permission
    return getCacheValue('canManageUsers') === true;
  } catch (error) {
    logger.error('[canManageUsers] Error checking user management permission:', error);
    return false;
  }
}

// Export all functions
export default {
  PAGE_ACCESS,
  PAGE_CATEGORIES,
  fetchUserPagePrivileges,
  verifyTenantOwnership,
  hasPageAccess,
  canManageUsers
};
