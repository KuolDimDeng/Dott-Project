import { logger } from './logger';

/**
 * Gets the current tenant ID from cookies or localStorage
 * @returns {string|null} The tenant ID or null if not found
 */
export const getTenantId = () => {
  // Client-side only
  if (typeof window === 'undefined') {
    logger.debug('[TenantUtils] Running server-side, no tenant ID available');
    return null;
  }
  
  // Try to get from cookie first
  const cookies = document.cookie.split(';');
  logger.debug(`[TenantUtils] Checking cookies: ${cookies.length} cookies found`);
  const tenantCookie = cookies.find(cookie => cookie.trim().startsWith('tenantId='));
  if (tenantCookie) {
    const tenantId = tenantCookie.split('=')[1].trim();
    logger.debug(`[TenantUtils] Found tenant ID in cookie: ${tenantId}`);
    return tenantId;
  }
  
  // Try to get from user attributes in localStorage
  try {
    const userDataStr = localStorage.getItem('userData');
    logger.debug(`[TenantUtils] Checking userData in localStorage: ${userDataStr ? 'found' : 'not found'}`);
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      logger.debug(`[TenantUtils] Parsed userData keys: ${Object.keys(userData || {}).join(', ')}`);
      if (userData && userData['custom:businessid']) {
        const tenantId = userData['custom:businessid'];
        logger.debug(`[TenantUtils] Found tenant ID in user attributes: ${tenantId}`);
        return tenantId;
      }
    }
  } catch (error) {
    logger.error('[TenantUtils] Error parsing user data from localStorage:', error);
  }
  
  // Fallback to direct localStorage value
  const tenantId = localStorage.getItem('tenantId');
  logger.debug(`[TenantUtils] Checking tenantId in localStorage: ${tenantId ? tenantId : 'not found'}`);
  if (tenantId) {
    logger.debug(`[TenantUtils] Found tenant ID in localStorage: ${tenantId}`);
    return tenantId;
  }
  
  // Check if we have a business ID in the URL
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const businessId = urlParams.get('businessId');
    logger.debug(`[TenantUtils] Checking URL for businessId: ${businessId ? businessId : 'not found'}`);
    if (businessId) {
      logger.debug(`[TenantUtils] Found business ID in URL: ${businessId}`);
      // Store it for future use
      storeTenantInfo(businessId);
      return businessId;
    }
  } catch (error) {
    logger.error('[TenantUtils] Error checking URL for business ID:', error);
  }
  
  logger.warn('[TenantUtils] No tenant ID found from any source. This may cause API requests to fail.');
  return null;
};

/**
 * Gets the schema name for the current tenant
 * @returns {string|null} The schema name or null if tenant ID not found
 */
export const getSchemaName = () => {
  const tenantId = getTenantId();
  if (!tenantId) {
    logger.debug('[TenantUtils] No tenant ID found, cannot generate schema name');
    return null;
  }
  
  // Convert tenant ID to schema name format (replace hyphens with underscores)
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  logger.debug(`[TenantUtils] Generated schema name: ${schemaName} from tenant ID: ${tenantId}`);
  return schemaName;
};

/**
 * Stores tenant information in both cookie and localStorage for redundancy
 * @param {string} tenantId The tenant ID to store
 */
export const storeTenantInfo = (tenantId) => {
  if (!tenantId) {
    logger.warn('[TenantUtils] Attempted to store empty tenant ID');
    return;
  }
  
  if (typeof window === 'undefined') {
    logger.debug('[TenantUtils] Running server-side, cannot store tenant info');
    return;
  }
  
  logger.debug(`[TenantUtils] Storing tenant ID: ${tenantId}`);
  
  // Store in cookie (accessible server-side)
  document.cookie = `tenantId=${tenantId}; path=/; max-age=31536000`; // 1 year
  
  // Store in localStorage (client-side only)
  localStorage.setItem('tenantId', tenantId);
  
  // Also try to update user data if it exists
  try {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData) {
        userData['custom:businessid'] = tenantId;
        localStorage.setItem('userData', JSON.stringify(userData));
        logger.debug('[TenantUtils] Updated tenant ID in user data');
      }
    }
  } catch (error) {
    logger.error('[TenantUtils] Error updating user data with tenant ID:', error);
  }
  
  logger.debug('[TenantUtils] Tenant info stored successfully');
};

/**
 * Gets tenant information from the server response
 * @param {Object} response The server response object
 * @returns {string|null} The tenant ID or null if not found
 */
export const getTenantFromResponse = (response) => {
  if (!response) {
    logger.warn('[TenantUtils] No response object provided to getTenantFromResponse');
    return null;
  }
  
  if (!response.headers) {
    logger.warn('[TenantUtils] Response has no headers');
    return null;
  }
  
  logger.debug('[TenantUtils] Checking response headers for tenant information');
  
  // Check for tenant ID in response headers
  let tenantId;
  
  // Handle different header access methods (Axios vs Fetch)
  if (typeof response.headers.get === 'function') {
    // Fetch API style
    tenantId = response.headers.get('x-tenant-id');
    logger.debug(`[TenantUtils] Fetch API headers - tenant ID: ${tenantId || 'not found'}`);
  } else {
    // Axios style
    tenantId = response.headers['x-tenant-id'];
    logger.debug(`[TenantUtils] Axios headers - tenant ID: ${tenantId || 'not found'}`);
  }
  
  // Also check for business ID in response body
  try {
    if (response.data && response.data.businessId) {
      tenantId = response.data.businessId;
      logger.debug(`[TenantUtils] Found business ID in response body: ${tenantId}`);
    }
  } catch (error) {
    logger.error('[TenantUtils] Error checking response body for business ID:', error);
  }
  
  if (tenantId) {
    logger.debug(`[TenantUtils] Found tenant ID in response: ${tenantId}`);
    // Store the tenant ID for future use
    storeTenantInfo(tenantId);
    return tenantId;
  }
  
  logger.debug('[TenantUtils] No tenant ID found in response');
  return null;
};