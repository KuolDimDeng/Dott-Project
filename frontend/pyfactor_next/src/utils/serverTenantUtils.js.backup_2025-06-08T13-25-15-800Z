/**
 * Server-side tenant utilities
 * For use in API routes and server components
 */
import { serverLogger as logger } from './logger';

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
 * Gets the tenant ID from request headers
 * @param {Object} headers - Request headers
 * @returns {string|null} The tenant ID or null if not found
 */
export function getTenantIdFromHeaders(headers) {
  if (!headers) return null;
  
  // Check the headers (set by middleware)
  if (headers.get('x-tenant-id')) {
    return headers.get('x-tenant-id');
  }
  
  return null;
}

/**
 * Extract tenant ID from various sources (URL, request headers, cookies)
 * @param {Object} request - Next.js request object
 * @returns {string|null} The extracted tenant ID or null if not found
 */
export function extractTenantId(request) {
  if (!request) return null;
  
  // Try to get tenant ID from URL path
  const url = new URL(request.url, 'http://localhost');
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Check if first part of path is a UUID (tenant ID)
  if (pathParts.length > 0 && isValidUUID(pathParts[0])) {
    return pathParts[0];
  }
  
  // Try to get tenant ID from query parameters
  const searchParams = url.searchParams;
  const queryTenantId = searchParams.get('tenantId');
  if (queryTenantId && isValidUUID(queryTenantId)) {
    return queryTenantId;
  }
  
  // Try to get tenant ID from headers
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId && isValidUUID(headerTenantId)) {
    return headerTenantId;
  }
  
  // Try to get tenant ID from cookies
  const cookies = request.headers.get('cookie') || '';
  const cookieMatch = cookies.match(/tenantId=([^;]+)/);
  if (cookieMatch && cookieMatch[1] && isValidUUID(cookieMatch[1])) {
    return cookieMatch[1];
  }
  
  return null;
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
 * Get SQL-safe schema name for tenant
 * @param {string} tenantId - The tenant ID
 * @returns {string} - Schema name
 */
export function getSchemaName(tenantId) {
  return tenantId ? formatSchemaName(tenantId) : 'public';
}

/**
 * Extract tenant ID from a URL path
 * @param {string} path - URL path
 * @returns {string|null} - Extracted tenant ID or null
 */
export function extractTenantIdFromPath(path) {
  if (!path) return null;
  
  const pathParts = path.split('/').filter(Boolean);
  
  // Check if first part of path is a UUID (tenant ID)
  if (pathParts.length > 0 && isValidUUID(pathParts[0])) {
    return pathParts[0];
  }
  
  return null;
}

/**
 * Get the current tenant ID from various sources
 * Fallback implementation for server components
 * @param {Object} request - Next.js request object (optional)
 * @returns {string|null} - Tenant ID or null
 */
export async function getTenantId(request = null) {
  try {
    // If we have a request object, try to extract from it
    if (request) {
      const tenantId = extractTenantId(request);
      if (tenantId) {
        logger.debug(`[ServerTenantUtils] Got tenant ID from request: ${tenantId}`);
        return tenantId;
      }
    }
    
    // Use auth context to get tenant ID
    try {
      const { getAuth } = await import('@/lib/auth');
      const auth = await getAuth();
      
      if (auth?.user?.attributes) {
        // Try different attribute names for backward compatibility
        const tenantId = auth.user.attributes['custom:tenant_ID'] || 
                         auth.user.attributes['custom:tenant_id'] || 
                         auth.user.attributes['custom:businessid'];
        
        if (tenantId) {
          logger.debug(`[ServerTenantUtils] Got tenant ID from auth context: ${tenantId}`);
          return tenantId;
        }
      }
    } catch (authError) {
      logger.warn(`[ServerTenantUtils] Error getting tenant ID from auth: ${authError.message}`);
    }
    
    // If we reach here, we couldn't find a tenant ID
    logger.warn('[ServerTenantUtils] Could not find tenant ID from any source');
    
    // Return a default tenant ID or null
    // For testing or development you could return a default ID
    if (process.env.NODE_ENV !== 'production') {
      const defaultTestTenantId = process.env.DEFAULT_TENANT_ID;
      if (defaultTestTenantId) {
        logger.warn(`[ServerTenantUtils] Using default test tenant ID: ${defaultTestTenantId}`);
        return defaultTestTenantId;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`[ServerTenantUtils] Error getting tenant ID: ${error.message}`);
    return null;
  }
}

/**
 * Get user attributes from Cognito (server-side implementation)
 * This is used in the attribute/route.js API
 * @returns {Promise<Object>} User attributes object
 */
export async function getUserAttributesFromCognito() {
  try {
    // For server components, we'll need to use AWS SDK directly
    const { getAuth } = await import('@/lib/auth');
    const auth = await getAuth();
    
    if (!auth || !auth.user) {
      logger.warn('[ServerTenantUtils] No authenticated user found for getUserAttributesFromCognito');
      return {};
    }
    
    // Return the user's attributes from the auth object
    return auth.user.attributes || {};
  } catch (error) {
    logger.error('[ServerTenantUtils] Error getting user attributes:', error);
    return {};
  }
}

/**
 * Update tenant ID in Cognito (server-side implementation)
 * This is used in the attribute/route.js API
 * @param {string} tenantId - The tenant ID to set
 * @returns {Promise<boolean>} Success status
 */
export async function updateTenantIdInCognito(tenantId) {
  try {
    // For server components, we'll need to use AWS SDK directly
    const { getAuth } = await import('@/lib/auth');
    const auth = await getAuth();
    
    if (!auth || !auth.user) {
      logger.warn('[ServerTenantUtils] No authenticated user found for updateTenantIdInCognito');
      return false;
    }
    
    // Ensure we have access to the AWS SDK client
    const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    // Create a Cognito client
    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    // Create the command to update user attributes
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: auth.user.username,
      UserAttributes: [
        {
          Name: 'custom:tenant_ID',
          Value: tenantId
        },
        {
          Name: 'custom:tenant_id',
          Value: tenantId
        },
        {
          Name: 'custom:businessid',
          Value: tenantId
        }
      ]
    });
    
    // Execute the command
    await client.send(command);
    logger.info(`[ServerTenantUtils] Updated tenant ID for user ${auth.user.username} to ${tenantId}`);
    return true;
  } catch (error) {
    logger.error('[ServerTenantUtils] Error updating tenant ID in Cognito:', error);
    return false;
  }
} 