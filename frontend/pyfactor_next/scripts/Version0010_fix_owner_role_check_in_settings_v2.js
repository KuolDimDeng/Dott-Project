/**
 * @fileoverview
 * Enhanced script to fix owner role checks in SettingsManagement.js
 * Version: 2.0.0
 * 
 * This script:
 * 1. Updates all instances of owner role checking to be case-insensitive
 * 2. Adds debug logging to help diagnose user role issues
 * 3. Ensures proper role detection across the component
 */

import fs from 'fs';
import path from 'path';
import { createBackup } from './utils/createBackup.js';

// Simple logger for this script
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`)
};

// Path to the SettingsManagement.js file
const targetFilePath = path.resolve(
  process.cwd(),
  'frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
);

/**
 * Fix all owner role checks in SettingsManagement.js
 */
async function fixOwnerRoleCheck() {
  try {
    // Check if file exists
    if (!fs.existsSync(targetFilePath)) {
      logger.error(`[OwnerRoleFix] File not found: ${targetFilePath}`);
      return false;
    }

    // Create backup
    const backupPath = await createBackup(targetFilePath);
    logger.info(`[OwnerRoleFix] Created backup at: ${backupPath}`);

    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');

    // Add debug logging to the component
    if (!content.includes('// Debug user role')) {
      const componentStartPattern = /const SettingsManagement = \(\) => \{[\s\S]+?console\.log\('\[SettingsManagement\] Component rendering'\);/;
      const debugLogging = `const SettingsManagement = () => {
  console.log('[SettingsManagement] Component rendering');
  
  // Debug user role
  useEffect(() => {
    if (user && user.attributes) {
      console.log('[SettingsManagement] User role:', user.attributes['custom:userrole']);
      console.log('[SettingsManagement] isOwner result:', isOwner());
    } else {
      console.log('[SettingsManagement] User or attributes not available yet');
    }
  }, [user, isOwner]);`;
      
      content = content.replace(componentStartPattern, debugLogging);
      logger.info('[OwnerRoleFix] Added debug logging to component');
    }

    // 1. Fix main isOwner function
    const oldIsOwnerFunction = /const isOwner = useCallback\(\(\) => \{\s*if \(!user \|\| !user\.attributes\) return false;\s*return user\.attributes\['custom:userrole'\] === ['"]owner['"];\s*\}, \[user\]\);/;
    
    const newIsOwnerFunction = `const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    
    // Use case-insensitive comparison for the role
    const userRole = user.attributes['custom:userrole'];
    if (!userRole) {
      console.log('[SettingsManagement] No userrole attribute found');
      return false;
    }
    
    const isOwnerResult = userRole.toLowerCase() === 'owner';
    console.log(\`[SettingsManagement] Checking owner role: \${userRole} -> \${isOwnerResult}\`);
    return isOwnerResult;
  }, [user]);`;

    // Check if the pattern exists and replace
    if (oldIsOwnerFunction.test(content)) {
      content = content.replace(oldIsOwnerFunction, newIsOwnerFunction);
      logger.info('[OwnerRoleFix] Updated main isOwner function');
    } else {
      // Try a more flexible pattern
      const alternativePattern = /const isOwner = useCallback\(\(\) => \{[\s\S]+?return user\.attributes\['custom:userrole'\][\s\S]+?=== ['"]owner['"][\s\S]+?\}, \[user\]\);/;
      
      if (alternativePattern.test(content)) {
        content = content.replace(alternativePattern, newIsOwnerFunction);
        logger.info('[OwnerRoleFix] Updated main isOwner function with alternative pattern');
      } else {
        logger.warn('[OwnerRoleFix] Could not find the isOwner function pattern. Manual inspection required.');
      }
    }

    // 2. Check for any other instances of 'owner' role comparison
    const ownerRoleComparisonPattern = /user\.attributes\['custom:userrole'\] === ['"]owner['"]/g;
    const ownerRoleComparisonReplacement = "user.attributes['custom:userrole']?.toLowerCase() === 'owner'";
    
    if (content.match(ownerRoleComparisonPattern)) {
      content = content.replace(ownerRoleComparisonPattern, ownerRoleComparisonReplacement);
      logger.info('[OwnerRoleFix] Fixed additional owner role comparisons');
    }

    // 3. Add logging to handleAddUser function
    const handleAddUserPattern = /const handleAddUser = useCallback\(async \(e\) => \{[\s\S]+?e\.preventDefault\(\);[\s\S]+?if \(!isOwner\(\)\) \{/;
    const handleAddUserReplacement = `const handleAddUser = useCallback(async (e) => {
    e.preventDefault();
    
    // Log user role information before check
    console.log('[SettingsManagement] handleAddUser - Current user attributes:', user?.attributes);
    
    if (!isOwner()) {`;
    
    if (content.match(handleAddUserPattern)) {
      content = content.replace(handleAddUserPattern, handleAddUserReplacement);
      logger.info('[OwnerRoleFix] Added logging to handleAddUser function');
    }

    // Write the updated content back to the file
    fs.writeFileSync(targetFilePath, content, 'utf8');
    
    logger.info('[OwnerRoleFix] Successfully updated all owner role checks to be case-insensitive');
    return true;
  } catch (error) {
    logger.error(`[OwnerRoleFix] Error fixing owner role check: ${error.message}`);
    return false;
  }
}

/**
 * Add a debug utility function to the project
 */
async function addDebugUtility() {
  try {
    const utilsDir = path.resolve(
      process.cwd(),
      'frontend/pyfactor_next/src/utils'
    );
    
    const debugUtilPath = path.join(utilsDir, 'debugUtils.js');
    
    // Create debug utility if it doesn't exist
    if (!fs.existsSync(debugUtilPath)) {
      const debugUtilContent = `/**
 * Debug utilities for troubleshooting user roles and permissions
 */

/**
 * Get all user information from all possible sources
 * @returns {Object} Object containing user info from various sources
 */
export function getAllUserInfo() {
  try {
    const result = {
      cognitoAttributes: null,
      localStorageRole: null,
      authContext: null,
      appCache: null,
      windowAppCache: null
    };
    
    // Check localStorage
    if (typeof window !== 'undefined') {
      result.localStorageRole = localStorage.getItem('userRole');
      
      // Check window.__APP_CACHE
      if (window.__APP_CACHE && window.__APP_CACHE.auth) {
        result.windowAppCache = window.__APP_CACHE.auth;
      }
    }
    
    // Return all available user info
    return result;
  } catch (error) {
    console.error('[DebugUtils] Error getting user info:', error);
    return { error: error.message };
  }
}

/**
 * Debug function to print all user role information
 */
export function debugUserRole() {
  console.group('🔍 User Role Debug Information');
  const userInfo = getAllUserInfo();
  console.log('User Info:', userInfo);
  console.groupEnd();
  
  return userInfo;
}

export default {
  getAllUserInfo,
  debugUserRole
};`;
      
      fs.writeFileSync(debugUtilPath, debugUtilContent, 'utf8');
      logger.info('[OwnerRoleFix] Created debug utility at ' + debugUtilPath);
    }
    
    return true;
  } catch (error) {
    logger.error(`[OwnerRoleFix] Error adding debug utility: ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  logger.info('[OwnerRoleFix] Starting enhanced fix for owner role check');
  
  const debugUtilAdded = await addDebugUtility();
  if (debugUtilAdded) {
    logger.info('[OwnerRoleFix] Added debug utilities');
  }
  
  const success = await fixOwnerRoleCheck();
  
  if (success) {
    logger.info('[OwnerRoleFix] Successfully fixed all owner role checks');
    console.log('\n✅ Successfully fixed owner role checks in SettingsManagement.js\n');
    console.log('This enhanced fix:');
    console.log('1. Makes ALL owner role checks case-insensitive');
    console.log('2. Adds detailed logging to help diagnose role issues');
    console.log('3. Ensures proper role detection across the component');
    console.log('\nCheck the browser console for additional logs that will help diagnose any remaining issues.\n');
  } else {
    logger.error('[OwnerRoleFix] Failed to fix owner role checks');
    console.error('\n❌ Failed to fix owner role checks. See logs for details.\n');
  }
})(); 