/**
 * Tenant Middleware
 * This middleware extracts tenant ID from requests and applies Row Level Security (RLS).
 * It prioritizes Cognito user attributes over cookies or URL parameters.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract tenant ID from the request
 * @param {Request} request - Next.js request object
 * @returns {Object} Object containing the extracted tenant ID and its source
 */
export function extractTenantId(request) {
  // Priority 1: Extract Cognito user ID which serves as the tenant ID
  const cognitoUserId = extractCognitoUserId(request);
  if (cognitoUserId) {
    console.log('[Tenant Middleware] Using Cognito user ID as tenant:', cognitoUserId);
    return {
      tenantId: cognitoUserId,
      source: 'cognito',
      isValid: true
    };
  }
  
  // Priority 2: Try x-tenant-id header (more secure than URL or cookies)
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId) {
    console.log('[Tenant Middleware] Using tenant ID from header:', headerTenantId);
    return {
      tenantId: headerTenantId,
      source: 'header',
      isValid: true
    };
  }
  
  // Priority 3: Try URL parameters (useful for direct access scenarios)
  const url = new URL(request.url);
  const urlTenantId = url.searchParams.get('tenant_id');
  if (urlTenantId) {
    console.log('[Tenant Middleware] Using tenant ID from URL parameter:', urlTenantId);
    return {
      tenantId: urlTenantId,
      source: 'url',
      isValid: true
    };
  }
  
  // Priority 4: Legacy - try cookies (DEPRECATED)
  // This is only kept for backward compatibility
  const cookieHeader = request.headers.get('cookie');
  let cookieTenantId = null;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name === 'tenantId') {
        cookieTenantId = value;
      }
    });
    
    if (cookieTenantId) {
      console.log('[Tenant Middleware] Using tenant ID from cookie (DEPRECATED):', cookieTenantId);
      return {
        tenantId: cookieTenantId,
        source: 'cookie',
        isValid: true
      };
    }
  }
  
  // If no tenant ID found, generate a new one
  const generatedTenantId = generateTenantId();
  console.log('[Tenant Middleware] Generated tenant ID:', generatedTenantId);
  return {
    tenantId: generatedTenantId,
    source: 'generated',
    isValid: false
  };
}

/**
 * Generate a new tenant ID
 * @returns {string} New UUID-based tenant ID
 */
function generateTenantId() {
  const newId = uuidv4();
  console.log('[Tenant Middleware] Generated new tenant ID:', newId);
  return newId;
}

/**
 * Middleware function to handle tenant context for API requests
 * @param {Request} request - Next.js request object
 * @returns {NextResponse} Modified response with tenant headers
 */
export function applyDevTenantMiddleware(request) {
  // Extract tenant ID from request
  const { tenantId, source, isValid } = extractTenantId(request);
  
  console.log(`[Tenant Middleware] Using tenant ID: ${tenantId} (source: ${source})`);
  
  // Add tenant ID to request headers for downstream processing
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenantId);
  
  // Also set as a cookie for client-side access if not already present
  const cookieOptions = {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax'
  };
  
  // Create cookie objects for Next.js middleware
  const cookies = response.cookies;
  cookies.set('tenantId', tenantId, cookieOptions);
  
  return response;
}

/**
 * Apply RLS filtering to a collection based on tenant ID
 * @param {Array} collection - Collection to filter
 * @param {string} tenantId - Tenant ID to filter by
 * @returns {Array} Filtered collection
 */
export function applyRLS(collection, tenantId) {
  if (!Array.isArray(collection)) return [];
  if (!tenantId) return [];
  
  return collection.filter(item => {
    // Check for tenant_id field first
    if (item.tenant_id !== undefined) {
      return item.tenant_id === tenantId;
    }
    
    // Check for tenantId field as a fallback
    if (item.tenantId !== undefined) {
      return item.tenantId === tenantId;
    }
    
    // If no tenant field, exclude the item for security reasons
    return false;
  });
}

/**
 * Extract the Cognito user ID from request cookies
 * @param {Request} request - Next.js request object
 * @returns {string|null} Cognito user ID if found, null otherwise
 */
export function extractCognitoUserId(request) {
  // First check Cognito-specific headers (preferred method)
  const cognitoUserHeader = request.headers.get('x-cognito-user-id') || 
                           request.headers.get('x-user-id');
  if (cognitoUserHeader) {
    console.log('[Tenant Middleware] Found Cognito user ID in header:', cognitoUserHeader);
    return cognitoUserHeader;
  }
  
  // Legacy method (DEPRECATED) - Check cookies
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cognitoUserMatch = cookieHeader.match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=([^;]+)/);
  if (cognitoUserMatch && cognitoUserMatch[1]) {
    console.log('[Tenant Middleware] Found Cognito user ID in cookie (DEPRECATED):', cognitoUserMatch[1]);
    return cognitoUserMatch[1];
  }
  
  return null;
}

/**
 * Verify if a tenant ID exists
 * @param {string} tenantId - Tenant ID to verify
 * @returns {Object|null} Tenant object if valid
 */
export function verifyTenantId(tenantId) {
  if (!tenantId) return null;
  
  // All tenant IDs are considered valid now
  return { id: tenantId, name: 'Tenant ' + tenantId.substring(0, 8) };
}

/**
 * Get the default tenant ID (uses environment variable or generates a new one)
 * @returns {string} Default tenant ID
 */
export function getDefaultTenantId() {
  // Generate a UUID tenant ID - this is just for complete fallback
  // In production or normal operation, the tenant ID should come from Cognito
  try {
    return uuidv4(); // Generate UUID dynamically
  } catch (error) {
    console.error('[Tenant Middleware] Error generating default tenant ID:', error);
    // Very last resort fallback - but this should never be reached in normal operation
    return null;
  }
}

/**
 * Get all available development tenants
 * @returns {Array} Empty array as we don't use predefined tenants anymore
 */
export function getAllDevTenants() {
  return [];
} 