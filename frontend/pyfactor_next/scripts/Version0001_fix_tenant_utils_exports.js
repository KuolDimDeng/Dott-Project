/**
 * Version0001_fix_tenant_utils_exports.js
 * Fix for tenant utility exports in tenantUtils.js
 * Date: 2025-04-24
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TENANT_UTILS_PATH = path.join(__dirname, '../frontend/pyfactor_next/src/utils/tenantUtils.js');

// Read the current content
const currentContent = fs.readFileSync(TENANT_UTILS_PATH, 'utf8');

// Create the fixed content with proper exports
const fixedContent = `/**
 * Tenant Utilities
 * Handles tenant-related operations and storage
 */

import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AppCache } from 'aws-amplify/utils';

// Constants
const TENANT_ID_KEY = 'tenantId';
const TENANT_INFO_KEY = 'tenantInfo';
const TENANT_SETTINGS_KEY = 'tenantSettings';
const TENANT_CACHE_PREFIX = 'tenant_';

/**
 * Get the current tenant ID
 * @returns {Promise<string>} The tenant ID
 */
export const getTenantId = async () => {
  try {
    // Try to get from AppCache first
    const cachedTenantId = await AppCache.getItem(TENANT_ID_KEY);
    if (cachedTenantId) {
      return cachedTenantId;
    }

    // If not in cache, get from user attributes
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const tenantId = user?.attributes?.['custom:tenantId'] || session?.accessToken?.payload?.['custom:tenantId'];

    if (!tenantId) {
      throw new Error('Tenant ID not found in user attributes or session');
    }

    // Cache the tenant ID
    await AppCache.setItem(TENANT_ID_KEY, tenantId);
    return tenantId;
  } catch (error) {
    console.error('Error getting tenant ID:', error);
    throw error;
  }
};

/**
 * Validate UUID format
 * @param {string} uuid - The UUID to validate
 * @returns {boolean} Whether the UUID is valid
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Get tenant-specific cache key
 * @param {string} key - The base key
 * @returns {Promise<string>} The tenant-specific cache key
 */
export const getTenantCacheKey = async (key) => {
  const tenantId = await getTenantId();
  return \`\${TENANT_CACHE_PREFIX}\${tenantId}_\${key}\`;
};

/**
 * Get tenant information
 * @returns {Promise<Object>} The tenant information
 */
export const getTenantInfo = async () => {
  try {
    const cacheKey = await getTenantCacheKey(TENANT_INFO_KEY);
    const cachedInfo = await AppCache.getItem(cacheKey);
    if (cachedInfo) {
      return cachedInfo;
    }

    // If not in cache, fetch from API
    const tenantId = await getTenantId();
    const response = await fetch(\`/api/tenants/\${tenantId}\`);
    if (!response.ok) {
      throw new Error('Failed to fetch tenant info');
    }

    const tenantInfo = await response.json();
    await AppCache.setItem(cacheKey, tenantInfo);
    return tenantInfo;
  } catch (error) {
    console.error('Error getting tenant info:', error);
    throw error;
  }
};

/**
 * Get tenant settings
 * @returns {Promise<Object>} The tenant settings
 */
export const getTenantSettings = async () => {
  try {
    const cacheKey = await getTenantCacheKey(TENANT_SETTINGS_KEY);
    const cachedSettings = await AppCache.getItem(cacheKey);
    if (cachedSettings) {
      return cachedSettings;
    }

    // If not in cache, fetch from API
    const tenantId = await getTenantId();
    const response = await fetch(\`/api/tenants/\${tenantId}/settings\`);
    if (!response.ok) {
      throw new Error('Failed to fetch tenant settings');
    }

    const settings = await response.json();
    await AppCache.setItem(cacheKey, settings);
    return settings;
  } catch (error) {
    console.error('Error getting tenant settings:', error);
    throw error;
  }
};

/**
 * Clear tenant cache
 * @returns {Promise<void>}
 */
export const clearTenantCache = async () => {
  try {
    const tenantId = await getTenantId();
    const keys = await AppCache.keys();
    const tenantKeys = keys.filter(key => key.startsWith(\`\${TENANT_CACHE_PREFIX}\${tenantId}_\`));
    await Promise.all(tenantKeys.map(key => AppCache.removeItem(key)));
  } catch (error) {
    console.error('Error clearing tenant cache:', error);
    throw error;
  }
};

/**
 * Check if user has access to tenant
 * @param {string} tenantId - The tenant ID to check
 * @returns {Promise<boolean>} Whether the user has access
 */
export const hasTenantAccess = async (tenantId) => {
  try {
    const userTenantId = await getTenantId();
    return userTenantId === tenantId;
  } catch (error) {
    console.error('Error checking tenant access:', error);
    return false;
  }
};
`;

// Write the fixed content
fs.writeFileSync(TENANT_UTILS_PATH, fixedContent);

console.log('Successfully fixed tenant utility exports'); 