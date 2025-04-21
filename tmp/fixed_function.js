/**
 * Stores the tenant ID in Cognito user attributes
 * @param {string} tenantId The tenant ID to store
 * @returns {Promise<boolean>} Success status
 */
export async function storeTenantId(tenantId) {
  if (!tenantId) {
    logger.warn('[tenantUtils] Attempted to store empty tenant ID');
    return false;
  }
  
  if (typeof window === 'undefined') {
    return false; // Cannot access Cognito on server
  }

  try {
    // Capture the original source for logging
    const source = new Error().stack?.includes('TenantInitializer') 
      ? 'TenantInitializer' 
      : 'other';
    
    logger.debug(`[tenantUtils] Storing tenant ID in Cognito: ${tenantId}`, {
      source
    });
    
    // Store in AppCache for redundancy
    setCacheValue('tenantId', tenantId);
    
    // Update Cognito with tenant ID
    try {
      // Use resilient implementation that handles retries and timeouts
      await resilientUpdateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:businessid': tenantId,
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);
      return true;
    } catch (e) {
      logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
      return false;
    }
  } catch (e) {
    logger.error('[tenantUtils] Error storing tenant ID:', e);
    return false;
  }
} 