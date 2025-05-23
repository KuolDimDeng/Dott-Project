/**
 * Tenant Utilities
 * Handles tenant-related operations and storage
 */

import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Cache as cache } from '@aws-amplify/core';

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
    // Try to get from cache first
    const cachedTenantId = await cache.getItem(TENANT_ID_KEY);
    if (cachedTenantId) {
      return cachedTenantId;
    }

    // If not in cache, get from user attributes
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const tenantId = user?.attributes?.['custom:tenant_ID'] || user?.attributes?.['custom:tenantId'] || session?.accessToken?.payload?.['custom:tenant_ID'] || session?.accessToken?.payload?.['custom:tenantId'];

    if (!tenantId) {
      throw new Error('Tenant ID not found in user attributes or session');
    }

    // Cache the tenant ID
    await cache.setItem(TENANT_ID_KEY, tenantId);
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
  return `${TENANT_CACHE_PREFIX}${tenantId}_${key}`;
};

/**
 * Get tenant information
 * @returns {Promise<Object>} The tenant information
 */
export const getTenantInfo = async () => {
  try {
    const cacheKey = await getTenantCacheKey(TENANT_INFO_KEY);
    const cachedInfo = await cache.getItem(cacheKey);
    if (cachedInfo) {
      return cachedInfo;
    }

    // If not in cache, fetch from API
    const tenantId = await getTenantId();
    const response = await fetch(`/api/tenants/${tenantId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tenant info');
    }

    const tenantInfo = await response.json();
    await cache.setItem(cacheKey, tenantInfo);
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
    const cachedSettings = await cache.getItem(cacheKey);
    if (cachedSettings) {
      return cachedSettings;
    }

    // If not in cache, fetch from API
    const tenantId = await getTenantId();
    const response = await fetch(`/api/tenants/${tenantId}/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch tenant settings');
    }

    const settings = await response.json();
    await cache.setItem(cacheKey, settings);
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
    const keys = await cache.keys();
    const tenantKeys = keys.filter(key => key.startsWith(`${TENANT_CACHE_PREFIX}${tenantId}_`));
    await Promise.all(tenantKeys.map(key => cache.removeItem(key)));
  } catch (error) {
    console.error('Error clearing tenant cache:', error);
    throw error;
  }
};

/**
 * Clear all tenant storage including cache, localStorage, sessionStorage, and cookies
 * @returns {Promise<void>}
 */
export const clearTenantStorage = async () => {
  try {
    // Clear Amplify cache
    await clearTenantCache();
    await cache.removeItem(TENANT_ID_KEY);
    
    // Clear browser storage if available
    if (typeof window !== 'undefined') {
      // Clear localStorage
      try {
        localStorage.removeItem('tenantId');
        localStorage.removeItem('businessid');
        localStorage.removeItem('selectedTenant');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('tenant_info');
      } catch (e) {
        console.warn('Could not clear localStorage:', e);
      }
      
      // Clear sessionStorage
      try {
        sessionStorage.removeItem('tenant_id');
        sessionStorage.removeItem('tenant_info');
        sessionStorage.removeItem('tenantId');
        sessionStorage.removeItem('businessid');
      } catch (e) {
        console.warn('Could not clear sessionStorage:', e);
      }
      
      // Clear cookies
      try {
        document.cookie = 'tenantId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'businessid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'tenant_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } catch (e) {
        console.warn('Could not clear cookies:', e);
      }
      
      // Clear APP_CACHE
      try {
        if (window.__APP_CACHE && window.__APP_CACHE.tenant) {
          delete window.__APP_CACHE.tenant;
        }
      } catch (e) {
        console.warn('Could not clear APP_CACHE:', e);
      }
    }
    
    console.log('Tenant storage cleared successfully');
  } catch (error) {
    console.error('Error clearing tenant storage:', error);
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
    
    console.debug(`[TenantUtils] Stored tenant info for ID: ${tenantId}`);
  } catch (error) {
    console.error('Error storing tenant info:', error);
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
    // In Amplify v6, updateUserAttributes is a separate function import, not a method on user
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Call the standalone function with userAttributes object
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': tenantId
      }
    });
    
    // Update local cache
    await storeTenantId(tenantId);
    
    console.debug(`[TenantUtils] Updated tenant ID in Cognito: ${tenantId}`);
  } catch (error) {
    console.error('Error updating tenant ID in Cognito:', error);
    // Don't throw the error, just log it and continue
    // Still update the local cache
    await storeTenantId(tenantId);
  }
};

/**
 * Get tenant ID from Cognito user attributes
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
    const tenantId = user?.attributes?.['custom:tenant_ID'] || user?.attributes?.['custom:tenantId'] || session?.accessToken?.payload?.['custom:tenant_ID'] || session?.accessToken?.payload?.['custom:tenantId'];

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
    const response = await fetch(`/api/tenants/${tenantId}/validate`);
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
  return `00000000-0000-4000-a000-${Math.abs(hash).toString(16).padStart(12, '0')}`;
};

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
  return `tenant_${tenantId.replace(/-/g, '_')}`;
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
    const match = path.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If in browser, try to extract from current URL
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const urlMatch = pathname.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/i);
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

