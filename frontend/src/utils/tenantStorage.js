/**
 * Tenant Storage Utility
 * Manages tenant ID storage across the application
 */

export const TenantStorage = {
  /**
   * Store tenant ID in multiple locations for redundancy
   */
  setTenantId(tenantId) {
    if (!tenantId) return;
    
    try {
      // Store in localStorage
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('tenantId', tenantId); // Alternative key
      
      // Store in sessionStorage
      sessionStorage.setItem('tenant_id', tenantId);
      sessionStorage.setItem('tenantId', tenantId);
      
      // Store in window object for immediate access
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.id = tenantId;
      }
      
      console.log('[TenantStorage] Tenant ID stored successfully:', tenantId);
    } catch (error) {
      console.error('[TenantStorage] Error storing tenant ID:', error);
    }
  },
  
  /**
   * Get tenant ID from any available source
   */
  getTenantId() {
    // Try localStorage first
    let tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId');
    if (tenantId) return tenantId;
    
    // Try sessionStorage
    tenantId = sessionStorage.getItem('tenant_id') || sessionStorage.getItem('tenantId');
    if (tenantId) return tenantId;
    
    // Try window object
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant?.id) {
      return window.__APP_CACHE.tenant.id;
    }
    
    return null;
  },
  
  /**
   * Clear tenant ID from all storage
   */
  clearTenantId() {
    try {
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('tenantId');
      sessionStorage.removeItem('tenant_id');
      sessionStorage.removeItem('tenantId');
      
      if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant) {
        delete window.__APP_CACHE.tenant.id;
      }
    } catch (error) {
      console.error('[TenantStorage] Error clearing tenant ID:', error);
    }
  }
};
