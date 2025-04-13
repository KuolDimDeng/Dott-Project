import { NextResponse } from 'next/server';
import { isValidUUID } from '@/utils/tenantUtils';

// UUID regex pattern for matching tenant IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Routes that require tenant ID in URL
const TENANT_REQUIRED_ROUTES = [
  '/dashboard',
  '/inventory',
  '/products',
  '/orders',
  '/reports',
  '/settings'
];

// Routes that don't need tenant verification
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/tenant/verify',
  '/api/tenant/initialize-tenant',
  '/api/tenant/ensure-db-record',
  '/api/session',
  '/api/health',
  '/auth',
  '/onboarding',
  '/signin',
  '/signup',
  '/reset',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/_next',
  '/static',
  '/favicon.ico',
  '/robots.txt'
];

/**
 * Extract tenant ID from various sources with improved error handling
 * Order of precedence:
 * 1. URL path in /<tenant-id>/... format
 * 2. Request headers
 * 3. Query parameters
 * 
 * @param {Request} request - The incoming request
 * @returns {Object} - The extracted tenant ID info with source and validation status
 */
export function extractTenantId(request) {
  try {
    const { pathname, searchParams } = new URL(request.url);
    let tenantId = null;
    let source = null;
    
    // 1. Check URL path for /<tenant-id>/... format
    const pathMatch = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
    if (pathMatch && pathMatch[1]) {
      tenantId = pathMatch[1];
      source = 'url_path';
    }

    // 2. Check URL path for /tenant/<tenant-id>/... format (legacy pattern)
    if (!tenantId) {
      const legacyPathMatch = pathname.match(/^\/tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
      if (legacyPathMatch && legacyPathMatch[1]) {
        tenantId = legacyPathMatch[1];
        source = 'legacy_url_path';
      }
    }
    
    // 3. Check for tenantId query parameter (including tid param)
    if (!tenantId) {
      const queryTenantId = searchParams.get('tenantId') || searchParams.get('tid');
      if (queryTenantId && UUID_PATTERN.test(queryTenantId)) {
        tenantId = queryTenantId;
        source = 'query_param';
      }
    }
    
    // 4. Check request headers (including Cognito-specific headers)
    if (!tenantId) {
      // Try standard tenant header
      const headerTenantId = request.headers.get('x-tenant-id');
      if (headerTenantId && UUID_PATTERN.test(headerTenantId)) {
        tenantId = headerTenantId;
        source = 'header';
      }
      
      // Try Cognito-specific headers that might be set by our auth handlers
      if (!tenantId) {
        const cognitoTenantId = request.headers.get('x-cognito-tenant-id');
        if (cognitoTenantId && UUID_PATTERN.test(cognitoTenantId)) {
          tenantId = cognitoTenantId;
          source = 'cognito_header';
        }
      }
    }
    
    // Return comprehensive information for better debugging
    return {
      tenantId,
      source,
      found: !!tenantId,
      isValid: tenantId ? UUID_PATTERN.test(tenantId) : false
    };
  } catch (error) {
    console.error('[Middleware] Error extracting tenant ID:', error);
    return {
      tenantId: null,
      source: null,
      found: false,
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Check if a path is public and doesn't require tenant ID
 * 
 * @param {string} path - The URL path to check
 * @returns {boolean} - True if the path is public
 */
function isPublicPath(path) {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
}

/**
 * Check if a path requires tenant ID
 * 
 * @param {string} path - The URL path to check
 * @returns {boolean} - True if tenant ID is required in the URL
 */
function requiresTenantInUrl(path) {
  // Handle path with query params
  const pathWithoutQuery = path.split('?')[0];
  const queryString = path.includes('?') ? path.split('?')[1] : '';
  const searchParams = new URLSearchParams(queryString);
  
  // Check for bypass parameters
  const freePlan = searchParams.get('freePlan') === 'true';
  const newAccount = searchParams.get('newAccount') === 'true';
  const fromSignIn = searchParams.get('fromSignIn') === 'true';
  const fromAuth = searchParams.get('fromAuth') === 'true';
  const reset = searchParams.get('reset') === 'true';
  
  // If any bypass flag is present, don't require tenant in URL
  if ((pathWithoutQuery === '/dashboard' || pathWithoutQuery.startsWith('/dashboard/')) && 
      (freePlan || newAccount || fromSignIn || fromAuth || reset)) {
    console.debug(`[Middleware] Allowing dashboard access without tenant ID (special case)`);
    return false;
  }
  
  return TENANT_REQUIRED_ROUTES.some(route => {
    // Match both /dashboard and /dashboard/any-subpath
    return pathWithoutQuery === route || pathWithoutQuery.startsWith(`${route}/`);
  });
}

/**
 * Check if a path already includes a tenant ID
 * 
 * @param {string} path - The URL path to check
 * @returns {boolean} - True if the path already includes a tenant ID
 */
function pathIncludesTenantId(path) {
  // Check for UUID pattern
  return path.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i) !== null;
}

/**
 * Add tenant ID header to the response
 * 
 * @param {NextResponse} response - The Next.js response object
 * @param {string} tenantId - The tenant ID to set in header
 * @returns {NextResponse} - The updated response
 */
function addTenantHeader(response, tenantId) {
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    console.warn('[Middleware] Attempted to set invalid tenant ID in header:', tenantId);
    return response;
  }
  
  // Set headers for server-side access
  response.headers.set('x-tenant-id', tenantId);
  
  return response;
}

/**
 * Main tenant middleware function with improved error handling
 * 
 * This middleware:
 * 1. Handles tenant ID extraction from various sources
 * 2. Redirects routes that need tenant ID in URL
 * 3. Validates tenant ID format
 * 4. Adds tenant ID headers to responses
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The response
 */
export function tenantMiddleware(request) {
  try {
    const { pathname, searchParams } = new URL(request.url);
    
    // Skip middleware for public routes and API routes
    if (isPublicPath(pathname)) {
      console.debug(`[Middleware] Skipping middleware for public path: ${pathname}`);
      return NextResponse.next();
    }

    // If the URL includes any bypass parameters, check if we still have a tenant ID
    // that should be used for redirection
    const fromAuth = searchParams.get('fromAuth') === 'true';
    const fromSignIn = searchParams.get('fromSignIn') === 'true';
    const reset = searchParams.get('reset') === 'true';
    
    // Extract tenant ID from request with detailed info
    const tenantInfo = extractTenantId(request);
    const tenantId = tenantInfo.tenantId;
    
    // Continue with additional middleware logic, focusing on URL rewriting
    // And tenant ID header injection, rather than cookie usage
    
    // If the path requires the tenant ID in the URL and it's not already there
    if (requiresTenantInUrl(pathname) && !pathIncludesTenantId(pathname) && tenantId) {
      // Redirect to include the tenant in the URL path
      const url = new URL(`/${tenantId}${pathname}`, request.url);
      
      // Preserve query params
      for (const [key, value] of searchParams.entries()) {
        url.searchParams.set(key, value);
      }
      
      console.debug(`[Middleware] Redirecting to include tenant ID in URL: ${url.pathname}`);
      const response = NextResponse.redirect(url);
      
      // Add tenant ID to response headers
      return addTenantHeader(response, tenantId);
    }
    
    // For all other paths, enhance the response with tenant header if available
    const response = NextResponse.next();
    
    if (tenantId) {
      // Add tenant ID header for server components
      return addTenantHeader(response, tenantId);
    }
    
    return response;
  } catch (error) {
    console.error('[Middleware] Tenant middleware error:', error);
    
    // Return unmodified response if there's an error to prevent breaking the app
    return NextResponse.next();
  }
} 