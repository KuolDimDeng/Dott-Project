/**
 * Tenant Handler Script
 * 
 * This script helps handle tenant-specific URLs by:
 * 1. Extracting tenant ID from URL
 * 2. Storing it in window.__APP_CACHE instead of localStorage/cookies
 * 3. Handling redirects when necessary
 */

(function() {
  // Helper function to get query parameters
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Helper function to get tenant ID from URL
  function extractTenantIdFromPath() {
    const pathParts = window.location.pathname.split('/');
    
    // Check if we have a UUID as the first path segment (after the leading slash)
    if (pathParts.length >= 2) {
      const potentialTenantId = pathParts[1];
      // Simple UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(potentialTenantId)) {
        return potentialTenantId;
      }
    }
    
    return null;
  }

  // Set tenant ID in app cache for client access
  function storeTenantId(tenantId) {
    if (!tenantId) return;
    
    // Initialize app cache if it doesn't exist
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenant.id = tenantId;
      window.__APP_CACHE.tenant.lastUpdated = new Date().toISOString();
      
      // Store in sessionStorage as a fallback for backward compatibility
      try {
        sessionStorage.setItem('tenantId', tenantId);
      } catch (err) {
        console.error('[tenant-handler] Failed to store in sessionStorage:', err);
      }
    }
    
    console.log(`[tenant-handler] Stored tenant ID in app cache: ${tenantId}`);
  }

  // Main function to handle tenant ID from URL
  function handleTenantId() {
    // Get tenant ID from URL path
    const tenantIdFromPath = extractTenantIdFromPath();
    
    // Get tenant ID from query params (fallback)
    const tenantIdFromParams = getQueryParam('tenantId');
    
    // Use path tenant ID first, then parameter tenant ID
    const tenantId = tenantIdFromPath || tenantIdFromParams;
    
    if (tenantId) {
      console.log(`[tenant-handler] Found tenant ID in URL: ${tenantId}`);
      storeTenantId(tenantId);
      
      // Check if we need to redirect to dashboard
      if (window.location.pathname.includes('/dashboard') && !getQueryParam('direct')) {
        // Get all current query parameters
        const params = new URLSearchParams(window.location.search);
        
        // Add direct=true parameter to prevent redirect loops
        params.set('direct', 'true');
        params.set('from_tenant_handler', 'true');
        
        // Redirect to the main dashboard with all query parameters
        window.location.href = `/dashboard?${params.toString()}`;
        return;
      }
    }
  }

  // Run the handler when the script loads
  handleTenantId();
})();