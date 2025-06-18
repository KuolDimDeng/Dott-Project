import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';

// Simplified middleware for security headers and auth route optimization
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Debug logging for double tenant ID issue
  if (pathname.includes('/dashboard') || pathname.includes('tenant')) {
    console.log('[Middleware] URL Debug:', {
      pathname,
      fullURL: request.url,
      search: url.search,
      tenantIdCount: (pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) || []).length,
      hasTenantPrefix: pathname.includes('/tenant/')
    });
  }
  
  // Special handling for auth routes to prevent RSC payload fetch errors
  if (pathname.startsWith('/api/auth/')) {
    const response = NextResponse.next();
    
    // Add headers to prevent caching and RSC payload fetching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    if (pathname === '/api/auth/login' || 
        pathname === '/api/auth/logout' ||
        pathname.startsWith('/api/auth/callback')) {
      // Force browser navigation for these routes
      response.headers.set('x-middleware-rewrite', url.toString());
    }
    
    return response;
  }
  
  // For protected routes, check session cookie
  const protectedPaths = ['/dashboard', '/tenant/', '/settings'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path)) ||
                         pathname.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//);
  
  // Skip protection for API routes (they handle auth themselves)
  if (isProtectedPath && !pathname.startsWith('/api/')) {
    const sessionId = request.cookies.get('sid');
    
    if (!sessionId) {
      // No session, redirect to login
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      return addSecurityHeaders(response);
    }
  }
  
  // For all other routes, apply security headers and continue normally
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  // Match all paths except static files, images, etc.
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /public (public files)
     * 4. .*\.\w+ (files with extensions, like images)
     */
    '/((?!_next|static|public|favicon\.ico|.*\.\w+).*)',
  ],
};