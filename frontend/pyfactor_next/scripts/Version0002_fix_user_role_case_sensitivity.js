/**
 * @fileoverview
 * Script to fix user role case sensitivity issues causing menu visibility problems
 * Version: 1.0.0
 * 
 * This script:
 * 1. Ensures that user role checking is case-insensitive
 * 2. Checks for both the auth context and app cache for the user role
 * 3. Properly sets the isBusinessOwner flag for owners regardless of case
 * 4. Fixes the main menu visibility for owners
 */

import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { useAuth } from '@/context/AuthContext';

/**
 * Check if a role string is an owner role regardless of case
 * @param {string} role - The role to check
 * @returns {boolean} - True if the role is any case variation of "owner"
 */
function isOwnerRole(role) {
  if (!role) return false;
  return role.toLowerCase() === 'owner';
}

/**
 * Get the user role from various sources with fallbacks
 * @returns {string|null} - The user role or null if not found
 */
function getUserRole() {
  try {
    // Check multiple sources for the role
    
    // 1. Check auth context in memory cache first (most reliable)
    const userAttributes = window.__APP_CACHE?.auth?.userAttributes;
    if (userAttributes && userAttributes['custom:userrole']) {
      return userAttributes['custom:userrole'];
    }
    
    // 2. Try to get from Cognito attributes if available
    const cognitoAttributes = getCacheValue('cognitoAttributes');
    if (cognitoAttributes && cognitoAttributes['custom:userrole']) {
      return cognitoAttributes['custom:userrole'];
    }
    
    // 3. Look in user object if available
    const user = getCacheValue('user');
    if (user && user.attributes && user.attributes['custom:userrole']) {
      return user.attributes['custom:userrole'];
    }
    
    // No role found
    return null;
  } catch (error) {
    logger.error('[UserRoleFix] Error getting user role:', error);
    return null;
  }
}

/**
 * Fix the isBusinessOwner cache flag based on actual user role
 */
export async function fixUserRoleChecking() {
  try {
    // Get user role from various sources
    const userRole = getUserRole();
    
    // Log what we found
    logger.info(`[UserRoleFix] Found user role: ${userRole}`);
    
    // Check if user is an owner (case insensitive)
    const isOwner = isOwnerRole(userRole);
    
    if (isOwner) {
      logger.info('[UserRoleFix] User is a business owner, setting proper privileges');
      
      // Set the isBusinessOwner flag to true
      setCacheValue('isBusinessOwner', true);
      
      // Dispatch custom event that listItems.js will listen for
      window.dispatchEvent(new CustomEvent('userMenuPrivilegesLoaded', {
        detail: { menuPrivileges: 'ALL', isOwner: true }
      }));
      
      logger.info('[UserRoleFix] Business owner privileges applied successfully');
    } else {
      logger.info('[UserRoleFix] User is not a business owner, no changes needed');
    }
    
    return isOwner;
  } catch (error) {
    logger.error('[UserRoleFix] Error fixing user role checking:', error);
    return false;
  }
}

/**
 * Fix the main menu display based on user role
 */
export async function fixMainMenuDisplay() {
  try {
    // Apply the user role fix
    const isOwner = await fixUserRoleChecking();
    
    // Find the main list items
    const mainListItems = document.querySelectorAll('.main-list-items');
    if (!mainListItems || mainListItems.length === 0) {
      logger.warn('[UserRoleFix] MainListItems component not found');
      return false;
    }
    
    if (isOwner) {
      // For owners, make sure all menu items are visible
      document.querySelectorAll('[data-menu-item]').forEach(item => {
        if (item.style.display === 'none') {
          item.style.display = '';
          logger.debug(`[UserRoleFix] Showing menu item: ${item.getAttribute('data-menu-item')}`);
        }
      });
      
      logger.info('[UserRoleFix] All menu items are now visible for owner user');
      return true;
    }
    
    logger.info('[UserRoleFix] No menu visibility changes needed for non-owner user');
    return false;
  } catch (error) {
    logger.error('[UserRoleFix] Error fixing main menu display:', error);
    return false;
  }
}

// Auto-execute when the script loads
if (typeof window !== 'undefined') {
  // Wait for app to initialize
  window.addEventListener('load', () => {
    // Small delay to ensure auth data is loaded
    setTimeout(fixMainMenuDisplay, 2000);
  });
  
  // Also apply when auth status changes
  window.addEventListener('authStatusChanged', fixMainMenuDisplay);
  
  // Apply when navigation occurs as a safeguard
  window.addEventListener('navigationChange', () => {
    setTimeout(fixMainMenuDisplay, 500);
  });
}

export default {
  isOwnerRole,
  getUserRole,
  fixUserRoleChecking,
  fixMainMenuDisplay
}; 