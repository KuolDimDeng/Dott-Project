import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';
import { validateSessionFingerprint } from './middleware/sessionFingerprint';

// This middleware now handles security headers, auth route optimization, and session fingerprinting
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
  
  // For protected routes, validate session fingerprint
  const protectedPaths = ['/dashboard', '/api/', '/tenant/', '/settings'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path)) ||
                         pathname.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//);
  
  if (isProtectedPath) {
    const validation = await validateSessionFingerprint(request);
    
    if (!validation.valid) {
      // Session hijacking detected, clear session and redirect
      const response = NextResponse.redirect(new URL('/auth/signin?error=session_invalid', request.url));
      response.cookies.delete('session_token');
      response.cookies.delete('session_fp');
      response.cookies.delete('dott_auth_session');
      return addSecurityHeaders(response);
    }
    
    // Set fingerprint if needed
    if (validation.action === 'set_fingerprint') {
      const response = NextResponse.next();
      response.cookies.set('session_fp', validation.fingerprint, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24
      });
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