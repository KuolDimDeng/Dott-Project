'use client';

import { appCache } from '../utils/appCache';


import { useEffect } from 'react';
// Import OAuth debugger to make functions available globally
import '@/utils/oauthDebugger';

/**
 * Client-side script initializer component
 * This component ensures our fix scripts run in the browser context
 */
export default function ClientSideScripts() {
  useEffect(() => {
    // Initialize AppCache structure
    if (!appCache.getAll()) {
      appCache.getAll() = { 
        auth: { provider: 'auth0', initialized: true }, 
        user: {}, 
        tenant: {},
        tenants: {}
      };
      console.log('[ClientSideScripts] AppCache initialized with Auth0 provider');
    }

    // Define global functions for cache access if not already defined
    if (!window.setCacheValue) {
      window.setCacheValue = function(key, value, options = {}) {
        try {
          if (!appCache.getAll()) return false;
          
          const now = Date.now();
          const ttl = options.ttl || 3600000; // Default 1 hour
          
          // Create cache entry with metadata
          appCache.getAll()[key] = {
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
    }
    
    if (!window.getCacheValue) {
      window.getCacheValue = function(key) {
        try {
          if (!appCache.getAll()) return null;
          
          // Check if the key exists in cache
          const cacheEntry = appCache.getAll()[key];
          if (!cacheEntry) return null;
          
          // Check if the entry is a structured entry with expiration
          if (cacheEntry.expiresAt && cacheEntry.value !== undefined) {
            // Check if the entry has expired
            if (Date.now() > cacheEntry.expiresAt) {
              delete appCache.getAll()[key];
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
    }

    // Define allowed attributes that users can update
    const ALLOWED_USER_ATTRIBUTES = [
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'email',
      'phone_number',
      'address',
      'birthdate',
      'gender',
      'locale',
      'picture',
      'website',
      'zoneinfo',
      'custom:tenant_ID',
      'custom:businessid',
      'custom:onboarding',
      'custom:setupdone',
      'custom:plan',
      'custom:subplan',
      'custom:created_at',
      'custom:updated_at',
      'custom:last_login',
      'custom:theme',
      'custom:language'
    ];
    
    // Store the allowed attributes list in window for global access
    window.__APP_CONFIG = window.__APP_CONFIG || {};
    window.__APP_CONFIG.allowedUserAttributes = ALLOWED_USER_ATTRIBUTES;

    // Add a warning about tenant ID attribute casing
    console.warn('[AttributesFix] IMPORTANT: Use only custom:tenant_ID (uppercase ID) and not custom:tenant_id (lowercase id). The lowercase version is not allowed for updates.');

    // Extract tenant from URL
    const extractTenantFromUrl = function() {
      try {
        // Check URL for tenant ID
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i);
        
        if (match) {
          const tenantId = match[1];
          console.log(`[ClientSideScripts] Found tenant ID in URL: ${tenantId}`);
          
          // Store in AppCache
          window.setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
          
          // Always ensure tenant namespace exists
          if (appCache.getAll()) {
            if (!appCache.get('tenant')) appCache.set('tenant', {});
            appCache.set('tenant.id', tenantId);
          }
          
          console.log('[ClientSideScripts] Tenant ID stored in AppCache');
          return tenantId;
        }
        
        // Check query params
        const searchParams = new URLSearchParams(window.location.search);
        const queryTenantId = searchParams.get('tenantId');
        
        if (queryTenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryTenantId)) {
          console.log(`[ClientSideScripts] Found tenant ID in query params: ${queryTenantId}`);
          
          // Store in AppCache
          window.setCacheValue('tenantId', queryTenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
          
          // Always ensure tenant namespace exists
          if (appCache.getAll()) {
            if (!appCache.get('tenant')) appCache.set('tenant', {});
            appCache.set('tenant.id', queryTenantId);
          }
          
          console.log('[ClientSideScripts] Tenant ID from query stored in AppCache');
          return queryTenantId;
        }
        
        return null;
      } catch (error) {
        console.error('[ClientSideScripts] Error extracting tenant ID from URL:', error);
        return null;
      }
    };
    
    // Run tenant extraction
    extractTenantFromUrl();

    console.log('[ClientSideScripts] Fix scripts initialized successfully in client context');
  }, []);

  // This component doesn't render anything
  return null;
} 