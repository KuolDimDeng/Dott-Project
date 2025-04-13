/**
 * Utility functions for handling tenant information
 * Updated to use Cognito attributes and headers instead of cookies
 */

import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/serverLogger';

/**
 * Extract and validate tenant ID from various sources in the request
 * Prioritizes Cognito attributes and secure headers over other methods
 * @param {Request} request - The request object
 * @returns {string|null} - The validated tenant ID or null if not found
 */
export function extractTenantId(request) {
  if (!request) {
    logger.error('[tenant] SECURITY ERROR: extractTenantId called without a request object');
    return null;
  }
  
  try {
    // Define valid sources in priority order
    let tenantId = null;
    
    // 1. First priority: Cognito specific headers
    tenantId = request.headers.get('x-cognito-tenant-id');
    if (tenantId) {
      logger.debug(`[tenant] Tenant ID extracted from Cognito header: ${tenantId}`);
      return validateTenantId(tenantId);
    }
    
    // 2. Second priority: Authorization headers with JWT token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwtDecode(token);
        
        // Check custom claims for tenant ID
        if (decoded['custom:tenant_id'] || decoded['custom:tenant_ID'] || decoded['custom:businessid']) {
          tenantId = decoded['custom:tenant_id'] || decoded['custom:tenant_ID'] || decoded['custom:businessid'];
          logger.debug(`[tenant] Tenant ID extracted from JWT token: ${tenantId}`);
          return validateTenantId(tenantId);
        }
      } catch (tokenError) {
        logger.error('[tenant] Error decoding JWT token:', tokenError);
      }
    }
    
    // 3. Third priority: Standard tenant ID headers
    tenantId = request.headers.get('x-tenant-id') || request.headers.get('x-business-id');
    if (tenantId) {
      logger.debug(`[tenant] Tenant ID extracted from request headers: ${tenantId}`);
      return validateTenantId(tenantId);
    }
    
    // 4. Fourth priority: URL path extraction (if in format /<tenant-id>/...)
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Check if the first path part looks like a UUID
      if (pathParts.length > 0 && 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathParts[0])) {
        tenantId = pathParts[0];
        logger.debug(`[tenant] Tenant ID extracted from URL path: ${tenantId}`);
        return validateTenantId(tenantId);
      }
    } catch (urlPathError) {
      logger.error('[tenant] Error extracting tenant ID from URL path:', urlPathError);
    }
    
    // 5. Fifth priority: URL query parameters (least secure)
    try {
      const url = new URL(request.url);
      tenantId = url.searchParams.get('tenantId') || url.searchParams.get('businessId') || url.searchParams.get('tid');
      if (tenantId) {
        logger.debug(`[tenant] Tenant ID extracted from URL parameters: ${tenantId}`);
        return validateTenantId(tenantId);
      }
    } catch (urlError) {
      logger.error('[tenant] Error parsing URL:', urlError);
    }
    
    logger.warn('[tenant] No tenant ID found in request');
    return null;
  } catch (error) {
    logger.error('[tenant] Error extracting tenant ID:', error);
    return null;
  }
}

/**
 * Validates a tenant ID to ensure it matches UUID format
 * @param {string} tenantId - The tenant ID to validate
 * @returns {string|null} - The validated tenant ID or null if invalid
 */
function validateTenantId(tenantId) {
  // Check for UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    logger.error(`[tenant] SECURITY WARNING: Invalid tenant ID format detected: ${tenantId}`);
    return null;
  }
  
  return tenantId;
}

/**
 * Convert a tenant ID to a schema name
 * @param {string} tenantId - The tenant ID
 * @returns {string} - The corresponding schema name
 */
export function getTenantSchema(tenantId) {
  if (!tenantId) return 'public';
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

export default {
  extractTenantId,
  getTenantSchema,
}; 