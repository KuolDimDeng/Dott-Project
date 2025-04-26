/**
 * Version0008_AddMissingStoreTenantInfo_tenantUtils.js
 * 
 * This script fixes the "storeTenantInfo is not exported from '@/utils/tenantUtils'" error
 * by adding the missing storeTenantInfo function to the tenantUtils.js file.
 * 
 * The error occurs in the TenantInitializer.js component which imports this function
 * but the function was not defined in the tenantUtils.js file.
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const tenantUtilsPath = path.join(__dirname, '../frontend/pyfactor_next/src/utils/tenantUtils.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${tenantUtilsPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${tenantUtilsPath}`);
const fileContent = fs.readFileSync(tenantUtilsPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Find the position to insert the new function
// We'll add it after the storeTenantId function
const storeTenantIdFunction = `/**
 * Store tenant ID in cache
 * @param {string} tenantId - The tenant ID to store
 * @returns {Promise<void>}
 */
export const storeTenantId = async (tenantId) => {
  try {
    await cache.setItem(TENANT_ID_KEY, tenantId);
  } catch (error) {
    console.error('Error storing tenant ID:', error);
    throw error;
  }
};`;

// Define the new function to add
const storeTenantInfoFunction = `

/**
 * Store tenant information in cache and local storage
 * @param {Object} options - The options object
 * @param {string} options.tenantId - The tenant ID to store
 * @param {Object} [options.metadata] - Additional metadata to store
 * @returns {Promise<void>}
 */
export const storeTenantInfo = async ({ tenantId, metadata = {} }) => {
  try {
    if (!tenantId) {
      console.error('Cannot store tenant info: No tenant ID provided');
      return;
    }
    
    // Store in Amplify cache
    await cache.setItem(TENANT_ID_KEY, tenantId);
    
    // Store in APP_CACHE for cross-component resilience
    if (typeof window !== 'undefined') {
      if (!window.__APP_CACHE) window.__APP_CACHE = {};
      if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
      
      window.__APP_CACHE.tenant.id = tenantId;
      window.__APP_CACHE.tenant.metadata = metadata;
      window.__APP_CACHE.tenant.timestamp = Date.now();
      
      // Also try to store in sessionStorage for persistence
      try {
        sessionStorage.setItem('tenant_id', tenantId);
        sessionStorage.setItem('tenant_info', JSON.stringify({
          id: tenantId,
          metadata,
          timestamp: Date.now()
        }));
      } catch (storageError) {
        // Ignore storage errors
        console.debug('Could not store tenant info in sessionStorage:', storageError);
      }
    }
    
    console.debug(\`[TenantUtils] Stored tenant info for ID: \${tenantId}\`);
  } catch (error) {
    console.error('Error storing tenant info:', error);
  }
};`;

// Insert the new function after storeTenantId
const updatedContent = fileContent.replace(storeTenantIdFunction, storeTenantIdFunction + storeTenantInfoFunction);

// Write the updated content
console.log(`Writing updated content to: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, updatedContent);

console.log('Fix completed successfully!');
