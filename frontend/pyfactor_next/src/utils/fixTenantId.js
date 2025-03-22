/**
 * Utility script to fix tenant ID issues
 * This script can be imported and run when tenant ID issues are encountered
 */

import { logger } from './logger';
import { apiService } from '@/services/apiService';

/**
 * Fix the tenant ID issue by ensuring the tenant ID is set in all storage locations
 * @param {string} tenantId - The tenant ID to set
 * @returns {Promise<boolean>} Whether the fix was successful
 */
export const fixTenantId = async (tenantId) => {
  if (!tenantId) {
    logger.error('[FixTenantId] No tenant ID provided');
    return false;
  }
  
  logger.info(`[FixTenantId] Fixing tenant ID: ${tenantId}`);
  
  try {
    // Set the tenant ID using the comprehensive method in apiService
    const result = await apiService.setTenantId(tenantId);
    
    // Verify the tenant ID was set correctly
    const verification = await apiService.verifyTenantContext();
    
    logger.info('[FixTenantId] Verification after fixing:', verification);
    
    return verification.isValid;
  } catch (error) {
    logger.error('[FixTenantId] Error fixing tenant ID:', error);
    return false;
  }
};

/**
 * Extract tenant ID from a string (e.g., "tenant_453928c0_737b_47a5_80e3_2aad2e7b5dd9")
 * @param {string} schemaString - String containing tenant ID in uuid format
 * @returns {string|null} Extracted tenant ID or null if not found
 */
export const extractTenantIdFromString = (schemaString) => {
  if (!schemaString) return null;
  
  // Try to extract a UUID from the string
  const uuidRegex = /([0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12})/i;
  const matches = schemaString.match(uuidRegex);
  
  if (matches && matches[1]) {
    // Replace underscores with hyphens to ensure UUID format
    const cleanedId = matches[1].replace(/_/g, '-');
    logger.debug(`[FixTenantId] Extracted tenant ID ${cleanedId} from ${schemaString}`);
    return cleanedId;
  }
  
  return null;
};

/**
 * This function can be called during app startup or when 401 errors occur
 * It will check if there are tenant issues and try to fix them
 * @returns {Promise<boolean>} Whether the check passed or was fixed
 */
export const checkAndFixTenantId = async () => {
  logger.info('[FixTenantId] Checking for tenant ID issues');
  
  try {
    // Check current tenant context
    const verification = await apiService.verifyTenantContext();
    
    // If everything is valid, return early
    if (verification.isValid) {
      logger.info('[FixTenantId] Tenant context is valid:', verification);
      return true;
    }
    
    // Try to find a tenant ID from any available source
    let tenantId = verification.fromContext?.tenantId || 
                   verification.fromFallback?.tenantId || 
                   verification.fromLocalStorage || 
                   verification.fromCookie;
    
    // If we found a tenant ID, use it
    if (tenantId) {
      logger.info(`[FixTenantId] Found tenant ID ${tenantId} to fix with`);
      return await fixTenantId(tenantId);
    }
    
    // Last resort: check URL for tenant ID in schema name format
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      const extractedId = extractTenantIdFromString(url);
      
      if (extractedId) {
        logger.info(`[FixTenantId] Extracted tenant ID ${extractedId} from URL`);
        return await fixTenantId(extractedId);
      }
    }
    
    logger.error('[FixTenantId] No tenant ID found, cannot fix');
    return false;
  } catch (error) {
    logger.error('[FixTenantId] Error checking and fixing tenant ID:', error);
    return false;
  }
};

// Export a default object with all methods for easier imports
export default {
  fixTenantId,
  extractTenantIdFromString,
  checkAndFixTenantId
};