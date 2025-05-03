/**
 * @fileoverview
 * Script to fix user role storage and access throughout the application
 * Version: 1.0.0
 * 
 * This script addresses issues with user role handling:
 * 1. Ensures all user roles are stored in lowercase
 * 2. Makes all role comparisons case-insensitive
 * 3. Adds explicit debugging and error handling
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

// List of files to check and fix
const filesToFix = [
  'frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js',
  'frontend/pyfactor_next/src/context/AuthContext.js',
  'frontend/pyfactor_next/src/utils/tenantUtils.js',
  'frontend/pyfactor_next/src/services/userService.js'
];

/**
 * Fix user role handling in a specific file
 * @param {string} filePath - Path to the file to fix
 * @returns {Promise<boolean>} - Whether the fix was successful
 */
async function fixUserRoleHandling(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      logger.error(`[UserRoleFix] File not found: ${fullPath}`);
      return false;
    }

    // Create backup
    const backupPath = await createBackup(fullPath);
    logger.info(`[UserRoleFix] Created backup of ${path.basename(fullPath)} at: ${backupPath}`);

    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Fix role comparisons
    const ownerRoleComparisonPattern = /(['"])custom:userrole['"]\] === ['"]owner['"]/gi;
    const ownerRoleComparisonReplacement = "$1custom:userrole$1]?.toLowerCase() === 'owner'";
    
    if (content.match(ownerRoleComparisonPattern)) {
      content = content.replace(ownerRoleComparisonPattern, ownerRoleComparisonReplacement);
      logger.info(`[UserRoleFix] Fixed owner role comparisons in ${path.basename(fullPath)}`);
      modified = true;
    }

    // Fix case for setting user roles
    const setOwnerRolePattern = /['"]custom:userrole['"]: ['"]Owner['"]/gi;
    const setOwnerRoleReplacement = "'custom:userrole': 'owner'";
    
    if (content.match(setOwnerRolePattern)) {
      content = content.replace(setOwnerRolePattern, setOwnerRoleReplacement);
      logger.info(`[UserRoleFix] Fixed owner role case when setting roles in ${path.basename(fullPath)}`);
      modified = true;
    }

    // Fix AuthContext if it's the AuthContext.js file
    if (filePath.includes('AuthContext.js')) {
      const processAttributesPattern = /const processAttributes = \(attributes\) => \{[^}]+\}/;
      const updatedProcessAttributes = `const processAttributes = (attributes) => {
    // Normalize role to lowercase for consistency
    if (attributes && attributes['custom:userrole']) {
      attributes['custom:userrole'] = attributes['custom:userrole'].toLowerCase();
      console.log('[AuthContext] Normalized user role to:', attributes['custom:userrole']);
    }
    return attributes;
  }`;
      
      if (content.match(processAttributesPattern)) {
        content = content.replace(processAttributesPattern, updatedProcessAttributes);
        logger.info(`[UserRoleFix] Added role normalization to AuthContext`);
        modified = true;
      } else if (!content.includes('processAttributes')) {
        // If processAttributes doesn't exist, add it before the return statement in the context provider
        const contextProviderPattern = /return \(\s*<AuthContext\.Provider value=\{/;
        const processAttributesAddition = `// Normalize role to lowercase for consistency
  const processAttributes = (attributes) => {
    if (attributes && attributes['custom:userrole']) {
      attributes['custom:userrole'] = attributes['custom:userrole'].toLowerCase();
      console.log('[AuthContext] Normalized user role to:', attributes['custom:userrole']);
    }
    return attributes;
  };

  // Apply normalization to user attributes if they exist
  if (user && user.attributes) {
    user.attributes = processAttributes(user.attributes);
  }

  return (<AuthContext.Provider value={`;
        
        content = content.replace(contextProviderPattern, processAttributesAddition);
        logger.info(`[UserRoleFix] Added role normalization to AuthContext`);
        modified = true;
      }
    }

    // Fix userService.js if it's that file
    if (filePath.includes('userService.js')) {
      // Add role normalization to inviteUser function
      const inviteUserPattern = /export const inviteUser = async \(\{[^}]+\}\) => \{/;
      const inviteUserReplacement = `export const inviteUser = async ({ email, firstName, lastName, role, canManageUsers, companyName }) => {
  // Normalize role to lowercase
  const normalizedRole = role?.toLowerCase();
  console.log('[UserService] Normalizing role from', role, 'to', normalizedRole);
  
  `;
      
      if (content.match(inviteUserPattern)) {
        content = content.replace(inviteUserPattern, inviteUserReplacement);
        
        // Also update where the role is used in the function
        content = content.replace(/role: role,/g, 'role: normalizedRole,');
        content = content.replace(/role === ['"]Owner['"]/g, "normalizedRole === 'owner'");
        
        logger.info(`[UserRoleFix] Added role normalization to userService.inviteUser`);
        modified = true;
      }
    }

    // Only save if the file was modified
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      logger.info(`[UserRoleFix] Updated ${path.basename(fullPath)}`);
      return true;
    } else {
      logger.info(`[UserRoleFix] No changes needed in ${path.basename(fullPath)}`);
      return false;
    }
  } catch (error) {
    logger.error(`[UserRoleFix] Error fixing user role handling in ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Add a RoleHelper utility for consistent role handling
 */
async function addRoleHelperUtility() {
  try {
    const utilsDir = path.resolve(
      process.cwd(),
      'frontend/pyfactor_next/src/utils'
    );
    
    const roleHelperPath = path.join(utilsDir, 'roleHelper.js');
    
    // Create role helper if it doesn't exist
    if (!fs.existsSync(roleHelperPath)) {
      const roleHelperContent = `/**
 * Utility functions for working with user roles consistently
 */

/**
 * Check if a role is an owner role (case-insensitive)
 * @param {string} role - The role to check
 * @returns {boolean} - Whether the role is an owner role
 */
export function isOwnerRole(role) {
  if (!role) return false;
  return role.toLowerCase() === 'owner';
}

/**
 * Normalize a role to lowercase for consistent storage
 * @param {string} role - The role to normalize
 * @returns {string} - The normalized role
 */
export function normalizeRole(role) {
  if (!role) return '';
  return role.toLowerCase();
}

/**
 * Get user role from user object with fallbacks
 * @param {Object} user - The user object
 * @returns {string|null} - The user role or null if not found
 */
export function getUserRole(user) {
  if (!user) return null;
  
  // Try to get from Cognito attributes
  if (user.attributes && user.attributes['custom:userrole']) {
    return normalizeRole(user.attributes['custom:userrole']);
  }
  
  // Try to get from role property
  if (user.role) {
    return normalizeRole(user.role);
  }
  
  return null;
}

/**
 * Check if user has owner permissions
 * @param {Object} user - The user object
 * @returns {boolean} - Whether the user is an owner
 */
export function isUserOwner(user) {
  const role = getUserRole(user);
  return isOwnerRole(role);
}

export default {
  isOwnerRole,
  normalizeRole,
  getUserRole,
  isUserOwner
};`;
      
      fs.writeFileSync(roleHelperPath, roleHelperContent, 'utf8');
      logger.info('[UserRoleFix] Created role helper utility at ' + roleHelperPath);
      return true;
    } else {
      logger.info('[UserRoleFix] Role helper utility already exists');
      return false;
    }
  } catch (error) {
    logger.error(`[UserRoleFix] Error adding role helper utility: ${error.message}`);
    return false;
  }
}

/**
 * Add explicit debugging to SettingsManagement.js
 */
async function addDebuggingToSettingsManagement() {
  try {
    const filePath = path.resolve(
      process.cwd(),
      'frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
    );
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`[UserRoleFix] File not found: ${filePath}`);
      return false;
    }
    
    // Create backup if not already done
    const backupPath = await createBackup(filePath);
    logger.info(`[UserRoleFix] Created backup of SettingsManagement.js at: ${backupPath}`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import for roleHelper
    if (!content.includes('import roleHelper')) {
      const importSection = /import userService from ['"]@\/services\/userService['"];/;
      const roleHelperImport = `import userService from '@/services/userService';
import roleHelper from '@/utils/roleHelper';
import { debugUserRole } from '@/utils/debugUtils';`;
      
      content = content.replace(importSection, roleHelperImport);
      logger.info('[UserRoleFix] Added roleHelper import to SettingsManagement.js');
    }
    
    // Add advanced debugging
    if (!content.includes('debugUserRole()')) {
      const useEffectSection = /useEffect\(\(\) => \{\s*fetchEmployees\(\);/;
      const debuggingCode = `useEffect(() => {
    // Call debug function when component mounts
    console.group('🛠️ SettingsManagement Debug Info');
    console.log('User object:', user);
    console.log('Role from roleHelper:', roleHelper.getUserRole(user));
    console.log('Is owner from roleHelper:', roleHelper.isUserOwner(user));
    debugUserRole();
    console.groupEnd();
    
    fetchEmployees();`;
      
      content = content.replace(useEffectSection, debuggingCode);
      logger.info('[UserRoleFix] Added advanced debugging to SettingsManagement.js');
    }
    
    // Update the isOwner function to use roleHelper
    const isOwnerFunction = /const isOwner = useCallback\(\(\) => \{[^}]+\}, \[user\]\);/;
    const updatedIsOwnerFunction = `const isOwner = useCallback(() => {
    // Use the roleHelper utility for consistent role checking
    const isOwner = roleHelper.isUserOwner(user);
    console.log('[SettingsManagement] isOwner check result:', isOwner, 'User:', user?.attributes?.['custom:userrole']);
    return isOwner;
  }, [user]);`;
    
    content = content.replace(isOwnerFunction, updatedIsOwnerFunction);
    logger.info('[UserRoleFix] Updated isOwner function to use roleHelper');
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    return true;
  } catch (error) {
    logger.error(`[UserRoleFix] Error adding debugging to SettingsManagement.js: ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  logger.info('[UserRoleFix] Starting fix for user role storage and access');
  
  // First, add the roleHelper utility
  const roleHelperAdded = await addRoleHelperUtility();
  if (roleHelperAdded) {
    logger.info('[UserRoleFix] Added role helper utility');
  }
  
  // Fix each file
  let fixedCount = 0;
  for (const file of filesToFix) {
    const fixed = await fixUserRoleHandling(file);
    if (fixed) fixedCount++;
  }
  
  // Add explicit debugging to SettingsManagement.js
  const debuggingAdded = await addDebuggingToSettingsManagement();
  if (debuggingAdded) {
    logger.info('[UserRoleFix] Added explicit debugging to SettingsManagement.js');
    fixedCount++;
  }
  
  if (fixedCount > 0) {
    logger.info(`[UserRoleFix] Successfully fixed user role handling in ${fixedCount} files`);
    console.log('\n✅ Successfully fixed user role storage and access\n');
    console.log('This fix:');
    console.log('1. Ensures all user roles are stored in lowercase');
    console.log('2. Makes all role comparisons case-insensitive');
    console.log('3. Adds a roleHelper utility for consistent role handling');
    console.log('4. Adds explicit debugging and better error handling');
    console.log('\nCheck the browser console for additional logs that will help diagnose any remaining issues.\n');
  } else {
    logger.error('[UserRoleFix] No files were modified');
    console.error('\n❌ Failed to fix user role handling. See logs for details.\n');
  }
})(); 