#!/usr/bin/env node
/**
 * Version0043_ensure_tenant_id_in_current_user.js
 * 
 * This script modifies the SettingsManagement component to ensure the tenant ID
 * is correctly retrieved from various sources including URL parameters when
 * loading the user list.
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from '../utils/fileHelpers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

// File paths
const SETTINGS_MGMT_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');
const APP_CACHE_UTILS_PATH = path.resolve(__dirname, '../frontend/pyfactor_next/src/utils/appCacheUtils.js');

// Main function
async function main() {
  logger.info('Starting update to ensure tenant ID is available for user list');
  
  // Create backup of original files
  const settingsBackupPath = await createBackup(SETTINGS_MGMT_PATH);
  logger.info(`Created settings backup at: ${settingsBackupPath}`);
  
  try {
    // Update the SettingsManagement component
    updateSettingsManagement();
    
    // Check if we need to update appCacheUtils
    await ensureAppCacheUtilsHasTenantIdFunction();
    
    logger.success('Successfully updated tenant ID handling for user management!');
    logger.info('Changes made:');
    logger.info('1. SettingsManagement now gets tenant ID from multiple sources');
    logger.info('2. Added fallback to URL parameters for tenant ID');
    logger.info('3. Added tenant ID caching in AWS AppCache');
  } catch (error) {
    logger.error(`Failed to update files: ${error.message}`);
    logger.info('Attempting to restore from backup...');
    
    fs.copyFileSync(settingsBackupPath, SETTINGS_MGMT_PATH);
    logger.info('Restored from backup successfully');
  }
}

/**
 * Updates the SettingsManagement component to handle tenant ID correctly
 */
function updateSettingsManagement() {
  // Read the original file content
  let fileContent = fs.readFileSync(SETTINGS_MGMT_PATH, 'utf8');
  
  // Update the fetchEmployees function to get tenant ID from various sources
  fileContent = updateFetchEmployeesFunction(fileContent);
  
  // Write the updated content back to the file
  fs.writeFileSync(SETTINGS_MGMT_PATH, fileContent);
  logger.info('Updated SettingsManagement.js with improved tenant ID handling');
}

/**
 * Updates the fetchEmployees function to get tenant ID from various sources
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateFetchEmployeesFunction(content) {
  // Find the fetchEmployees function
  const fetchEmployeesRegex = /const fetchEmployees = useCallback\(async \(\) => \{([\s\S]*?)\}\, \[\w+\]\);/;
  const fetchEmployeesMatch = content.match(fetchEmployeesRegex);
  
  if (!fetchEmployeesMatch) {
    logger.error('Could not find fetchEmployees function in the file');
    throw new Error('fetchEmployees function not found');
  }
  
  // Add appCacheUtils import if not present
  if (!content.includes("import { getFromAppCache } from '@/utils/appCacheUtils'")) {
    const importRegex = /(import [^;]+;(\r?\n|$))+/;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      const newImports = importMatch[0] + "import { getFromAppCache, setInAppCache } from '@/utils/appCacheUtils';\n";
      content = content.replace(importRegex, newImports);
    }
  }
  
  // Define the new implementation that gets tenant ID from multiple sources
  const newFetchEmployeesFunction = `const fetchEmployees = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      logger.debug('[SettingsManagement] Attempting to fetch users');
      
      // Try to get tenant ID from multiple sources
      let tenantId = null;
      
      // 1. Try from user attributes
      if (user?.attributes?.['custom:tenant_ID']) {
        tenantId = user.attributes['custom:tenant_ID'];
        logger.debug(\`[SettingsManagement] Using tenant ID from user attributes: \${tenantId}\`);
      }
      // 2. Try from app cache
      else if (!tenantId) {
        try {
          tenantId = await getFromAppCache('tenantId');
          if (tenantId) {
            logger.debug(\`[SettingsManagement] Using tenant ID from app cache: \${tenantId}\`);
          }
        } catch (cacheError) {
          logger.warn('[SettingsManagement] Error getting tenant ID from app cache:', cacheError);
        }
      }
      // 3. Try from URL parameters
      if (!tenantId) {
        try {
          // Check if we're in a tenant context from URL
          const urlParams = new URLSearchParams(window.location.search);
          const pathParts = window.location.pathname.split('/');
          
          // Look for tenant ID in the URL path (e.g., /tenant/{tenantId}/...)
          const pathTenantId = pathParts.length > 2 && pathParts[1] === 'tenant' ? pathParts[2] : null;
          
          if (pathTenantId && pathTenantId.length > 10) {
            tenantId = pathTenantId;
            logger.debug(\`[SettingsManagement] Using tenant ID from URL path: \${tenantId}\`);
            
            // Store in app cache for future use
            try {
              await setInAppCache('tenantId', tenantId);
              logger.debug('[SettingsManagement] Saved tenant ID to app cache');
            } catch (setCacheError) {
              logger.warn('[SettingsManagement] Error saving tenant ID to app cache:', setCacheError);
            }
          }
        } catch (urlError) {
          logger.warn('[SettingsManagement] Error parsing URL for tenant ID:', urlError);
        }
      }
      
      if (!tenantId) {
        logger.warn('[SettingsManagement] No tenant ID found - user isolation may be compromised');
      } else {
        logger.debug(\`[SettingsManagement] Final tenant ID for fetching users: \${tenantId}\`);
      }
      
      // Use userService with the tenant ID to get users from Cognito
      const users = await userService.getTenantUsers({
        tenantId: tenantId
      });
      
      logger.debug(\`[SettingsManagement] Fetched \${users?.length || 0} users for tenant\`);
      
      if (isMounted.current) {
        // The structure of users from Cognito is different from employees,
        // so we need to adapt it to the expected format
        if (Array.isArray(users)) {
          const formattedUsers = users.map(user => ({
            id: user.id || user.username,
            first_name: user.firstName || user.attributes?.given_name || '',
            last_name: user.lastName || user.attributes?.family_name || '',
            email: user.email || user.attributes?.email || '',
            role: user.role || user.attributes?.['custom:userrole'] || 'User',
            status: user.status || 'CONFIRMED',
            tenantId: user.tenantId || user.attributes?.['custom:tenant_ID'] || '',
            canManageUsers: user.canManageUsers || user.attributes?.['custom:canManageUsers'] === 'true',
            managablePages: user.managablePages || user.attributes?.['custom:managablePages'] || '',
            accessiblePages: user.accessiblePages || user.attributes?.['custom:accessiblePages'] || ''
          }));
          
          logger.debug(\`[SettingsManagement] Formatted \${formattedUsers.length} users\`);
          setEmployees(formattedUsers || []);
        } else {
          logger.error('[SettingsManagement] Received non-array response:', users);
          setEmployees([]);
          setError('Failed to load users: Invalid response format');
        }
        setError(null);
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error fetching users:', err);
      if (isMounted.current) {
        setError('Failed to load users: ' + (err.message || 'Unknown error'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user]);`;

  // Replace the function in the content
  return content.replace(fetchEmployeesRegex, newFetchEmployeesFunction);
}

/**
 * Ensures the appCacheUtils.js file has the necessary functions
 */
