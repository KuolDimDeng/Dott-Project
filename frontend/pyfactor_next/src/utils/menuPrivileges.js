import api from './api';
import { getCacheValue, setCacheValue } from './appCache';
import { logger } from './logger';

// Default menu items everyone should have
const DEFAULT_MENU_ITEMS = [
    'dashboard',
    'settings'
];

/**
 * Fetches the current user's menu privileges from the backend
 * and stores them in AppCache for use throughout the app
 */
export async function fetchCurrentUserMenuPrivileges() {
    try {
        logger.info('[fetchMenuPrivileges] Fetching current user menu privileges');
        
        // Check if there are already cached privileges (older than 5 minutes will be refreshed)
        const cachedPrivileges = getCacheValue('currentUserMenuPrivileges');
        const cacheTimestamp = getCacheValue('menuPrivilegesTimestamp');
        
        // If we have cached data and it's less than 5 minutes old, use it
        const now = Date.now();
        if (cachedPrivileges && cacheTimestamp && (now - parseInt(cacheTimestamp) < 5 * 60 * 1000)) {
            logger.info('[fetchMenuPrivileges] Using cached menu privileges');
            return cachedPrivileges;
        }
        
        // Fetch current user's menu privileges from API
        const response = await api.get('/users/api/menu-privileges/current_user/');
        
        // Check if we got a valid response with menu items
        if (response && response.menu_items && Array.isArray(response.menu_items)) {
            // Store privileges in AppCache
            setCacheValue('currentUserMenuPrivileges', response.menu_items);
            setCacheValue('menuPrivilegesTimestamp', now.toString());
            
            logger.info('[fetchMenuPrivileges] Successfully fetched menu privileges', response.menu_items);
            return response.menu_items;
        } else {
            // If response is empty or invalid, use defaults
            logger.warn('[fetchMenuPrivileges] Invalid or empty response, using default menu items');
            setCacheValue('currentUserMenuPrivileges', DEFAULT_MENU_ITEMS);
            setCacheValue('menuPrivilegesTimestamp', now.toString());
            return DEFAULT_MENU_ITEMS;
        }
    } catch (error) {
        // Log error but don't break the application
        logger.error('[fetchMenuPrivileges] Error fetching menu privileges:', error);
        
        // Use default menu items if fetching fails
        const now = Date.now();
        setCacheValue('currentUserMenuPrivileges', DEFAULT_MENU_ITEMS);
        setCacheValue('menuPrivilegesTimestamp', now.toString());
        return DEFAULT_MENU_ITEMS;
    }
}

/**
 * Gets the current user's menu privileges from AppCache
 * @returns {Array} Array of menu items the user has access to
 */
export function getCurrentUserMenuPrivileges() {
    // Get from AppCache or use defaults
    return getCacheValue('currentUserMenuPrivileges') || DEFAULT_MENU_ITEMS;
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
        
        // Get tenant ID from cache
        const tenantId = getCacheValue('auth')?.tenantId || 
                         (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.tenantId) ||
                         getCacheValue('tenantId');
        
        if (!tenantId) {
            logger.warn('[verifyTenantOwnership] No tenant ID found in cache');
            return false;
        }
        
        // First check: Look at Cognito user attributes for owner role
        const userAttributes = getCacheValue('auth')?.userAttributes || 
                              (typeof window !== 'undefined' && window.__APP_CACHE?.user?.attributes);
        const userRole = userAttributes?.['custom:userrole'] || '';
        
        if (userRole.toLowerCase() === 'owner') {
            logger.info('[verifyTenantOwnership] User has owner role in Cognito attributes');
            setCacheValue('isBusinessOwner', true);
            setCacheValue('ownerVerificationTimestamp', now.toString());
            return true;
        }
        
        // Second check: Verify with backend API
        logger.info(`[verifyTenantOwnership] Verifying owner status with backend for tenant ${tenantId}`);
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
        // Don't update cache on error to allow retry
        return false;
    }
}

/**
 * Checks if the current user has access to a specific menu
 * @param {string} menuName - The name of the menu to check
 * @returns {boolean} True if the user has access, false otherwise
 */
export function hasMenuAccess(menuName) {
    try {
        // Business owners always have unrestricted access to all menus
        const isOwner = getCacheValue('isBusinessOwner');
        if (isOwner === true) {
            return true;
        }
        
        // Check userAttributes directly as fallback
        const userAttributes = getCacheValue('auth')?.userAttributes || 
                              (typeof window !== 'undefined' && window.__APP_CACHE?.user?.attributes);
        const userRole = userAttributes?.['custom:userrole'] || '';
        
        if (userRole.toLowerCase() === 'owner') {
            // Cache this result for future checks
            setCacheValue('isBusinessOwner', true);
            return true;
        }
        
        // For regular employees, check if they have access to this specific menu
        const userPrivileges = getCacheValue('currentUserMenuPrivileges') || [];
        
        // Always allow access to dashboard and settings
        if (menuName === 'dashboard' || menuName === 'settings') {
            return true;
        }
        
        // If privileges are the string 'ALL', grant access to everything
        if (userPrivileges === 'ALL') {
            return true;
        }
        
        // If privileges are empty, default to denying access
        if (!userPrivileges || userPrivileges.length === 0) {
            return false;
        }
        
        return userPrivileges.includes(menuName.toLowerCase());
    } catch (error) {
        // Log error but default to restricting access for security
        logger.error(`[hasMenuAccess] Error checking access for menu ${menuName}:`, error);
        return false;
    }
}

// Export functions for use in other modules
export default {
    fetchCurrentUserMenuPrivileges,
    getCurrentUserMenuPrivileges,
    verifyTenantOwnership,
    hasMenuAccess
}; 