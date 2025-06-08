'use client';


import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, updateUserAttributes  } from '@/config/amplifyUnified';
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
  const isBrowser = typeof window !== 'undefined';
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

  // Check if we're on the landing page or a public page
  const isPublicPage = useCallback(() => {
    if (!isBrowser) return false;
    
    const path = window.location.pathname;
    return path === '/' || 
           path === '' || 
           path === '/index.html' ||
           path.startsWith('/auth/') || 
           path === '/about' ||
           path === '/privacy' ||
           path === '/terms';
  }, [isBrowser]);

  // Don't fetch tenant info if we're on the landing page
  useEffect(() => {
    if (isPublicPage()) {
      setLoading(false);
    }
  }, [isPublicPage]);

  // Get tenant ID from token
  const getTenantFromToken = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/from-token');
      
      if (!response.ok) {
        // If we're on a public page, ignore auth errors
        if (isPublicPage() && (response.status === 401 || response.status === 403)) {
          logger.debug('[TenantContext] Auth error on public page (expected)');
          return null;
        }
        
        // For other non-public pages, handle the error
        const error = await response.json();
        if (error.name === 'UserUnAuthenticatedException' || 
            error.message?.includes('User needs to be authenticated')) {
          throw new Error('User needs to be authenticated');
        }
        throw new Error(`Error getting tenant ID from token: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.tenantId;
    } catch (error) {
      // If we're on a public page, ignore auth errors
      if (isPublicPage() && (
        error.name === 'UserUnAuthenticatedException' || 
        error.message?.includes('User needs to be authenticated')
      )) {
        logger.debug('[TenantContext] Auth error on public page (expected)');
        return null;
      }
      
      throw error;
    }
  }, [isPublicPage]);

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

  // Initialize tenant context
  const initializeTenant = useCallback(async () => {
    // Skip tenant initialization for public pages including landing page
    if (isPublicPage()) {
      logger.debug('[TenantContext] Skipping tenant initialization for public page');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Rest of your existing initialization code...
      
      // When handling errors, check for public pages first
      // ... existing code ...
      
    } catch (err) {
      // First check if we're on a public page
      if (isPublicPage()) {
        logger.debug('[TenantContext] Error ignored on public page:', err.message);
        setLoading(false);
        return null;
      }
      
      // Check if this is an auth error on an auth page
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isAuthPage = path.includes('/auth/signin') || 
                          path.includes('/auth/signup') || 
                          path.includes('/auth/verify') ||
                          path.includes('/auth/reset-password');
        
        if (isAuthPage && (
            err.name === 'UserUnAuthenticatedException' || 
            err.message?.includes('User needs to be authenticated')
          )) {
          logger.debug('[TenantContext] User not authenticated on auth page (expected)');
          setLoading(false);
          return null;
        }
      }
      
      logger.error('[TenantContext] Error initializing tenant context:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isPublicPage, getTenantFromToken, fetchTenantInfo]);

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