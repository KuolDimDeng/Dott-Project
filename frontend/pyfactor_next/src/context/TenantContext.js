'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, updateUserAttributes } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';
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

  // Function to update tenant ID in state and Cognito
  const setTenantId = useCallback(async (newTenantId) => {
    if (!newTenantId || newTenantId === tenantId) return;
    
    setTenantIdState(newTenantId);
    if (isBrowser) {
      try {
        // Update Cognito attributes
        await updateTenantIdInCognito(newTenantId);
        logger.info(`[TenantContext] Tenant ID updated in Cognito: ${newTenantId}`);
      } catch (error) {
        logger.error('[TenantContext] Error updating tenant ID in Cognito:', error);
      }
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
      
      // Set new tenant ID in state and Cognito
      await setTenantId(newTenantId);
      
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
  const clearTenant = useCallback(async () => {
    if (isBrowser) {
      try {
        // Clear tenant ID in Cognito
        await updateTenantIdInCognito('');
        setTenantIdState(null);
        setTenantInfo(null);
        logger.info('[TenantContext] Tenant context cleared');
      } catch (error) {
        logger.error('[TenantContext] Error clearing tenant ID in Cognito:', error);
      }
    }
  }, []);

  // Initialize tenant context function that can be called from middleware or components
  const initializeTenant = useCallback(async () => {
    try {
      if (!isBrowser) {
        return;
      }
      
      setLoading(true);
      logger.info('[TenantContext] Initializing tenant context');
      
      // Get tenant ID from Cognito
      let currentTenantId = await getTenantIdFromCognito();
      
      if (currentTenantId) {
        setTenantIdState(currentTenantId);
        setTenantInfo(currentTenantId);
        logger.debug('[TenantContext] Initialized with tenant ID from Cognito:', currentTenantId);
        
        // In the background, verify with JWT token
        try {
          const tokenTenantId = await getTenantFromToken();
          
          // If token has a different tenant ID, update state and Cognito
          if (tokenTenantId && tokenTenantId !== currentTenantId) {
            logger.info('[TenantContext] Token tenant ID differs from Cognito, updating:', tokenTenantId);
            setTenantIdState(tokenTenantId);
            await updateTenantIdInCognito(tokenTenantId);
            
            // Fetch info for the new tenant ID
            await fetchTenantInfo(tokenTenantId);
          } else {
            // Fetch info for the current tenant ID
            await fetchTenantInfo(currentTenantId);
          }
        } catch (tokenError) {
          logger.warn('[TenantContext] Error verifying tenant ID from token:', tokenError);
          // Still fetch info for the current tenant ID
          await fetchTenantInfo(currentTenantId);
        }
      } else {
        // No tenant ID in Cognito, try to get from token
        const tokenTenantId = await getTenantFromToken();
        
        if (tokenTenantId) {
          logger.info('[TenantContext] Using tenant ID from token:', tokenTenantId);
          setTenantIdState(tokenTenantId);
          await updateTenantIdInCognito(tokenTenantId);
          await fetchTenantInfo(tokenTenantId);
        } else {
          // Try to get from URL path
          try {
            const pathParts = window.location.pathname.split('/');
            for (const part of pathParts) {
              if (part && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
                logger.info('[TenantContext] Using tenant ID from URL path:', part);
                setTenantIdState(part);
                await updateTenantIdInCognito(part);
                await fetchTenantInfo(part);
                break;
              }
            }
          } catch (urlError) {
            logger.warn('[TenantContext] Error extracting tenant ID from URL:', urlError);
          }
        }
      }
    } catch (err) {
      logger.error('[TenantContext] Error initializing tenant context:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [getTenantFromToken, fetchTenantInfo]);

  // Verify user has access to tenant
  const verifyTenantAccess = useCallback(async (tenantId) => {
    try {
      if (!tenantId) {
        logger.warn('[TenantContext] No tenant ID provided to verify access');
        return false;
      }
      
      const hasAccess = await apiService.verifyTenantAccess(tenantId);
      logger.info(`[TenantContext] User access to tenant ${tenantId}: ${hasAccess}`);
      return hasAccess;
    } catch (err) {
      logger.error('[TenantContext] Error verifying tenant access:', err);
      return false;
    }
  }, []);

  // Initialize tenant context on component mount
  useEffect(() => {
    if (isBrowser) {
      initializeTenant();
    }
  }, [initializeTenant]);

  // Context value
  const value = {
    tenantId,
    tenantInfo,
    loading,
    error,
    setTenantId,
    fetchTenantInfo,
    switchTenant,
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