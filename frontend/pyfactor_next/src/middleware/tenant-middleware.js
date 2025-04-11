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
 * 3. Cookies
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
    
    // 3. Check for tenantId query parameter
    if (!tenantId) {
      const queryTenantId = searchParams.get('tenantId');
      if (queryTenantId && UUID_PATTERN.test(queryTenantId)) {
        tenantId = queryTenantId;
        source = 'query_param';
      }
    }
    
    // 4. Check request headers
    if (!tenantId) {
      const headerTenantId = request.headers.get('x-tenant-id');
      if (headerTenantId && UUID_PATTERN.test(headerTenantId)) {
        tenantId = headerTenantId;
        source = 'header';
      }
    }
    
    // 5. Check cookies with better parsing
    if (!tenantId) {
      const cookies = request.cookies;
      
      // Try primary tenant cookie
      const tenantIdCookie = cookies.get('tenantId')?.value;
      if (tenantIdCookie && UUID_PATTERN.test(tenantIdCookie)) {
        tenantId = tenantIdCookie;
        source = 'cookie_tenantId';
      }
      
      // Try legacy/alternative cookie if primary not found
      if (!tenantId) {
        const businessIdCookie = cookies.get('businessid')?.value;
        if (businessIdCookie && UUID_PATTERN.test(businessIdCookie)) {
          tenantId = businessIdCookie;
          source = 'cookie_businessid';
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
  
  const freePlan = searchParams.get('freePlan') === 'true';
  const newAccount = searchParams.get('newAccount') === 'true';
  
  // If dashboard with freePlan=true, don't require tenant in URL
  if ((pathWithoutQuery === '/dashboard' || pathWithoutQuery.startsWith('/dashboard/')) && 
      (freePlan || newAccount)) {
    console.debug(`[Middleware] Allowing dashboard access without tenant ID (freePlan/newAccount)`);
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
 * Set tenant cookies for the response with improved security settings
 * 
 * @param {NextResponse} response - The Next.js response object
 * @param {string} tenantId - The tenant ID to set in cookies
 * @returns {NextResponse} - The updated response
 */
function setTenantCookies(response, tenantId) {
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    console.warn('[Middleware] Attempted to set invalid tenant ID in cookies:', tenantId);
    return response;
  }
  
  // Set cookies with enhanced secure settings
  const cookieOptions = {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: true // Prevent JavaScript access for security
  };
  
  // Set primary tenant cookie
  response.cookies.set('tenantId', tenantId, cookieOptions);
  
  // Set legacy cookie for backward compatibility
  response.cookies.set('businessid', tenantId, cookieOptions);
  
  return response;
}

/**
 * Main tenant middleware function with improved error handling
 * 
 * This middleware:
 * 1. Handles tenant ID extraction from various sources
 * 2. Redirects routes that need tenant ID in URL
 * 3. Sets tenant ID in cookies for consistency
 * 4. Validates tenant ID format
 * 5. Adds tenant ID headers to responses
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The response
 */
export function tenantMiddleware(request) {
  try {
    const { pathname } = new URL(request.url);
    
    // Skip middleware for public routes and API routes
    if (isPublicPath(pathname)) {
      console.debug(`[Middleware] Skipping middleware for public path: ${pathname}`);
      return NextResponse.next();
    }
    
    // Extract tenant ID from request with detailed info
    const tenantInfo = extractTenantId(request);
    console.debug(`[Middleware] Extracted tenant ID for path ${pathname}:`, tenantInfo);
    
    // Extract tenant ID value
    const tenantId = tenantInfo.tenantId;
    
    // For routes that require tenant ID in URL, redirect if needed
    if (requiresTenantInUrl(pathname) && !pathIncludesTenantId(pathname)) {
      console.debug(`[Middleware] Path ${pathname} requires tenant ID in URL`);
      
      if (tenantId) {
        // Redirect to tenant-specific URL
        const url = new URL(request.url);
        
        // Create tenant-specific path
        const newPath = `/${tenantId}${pathname}`;
        url.pathname = newPath;
        
        console.info(`[Middleware] Redirecting to tenant-specific URL: ${url.pathname}`);
        
        // Create redirect response and set cookies
        const response = NextResponse.redirect(url);
        return setTenantCookies(response, tenantId);
      } else {
        // No tenant ID available - redirect to signin with better error info
        console.warn(`[Middleware] No tenant ID available for path ${pathname}, redirecting to sign-in`);
        
        const url = new URL('/auth/signin', request.url);
        url.searchParams.set('error', 'no_tenant_id');
        url.searchParams.set('redirect', pathname);
        url.searchParams.set('errorSource', 'middleware');
        
        return NextResponse.redirect(url);
      }
    }
    
    // For all other routes, proceed with the request
    // Add tenant ID headers for API routes
    const response = NextResponse.next();
    
    if (tenantId) {
      console.debug(`[Middleware] Adding tenant ID header for path ${pathname}: ${tenantId}`);
      response.headers.set('x-tenant-id', tenantId);
      return setTenantCookies(response, tenantId);
    }
    
    return response;
  } catch (error) {
    console.error('[Middleware] Unhandled error in tenant middleware:', error);
    
    // Create a simple response for errors to prevent breaking application
    const response = NextResponse.next();
    response.headers.set('x-middleware-error', 'true');
    response.headers.set('x-error-message', error.message.substring(0, 100)); // Truncate for security
    
    return response;
  }
} 