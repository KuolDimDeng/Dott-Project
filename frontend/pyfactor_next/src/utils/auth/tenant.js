/**
 * Utility functions for handling tenant information
 */

import { jwtDecode } from 'jwt-decode';

/**
 * Extract tenant ID from various sources in the request
 * @param {Request} request - The request object
 * @returns {Promise<object>} - Object containing tenant IDs from different sources
 */
export async function extractTenantId(request) {
  const result = {
    tenantId: null,
    businessId: null,
    tokenTenantId: null,
    headers: {},
    cookies: {}
  };
  
  try {
    // 1. Check headers
    result.headers.tenantId = request.headers.get('x-tenant-id');
    result.headers.businessId = request.headers.get('x-business-id');
    
    // Use the header values if present
    if (result.headers.tenantId) {
      result.tenantId = result.headers.tenantId;
    }
    
    if (result.headers.businessId) {
      result.businessId = result.headers.businessId;
    }
    
    // 2. Check cookies
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          result.cookies.tenantId = value;
          result.tenantId = result.tenantId || value;
        } else if (name === 'businessid') {
          result.cookies.businessId = value;
          result.businessId = result.businessId || value;
        }
      });
    }
    
    // 3. Check search params
    const url = new URL(request.url);
    const paramTenantId = url.searchParams.get('tenantId');
    const paramBusinessId = url.searchParams.get('businessId');
    
    if (paramTenantId) {
      result.tenantId = result.tenantId || paramTenantId;
    }
    
    if (paramBusinessId) {
      result.businessId = result.businessId || paramBusinessId;
    }
    
    // 4. Check authorization header for JWT token tenant ID
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwtDecode(token);
        
        // Check custom claim for business ID or tenant ID
        if (decoded['custom:businessid']) {
          result.tokenTenantId = decoded['custom:businessid'];
        }
      } catch (tokenError) {
        console.error('Error decoding JWT token:', tokenError);
      }
    }
    
    // Also check authToken cookie directly
    if (cookieHeader) {
      const authTokenCookie = cookieHeader.split(';')
        .find(cookie => cookie.trim().startsWith('authToken='));
      
      if (authTokenCookie) {
        const token = authTokenCookie.split('=')[1];
        try {
          const decoded = jwtDecode(token);
          
          // Check custom claim for business ID or tenant ID
          if (decoded['custom:businessid']) {
            result.tokenTenantId = decoded['custom:businessid'];
          }
        } catch (tokenError) {
          console.error('Error decoding auth token cookie:', tokenError);
        }
      }
    }
    
  } catch (error) {
    console.error('Error extracting tenant ID:', error);
  }
  
  return result;
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
  getTenantSchema
}; 