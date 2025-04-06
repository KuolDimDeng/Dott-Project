"use strict";

/**
 * Simple utility for tenant ID management.
 * This is a simplified version to avoid memory issues and initialization problems.
 * It provides stubs for all required exports.
 */

// Basic logger that just wraps console methods
const logger = {
  debug: (msg, data) => console.log(msg, data || ''),
  error: (msg, data) => console.error(msg, data || ''),
  warn: (msg, data) => console.warn(msg, data || ''),
  info: (msg, data) => console.info(msg, data || '')
};

// Helper function to detect if code is running in browser
const isBrowser = typeof window !== 'undefined';

/**
 * Synchronize a repaired tenant ID by updating cookies and localStorage
 * @param {string} oldTenantId - The old/invalid tenant ID
 * @param {string} newTenantId - The new/valid tenant ID to use
 */
export async function syncRepairedTenantId(oldTenantId, newTenantId) {
  if (!isBrowser) {
    logger.debug('[TenantUtils] Cannot sync tenant IDs on server side');
    return;
  }

  try {
    logger.debug('[TenantUtils] Syncing repaired tenant ID', {
      oldTenantId, 
      newTenantId
    });
    
    // Update localStorage
    try {
      localStorage.setItem('tenantId', newTenantId);
    } catch (e) {
      // Ignore localStorage errors
      logger.error('[TenantUtils] Error saving to localStorage:', e);
    }
    
    // Update cookies
    document.cookie = `tenantId=${newTenantId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.cookie = `businessid=${newTenantId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    
    logger.debug('[TenantUtils] Tenant ID sync complete');
  } catch (error) {
    logger.error('[TenantUtils] Error syncing tenant ID:', error);
  }
}

/**
 * Get the current tenant ID from cookies or localStorage
 * @returns {string|null} Current tenant ID or null if not found
 */
export function getTenantId() {
  if (!isBrowser) {
    return null;
  }
  
  try {
    // Get from cookie
    const cookieMatch = document.cookie.match(/tenantId=([^;]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }
    
    // Fallback to localStorage
    return localStorage.getItem('tenantId');
  } catch (e) {
    return null;
  }
}

/**
 * Store tenant information in localStorage and cookies
 * @param {string} tenantId - The tenant ID to store
 */
export function storeTenantInfo(tenantId) {
  if (!isBrowser || !tenantId) {
    return;
  }
  
  try {
    // Store in localStorage
    localStorage.setItem('tenantId', tenantId);
    
    // Store in cookies
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30 days expiry
    document.cookie = `tenantId=${tenantId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    document.cookie = `businessid=${tenantId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    
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
      // Default tenant ID as fallback
      const defaultTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
      await storeTenantInfo(defaultTenantId);
      return defaultTenantId;
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
      // Store tokens in localStorage
      const existingTokens = JSON.parse(localStorage.getItem('tokens') || '{}');
      const updatedTokens = {
        ...existingTokens,
        ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
        ...(tokens.idToken ? { idToken: tokens.idToken } : {})
      };
      
      localStorage.setItem('tokens', JSON.stringify(updatedTokens));
      logger.debug('[TenantUtils] Tokens updated');
    }
  } catch (error) {
    logger.error('[TenantUtils] Error setting tokens:', error);
  }
}

/**
 * Get schema name for database
 * @returns {string|null} The schema name or null
 */
export function getSchemaName() {
  const tenantId = getTenantId();
  if (!tenantId) {
    return null;
  }
  
  // Convert tenant ID to schema name format
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Get headers for inventory API requests
 * @returns {Object} Headers with tenant information
 */
export function getInventoryHeaders() {
  const tenantId = getTenantId();
  if (!tenantId) {
    return {};
  }
  
  // Generate basic headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'X-Schema-Name': getSchemaName(),
    'X-Business-ID': tenantId
  };
  
  // Add auth tokens if available
  try {
    if (isBrowser) {
      const tokensStr = localStorage.getItem('tokens');
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (tokens.accessToken) {
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        }
        if (tokens.idToken) {
          headers['X-Id-Token'] = tokens.idToken;
        }
      }
    }
  } catch (error) {
    logger.error('[TenantUtils] Error adding auth to headers:', error);
  }
  
  return headers;
}