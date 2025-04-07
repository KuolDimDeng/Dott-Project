'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';
import { getTenantId, getTenantHeaders, storeTenantId, clearTenantStorage } from '@/utils/tenantUtils';
import { apiService } from '@/lib/apiService';

// Helper to detect browser environment
const isBrowser = typeof window !== 'undefined';

// Default fallback tenant ID for development
const FALLBACK_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '70cc394b-6b7c-5e61-8213-9801cbc78708';

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
  initializeTenant: () => Promise.resolve()
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
      initializeTenant: () => Promise.resolve()
    };
  }
  return context;
};

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
      
      // Look for tenant ID in token claims
      let tokenTenantId = null;
      if (decoded['custom:tenant_id']) {
        tokenTenantId = decoded['custom:tenant_id'];
      } else if (decoded['custom:tenantId']) {
        tokenTenantId = decoded['custom:tenantId'];
      } else if (decoded['custom:businessid']) {
        tokenTenantId = decoded['custom:businessid'];
      } else if (decoded.tenantId) {
        tokenTenantId = decoded.tenantId;
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
        // If in development and dev tenant ID is available, use it
        if (process.env.NODE_ENV !== 'production' && FALLBACK_TENANT_ID) {
          logger.info(`[TenantContext] Using fallback tenant ID: ${FALLBACK_TENANT_ID}`);
          setTenantId(FALLBACK_TENANT_ID);
          await fetchTenantInfo(FALLBACK_TENANT_ID);
          return FALLBACK_TENANT_ID;
        } else {
          logger.warn('[TenantContext] No tenant ID found in any source');
          setLoading(false);
          return null;
        }
      }
    } catch (err) {
      logger.error('[TenantContext] Error initializing tenant context:', err);
      setError(err);
      setLoading(false);
      return null;
    }
  }, [fetchTenantInfo, getTenantFromToken, setTenantId]);

  // Initialize on component mount
  useEffect(() => {
    // Skip on server-side rendering
    if (!isBrowser) {
      return;
    }
    
    initializeTenant();
  }, [initializeTenant]);

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
    initializeTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}; 