/**
 * TenantStorage - Centralized utility for tenant ID management
 * Version: 1.0.0
 * Created: June 7, 2025
 * 
 * This utility provides centralized functions for storing and retrieving
 * the tenant ID across different storage mechanisms including:
 * - localStorage
 * - sessionStorage
 * - window.__APP_CACHE
 */

// Storage keys
const TENANT_ID_KEY = 'pyfactor_tenant_id';
const TENANT_CACHE_KEY = 'tenant';

/**
 * Safely stores tenant ID in multiple locations for redundancy
 * @param {string} tenantId - The tenant ID to store
 */
export function storeTenantId(tenantId) {
  if (!tenantId) {
    console.warn('[TenantStorage] Attempted to store empty tenant ID');
    return;
  }
  
  try {
    // Store in localStorage
    localStorage.setItem(TENANT_ID_KEY, tenantId);
    
    // Store in sessionStorage
    sessionStorage.setItem(TENANT_ID_KEY, tenantId);
    
    // Store in window.__APP_CACHE
    if (typeof window !== 'undefined') {
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = {};
      }
      
      if (!window.__APP_CACHE[TENANT_CACHE_KEY]) {
        window.__APP_CACHE[TENANT_CACHE_KEY] = {};
      }
      
      window.__APP_CACHE[TENANT_CACHE_KEY].id = tenantId;
    }
    
    console.log(`[TenantStorage] Successfully stored tenant ID: ${tenantId}`);
  } catch (error) {
    console.error('[TenantStorage] Error storing tenant ID:', error);
  }
}

/**
 * Retrieves tenant ID from any available source
 * @returns {string|null} The tenant ID or null if not found
 */
export function getTenantId() {
  try {
    // Try window.__APP_CACHE first (memory)
    if (typeof window !== 'undefined' && 
        window.__APP_CACHE && 
        window.__APP_CACHE[TENANT_CACHE_KEY] && 
        window.__APP_CACHE[TENANT_CACHE_KEY].id) {
      return window.__APP_CACHE[TENANT_CACHE_KEY].id;
    }
    
    // Try localStorage
    const localStorageTenantId = localStorage.getItem(TENANT_ID_KEY);
    if (localStorageTenantId) {
      storeTenantId(localStorageTenantId); // Sync with other storage
      return localStorageTenantId;
    }
    
    // Try sessionStorage
    const sessionStorageTenantId = sessionStorage.getItem(TENANT_ID_KEY);
    if (sessionStorageTenantId) {
      storeTenantId(sessionStorageTenantId); // Sync with other storage
      return sessionStorageTenantId;
    }
    
    console.warn('[TenantStorage] No tenant ID found in any storage');
    return null;
  } catch (error) {
    console.error('[TenantStorage] Error retrieving tenant ID:', error);
    return null;
  }
}

/**
 * Clears tenant ID from all storage locations
 */
export function clearTenantId() {
  try {
    // Clear from localStorage
    localStorage.removeItem(TENANT_ID_KEY);
    
    // Clear from sessionStorage
    sessionStorage.removeItem(TENANT_ID_KEY);
    
    // Clear from window.__APP_CACHE
    if (typeof window !== 'undefined' && 
        window.__APP_CACHE && 
        window.__APP_CACHE[TENANT_CACHE_KEY]) {
      delete window.__APP_CACHE[TENANT_CACHE_KEY].id;
    }
    
    console.log('[TenantStorage] Successfully cleared tenant ID from all storage');
  } catch (error) {
    console.error('[TenantStorage] Error clearing tenant ID:', error);
  }
}

/**
 * Utility function to check if tenant ID exists in any storage
 * @returns {boolean} True if tenant ID exists, false otherwise
 */
export function hasTenantId() {
  return getTenantId() !== null;
}

export default {
  storeTenantId,
  getTenantId,
  clearTenantId,
  hasTenantId
};
