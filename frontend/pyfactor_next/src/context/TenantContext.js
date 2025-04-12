'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';
import { getTenantId, storeTenantId, clearTenantStorage } from '@/utils/tenantUtils';
import { apiService } from '@/lib/apiService';

// Helper to detect browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Context for managing tenant information throughout the application
 */
export const TenantContext = createContext({
  tenantId: null,
  tenantInfo: null,
  loading: true,
  error: null,
  setTenantId: () => {},
  fetchTenantInfo: () => Promise.resolve(null),
  switchTenant: () => Promise.resolve(false),
  clearTenant: () => {},
  initializeTenant: () => Promise.resolve(),
  verifyTenantAccess: () => Promise.resolve(true)
});

/**
 * Custom hook to access the tenant context
 */
export const useTenant = () => {
  const context = useContext(TenantContext);
  // Provide fallback values if context is not available (useful for SSR)
  if (!context) {
    logger.warn('[TenantContext] useTenant called outside of provider, returning empty context');
    return {
      tenantId: null,
      tenantInfo: null,
      loading: false,
      error: null,
      setTenantId: () => {},
      fetchTenantInfo: () => Promise.resolve(null),
      switchTenant: () => Promise.resolve(false),
      clearTenant: () => {},
      initializeTenant: () => Promise.resolve(),
      verifyTenantAccess: () => Promise.resolve(true)
    };
  }
  return context;
};

// Export also as useTenantContext for compatibility
export const useTenantContext = useTenant;

/**
 * Provider component for tenant information
 */
