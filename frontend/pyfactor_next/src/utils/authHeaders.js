/**
 * Utility functions for handling authentication headers
 */
import { logger } from './logger';
import { getAccessToken, getIdToken } from './tokenUtils';
import { getTenantId, getSchemaName } from './tenantUtils';
import { v4 as uuidv4 } from 'uuid';
import { headers as nextHeaders } from 'next/headers';

/**
 * Check if code is running on server side
 * @returns {boolean} True if running on server
 */
const isServer = () => typeof window === 'undefined';

/**
 * Safely get tenant ID with server/client detection
 * @returns {Promise<string|null>} Tenant ID or null
 */
async function getSafeTenantId() {
  try {
    if (isServer()) {
      try {
        // Server-side: Try to get from request headers
        const headersList = await nextHeaders();
        const tenantId = headersList.get('x-tenant-id');
        if (tenantId) return tenantId;
      } catch (e) {
        logger.debug('[AuthHeaders] Error getting tenant ID from server headers:', e);
      }
      return null;
    } else {
      // Client-side: Use the tenant util function
      return getTenantId();
    }
  } catch (e) {
    logger.debug('[AuthHeaders] Error getting tenant ID:', e);
    return null;
  }
}

/**
 * Safely get schema name with server/client detection
 * @returns {Promise<string|null>} Schema name or null
 */
async function getSafeSchemaName() {
  try {
    if (isServer()) {
      try {
        // Server-side: Try to get from request headers
        const headersList = await nextHeaders();
        const schemaName = headersList.get('x-schema-name');
        if (schemaName) return schemaName;
      } catch (e) {
        logger.debug('[AuthHeaders] Error getting schema name from server headers:', e);
      }
      return null;
    } else {
      // Client-side: Use the tenant util function
      return getSchemaName();
    }
  } catch (e) {
    logger.debug('[AuthHeaders] Error getting schema name:', e);
    return null;
  }
}

/**
 * Get authentication headers for API requests
 * Includes Authorization and tenant headers
 * @returns {Promise<Object>} Headers object
 */
export async function getAuthHeaders() {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    try {
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      logger.debug('[AuthHeaders] Error getting token:', e);
    }

    // Add tenant information if available
    try {
      const tenantId = await getSafeTenantId();
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }

      const schemaName = await getSafeSchemaName();
      if (schemaName) {
        headers['X-Schema-Name'] = schemaName;
      }
    } catch (e) {
      logger.debug('[AuthHeaders] Error getting tenant info:', e);
    }

    // Add request ID for tracing
    headers['X-Request-ID'] = uuidv4();

    return headers;
  } catch (error) {
    logger.error('[AuthHeaders] Error building auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
}

/**
 * Get comprehensive headers for backend API requests
 * Includes additional debugging information
 * @returns {Promise<Object>} Headers object
 */
export async function getBackendHeaders() {
  const headers = await getAuthHeaders();

  try {
    // Add additional user info if available
    const idToken = await getIdToken();
    if (idToken) {
      // Extract user ID from token if available
      try {
        const tokenParts = idToken.split('.');
        if (tokenParts.length === 3) {
          let payload;
          
          if (isServer()) {
            // Server-side: Use Buffer for base64 decoding
            payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          } else {
            // Client-side: Use atob for base64 decoding
            payload = JSON.parse(atob(tokenParts[1]));
          }
          
          if (payload.sub) {
            headers['X-User-ID'] = payload.sub;
          }
          if (payload.email) {
            headers['X-User-Email'] = payload.email;
          }
        }
      } catch (e) {
        logger.debug('[AuthHeaders] Error parsing token:', e);
      }
    }

    // Add client info
    headers['X-Client-Version'] = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
    headers['X-Client-Platform'] = isServer() ? 'web-server' : 'web';

    return headers;
  } catch (error) {
    logger.error('[AuthHeaders] Error building backend headers:', error);
    return headers;
  }
} 