'use client';


import { appCache } from '@/utils/appCache';


/**
 * Utility module for tenant context operations that don't require the full React context
 * This module is kept separate to avoid circular dependencies
 */

import { logger } from './logger';
import useAuthStore from '@/store/authStore';
import { getTenantId, forceValidateTenantId, validateTenantIdFormat } from './tenantUtils';
import { useCallback, useState, useEffect } from 'react';

/**
 * TenantContext - Single source of truth for tenant information
 * This module centralizes all tenant-related functionality and provides
 * a consistent interface for accessing tenant information across the application.
 */

// Define isBrowser constant for SSR detection
const isBrowser = typeof window !== 'undefined';

// Centralized local tenantId for components that can't access React context
let currentTenantId = null;

/**
 * Sets the tenant context ID in the utility module
 * This is useful for middleware and server components
 * @param {string} tenantId - The tenant ID to set
 */
export function setTenantContext(tenantId) {
  if (!tenantId) {
    logger.warn('[tenantContext] Attempted to set empty tenant ID');
    return;
  }
  
  if (currentTenantId !== tenantId) {
    logger.info(`[tenantContext] Tenant ID updated: ${tenantId}`);
    currentTenantId = tenantId;
  }
}

/**
 * Gets the current tenant ID from the utility module
 * @returns {string|null} The current tenant ID or null if not set
 */
export function getTenantContext() {
  return currentTenantId;
}

/**
 * Clears the tenant context
 */
export function clearTenantContext() {
  logger.info('[tenantContext] Tenant context cleared');
  currentTenantId = null;
}

/**
 * Get the current tenant context (ID and schema name)
 * @returns {Object} Object containing tenantId and schemaName
 */
export const getTenantContextFull = () => {
  // Get tenant ID from auth store as the single source of truth
  const authState = useAuthStore.getState();
  let tenantId = authState.user?.businessId || null;
  
  // If not in auth store, try to get from tenantUtils
  if (!tenantId) {
    tenantId = getTenantId();
    
    // If we found a tenant ID from tenantUtils, update the auth store
    if (tenantId) {
      logger.debug(`[TenantContext] Updated tenant in auth store from tenantUtils: ${tenantId}`);
      setTenantContext(tenantId);
    }
  }
  
  // Generate schema name if tenant ID exists
  const schemaName = tenantId ? `tenant_${tenantId.replace(/-/g, '_')}` : null;
  
  logger.debug('[TenantContext] Current context:', { tenantId, schemaName });
  
  return { tenantId, schemaName };
};

/**
 * Get tenant headers for API requests
 * @returns {Object} Headers object with tenant information
 */
export const getTenantHeaders = () => {
  const { tenantId, schemaName } = getTenantContextFull();
  
  const headers = {};
  
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  if (schemaName) {
    headers['X-Schema-Name'] = schemaName;
  }
  
  return headers;
};

/**
 * Extract tenant information from API response
 * @param {Object} response API response object
 */
export const extractTenantFromResponse = (response) => {
  if (!response || !response.headers) return;
  
  let tenantId;
  
  // Handle different header access methods
  if (typeof response.headers.get === 'function') {
    tenantId = response.headers.get('x-tenant-id');
  } else {
    tenantId = response.headers['x-tenant-id'];
  }
  
  // Also check response body
  if (!tenantId && response.data && response.data.businessId) {
    tenantId = response.data.businessId;
  }
  
  if (tenantId) {
    logger.debug(`[TenantContext] Extracted tenant ID from response: ${tenantId}`);
    setTenantContext(tenantId);
  }
};

/**
 * Initialize tenant context from available sources
 * Should be called during app initialization
 */
export const initializeTenantContext = async () => {
  // Only run on client
  if (typeof window === 'undefined') return;
  
  logger.debug('[TenantContext] Initializing tenant context');
  
  try {
    // Reset tenant cache
    logger.info('[TenantContext] Initializing tenant context');
    
    // Find a valid tenant ID
    const validatedId = await forceValidateTenantId();
    
    if (validatedId) {
      // Update tenant ID in UI
      setTenantContext(validatedId);
      logger.info(`[TenantContext] Tenant context initialized with ID: ${validatedId}`);
    } else {
      logger.warn('[TenantContext] No valid tenant ID found during initialization');
    }
    
    return validatedId;
  } catch (error) {
    logger.error('[TenantContext] Error getting tenant context:', error);
    
    // Last resort - use fallback tenant
    const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    logger.warn(`[TenantContext] Error during initialization, using fallback: ${fallbackTenantId}`);
    setTenantContext(fallbackTenantId);
    return fallbackTenantId;
  }
};

/**
 * Fetch tenant information from the server
 * @param {string} tenantId - The tenant ID to fetch info for
 * @returns {Promise<Object|null>} Tenant information or null if failed
 */
