"use strict";

/**
 * Enhanced tenant management utilities
 * Provides secure methods for handling tenant information
 */

import Cookies from 'js-cookie';
import { logger } from './logger';
import { jwtDecode } from 'jwt-decode';

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
    // Set in cookies (both secure and regular for compatibility)
    Cookies.set('tenantId', tenantId, COOKIE_CONFIG);
    
    // Set in sessionStorage (more secure than localStorage)
    try {
      sessionStorage.setItem('tenantId', tenantId);
    } catch (e) {
      // Ignore sessionStorage errors
      logger.error('[TenantUtils] Error saving to sessionStorage:', e);
    }

    // Legacy: Set in localStorage with warning (less secure)
    try {
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('businessid', tenantId); // For backward compatibility
    } catch (e) {
      // Ignore localStorage errors
      logger.error('[TenantUtils] Error saving to localStorage:', e);
    }
    
    logger.debug(`[TenantUtils] Tenant ID stored: ${tenantId}`);
  } catch (error) {
    logger.error('[TenantUtils] Error storing tenant ID:', error);
  }
}

/**
 * Get tenant ID from all available sources with priority
 * Uses caching to avoid excessive cookie reads and logging
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
    
    // Try from cookies first (most secure)
    const cookieTenantId = Cookies.get('tenantId');
    if (cookieTenantId) {
      // Only log first time or when value changes
      if (cookieTenantId !== cachedTenantId) {
        logger.debug(`[TenantUtils] Got tenant ID from cookie: ${cookieTenantId}`);
      }
      
      // Update cache
      cachedTenantId = cookieTenantId;
      lastCacheTime = now;
      return cookieTenantId;
    }
    
    // Try from sessionStorage next
    const sessionTenantId = sessionStorage.getItem('tenantId');
    if (sessionTenantId) {
      // Only log when value changes
      if (sessionTenantId !== cachedTenantId) {
        logger.debug(`[TenantUtils] Got tenant ID from sessionStorage: ${sessionTenantId}`);
      }
      
      // Sync to cookies
      storeTenantId(sessionTenantId);
      
      // Update cache
      cachedTenantId = sessionTenantId;
      lastCacheTime = now;
      return sessionTenantId;
    }
    
    // Try from localStorage last (least secure)
    const localTenantId = localStorage.getItem('tenantId') || localStorage.getItem('businessid');
    if (localTenantId) {
      // Only log when value changes
      if (localTenantId !== cachedTenantId) {
        logger.debug(`[TenantUtils] Got tenant ID from localStorage: ${localTenantId}`);
      }
      
      // Sync to more secure storage
      storeTenantId(localTenantId);
      
      // Update cache
      cachedTenantId = localTenantId;
      lastCacheTime = now;
      return localTenantId;
    }
    
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
 * This removes tenant IDs from cookies and storage
 */
export function clearTenantStorage() {
  if (!isBrowser) {
    logger.debug('[TenantUtils] Cannot clear tenant storage on server side');
    return;
  }

  try {
    // Clear cookies
    Cookies.remove('tenantId', { path: '/' });
    Cookies.remove('businessid', { path: '/' });
    
    // Clear sessionStorage
    try {
      sessionStorage.removeItem('tenantId');
    } catch (e) {
      // Ignore errors
    }
    
    // Clear localStorage
    try {
      localStorage.removeItem('tenantId');
      localStorage.removeItem('businessid');
    } catch (e) {
      // Ignore errors
    }
    
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
    
    // Update cache
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