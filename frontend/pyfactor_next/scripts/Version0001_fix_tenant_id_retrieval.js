/**
 * Version 1.0 - Fix Tenant ID Retrieval
 * 
 * This script fixes issues with tenant ID retrieval by:
 * 1. Improving the reliability of tenant ID retrieval from AppCache
 * 2. Adding better error handling and logging
 * 3. Implementing a more robust fallback mechanism
 * 4. Ensuring proper initialization of AppCache
 */

// Create a global object to store our functions and cache
const global = typeof window !== 'undefined' ? window : self;

// Initialize AppCache if not already done
if (!global.__APP_CACHE) {
  global.__APP_CACHE = {
    auth: { provider: 'cognito', initialized: true },
    user: {},
    tenant: {},
    tenants: {}
  };
  console.log('[TenantFix] AppCache initialized');
}

// Enhanced tenant ID retrieval function
global.getTenantId = async function() {
  try {
    // 1. First try AppCache
    const cachedTenantId = global.getCacheValue('tenantId') || 
                          global.getCacheValue('businessid');
    
    if (cachedTenantId) {
      console.log('[TenantFix] Retrieved tenant ID from AppCache:', cachedTenantId);
      return cachedTenantId;
    }
    
    // 2. Try to get from Cognito attributes
    try {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const attributes = await fetchUserAttributes();
      
      const tenantId = attributes['custom:businessid'] || 
                      attributes['custom:tenant_id'] || 
                      attributes['custom:tenant_ID'];
      
      if (tenantId) {
        console.log('[TenantFix] Retrieved tenant ID from Cognito:', tenantId);
        // Store in AppCache for future use
        global.setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
        return tenantId;
      }
    } catch (cognitoError) {
      console.warn('[TenantFix] Error getting tenant ID from Cognito:', cognitoError);
    }
    
    // 3. Try to get from auth store
    try {
      const authStore = global.__APP_CACHE?.auth;
      if (authStore?.user?.attributes) {
        const tenantId = authStore.user.attributes['custom:businessid'];
        if (tenantId) {
          console.log('[TenantFix] Retrieved tenant ID from auth store:', tenantId);
          global.setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 });
          return tenantId;
        }
      }
    } catch (authError) {
      console.warn('[TenantFix] Error getting tenant ID from auth store:', authError);
    }
    
    console.error('[TenantFix] No tenant ID found in any source');
    return null;
  } catch (error) {
    console.error('[TenantFix] Error in getTenantId:', error);
    return null;
  }
};

// Enhanced cache value retrieval
global.getCacheValue = function(key) {
  try {
    if (!global.__APP_CACHE) return null;
    
    const entry = global.__APP_CACHE[key];
    if (!entry) return null;
    
    // Handle structured cache entries
    if (entry.value !== undefined && entry.expiresAt) {
      if (Date.now() > entry.expiresAt) {
        delete global.__APP_CACHE[key];
        return null;
      }
      return entry.value;
    }
    
    // Handle direct values
    return entry;
  } catch (error) {
    console.error(`[TenantFix] Error getting cache value for ${key}:`, error);
    return null;
  }
};

// Enhanced cache value setting
global.setCacheValue = function(key, value, options = {}) {
  try {
    if (!global.__APP_CACHE) return false;
    
    const now = Date.now();
    const ttl = options.ttl || 24 * 60 * 60 * 1000; // Default 24 hours
    
    global.__APP_CACHE[key] = {
      value,
      timestamp: now,
      expiresAt: now + ttl,
      ttl
    };
    
    return true;
  } catch (error) {
    console.error(`[TenantFix] Error setting cache value for ${key}:`, error);
    return false;
  }
};

// Make functions available globally
if (typeof window !== 'undefined') {
  window.getTenantId = global.getTenantId;
  window.getCacheValue = global.getCacheValue;
  window.setCacheValue = global.setCacheValue;
  console.log('[TenantFix] Functions initialized successfully in browser environment');
} else {
  console.log('[TenantFix] Functions initialized successfully in Node.js environment');
} 