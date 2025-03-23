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
 * Get tenant ID from server request headers
 * @returns {string|null} The tenant ID from headers or null
 */
async function getServerTenantId() {
  try {
    const headersList = await nextHeaders();
    return headersList.get('x-tenant-id');
  } catch (e) {
    logger.debug('[AuthHeaders] Error getting tenant ID from server headers:', e);
    return null;
  }
}

/**
 * Get schema name from server request headers
 * @returns {string|null} The schema name from headers or null
 */
async function getServerSchemaName() {
  try {
    const headersList = await nextHeaders();
    return headersList.get('x-schema-name');
  } catch (e) {
    logger.debug('[AuthHeaders] Error getting schema name from server headers:', e);
    return null;
  }
}

/**
 * Get authentication headers for API requests
 * Includes Authorization and tenant headers
 * @returns {Promise<Object>} Headers object
 */
export async function getAuthHeaders() {
  return isServer() ? getServerAuthHeaders() : getClientAuthHeaders();
}

/**
 * Get authentication headers on the client side
 * @returns {Promise<Object>} Headers object
 */
async function getClientAuthHeaders() {
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
      const tenantId = getTenantId();
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }

      const schemaName = getSchemaName();
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
 * Get authentication headers on the server side
 * @returns {Promise<Object>} Headers object
 */
async function getServerAuthHeaders() {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add auth token from server sources
    try {
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      logger.debug('[AuthHeaders] Error getting token from server:', e);
    }

    // Add tenant information from server headers
    try {
      const tenantId = await getServerTenantId();
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }

      const schemaName = await getServerSchemaName();
      if (schemaName) {
        headers['X-Schema-Name'] = schemaName;
      }
    } catch (e) {
      logger.debug('[AuthHeaders] Error getting tenant info from server:', e);
    }

    // Add request ID for tracing
    headers['X-Request-ID'] = uuidv4();

    return headers;
  } catch (error) {
    logger.error('[AuthHeaders] Error building server auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
}

/**
 * Get comprehensive headers for backend API requests
 * Includes additional debugging information
 * @returns {Promise<Object>} Headers object
 */
export async function getBackendHeaders() {
  return isServer() ? getServerBackendHeaders() : getClientBackendHeaders();
}

/**
 * Get comprehensive headers for backend API requests on the client side
 * @returns {Promise<Object>} Headers object
 */
async function getClientBackendHeaders() {
  const headers = await getClientAuthHeaders();

  try {
    // Add additional user info if available
    const idToken = await getIdToken();
    if (idToken) {
      // Extract user ID from token if available
      try {
        const tokenParts = idToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
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
    headers['X-Client-Platform'] = 'web';

    return headers;
  } catch (error) {
    logger.error('[AuthHeaders] Error building backend headers:', error);
    return headers;
  }
}

/**
 * Get comprehensive headers for backend API requests on the server side
 * @returns {Promise<Object>} Headers object
 */
async function getServerBackendHeaders() {
  const headers = await getServerAuthHeaders();

  try {
    // Add additional user info if available
    const idToken = await getIdToken();
    if (idToken) {
      // Extract user ID from token if available
      try {
        const tokenParts = idToken.split('.');
        if (tokenParts.length === 3) {
          // Use Buffer for server-side base64 decoding
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          if (payload.sub) {
            headers['X-User-ID'] = payload.sub;
          }
          if (payload.email) {
            headers['X-User-Email'] = payload.email;
          }
        }
      } catch (e) {
        logger.debug('[AuthHeaders] Error parsing token on server:', e);
      }
    }

    // Add client info
    headers['X-Client-Version'] = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
    headers['X-Client-Platform'] = 'web-server';

    return headers;
  } catch (error) {
    logger.error('[AuthHeaders] Error building server backend headers:', error);
    return headers;
  }
} 