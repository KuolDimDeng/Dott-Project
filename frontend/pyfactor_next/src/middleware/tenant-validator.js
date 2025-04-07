import { NextResponse } from 'next/server';

/**
 * Server-side middleware for validating tenant access
 * This validates that a user has access to a specific tenant
 * before allowing access to tenant-specific routes
 */

// Routes that require tenant validation
const TENANT_ROUTES = [
  '/tenant',
  '/dashboard',
  '/inventory',
  '/products',
  '/orders',
  '/invoices',
  '/customers',
  '/settings'
];

// Skip validation for public routes
const PUBLIC_TENANT_ROUTES = [
  '/tenant/select',
  '/tenant/create'
];

/**
 * Checks if a route requires tenant validation
 * @param {string} pathname - Current path
 * @returns {boolean} Whether tenant validation is required
 */
export function requiresTenantValidation(pathname) {
  // Skip validation for public tenant routes
  if (PUBLIC_TENANT_ROUTES.some(route => pathname.startsWith(route))) {
    return false;
  }
  
  // Check if it's a tenant route requiring validation
  return TENANT_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Extracts tenant ID from various sources
 * @param {Request} request - Next.js request object
 * @returns {string|null} The tenant ID or null if not found
 */
export function extractTenantId(request) {
  // Try to extract from URL path first (highest priority)
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check URL path for tenant ID
  const tenantPathMatch = pathname.match(/\/tenant\/([^\/]+)/);
  if (tenantPathMatch && tenantPathMatch[1]) {
    return tenantPathMatch[1];
  }
  
  // Extract from cookies (second priority)
  const tenantIdCookie = request.cookies.get('tenantId')?.value;
  const businessIdCookie = request.cookies.get('businessid')?.value;
  
  if (tenantIdCookie) return tenantIdCookie;
  if (businessIdCookie) return businessIdCookie;
  
  // Extract from query params (lowest priority)
  const tenantIdParam = url.searchParams.get('tenantId');
  const businessIdParam = url.searchParams.get('businessid');
  
  if (tenantIdParam) return tenantIdParam;
  if (businessIdParam) return businessIdParam;
  
  // No tenant ID found
  return null;
}

/**
 * Validates tenant access for the current user
 * @param {Request} request - Next.js request object
 * @returns {Promise<{isValid: boolean, tenantId: string|null, error: string|null}>}
 */
export async function validateTenantAccess(request) {
  const tenantId = extractTenantId(request);
  
  // If no tenant ID found, access is invalid
  if (!tenantId) {
    return { 
      isValid: false, 
      tenantId: null, 
      error: 'No tenant ID found' 
    };
  }
  
  try {
    // Get authentication token from cookies
    const idToken = request.cookies.get('idToken')?.value;
    const accessToken = request.cookies.get('accessToken')?.value;
    
    // Skip validation if no authentication token is found
    // This will be handled by the auth middleware
    if (!idToken && !accessToken) {
      console.warn('[TenantValidator] No auth token found, skipping tenant validation');
      return { isValid: true, tenantId, error: null };
    }
    
    // Call tenant validation API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || accessToken}`
      },
      body: JSON.stringify({ tenantId }),
    });
    
    // If the API request succeeds, check the response
    if (response.ok) {
      const data = await response.json();
      
      return {
        isValid: data.hasAccess,
        tenantId,
        error: data.hasAccess ? null : data.message || 'Tenant access denied'
      };
    } else {
      // If the API request fails, log the error
      const error = await response.text();
      console.error('[TenantValidator] Tenant validation API error:', error);
      
      return {
        isValid: false,
        tenantId,
        error: `Validation failed: ${response.status}`
      };
    }
  } catch (error) {
    // Handle any exceptions during validation
    console.error('[TenantValidator] Error validating tenant access:', error);
    
    return {
      isValid: false,
      tenantId,
      error: error.message || 'Unexpected error during tenant validation'
    };
  }
}

/**
 * Main tenant validation middleware handler
 * This function should be called from the middleware.js file
 * @param {Request} request - Next.js request object
 * @returns {Promise<NextResponse|null>} NextResponse or null to continue
 */
export async function tenantValidationMiddleware(request) {
  const pathname = new URL(request.url).pathname;
  
  // Skip validation for non-tenant routes
  if (!requiresTenantValidation(pathname)) {
    return null;
  }
  
  // Validate tenant access
  const { isValid, tenantId, error } = await validateTenantAccess(request);
  
  // If tenant access is valid, continue to the requested page
  if (isValid) {
    // Create a new response
    const response = NextResponse.next();
    
    // Ensure tenant ID is set in cookies for client-side access
    if (tenantId) {
      response.cookies.set('tenantId', tenantId, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
    }
    
    return response;
  }
  
  // If tenant access is invalid, redirect to tenant selection
  console.warn(`[TenantValidator] Invalid tenant access: ${error}`);
  
  // Create redirect response
  const redirectUrl = new URL('/tenant/select', request.url);
  
  // Add error parameter if there's an error message
  if (error) {
    redirectUrl.searchParams.set('error', encodeURIComponent(error));
  }
  
  return NextResponse.redirect(redirectUrl);
} 