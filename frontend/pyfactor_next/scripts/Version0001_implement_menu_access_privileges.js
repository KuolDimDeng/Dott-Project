/**
 * @fileoverview
 * Script to implement menu access privileges in listItems.js
 * Version: 1.0.0
 * 
 * This script adds user access privilege checking to the main menu navigation.
 * When a user logs in, their access privileges are loaded from the backend
 * and stored in the app cache. The menu then filters items based on these
 * privileges, only showing menu items the user has access to.
 * 
 * IMPORTANT: Business owners always have unrestricted access to all menu items.
 * Only employees with role 'employee' are restricted by their assigned privileges.
 */

import { getCacheValue, setCacheValue } from '@/utils/appCache';
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import { verifyTenantOwnership } from '@/utils/menuPrivileges';

/**
 * Load user menu privileges from the server or cache
 * @returns {Promise<string[]>} Array of menu item IDs the user has access to
 */
export async function loadUserMenuPrivileges() {
  try {
    // Check if we already have privileges in cache
    const userId = typeof window !== 'undefined' && window.__APP_CACHE?.auth?.userId;
    if (!userId) {
      logger.warn('[MenuPrivileges] No user ID found in app cache');
      return [];
    }
    
    // Try to get from cache first
    const cacheKey = `user_menu_privileges_${userId}`;
    const cachedPrivileges = getCacheValue(cacheKey);
    
    if (cachedPrivileges) {
      logger.debug('[MenuPrivileges] Using cached menu privileges');
      return cachedPrivileges;
    }
    
    // No cache, fetch from server
    logger.debug('[MenuPrivileges] Fetching menu privileges from server');
    const response = await api.get('/users/api/menu-privileges/current_user/');
    
    if (response && response.data && response.data.menu_items) {
      // Store in cache for future use
      setCacheValue(cacheKey, response.data.menu_items);
      return response.data.menu_items;
    }
    
    // If no privileges defined yet, return empty array
    return [];
  } catch (error) {
    logger.error('[MenuPrivileges] Error loading user menu privileges:', error);
    return [];
  }
}

/**
 * Check if the current user is a business owner
 * @returns {Promise<boolean>} True if the user is a business owner
 */
export async function isUserBusinessOwner() {
  try {
    // Check if we have a cached value from previous verification
    const isOwner = getCacheValue('isBusinessOwner');
    if (isOwner === true) {
      logger.info('[MenuPrivileges] User is cached as business owner');
      return true;
    }
    
    // First check: Look at Cognito user attributes
    const userAttributes = typeof window !== 'undefined' && (
                           window.__APP_CACHE?.auth?.userAttributes || 
                           getCacheValue('auth')?.userAttributes || 
                           window.__APP_CACHE?.user?.attributes);
    const userRole = userAttributes?.['custom:userrole'] || '';
    
    if (userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'OWNER') {
      logger.info('[MenuPrivileges] User is business owner according to Cognito attributes');
      setCacheValue('isBusinessOwner', true);
      return true;
    }
    
    // Second check: Verify with backend API
    const isVerifiedOwner = await verifyTenantOwnership();
    if (isVerifiedOwner) {
      logger.info('[MenuPrivileges] User is verified as tenant owner by backend API');
      return true;
    }
    
    logger.info('[MenuPrivileges] User is not a business owner');
    return false;
  } catch (error) {
    logger.error('[MenuPrivileges] Error checking user role:', error);
    // In case of error, check if we have a cached value to fall back on
    return getCacheValue('isBusinessOwner') === true;
  }
}

/**
 * Apply this script to implement menu access privileges by modifying the 
 * MainListItems component in listItems.js
 */
export async function applyMenuAccessPrivileges() {
  try {
    // Find the MainListItems component
    if (typeof document === 'undefined') {
      logger.warn('[MenuPrivileges] Document not available (SSR)');
      return;
    }

    const mainListItems = document.querySelectorAll('.main-list-items');
    if (!mainListItems || mainListItems.length === 0) {
      logger.warn('[MenuPrivileges] MainListItems component not found');
      return;
    }
    
    // Owner users always have access to all menus - do not restrict them
    const isOwner = await isUserBusinessOwner();
    if (isOwner) {
      logger.info('[MenuPrivileges] Business owner detected - full unrestricted menu access granted');
      // Set a flag in cache to indicate owner status for other components
      setCacheValue('isBusinessOwner', true);
      // Also set full privileges
      setCacheValue('currentUserMenuPrivileges', 'ALL');
      // Dispatch event with full access
      window.dispatchEvent(new CustomEvent('userMenuPrivilegesLoaded', {
        detail: { menuPrivileges: 'ALL', isOwner: true }
      }));
      return;
    }
    
    // Set owner flag to false in cache
    setCacheValue('isBusinessOwner', false);
    
    // Load privileges for regular employees
    const menuPrivileges = await loadUserMenuPrivileges();
    
    // Set user privileges in app cache for use across the app
    setCacheValue('currentUserMenuPrivileges', menuPrivileges);
    
    logger.info(`[MenuPrivileges] Employee user has access to ${menuPrivileges.length} specific menu items`);
    
    // Dispatch custom event that listItems.js will listen for
    window.dispatchEvent(new CustomEvent('userMenuPrivilegesLoaded', {
      detail: { menuPrivileges, isOwner: false }
    }));
    
  } catch (error) {
    logger.error('[MenuPrivileges] Error applying menu access privileges:', error);
  }
}

// Auto-execute when the script loads
if (typeof window !== 'undefined') {
  // Wait for app to initialize
  window.addEventListener('load', () => {
    // Small delay to ensure auth data is loaded
    setTimeout(applyMenuAccessPrivileges, 1000);
  });
  
  // Also apply when auth status changes
  window.addEventListener('authStatusChanged', applyMenuAccessPrivileges);
}

export default {
  loadUserMenuPrivileges,
  isUserBusinessOwner,
  applyMenuAccessPrivileges
}; 