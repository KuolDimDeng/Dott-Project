import { logger } from './logger';
import useAuthStore from '@/store/authStore';
import { getTenantId, forceValidateTenantId, validateTenantIdFormat } from './tenantUtils';

/**
 * TenantContext - Single source of truth for tenant information
 * This module centralizes all tenant-related functionality and provides
 * a consistent interface for accessing tenant information across the application.
 */

/**
 * Get the current tenant context (ID and schema name)
 * @returns {Object} Object containing tenantId and schemaName
 */
export const getTenantContext = () => {
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
  const { tenantId, schemaName } = getTenantContext();
  
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
 * Store tenant information in auth store and localStorage
 * @param {string} tenantId The tenant ID to store
 */
export const setTenantContext = (tenantId) => {
  if (!tenantId) {
    logger.warn('[TenantContext] Attempted to set empty tenant ID');
    return;
  }
  
  logger.debug(`[TenantContext] Setting tenant ID: ${tenantId}`);
  
  // Store in auth store (single source of truth)
  const authState = useAuthStore.getState();
  if (authState.user) {
    useAuthStore.setState({
      user: {
        ...authState.user,
        businessId: tenantId
      }
    });
  } else {
    // Create a minimal user object if none exists
    useAuthStore.setState({
      user: { businessId: tenantId }
    });
  }
  
  // Also store in localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem('tenantId', tenantId);
    
    // Set in cookie for server-side access
    document.cookie = `tenantId=${tenantId}; path=/; max-age=31536000`; // 1 year
  }
};

/**
 * Clear tenant context
 */
export const clearTenantContext = () => {
  logger.debug('[TenantContext] Clearing tenant context');
  
  // Clear from auth store
  const authState = useAuthStore.getState();
  if (authState.user) {
    useAuthStore.setState({
      user: {
        ...authState.user,
        businessId: null
      }
    });
  }
  
  // Clear from localStorage and cookies
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tenantId');
    document.cookie = 'tenantId=; path=/; max-age=0';
  }
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