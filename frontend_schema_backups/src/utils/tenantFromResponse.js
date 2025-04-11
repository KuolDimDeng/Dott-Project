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