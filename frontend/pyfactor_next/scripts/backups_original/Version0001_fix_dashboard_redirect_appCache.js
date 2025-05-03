/**
 * Dashboard Redirect Fix Script - Version 0001
 * This script fixes issues with dashboard redirects after authentication
 * by ensuring proper AppCache initialization and tenant ID storage.
 *
 * Problem: After successful authentication, users are not being properly redirected to the dashboard
 * due to storage constraints (no cookies, no localStorage) and proper initialization of AppCache.
 *
 * Fix: Apply this script to initialize AppCache structure on all pages and implement proper in-memory
 * storage for tenant IDs and authentication state.
 */

'use strict';

(function() {
  // Script version and metadata
  const VERSION = '0001';
  const DESCRIPTION = 'Fix dashboard redirect by properly initializing AppCache';
  const TARGET_FILES = ['src/utils/appCache.js', 'src/utils/tenantUtils.js', 'src/app/auth/components/SignInForm.js'];
  
  // Log execution
  console.log(`Executing Dashboard Redirect Fix Script v${VERSION}`);
  console.log(`Description: ${DESCRIPTION}`);
  console.log(`Target files: ${TARGET_FILES.join(', ')}`);
  
  // Only run in browser context
  if (typeof window === 'undefined') {
    console.log('Script is running in server context, skipping execution');
    return;
  }
  
  try {
    // ===============================================
    // Fix 1: Initialize AppCache properly on all pages
    // ===============================================
    if (!window.__APP_CACHE) {
      console.log('Initializing AppCache structure');
      window.__APP_CACHE = { 
        auth: {
          provider: 'cognito',
          initialized: true
        }, 
        user: {}, 
        tenant: {},
        tenants: {} // Tenant-specific namespaces
      };
    } else {
      // Ensure all required namespaces exist
      window.__APP_CACHE.auth = window.__APP_CACHE.auth || { provider: 'cognito', initialized: true };
      window.__APP_CACHE.user = window.__APP_CACHE.user || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenants = window.__APP_CACHE.tenants || {};
      
      // Mark as initialized
      window.__APP_CACHE.auth.initialized = true;
    }
    
    // ===============================================
    // Fix 2: Add script to head to ensure early AppCache initialization
    // ===============================================
    const initScript = document.createElement('script');
    initScript.type = 'text/javascript';
    initScript.innerHTML = `
      // Initialize AppCache structure early
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = { 
          auth: { provider: 'cognito', initialized: true }, 
          user: {}, 
          tenant: {},
          tenants: {}
        };
      }
    `;
    
    // Insert at the beginning of head
    const head = document.getElementsByTagName('head')[0];
    if (head.firstChild) {
      head.insertBefore(initScript, head.firstChild);
    } else {
      head.appendChild(initScript);
    }
    
    // ===============================================
    // Fix 3: Define helper functions for AppCache access
    // ===============================================
    
    // Function to safely set value in AppCache
    window.setCacheValue = function(key, value, options = {}) {
      try {
        if (typeof window === 'undefined' || !window.__APP_CACHE) return false;
        
        const now = Date.now();
        const ttl = options.ttl || 3600000; // Default 1 hour
        
        // Create cache entry with metadata
        window.__APP_CACHE[key] = {
          value,
          timestamp: now,
          expiresAt: now + ttl,
          ttl
        };
        
        return true;
      } catch (error) {
        console.error(`[AppCache] Error setting cache value for key ${key}:`, error);
        return false;
      }
    };
    
    // Function to safely get value from AppCache
    window.getCacheValue = function(key) {
      try {
        if (typeof window === 'undefined' || !window.__APP_CACHE) return null;
        
        // Check if the key exists in cache
        const cacheEntry = window.__APP_CACHE[key];
        if (!cacheEntry) return null;
        
        // Check if the entry is a structured entry with expiration
        if (cacheEntry.expiresAt && cacheEntry.value !== undefined) {
          // Check if the entry has expired
          if (Date.now() > cacheEntry.expiresAt) {
            delete window.__APP_CACHE[key];
            return null;
          }
          
          return cacheEntry.value;
        }
        
        // If it's just a simple value (old format), return it directly
        return cacheEntry;
      } catch (error) {
        console.error(`[AppCache] Error getting cache value for key ${key}:`, error);
        return null;
      }
    };
    
    // ===============================================
    // Fix 4: Check for tenant ID in URL and store it
    // ===============================================
    const extractTenantFromUrl = function() {
      try {
        // Check URL for tenant ID
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i);
        
        if (match) {
          const tenantId = match[1];
          console.log(`Found tenant ID in URL: ${tenantId}`);
          
          // Store in AppCache
          window.setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
          
          // Always ensure tenant namespace exists
          if (window.__APP_CACHE) {
            window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
            window.__APP_CACHE.tenant.id = tenantId;
          }
          
          console.log('Tenant ID stored in AppCache');
          return tenantId;
        }
        
        // Check query params
        const searchParams = new URLSearchParams(window.location.search);
        const queryTenantId = searchParams.get('tenantId');
        
        if (queryTenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryTenantId)) {
          console.log(`Found tenant ID in query params: ${queryTenantId}`);
          
          // Store in AppCache
          window.setCacheValue('tenantId', queryTenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
          
          // Always ensure tenant namespace exists
          if (window.__APP_CACHE) {
            window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
            window.__APP_CACHE.tenant.id = queryTenantId;
          }
          
          console.log('Tenant ID from query stored in AppCache');
          return queryTenantId;
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting tenant ID from URL:', error);
        return null;
      }
    };
    
    // Run tenant extraction
    extractTenantFromUrl();
    
    // ===============================================
    // Fix 5: Register a page load listener to always initialize AppCache
    // ===============================================
    window.addEventListener('load', function() {
      console.log('Dashboard redirect fix: Page loaded, ensuring AppCache initialization');
      
      // Ensure AppCache is initialized with all required namespaces
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = { 
          auth: { provider: 'cognito', initialized: true }, 
          user: {}, 
          tenant: {},
          tenants: {}
        };
      } else {
        // Ensure all namespaces exist even if AppCache was already initialized
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || { provider: 'cognito', initialized: true };
        window.__APP_CACHE.user = window.__APP_CACHE.user || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenants = window.__APP_CACHE.tenants || {};
      }
      
      // Extract tenant ID from URL
      extractTenantFromUrl();
    });
    
    console.log(`Dashboard redirect fix script v${VERSION} executed successfully`);
  } catch (error) {
    console.error(`Error in dashboard redirect fix script v${VERSION}:`, error);
  }
})(); 