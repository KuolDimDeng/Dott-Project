"use strict";

/**
 * Enhanced tenant management utilities
 * Provides secure methods for handling tenant information
 */

import Cookies from 'js-cookie';
import { logger } from './logger';
import { jwtDecode } from 'jwt-decode';
// Import the AppCache utilities
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';
// Import user preferences for Cognito attributes
import { saveUserPreference, getUserPreference, PREF_KEYS } from '@/utils/userPreferences';

// Helper function to detect if code is running in browser
const isBrowser = typeof window !== 'undefined';

// Cookie configuration
const COOKIE_CONFIG = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  expires: 30 // 30 days
};

// Near the top of the file, add a caching mechanism
// Cache for tenant ID to avoid excessive cookie reads
let cachedTenantId = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Get tenant ID from JWT token
 * @param {string} token - JWT token
 * @returns {string|null} - Tenant ID from token
 */
export function getTenantFromToken(token) {
  try {
    if (!token) return null;
    
    const decoded = jwtDecode(token);
    
    // Check various possible locations for tenant ID
    return decoded['custom:tenant_id'] || 
           decoded['custom:tenantId'] || 
           decoded['custom:businessid'] || 
           decoded.tenantId || 
           null;
  } catch (error) {
    logger.error('[TenantUtils] Error extracting tenant from token:', error);
    return null;
  }
}

/**
 * Store tenant ID securely
 * @param {string} tenantId - Tenant ID to store
 */
export function storeTenantId(tenantId) {
  if (!isBrowser || !tenantId) {
    return;
  }

  try {
    // Store in AppCache
    setCacheValue('tenantId', tenantId);
    
    // Store in Cognito attributes (async)
    try {
      saveUserPreference(PREF_KEYS.TENANT_ID, tenantId)
        .then(() => logger.debug(`[TenantUtils] Tenant ID saved to Cognito: ${tenantId}`))
        .catch(err => logger.error('[TenantUtils] Error saving tenant ID to Cognito:', err));
    } catch (e) {
      logger.error('[TenantUtils] Error initiating Cognito tenant save:', e);
    }
    
    logger.debug(`[TenantUtils] Tenant ID stored: ${tenantId}`);
  } catch (error) {
    logger.error('[TenantUtils] Error storing tenant ID:', error);
  }
}

/**
 * Get tenant ID from all available sources with priority
 * Uses caching to avoid excessive reads and logging
 * @returns {string|null} - Tenant ID from most secure source
 */
export function getTenantId() {
  if (!isBrowser) {
    return null;
  }

  try {
    const now = Date.now();
    
    // Return cached value if valid
    if (cachedTenantId && (now - lastCacheTime) < CACHE_DURATION) {
      return cachedTenantId;
    }
    
    // Try from AppCache first (fastest)
    const appCacheTenantId = getCacheValue('tenantId');
    if (appCacheTenantId) {
      // Only log first time or when value changes
      if (appCacheTenantId !== cachedTenantId) {
        logger.debug(`[TenantUtils] Got tenant ID from AppCache: ${appCacheTenantId}`);
      }
      
      // Update cache
      cachedTenantId = appCacheTenantId;
      lastCacheTime = now;
      return appCacheTenantId;
    }
    
    // Try from Cognito attributes (async check, will update AppCache for future)
    getUserPreference(PREF_KEYS.TENANT_ID)
      .then(cognitoTenantId => {
        if (cognitoTenantId) {
          logger.debug(`[TenantUtils] Got tenant ID from Cognito: ${cognitoTenantId}`);
          // Store in AppCache for future fast access
          setCacheValue('tenantId', cognitoTenantId);
        }
      })
      .catch(err => logger.error('[TenantUtils] Error getting tenant ID from Cognito:', err));
    
    // Only log no tenant found once
    if (cachedTenantId !== null) {
      logger.debug('[TenantUtils] No tenant ID found in any storage');
      cachedTenantId = null;
    }
    
    return null;
  } catch (error) {
    logger.error('[TenantUtils] Error getting tenant ID:', error);
    return null;
  }
}

