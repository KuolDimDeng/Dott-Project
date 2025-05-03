/**
 * Version0006_FixMissingTenantUtilsExports_tenantUtils.js
 * 
 * This script adds missing exported functions to the tenantUtils.js file:
 * - getSecureTenantId
 * - validateTenantIdFormat
 * - getSchemaName
 * - getTenantHeaders
 * - extractTenantId
 * 
 * These functions are being imported by various dashboard components but are not defined
 * in the current tenantUtils.js file, causing import errors.
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
const userRoleUtilsPath = path.join(__dirname, '../frontend/pyfactor_next/src/utils/userRoleUtils.js');

// Create backups
const backupDate = new Date().toISOString().replace(/:/g, '-');
const tenantUtilsBackupPath = `${tenantUtilsPath}.backup-${backupDate}`;
const userRoleUtilsBackupPath = `${userRoleUtilsPath}.backup-${backupDate}`;

// Read the files
console.log(`Reading tenantUtils.js file: ${tenantUtilsPath}`);
const tenantUtilsContent = fs.readFileSync(tenantUtilsPath, 'utf8');

console.log(`Reading userRoleUtils.js file: ${userRoleUtilsPath}`);
const userRoleUtilsContent = fs.readFileSync(userRoleUtilsPath, 'utf8');

// Create backups
console.log(`Creating backup: ${tenantUtilsBackupPath}`);
fs.writeFileSync(tenantUtilsBackupPath, tenantUtilsContent);

console.log(`Creating backup: ${userRoleUtilsBackupPath}`);
fs.writeFileSync(userRoleUtilsBackupPath, userRoleUtilsContent);

// Define the missing functions to add to tenantUtils.js
const missingFunctions = `
/**
 * Get secure tenant ID with validation
 * @returns {Promise<string|null>} The validated tenant ID or null if not found/valid
 */
export const getSecureTenantId = async () => {
  try {
    const tenantId = await getTenantId();
    
    // Validate the tenant ID format
    if (!isValidUUID(tenantId)) {
      console.error('Invalid tenant ID format:', tenantId);
      return null;
    }
    
    return tenantId;
  } catch (error) {
    console.error('Error getting secure tenant ID:', error);
    return null;
  }
};

/**
 * Validate tenant ID format (alias for isValidUUID for backward compatibility)
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean} Whether the tenant ID format is valid
 */
export const validateTenantIdFormat = (tenantId) => {
  return isValidUUID(tenantId);
};

/**
 * Get schema name for a tenant
 * @param {string} tenantId - The tenant ID
 * @returns {string} The schema name
 */
export const getSchemaName = (tenantId) => {
  if (!tenantId) return 'public';
  return \`tenant_\${tenantId.replace(/-/g, '_')}\`;
};

/**
 * Get tenant headers for API requests
 * @returns {Promise<Object>} The tenant headers
 */
export const getTenantHeaders = async () => {
  try {
    const tenantId = await getTenantId();
    const headers = {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId
    };
    
    // Try to get user ID if available
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      if (user && user.userId) {
        headers['x-user-id'] = user.userId;
      }
    } catch (e) {
      // Continue without user ID
    }
    
    return headers;
  } catch (error) {
    console.error('Error getting tenant headers:', error);
    return { 'Content-Type': 'application/json' };
  }
};

/**
 * Extract tenant ID from URL path or other sources
 * @param {string} path - The URL path to extract from (optional)
 * @returns {Promise<string|null>} The extracted tenant ID or null if not found
 */
export const extractTenantId = async (path) => {
  // Try to extract from URL path if provided
  if (path) {
    const match = path.match(/\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\/dashboard/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If in browser, try to extract from current URL
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const urlMatch = pathname.match(/\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\/dashboard/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
  }
  
  // Fall back to getting from Cognito/cache
  try {
    return await getTenantId();
  } catch (e) {
    return null;
  }
};
`;

// Fix the userRoleUtils.js file to use the correct cache import
const fixedUserRoleUtilsContent = userRoleUtilsContent.replace(
  "import { cache } from 'aws-amplify/utils';",
  "import { Cache as cache } from '@aws-amplify/core';"
);

// Add the missing functions to tenantUtils.js
const updatedTenantUtilsContent = tenantUtilsContent.replace(
  "export const generateDeterministicTenantId = (input) => {\n  // Simple hash function\n  let hash = 0;\n  for (let i = 0; i < input.length; i++) {\n    const char = input.charCodeAt(i);\n    hash = ((hash << 5) - hash) + char;\n    hash = hash & hash;\n  }\n  // Convert to UUID v4 format\n  return `00000000-0000-4000-a000-${Math.abs(hash).toString(16).padStart(12, '0')}`;\n};",
  "export const generateDeterministicTenantId = (input) => {\n  // Simple hash function\n  let hash = 0;\n  for (let i = 0; i < input.length; i++) {\n    const char = input.charCodeAt(i);\n    hash = ((hash << 5) - hash) + char;\n    hash = hash & hash;\n  }\n  // Convert to UUID v4 format\n  return `00000000-0000-4000-a000-${Math.abs(hash).toString(16).padStart(12, '0')}`;\n};" + missingFunctions
);

// Write the updated content
console.log(`Writing updated content to: ${tenantUtilsPath}`);
fs.writeFileSync(tenantUtilsPath, updatedTenantUtilsContent);

console.log(`Writing updated content to: ${userRoleUtilsPath}`);
fs.writeFileSync(userRoleUtilsPath, fixedUserRoleUtilsContent);

console.log('Fix completed successfully!');
