/**
 * Request utilities for secure tenant ID extraction and request handling
 */
import { logger } from './logger';

// UUID regex pattern for matching tenant IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if string is a valid UUID
 * @param {string} id - The ID to check
 * @returns {boolean} - True if the ID is a valid UUID
 */
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return UUID_PATTERN.test(id);
}

/**
 * Extract tenant ID from various sources (URL, request headers, cookies)
 * @param {Object} request - Next.js request object
 * @returns {Promise<Object>} Object containing extracted tenant information 
 */
export async function extractTenantId(request) {
  if (!request) {
    return { tenantId: null };
  }
  
  try {
    const tenantInfo = {};
    
    // Try to get tenant ID from URL path
    const url = new URL(request.url, 'http://localhost');
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Check if first part of path is a UUID (tenant ID)
    if (pathParts.length > 0 && isValidUUID(pathParts[0])) {
      tenantInfo.tenantId = pathParts[0];
      tenantInfo.source = 'url_path';
    }
    
    // Try to get tenant ID from query parameters
    const searchParams = url.searchParams;
    const queryTenantId = searchParams.get('tenantId');
    if (queryTenantId && isValidUUID(queryTenantId)) {
      tenantInfo.tenantId = queryTenantId;
      tenantInfo.source = 'query_param';
    }
    
    // Try to get tenant ID from headers
    const headerTenantId = request.headers.get('x-tenant-id');
    if (headerTenantId && isValidUUID(headerTenantId)) {
      tenantInfo.tenantId = headerTenantId;
      tenantInfo.source = 'header';
    }
    
    // Check for business ID in headers (alternative format)
    const businessId = request.headers.get('x-business-id');
    if (businessId && isValidUUID(businessId)) {
      tenantInfo.businessId = businessId;
      tenantInfo.source = 'business_header';
      
      // Use as primary tenant ID if not already set
      if (!tenantInfo.tenantId) {
        tenantInfo.tenantId = businessId;
      }
    }
    
    // Try to get tenant ID from authorization token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const tokenData = parseJwt(token);
        
        // Check for tenant ID in token claims
        const tokenTenantId = tokenData['custom:tenant_id'] || 
                           tokenData['custom:tenant_ID'] || 
                           tokenData['custom:businessid'] ||
                           tokenData['tenant_id'];
                           
        if (tokenTenantId && isValidUUID(tokenTenantId)) {
          tenantInfo.tokenTenantId = tokenTenantId;
          tenantInfo.source = 'jwt_token';
          
          // Use as primary tenant ID if not already set
          if (!tenantInfo.tenantId) {
            tenantInfo.tenantId = tokenTenantId;
          }
        }
      } catch (tokenError) {
        // Ignore token parsing errors
        logger.warn('Failed to parse JWT token:', tokenError);
      }
    }
    
    // Log the tenant info for debugging
    logger.debug(`[request-utils] Extracted tenant info: ${JSON.stringify(tenantInfo)}`);
    
    return tenantInfo;
  } catch (error) {
    logger.error('[request-utils] Error extracting tenant ID:', error);
    return { tenantId: null, error: error.message };
  }
}

/**
 * Format schema name with tenant ID for PostgreSQL
 * @param {string} tenantId - The tenant ID
 * @returns {string} - Formatted schema name
 */
export function formatSchemaName(tenantId) {
  if (!tenantId) return 'public';
  
  // Format tenant ID for use in schema name (replace UUID dashes with underscores)
  const formattedId = tenantId.toLowerCase().replace(/-/g, '_');
  return `tenant_${formattedId}`;
}

/**
 * Parse a JWT token and extract the claims
 * @param {string} token - The JWT token
 * @returns {Object} - The parsed token payload
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('[request-utils] Error parsing JWT:', error);
    return {};
  }
}

/**
 * Helper to safely extract headers from a request
 * @param {Object} request - The request object
 * @param {string} headerName - The name of the header to extract
 * @returns {string|null} - The header value or null if not found
 */
export function getRequestHeader(request, headerName) {
  try {
    if (!request || !request.headers) return null;
    return request.headers.get(headerName) || null;
  } catch (error) {
    logger.error(`[request-utils] Error getting header ${headerName}:`, error);
    return null;
  }
}

/**
 * Get secure headers for database requests
 * @param {string} tenantId - The tenant ID
 * @returns {Object} - Headers object with tenant ID
 */
export function getSecureHeaders(tenantId) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  return headers;
} 