/**
 * Clear all tenant-related storage
 * This removes tenant IDs from AppCache and Cognito
 */
export function clearTenantStorage() {
  if (!isBrowser) {
    logger.debug('[TenantUtils] Cannot clear tenant storage on server side');
    return;
  }

  try {
    // Clear from AppCache
    removeCacheValue('tenantId');
    
    // Clear from Cognito (async)
    saveUserPreference(PREF_KEYS.TENANT_ID, '')
      .then(() => logger.debug('[TenantUtils] Tenant ID cleared from Cognito'))
      .catch(err => logger.error('[TenantUtils] Error clearing tenant ID from Cognito:', err));
    
    // Reset cache
    cachedTenantId = null;
    lastCacheTime = 0;
    
    logger.debug('[TenantUtils] Tenant storage cleared successfully');
  } catch (error) {
    logger.error('[TenantUtils] Error clearing tenant storage:', error);
  }
}

/**
 * Add tenant ID to URL or API request
 * @param {string} url - URL to add tenant to
 * @param {string} [tenantIdOverride] - Optional override tenant ID
 * @returns {string} - URL with tenant ID parameter
 */
export function addTenantToUrl(url, tenantIdOverride) {
  try {
    const id = tenantIdOverride || getTenantId();
    if (!id || !url) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tenantId=${id}`;
  } catch (error) {
    logger.error('[TenantUtils] Error adding tenant to URL:', error);
    return url;
  }
}

/**
 * Generate headers with tenant ID for API requests
 * @param {Object} [existingHeaders={}] - Existing headers
 * @param {string} [tenantIdOverride] - Optional override tenant ID 
 * @returns {Object} - Headers with tenant ID
 */
export function getTenantHeaders(existingHeaders = {}, tenantIdOverride) {
  try {
    const id = tenantIdOverride || getTenantId();
    if (!id) return existingHeaders;
    
    return {
      ...existingHeaders,
      'X-Tenant-ID': id
    };
  } catch (error) {
    logger.error('[TenantUtils] Error generating tenant headers:', error);
    return existingHeaders;
  }
}

/**
 * Synchronize a repaired tenant ID by updating AppCache and Cognito
 * @param {string} oldTenantId - The old/invalid tenant ID
 * @param {string} newTenantId - The new/valid tenant ID to use
 */
export async function syncRepairedTenantId(oldTenantId, newTenantId) {
  if (!isBrowser) {
    return;
  }
  
  try {
    logger.info(`[TenantUtils] Synchronizing repaired tenant ID: ${oldTenantId} -> ${newTenantId}`);
    
    // Update AppCache
    setCacheValue('tenantId', newTenantId);
    
    // Update Cognito
    await saveUserPreference(PREF_KEYS.TENANT_ID, newTenantId);
    
    // Update cache
    cachedTenantId = newTenantId;
    lastCacheTime = Date.now();
    
    logger.debug(`[TenantUtils] Tenant ID repaired: ${newTenantId}`);
  } catch (error) {
    logger.error('[TenantUtils] Error saving repaired tenant ID:', error);
  }
}

/**
 * Convert tenant ID to schema name format
 */
export function getSchemaName(tenantId) {
  if (!tenantId) return null;
  
  try {
    // Schema name is typically tenant_ followed by tenant ID
    // Ensure tenant ID is formatted correctly for database schema
    const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `tenant_${sanitizedTenantId}`;
  } catch (error) {
    logger.error('Error formatting schema name', error);
    return null;
  }
}

/**
 * Store tenant information in Cognito attributes and AppCache
 * @param {string} tenantId - The tenant ID to store
 */
export async function storeTenantInfo(tenantId) {
  if (!isBrowser || !tenantId) {
    return;
  }
  
  try {
    // Store in AppCache
    setCacheValue('tenantId', tenantId);
    
    // Store in Cognito attributes
    await saveUserPreference(PREF_KEYS.TENANT_ID, tenantId);
    
    // Update memory cache
    cachedTenantId = tenantId;
    lastCacheTime = Date.now();
    
    logger.debug('[TenantUtils] Tenant info stored:', tenantId);
  } catch (error) {
    logger.error('[TenantUtils] Error storing tenant info:', error);
  }
}

/**
 * Validate tenant ID format (UUID)
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean} True if valid
 */
export function validateTenantIdFormat(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    return false;
  }
  
  // Basic UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Force validation of tenant ID
 * @returns {Promise<string|null>} The validated tenant ID
 */
export async function forceValidateTenantId() {
  try {
    const tenantId = getTenantId();
    logger.debug('[TenantUtils] Force validating tenant ID:', tenantId);
    
    if (!tenantId) {
      logger.warn('[TenantUtils] No tenant ID found during force validation');
      return null;
    }
    
    return tenantId;
  } catch (error) {
    logger.error('[TenantUtils] Error in force validation:', error);
    return null;
  }
}

/**
 * Set authentication tokens
 * @param {Object} tokens - Object containing accessToken and idToken
 */
export function setTokens(tokens = {}) {
  if (!isBrowser) {
    return;
  }
  
  try {
    if (tokens.accessToken || tokens.idToken) {
      // Store tokens in AppCache
      const existingTokens = getCacheValue('tokens') || {};
      const updatedTokens = {
        ...existingTokens,
        ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
        ...(tokens.idToken ? { idToken: tokens.idToken } : {})
      };
      
      setCacheValue('tokens', updatedTokens);
      
      // Also cache individual tokens for easier access
      if (tokens.accessToken) {
        setCacheValue('accessToken', tokens.accessToken);
      }
      if (tokens.idToken) {
        setCacheValue('idToken', tokens.idToken);
      }
      
      logger.debug('[TenantUtils] Tokens updated in AppCache');
    }
  } catch (error) {
    logger.error('[TenantUtils] Error setting tokens:', error);
  }
}

/**
 * Extract the tenant ID from all available sources for RLS
 * This function is used on the client side to get the tenant ID for API requests
 * @returns {string|null} The tenant ID or null if not found
 */
export function extractTenantId() {
  if (!isBrowser) {
    return null;
  }

  try {
    // Try from Cognito attributes first (most secure)
    const cognitoTenantId = getUserPreference(PREF_KEYS.TENANT_ID);
    if (cognitoTenantId) {
      return cognitoTenantId;
    }
    
    // Try from AppCache
    const cacheTenantId = getCacheValue('tenantId');
    if (cacheTenantId) {
      return cacheTenantId;
    }
    
    // Final fallback - check URL/search params if available
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTenantId = urlParams.get('tenantId');
        if (urlTenantId) {
          // Cache the tenant ID for future use
          storeTenantId(urlTenantId);
          return urlTenantId;
        }
      } catch (e) {
        logger.error('[TenantUtils] Error getting tenant ID from URL:', e);
      }
    }
    
    // Log a warning if no tenant ID was found
    logger.warn('[TenantUtils] No tenant ID found in storage');
    return null;
  } catch (error) {
    logger.error('[TenantUtils] Error extracting tenant ID:', error);
    return null;
  }
}

/**
 * Set tenant ID in AppCache and Cognito
 * @param {string} tenantId - Tenant ID to store
 */
export function setTenantIdCookies(tenantId) {
  if (!isBrowser || !tenantId) {
    return;
  }

  try {
    // Use existing storeTenantId function which already handles AppCache and Cognito
    storeTenantId(tenantId);
    
    // Also store business ID for backward compatibility
    setCacheValue('businessid', tenantId, { ttl: 30 * 24 * 60 * 60 * 1000 });
    
    // For server-side access, set tenant reference
    setCacheValue('tenant_reference', {
      id: tenantId,
      timestamp: Date.now()
    }, { ttl: 30 * 24 * 60 * 60 * 1000 });
    
    logger.debug(`[TenantUtils] Set tenant ID in all storage: ${tenantId}`);
    return true;
  } catch (error) {
    logger.error('[TenantUtils] Error in setTenantIdCookies:', error);
    return false;
  }
}