async function ensureAppCacheUtilsHasTenantIdFunction() {
  // Check if the file exists
  if (!fs.existsSync(APP_CACHE_UTILS_PATH)) {
    logger.info('appCacheUtils.js not found, creating it');
    createAppCacheUtilsFile();
    return;
  }
  
  // Read the file content
  let fileContent = fs.readFileSync(APP_CACHE_UTILS_PATH, 'utf8');
  
  // Check if the file already has the required functions
  if (fileContent.includes('getFromAppCache') && fileContent.includes('setInAppCache')) {
    logger.info('appCacheUtils.js already has the required functions');
    return;
  }
  
  // Create backup of the original file
  const backupPath = await createBackup(APP_CACHE_UTILS_PATH);
  logger.info(`Created appCacheUtils backup at: ${backupPath}`);
  
  // Update the file with the required functions
  fileContent = updateAppCacheUtilsFile(fileContent);
  
  // Write the updated content back to the file
  fs.writeFileSync(APP_CACHE_UTILS_PATH, fileContent);
  logger.info('Updated appCacheUtils.js with required functions');
}

/**
 * Updates the appCacheUtils.js file with the required functions
 * @param {string} content - The file content
 * @returns {string} - The updated file content
 */
function updateAppCacheUtilsFile(content) {
  // Add the required functions if they don't exist
  if (!content.includes('getFromAppCache')) {
    content += `
/**
 * Gets a value from AWS AppCache
 * @param {string} key - The key to get
 * @returns {Promise<any>} - The value from the cache
 */
export async function getFromAppCache(key) {
  try {
    // Check if AWS AppCache is available
    if (typeof window !== 'undefined' && window.APP_CACHE) {
      return window.APP_CACHE[key];
    }
    
    // Server-side access to cache
    console.log('[AppCacheUtils] Server-side cache access for ' + key);
    return null;
  } catch (error) {
    console.error('[AppCacheUtils] Error getting from app cache:', error);
    return null;
  }
}
`;
  }
  
  if (!content.includes('setInAppCache')) {
    content += `
/**
 * Sets a value in AWS AppCache
 * @param {string} key - The key to set
 * @param {any} value - The value to set
 * @returns {Promise<void>}
 */
export async function setInAppCache(key, value) {
  try {
    // Check if AWS AppCache is available
    if (typeof window !== 'undefined') {
      if (!window.APP_CACHE) {
        window.APP_CACHE = {};
      }
      window.APP_CACHE[key] = value;
    }
  } catch (error) {
    console.error('[AppCacheUtils] Error setting in app cache:', error);
  }
}
`;
  }
  
  return content;
}

/**
 * Creates the appCacheUtils.js file if it doesn't exist
 */
function createAppCacheUtilsFile() {
  const content = `/**
 * appCacheUtils.js
 * Utility functions for interacting with AWS AppCache
 */

/**
 * Gets a value from AWS AppCache
 * @param {string} key - The key to get
 * @returns {Promise<any>} - The value from the cache
 */
export async function getFromAppCache(key) {
  try {
    // Check if AWS AppCache is available
    if (typeof window !== 'undefined' && window.APP_CACHE) {
      return window.APP_CACHE[key];
    }
    
    // Server-side access to cache
    console.log('[AppCacheUtils] Server-side cache access for ' + key);
    return null;
  } catch (error) {
    console.error('[AppCacheUtils] Error getting from app cache:', error);
    return null;
  }
}

/**
 * Sets a value in AWS AppCache
 * @param {string} key - The key to set
 * @param {any} value - The value to set
 * @returns {Promise<void>}
 */
export async function setInAppCache(key, value) {
  try {
    // Check if AWS AppCache is available
    if (typeof window !== 'undefined') {
      if (!window.APP_CACHE) {
        window.APP_CACHE = {};
      }
      window.APP_CACHE[key] = value;
    }
  } catch (error) {
    console.error('[AppCacheUtils] Error setting in app cache:', error);
  }
}
`;

  // Create the directory if it doesn't exist
  const dir = path.dirname(APP_CACHE_UTILS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(APP_CACHE_UTILS_PATH, content);
  logger.info('Created new appCacheUtils.js file');
}

// Run the main function
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
}); 