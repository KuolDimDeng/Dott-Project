/**
 * Version 1.0
 * Fix: Add missing getTenantIdFromCognito function to tenantUtils.js
 * Issue: _utils_tenantUtils__WEBPACK_IMPORTED_MODULE_3__.getTenantIdFromCognito is not a function
 * 
 * This script adds the missing function to tenantUtils.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '../frontend/pyfactor_next/src/utils/tenantUtils.js');

// Create backup
const backupPath = `${filePath}.backup-${new Date().toISOString().split('T')[0]}`;
writeFileSync(backupPath, readFileSync(filePath));

// Read the file
const content = readFileSync(filePath, 'utf8');

// Add the new function before the last export
const functionToAdd = `
/**
 * Get tenant ID from Cognito
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export const getTenantIdFromCognito = async () => {
  try {
    // Try to get from cache first
    const cachedTenantId = await cache.getItem(TENANT_ID_KEY);
    if (cachedTenantId) {
      return cachedTenantId;
    }

    // If not in cache, get from user attributes
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const tenantId = user?.attributes?.['custom:tenantId'] || session?.accessToken?.payload?.['custom:tenantId'];

    if (!tenantId) {
      return null;
    }

    // Cache the tenant ID
    await cache.setItem(TENANT_ID_KEY, tenantId);
    return tenantId;
  } catch (error) {
    console.error('Error getting tenant ID from Cognito:', error);
    return null;
  }
};

`;

// Find the position to insert the new function (before the last export)
const lastExportIndex = content.lastIndexOf('export const');
const insertPosition = content.lastIndexOf('export const', lastExportIndex - 1);

// Insert the new function
const updatedContent = content.slice(0, insertPosition) + functionToAdd + content.slice(insertPosition);

// Write the updated content back to the file
writeFileSync(filePath, updatedContent, 'utf8');

console.log('Successfully added getTenantIdFromCognito function to tenantUtils.js');
console.log(`Backup created at: ${backupPath}`); 