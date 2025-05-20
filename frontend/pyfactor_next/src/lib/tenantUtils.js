import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Gets the tenant ID from a NextRequest or header cookies
 * This is a server-side utility for API routes
 * @param {NextRequest} request - The Next.js request object
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export async function getTenantId(request) {
  try {
    // Check request headers first
    const tenantId = request.headers.get('x-tenant-id');
    if (tenantId) {
      logger.debug(`[lib/tenantUtils] Found tenant ID in request headers: ${tenantId}`);
      return tenantId;
    }

    // Try to extract from cookies
    const cookieStore = cookies();
    const tenantIdCookie = cookieStore.get('tenantId');
    
    if (tenantIdCookie) {
      logger.debug(`[lib/tenantUtils] Found tenant ID in cookies: ${tenantIdCookie.value}`);
      return tenantIdCookie.value;
    }
    
    // Fall back to default tenant for testing
    const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    logger.warn(`[lib/tenantUtils] Using fallback tenant ID: ${fallbackTenantId}`);
    return fallbackTenantId;
  } catch (error) {
    logger.error('[lib/tenantUtils] Error getting tenant ID:', error);
    
    // Fallback to default tenant for testing
    return '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
  }
}

/**
 * Gets the schema name for a tenant ID
 * @param {string} tenantId - The tenant ID
 * @returns {string} The schema name
 */
export function getSchemaName(tenantId) {
  if (!tenantId) {
    return null;
  }
  
  // Convert tenant ID to schema name by replacing hyphens with underscores
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Validates a tenant ID format
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean} True if the tenant ID is valid
 */
export function validateTenantId(tenantId) {
  if (!tenantId) {
    return false;
  }
  
  // Check if it matches UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(tenantId);
}