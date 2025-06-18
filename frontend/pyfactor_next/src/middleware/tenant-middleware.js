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

    // 2. Query parameter check moved here
    
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
  const url = new URL(request.url);
  const { pathname } = url;
  
  // Skip tenant middleware for root/landing page and explicitly public paths
  if (pathname === '/' || pathname === '' || pathname === '/index.html' || 
      pathname.startsWith('/auth/') || pathname.startsWith('/static/') ||
      pathname.startsWith('/_next/') || pathname.startsWith('/api/public/') ||
      pathname === '/privacy' || pathname === '/terms' || pathname === '/about') {
    // Allow these paths without tenant ID or authentication
    console.debug(`[TenantMiddleware] Skipping for public path: ${pathname}`);
    return NextResponse.next();
  }

  // Extract tenant ID from various sources
  const tenantInfo = extractTenantId(request);
  
  // Check if path requires tenant ID in URL
  if (requiresTenantInUrl(pathname)) {
    console.debug(`[TenantMiddleware] Path ${pathname} requires tenant ID in URL`);
    
    // Check if path already has tenant ID
    if (!pathIncludesTenantId(pathname)) {
      // If path needs tenant ID but doesn't have it
      if (tenantInfo.found && tenantInfo.isValid) {
        // We have valid tenant ID, redirect to tenant URL
        const redirectPath = `/${tenantInfo.tenantId}${pathname}`;
        console.debug(`[TenantMiddleware] Redirecting to tenant path: ${redirectPath}`);
        
        // Include query parameters in redirect
        if (url.search) {
          return NextResponse.redirect(new URL(`${redirectPath}${url.search}`, request.url));
        }
        
        return NextResponse.redirect(new URL(redirectPath, request.url));
      } else if (pathname.startsWith('/dashboard')) {
        // Special handling for dashboard without tenant ID
        // This might happen during initial login or tenant selection
        console.debug(`[TenantMiddleware] Dashboard access without tenant ID`);
        
        // Special case for dashboard without tenant - check query params
        const direct = url.searchParams.get('direct') === 'true';
        const fromAuth = url.searchParams.get('fromAuth') === 'true';
        const fromSignIn = url.searchParams.get('fromSignIn') === 'true';
        
        if (direct || fromAuth || fromSignIn) {
          // Allow direct dashboard access during auth/login flows
          console.debug(`[TenantMiddleware] Allowing dashboard access (auth flow)`);
          const response = NextResponse.next();
          response.headers.set('x-tenant-status', 'auth-flow');
          return response;
        }
        
        // Handle temporary tenant IDs in non-standard format
        const tempTenantId = url.searchParams.get('temp_tenant');
        if (tempTenantId && !isValidUUID(tempTenantId)) {
          console.warn(`[TenantMiddleware] Temporary tenant ID detected with invalid format: ${tempTenantId}`);
          // Let it continue to dashboard where it will be converted to proper UUID
          const response = NextResponse.next();
          response.headers.set('x-tenant-status', 'temp-tenant');
          return response;
        }
        
        // If we get here, redirect to auth with error
        console.debug(`[TenantMiddleware] No valid tenant ID for dashboard, redirecting to auth`);
        return NextResponse.redirect(new URL('/auth/signin?error=missing_tenant', request.url));
      }
    } else {
      // The path already has a tenant ID
      // Extract it to validate
      const pathTenantId = pathname.split('/')[1];
      
      // Validate the tenant ID format
      if (!UUID_PATTERN.test(pathTenantId)) {
        console.warn(`[TenantMiddleware] Invalid tenant ID format in URL: ${pathTenantId}`);
        
        // For invalid IDs in dashboard URL, fallback to standard dashboard
        if (pathname.includes('/dashboard')) {
          return NextResponse.redirect(new URL('/dashboard?error=invalid_tenant', request.url));
        }
      }
    }
  }
  
  // Forward the tenant ID in headers if found
  if (tenantInfo.found) {
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenantInfo.tenantId);
    return response;
  }
  
  // Allow the request to continue by default
  return NextResponse.next();
} 