import { NextResponse } from 'next/server';

// This middleware handles authentication-related routes to prevent RSC payload errors
export function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Special handling for auth routes to prevent RSC payload fetch errors
  if (pathname.startsWith('/api/auth/')) {
    // For these routes, we want to ensure browser navigation not client-side navigation
    // to prevent "Failed to fetch RSC payload" errors
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
  
  // For all other routes, continue normally
  return NextResponse.next();
}

// Define the middleware config to match the paths we want to handle
// Add proper scope to token requests
function addScopeToTokenRequests(request) {
  const url = new URL(request.url);
  
  // For token endpoints, ensure scope includes email
  if (url.pathname.includes('/api/auth/token') || 
      url.pathname.includes('/api/auth/access-token') ||
      url.pathname.includes('/authorize')) {
    
    // Add email scope if not present
    if (!url.searchParams.has('scope')) {
      url.searchParams.set('scope', 'openid profile email');
    } else if (!url.searchParams.get('scope').includes('email')) {
      const currentScope = url.searchParams.get('scope');
      url.searchParams.set('scope', `${currentScope} email`);
    }
    
    // Create new request with updated URL
    return NextRequest.next({
      request: {
        headers: request.headers,
        method: request.method,
        url: url.toString(),
        body: request.body
      }
    });
  }
  
  return request;
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