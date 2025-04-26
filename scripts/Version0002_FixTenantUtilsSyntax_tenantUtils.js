#!/usr/bin/env node

/**
 * Version: 1.0
 * Purpose: Fix syntax error in tenantUtils.js
 * Target: frontend/pyfactor_next/src/utils/tenantUtils.js
 * Dependencies: aws-amplify v6
 * 
 * Changes:
 * 1. Fix syntax error in the file
 * 2. Properly merge existing and new code
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_FILE = join(__dirname, '../frontend/pyfactor_next/src/utils/tenantUtils.js');
const BACKUP_FILE = `${TARGET_FILE}.backup-${new Date().toISOString().split('T')[0]}`;

// Create backup
await fs.copyFile(TARGET_FILE, BACKUP_FILE);

// Read current file
const currentContent = await fs.readFile(TARGET_FILE, 'utf8');

// Extract the existing functions
const existingFunctions = currentContent.split('export const getTenantId')[1];

// New content with fixes
const newContent = `/**
 * Tenant Utilities
 * Handles tenant-related operations and storage
 */

import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { cache } from 'aws-amplify/utils';

// Constants
const TENANT_ID_KEY = 'tenantId';
const TENANT_INFO_KEY = 'tenantInfo';
const TENANT_SETTINGS_KEY = 'tenantSettings';
const TENANT_CACHE_PREFIX = 'tenant_';

/**
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
};

/**
 * Fix onboarding status case
 * @param {string} status - The status to fix
 * @returns {string} The fixed status
 */
export const fixOnboardingStatusCase = (status) => {
  if (!status) return status;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * Update tenant ID in Cognito
 * @param {string} tenantId - The new tenant ID
 * @returns {Promise<void>}
 */
export const updateTenantIdInCognito = async (tenantId) => {
  try {
    const user = await getCurrentUser();
    await user.updateUserAttributes({
      'custom:tenantId': tenantId
    });
    await storeTenantId(tenantId);
  } catch (error) {
    console.error('Error updating tenant ID in Cognito:', error);
    throw error;
  }
};

/**
 * Set authentication tokens
 * @param {Object} tokens - The tokens to set
 * @returns {Promise<void>}
 */
export const setTokens = async (tokens) => {
  try {
    await cache.setItem('auth_tokens', tokens);
  } catch (error) {
    console.error('Error setting tokens:', error);
    throw error;
  }
};

/**
 * Force validate tenant ID
 * @param {string} tenantId - The tenant ID to validate
 * @returns {Promise<boolean>} Whether the tenant ID is valid
 */
export const forceValidateTenantId = async (tenantId) => {
  try {
    if (!isValidUUID(tenantId)) {
      return false;
    }
    const response = await fetch(\`/api/tenants/\${tenantId}/validate\`);
    return response.ok;
  } catch (error) {
    console.error('Error validating tenant ID:', error);
    return false;
  }
};

/**
 * Generate deterministic tenant ID
 * @param {string} input - The input to generate from
 * @returns {string} The generated tenant ID
 */
export const generateDeterministicTenantId = (input) => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to UUID v4 format
  return \`00000000-0000-4000-a000-\${Math.abs(hash).toString(16).padStart(12, '0')}\`;
};

/**
 * Get the current tenant ID
 * @returns {Promise<string>} The tenant ID
 */
export const getTenantId${existingFunctions}`;

// Write new content
await fs.writeFile(TARGET_FILE, newContent);

console.log('Successfully fixed tenantUtils.js');
console.log('Backup created at:', BACKUP_FILE); 