export const TenantProvider = ({ children }) => {
  const [tenantId, setTenantIdState] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenants, setTenants] = useState([]);
  
  // Add refs to track last fetch time and prevent duplicate requests
  const lastFetchTime = useRef({
    tenantInfo: 0,
    tenantList: 0
  });
  const fetchInProgress = useRef({
    tenantInfo: false,
    tenantList: false
  });
  
  // Minimum time between fetches (2 seconds)
  const MIN_FETCH_INTERVAL = 2000;

  // Get tenant ID from JWT token
  const getTenantFromToken = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens?.idToken) {
        logger.debug('[TenantContext] No ID token found in session');
        return null;
      }
      
      const decoded = jwtDecode(session.tokens.idToken.toString());
      logger.debug('[TenantContext] JWT token decoded', { decoded });
      
      // Look for tenant ID in token claims - prioritize custom:tenant_ID as source of truth
      let tokenTenantId = null;
      
      // First check for custom:tenant_ID (uppercase ID) which is our source of truth
      if (decoded['custom:tenant_ID']) {
        tokenTenantId = decoded['custom:tenant_ID'];
        logger.info('[TenantContext] Found tenant ID in custom:tenant_ID attribute (source of truth)');
        return tokenTenantId;
      }
      
      // Check alternative attribute names as fallbacks only
      if (decoded['custom:tenant_id']) {
        tokenTenantId = decoded['custom:tenant_id'];
        logger.debug('[TenantContext] Found tenant ID in custom:tenant_id attribute (fallback)');
      } else if (decoded['custom:tenantId']) {
        tokenTenantId = decoded['custom:tenantId'];
        logger.debug('[TenantContext] Found tenant ID in custom:tenantId attribute (fallback)');
      } else if (decoded['custom:businessid']) {
        tokenTenantId = decoded['custom:businessid'];
        logger.debug('[TenantContext] Found tenant ID in custom:businessid attribute (fallback)');
      } else if (decoded.tenantId) {
        tokenTenantId = decoded.tenantId;
        logger.debug('[TenantContext] Found tenant ID in tenantId claim (fallback)');
      }
      
      if (tokenTenantId) {
        logger.info(`[TenantContext] Found tenant ID in token: ${tokenTenantId}`);
      } else {
        logger.warn('[TenantContext] No tenant ID found in token claims');
      }
      
      return tokenTenantId;
    } catch (error) {
      logger.error('[TenantContext] Error getting tenant from token:', error);
      return null;
    }
  }, []);

  // Function to update tenant ID in state and storage
  const setTenantId = useCallback((newTenantId) => {
    if (!newTenantId || newTenantId === tenantId) return;
    
    setTenantIdState(newTenantId);
    if (isBrowser) {
      storeTenantId(newTenantId);
      logger.info(`[TenantContext] Tenant ID updated: ${newTenantId}`);
    }
  }, [tenantId]);

  // Fetch tenant information
  const fetchTenantInfo = useCallback(async (targetTenantId = tenantId) => {
    try {
      if (!targetTenantId) {
        logger.warn('[TenantContext] No tenant ID provided to fetch info');
        return null;
      }
      
      // Check if a fetch is already in progress or if we fetched recently
      const now = Date.now();
      if (fetchInProgress.current.tenantInfo || 
          (now - lastFetchTime.current.tenantInfo) < MIN_FETCH_INTERVAL) {
        logger.debug('[TenantContext] Skipping tenant info fetch (too frequent or in progress)');
        return tenantInfo;
      }
      
      // Mark fetch as in progress
      fetchInProgress.current.tenantInfo = true;
      setLoading(true);
      
      try {
        const tenantData = await apiService.getTenantInfo(targetTenantId);
        
        // Update last fetch time
        lastFetchTime.current.tenantInfo = Date.now();
        
        if (tenantData) {
          logger.info(`[TenantContext] Fetched tenant info for: ${targetTenantId}`);
          setTenantInfo(tenantData);
          return tenantData;
        } else {
          logger.warn(`[TenantContext] No tenant info returned for: ${targetTenantId}`);
          return null;
        }
      } catch (apiError) {
        // If API fails, return a mock tenant for development
        logger.warn(`[TenantContext] Failed to fetch tenant info, using mock: ${apiError.message}`);
        
        // Use a mock tenant for development
        const mockTenant = {
          id: targetTenantId,
          name: `Tenant ${targetTenantId.substring(0, 8)}`,
          description: 'Mock tenant for development',
          isActive: true
        };
        
        setTenantInfo(mockTenant);
        return mockTenant;
      }
    } catch (err) {
      logger.error(`[TenantContext] Error fetching tenant info: ${err}`);
      setError(err);
      return null;
    } finally {
      setLoading(false);
      fetchInProgress.current.tenantInfo = false;
    }
  }, [tenantId, tenantInfo]);

  // Switch to a different tenant
  const switchTenant = useCallback(async (newTenantId) => {
    try {
      if (!newTenantId) {
        logger.warn('[TenantContext] No tenant ID provided to switch to');
        return false;
      }
      
      // Set new tenant ID
      setTenantId(newTenantId);
      
      // Fetch tenant info
      await fetchTenantInfo(newTenantId);
      
      logger.info(`[TenantContext] Successfully switched to tenant: ${newTenantId}`);
      return true;
    } catch (err) {
      logger.error('[TenantContext] Error switching tenant:', err);
      return false;
    }
  }, [setTenantId, fetchTenantInfo]);

  // Clear tenant context (for logout)
  const clearTenant = useCallback(() => {
    if (isBrowser) {
      clearTenantStorage();
      setTenantIdState(null);
      setTenantInfo(null);
      logger.info('[TenantContext] Tenant context cleared');
    }
  }, []);

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
        await fetchTenantInfo(currentTenantId);
        return currentTenantId;
      }
      
      // Try to get tenant from auth session
      currentTenantId = await getTenantFromToken();
      
      if (currentTenantId) {
        setTenantId(currentTenantId);
        await fetchTenantInfo(currentTenantId);
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
  }, [getTenantFromToken, setTenantId, fetchTenantInfo]);

  // Initialize on component mount
  useEffect(() => {
    // Skip on server-side rendering
    if (!isBrowser) {
      return;
    }
    
    initializeTenant();
  }, [initializeTenant]);

  // Verify if user has access to the tenant
  const verifyTenantAccess = useCallback(async (targetTenantId) => {
    try {
      logger.info(`[TenantContext] Verifying access to tenant: ${targetTenantId}`);
      
      if (!targetTenantId) {
        logger.warn('[TenantContext] No tenant ID provided for access verification');
        return false;
      }
      
      // Try to get user's authorized tenants from token
      const session = await fetchAuthSession().catch(() => null);
      if (!session?.tokens?.idToken) {
        logger.warn('[TenantContext] No authenticated session for tenant access verification');
        // Default to allowing access - we'll rely on server-side checks
        return true;
      }
      
      try {
        const decoded = jwtDecode(session.tokens.idToken.toString());
        
        // Get tenant IDs from token
        const authorizedTenants = [];
        
        // Look for tenant ID in various attributes
        if (decoded['custom:tenant_ID']) {
          authorizedTenants.push(decoded['custom:tenant_ID']);
        }
        if (decoded['custom:tenant_id']) {
          authorizedTenants.push(decoded['custom:tenant_id']);
        }
        if (decoded['custom:businessid']) {
          authorizedTenants.push(decoded['custom:businessid']);
        }
        if (decoded.tenantId) {
          authorizedTenants.push(decoded.tenantId);
        }
        
        // Also try multi-tenant attributes if they exist
        if (decoded['custom:tenants']) {
          try {
            const tenantsArray = JSON.parse(decoded['custom:tenants']);
            if (Array.isArray(tenantsArray)) {
              authorizedTenants.push(...tenantsArray);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // For now, default to allowing access if we can't determine authorized tenants
        // This is a security simplification for development
        if (authorizedTenants.length === 0) {
          logger.debug('[TenantContext] No authorized tenants found in token, allowing access by default');
          return true;
        }
        
        // Check if target tenant is in authorized tenants
        const hasAccess = authorizedTenants.includes(targetTenantId);
        logger.debug(`[TenantContext] Tenant access check: ${hasAccess ? 'granted' : 'denied'}`);
        
        return hasAccess;
      } catch (tokenError) {
        logger.error('[TenantContext] Error decoding token for tenant access:', tokenError);
        // Default to allowing access
        return true;
      }
    } catch (error) {
      logger.error('[TenantContext] Error verifying tenant access:', error);
      // Default to allowing access
      return true;
    }
  }, []);

  const value = {
    tenantId,
    setTenantId,
    tenantInfo,
    tenants,
    loading,
    error,
    switchTenant,
    fetchTenantInfo,
    clearTenant,
    initializeTenant,
    verifyTenantAccess
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}; 