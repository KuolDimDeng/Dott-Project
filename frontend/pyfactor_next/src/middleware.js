import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';
import { checkPagePermissions } from './middleware/permissionChecker';

// Simplified middleware for security headers and auth route optimization
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Detailed session tracking logs
  console.log('[Middleware] ========== REQUEST START ==========');
  console.log('[Middleware] Path:', pathname);
  console.log('[Middleware] Method:', request.method);
  
  // Log all cookies for debugging
  const cookies = request.cookies;
  const cookieList = cookies.getAll();
  console.log('[Middleware] All cookies:', cookieList.map(c => ({
    name: c.name,
    value: c.value ? `${c.value.substring(0, 8)}...` : 'empty',
    length: c.value ? c.value.length : 0
  })));
  
  // Check only session cookies - ignore onboarding cookies
  const sid = cookies.get('sid');
  const sessionToken = cookies.get('session_token');
  
  console.log('[Middleware] Session cookie status:', {
    sid: sid ? { exists: true, length: sid.value.length, value: sid.value.substring(0, 8) + '...' } : { exists: false },
    sessionToken: sessionToken ? { exists: true, length: sessionToken.value.length, value: sessionToken.value.substring(0, 8) + '...' } : { exists: false }
  });
  
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
  
  // Skip auth check for auth routes to prevent redirect loops
  const isAuthRoute = pathname.startsWith('/auth/');
  
  console.log('[Middleware] Protected path check:', {
    isProtectedPath,
    isAuthRoute,
    matchedPattern: protectedPaths.find(path => pathname.startsWith(path)) || 
                   (pathname.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//) ? 'tenant-uuid' : null)
  });
  
  // Skip protection for API routes and auth routes (they handle auth themselves)
  if (isProtectedPath && !pathname.startsWith('/api/') && !isAuthRoute) {
    console.log('[Middleware] Checking auth for protected route:', pathname);
    console.log('[Middleware] Session check - sid:', !!sid, 'sessionToken:', !!sessionToken);
    
    if (!sid && !sessionToken) {
      console.log('[Middleware] ❌ NO SESSION COOKIES FOUND!');
      console.log('[Middleware] Debug - All cookies:', cookieList.map(c => c.name));
      
      // No session, redirect to login - no exceptions
      console.log('[Middleware] 🚫 REDIRECTING TO LOGIN - No valid session found');
      console.log('[Middleware] - From path:', pathname);
      console.log('[Middleware] - Redirect URL:', `/auth/signin?returnTo=${encodeURIComponent(pathname)}`);
      const response = NextResponse.redirect(new URL(`/auth/signin?returnTo=${encodeURIComponent(pathname)}`, request.url));
      return addSecurityHeaders(response);
    } else {
      console.log('[Middleware] ✅ Session found, allowing access');
      console.log('[Middleware] Session details:', {
        sid: sid ? { present: true, value: sid.value.substring(0, 8) + '...' } : null,
        sessionToken: sessionToken ? { present: true, value: sessionToken.value.substring(0, 8) + '...' } : null
      });
    }
  } else if (!isProtectedPath) {
    console.log('[Middleware] Not a protected path, allowing access');
  }
  
  // Check for protected dashboard and settings routes
  if (pathname.includes('/dashboard') || pathname.includes('/settings')) {
    console.log('[Middleware] Checking permissions for protected route');
    
    // Skip permission check for API routes
    if (!pathname.startsWith('/api/')) {
      // Get session data to check permissions
      const sessionCookie = cookies.get('sid') || cookies.get('session_token');
      
      if (sessionCookie) {
        try {
          // Fetch session data from API
          const baseUrl = request.nextUrl.origin;
          const sessionResponse = await fetch(`${baseUrl}/api/auth/session-v2`, {
            headers: {
              'Cookie': request.headers.get('cookie') || ''
            }
          });
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            // Check permissions
            const permissionResponse = await checkPagePermissions(request, sessionData);
            if (permissionResponse.status === 307 || permissionResponse.status === 302) {
              // Permission denied, return redirect response
              return permissionResponse;
            }
          }
        } catch (error) {
          console.error('[Middleware] Error checking permissions:', error);
        }
      }
    }
  }
  
  // For all other routes, apply security headers and continue normally
  const response = NextResponse.next();
  console.log('[Middleware] ========== REQUEST END ==========');
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