export const fetchTenantInfo = async (tenantId) => {
  try {
    if (!tenantId) {
      logger.warn(`[TenantContext] Cannot fetch tenant info: No tenant ID provided`);
      return null;
    }
    
    const isBrowser = typeof window !== 'undefined';
    
    // Call the tenant info API endpoint
    const response = await fetch(`/api/tenant/info?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Store tenant info in app cache for easier access
      if (isBrowser && data.tenant) {
        // Initialize app cache if needed
        if (!appCache.getAll()) appCache.init();
        if (!appCache.get('tenant')) appCache.set('tenant', {});
        appCache.set('tenant.data', data.tenant);
        appCache.set('tenant.name', data.tenant.name || '');
        appCache.set('tenant.lastUpdated', new Date().toISOString());
      }
      
      logger.debug(`[TenantContext] Tenant info fetched:`, data.tenant);
      return data.tenant;
    } else {
      logger.warn(`[TenantContext] Failed to fetch tenant info: ${response.status}`);
      return null;
    }
  } catch (error) {
    logger.error(`[TenantContext] Error fetching tenant info:`, error);
    return null;
  }
};

/**
 * Gets the tenant ID from the access token JWT
 * 
 * @param {string} token - The JWT access token
 * @returns {string|null} - The tenant ID or null if not found
 */
export function getTenantFromToken(token) {
  try {
    if (!token) {
      logger.warn('[getTenantFromToken] No token provided');
      return null;
    }
    
    // JWT tokens are in format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.warn('[getTenantFromToken] Invalid token format');
      return null;
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Look for the tenant ID in common JWT claim locations
    const tenantId = payload['custom:tenant_ID'] ||
                     payload['custom:tenantId'] ||
                     payload['custom:businessid'] ||
                     payload['custom:tenant_id'] ||
                     null;
    
    if (tenantId) {
      logger.debug(`[getTenantFromToken] Found tenant ID in token: ${tenantId}`);
    } else {
      logger.warn('[getTenantFromToken] No tenant ID found in token');
    }
    
    return tenantId;
  } catch (error) {
    logger.error('[getTenantFromToken] Error extracting tenant from token:', error);
    return null;
  }
}

/**
 * TenantContext hook for React components
 * Provides tenant context and initialization capabilities
 */
export const useTenantContext = () => {
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);

  // Initialize tenant context function that can be called from middleware or components
  const initializeTenant = useCallback(async () => {
    try {
      if (!isBrowser) {
        return;
      }
      
      setLoading(true);
      
      // First check if we already have a tenant ID
      let currentTenantId = getTenantId();
      if (currentTenantId) {
        logger.info(`[TenantContext] Using existing tenant ID: ${currentTenantId}`);
        setTenantId(currentTenantId);
        
        // Ensure database tables exist for subscription data by calling the create-tables endpoint
        try {
          logger.debug('[TenantContext] Ensuring database tables exist');
          const tableResponse = await fetch('/api/tenant/create-tables', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': currentTenantId
            }
          });
          
          if (tableResponse.ok) {
            const tableData = await tableResponse.json();
            logger.debug('[TenantContext] Table check result:', tableData);
          } else {
            logger.warn('[TenantContext] Failed to verify database tables:', await tableResponse.text());
          }
        } catch (tableError) {
          logger.warn('[TenantContext] Error checking database tables:', tableError);
          // Continue anyway as this is non-critical
        }
        
        // Initialize tenant database structures by calling the initialize-tenant endpoint
        try {
          logger.debug('[TenantContext] Initializing tenant database structures');
          const initResponse = await fetch('/api/tenant/initialize-tenant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': currentTenantId
            },
            body: JSON.stringify({ tenantId: currentTenantId })
          });
          
          if (initResponse.ok) {
            const initData = await initResponse.json();
            logger.debug('[TenantContext] Tenant initialization result:', initData);
          } else {
            logger.warn('[TenantContext] Failed to initialize tenant database:', await initResponse.text());
          }
        } catch (initError) {
          logger.warn('[TenantContext] Error initializing tenant database:', initError);
          // Continue anyway as this is non-critical
        }
        
        const info = await fetchTenantInfo(currentTenantId);
        if (info) {
          setTenantInfo(info);
        }
        setLoading(false);
        return currentTenantId;
      }
      
      // Try to get tenant from auth session
      currentTenantId = await getTenantFromToken();
      
      if (currentTenantId) {
        setTenantId(currentTenantId);
        const info = await fetchTenantInfo(currentTenantId);
        if (info) {
          setTenantInfo(info);
        }
        setLoading(false);
        return currentTenantId;
      } else {
        // No fallback tenant ID - just report that no tenant ID was found
        logger.warn('[TenantContext] No tenant ID found in any source');
        setLoading(false);
        return null;
      }
    } catch (err) {
      logger.error('[TenantContext] Error initializing tenant:', err);
      setLoading(false);
      setError(err);
      return null;
    }
  }, []);

  // Initialize tenant on component mount
  useEffect(() => {
    initializeTenant();
  }, [initializeTenant]);

  return {
    tenantId,
    setTenantId,
    loading,
    error,
    tenantInfo,
    initializeTenant
  };
};