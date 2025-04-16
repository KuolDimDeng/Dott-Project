/**
 * Tenant Isolation Middleware
 * 
 * This middleware enforces strict tenant isolation for multi-tenant app security.
 * It prevents users from accessing data belonging to other tenants.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * Checks if a route requires tenant isolation
 * @param {string} pathname - The current route path
 * @returns {boolean} Whether the route requires tenant isolation
 */
function isTenantIsolatedRoute(pathname) {
  // Check for tenant-specific routes that include tenant ID in path
  const tenantRegex = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;
  return tenantRegex.test(pathname);
}

/**
 * Extracts tenant ID from a request path
 * @param {string} pathname - The request pathname
 * @returns {string|null} The extracted tenant ID or null
 */
function extractTenantIdFromPath(pathname) {
  const tenantRegex = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;
  const match = pathname.match(tenantRegex);
  return match ? match[1] : null;
}

/**
 * Middleware handler to enforce tenant isolation
 */
export async function tenantIsolationMiddleware(request) {
  const pathname = request.nextUrl.pathname;
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  // Skip for non-tenant routes or authentication routes
  if (!isTenantIsolatedRoute(pathname) || pathname.includes('/auth/')) {
    return NextResponse.next();
  }
  
  // Extract tenant ID from URL
  const urlTenantId = extractTenantIdFromPath(pathname);
  if (!urlTenantId) {
    // No tenant ID found, allow request to proceed to 404 page
    return NextResponse.next();
  }
  
  // Check if this is a directly auth-related request that should be allowed with special handling
  const fromAuth = searchParams.get('fromAuth') === 'true';
  const direct = searchParams.get('direct') === 'true';
  
  // If this is coming directly from auth flow, handle differently - allow temporary access
  // This addresses the immediate post-login redirect where auth tokens might not be fully available
  if (fromAuth && direct) {
    logger.info(`[TenantIsolation] Detected direct auth flow for tenant: ${urlTenantId}, allowing access`);
    
    // Add tenant ID to headers for downstream use
    const headers = new Headers(request.headers);
    headers.set('x-tenant-id', urlTenantId);
    headers.set('x-from-auth-flow', 'true');
    
    // Allow the request to proceed, authentication will be checked by page components
    return NextResponse.next({
      request: {
        headers
      }
    });
  }
  
  try {
    // Get user from server-side authentication
    const user = await getServerUser(request);
    
    // If no authenticated user, redirect to sign in
    if (!user) {
      logger.warn('[TenantIsolation] Unauthenticated access attempt to tenant route:', pathname);
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    // Get the user's tenant ID from attributes with fallbacks for different attribute formats
    const userTenantId = user['custom:tenant_ID'] || user['custom:tenant_id'] || user['custom:businessid'] || null;
    
    // No tenant ID assigned to user, but trying to access tenant route
    if (!userTenantId) {
      logger.warn('[TenantIsolation] User without tenant ID trying to access tenant route:', {
        userId: user.sub,
        email: user.email,
        path: pathname
      });
      
      // Redirect to onboarding if no tenant ID assigned
      return NextResponse.redirect(new URL('/auth/onboarding', request.url));
    }
    
    // Check if tenant IDs match - this is the critical RLS enforcement
    if (userTenantId !== urlTenantId) {
      logger.error('[TenantIsolation] SECURITY VIOLATION: Tenant ID mismatch!', {
        userId: user.sub,
        email: user.email,
        userTenantId,
        urlTenantId,
        path: pathname
      });
      
      // Redirect to user's correct tenant dashboard
      return NextResponse.redirect(new URL(`/${userTenantId}/dashboard`, request.url));
    }
    
    // Add tenant ID to headers for downstream use
    const headers = new Headers(request.headers);
    headers.set('x-tenant-id', urlTenantId);
    
    // RLS validation passed, allow the request to proceed with tenant ID header
    return NextResponse.next({
      request: {
        headers
      }
    });
  } catch (error) {
    // Check if this is a network error during auth flow
    if (error.name === 'TypeError' && error.message.includes('NetworkError') && fromAuth) {
      logger.warn('[TenantIsolation] Network error during auth flow, allowing temporary access:', error);
      
      // Add tenant ID to headers for downstream use
      const headers = new Headers(request.headers);
      headers.set('x-tenant-id', urlTenantId);
      headers.set('x-auth-retry-needed', 'true');
      
      // Allow the request to proceed, the client will handle authentication retries
      return NextResponse.next({
        request: {
          headers
        }
      });
    }
    
    logger.error('[TenantIsolation] Error in tenant isolation middleware:', error);
    
    // Default to auth redirect for any errors to prevent unauthorized access
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 