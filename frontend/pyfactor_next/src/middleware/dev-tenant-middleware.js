/**
 * Tenant Middleware
 * This middleware extracts tenant ID from requests and applies Row Level Security (RLS).
 * It uses the Cognito user ID as the tenant ID when available.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract tenant ID from the request
 * @param {Request} request - Next.js request object
 * @returns {Object} Object containing the extracted tenant ID and its source
 */
export function extractTenantId(request) {
  // Try URL parameters first
  const url = new URL(request.url);
  const urlTenantId = url.searchParams.get('tenant_id');
  
  // Try headers next
  const headerTenantId = request.headers.get('x-tenant-id');
  
  // Try cookies last
  const cookieHeader = request.headers.get('cookie');
  let cookieTenantId = null;
  let cognitoUserId = null;
  
  if (cookieHeader) {
    // First priority: Extract the Cognito user ID which serves as the tenant ID
    const cognitoUserMatch = cookieHeader.match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=([^;]+)/);
    if (cognitoUserMatch && cognitoUserMatch[1]) {
      cognitoUserId = cognitoUserMatch[1];
      console.log('[Tenant Middleware] Found Cognito user ID as tenant:', cognitoUserId);
    }
    
    // Extract tenant ID from cookies as fallback
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name === 'tenantId') {
        cookieTenantId = value;
      }
    });
  }
  
  // User-specific checks for Kuol's account
  const isKuolAccount = cookieHeader && cookieHeader.includes('kuoldimdeng@outlook.com');
  if (isKuolAccount && cognitoUserId) {
    console.log('[Tenant Middleware] Identified Kuol by email, using Cognito ID as tenant ID');
    return {
      tenantId: cognitoUserId,
      source: 'cognito_kuol',
      isValid: true
    };
  }
  
  // Determine tenant ID with priority: Cognito ID > URL > Header > Cookie
  const tenantId = cognitoUserId || urlTenantId || headerTenantId || cookieTenantId || generateTenantId();
  
  // Determine source for logging
  let source = 'generated';
  if (cognitoUserId) source = 'cognito';
  else if (urlTenantId) source = 'url';
  else if (headerTenantId) source = 'header';
  else if (cookieTenantId) source = 'cookie';
  
  return {
    tenantId,
    source,
    isValid: true // All tenant IDs are valid since we generate one if not found
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
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cognitoUserMatch = cookieHeader.match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=([^;]+)/);
  return cognitoUserMatch ? cognitoUserMatch[1] : null;
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
  // Check environment variable first
  if (process.env.DEFAULT_TENANT_ID) {
    return process.env.DEFAULT_TENANT_ID;
  }
  
  // Generate a dynamic tenant ID instead of hardcoded value
  return uuidv4(); // Generate a new UUID for tenant ID
}

/**
 * Get all available development tenants
 * @returns {Array} Empty array as we don't use predefined tenants anymore
 */
export function getAllDevTenants() {
  return [];
} 