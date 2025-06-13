import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';

// This middleware now only handles security headers and auth route optimization
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
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