import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Handle Auth0 routes with special headers to bypass DDoS protection
  if (pathname.startsWith('/api/auth/')) {
    const response = NextResponse.next();
    
    // Add headers to bypass Vercel DDoS protection for auth routes
    response.headers.set('x-vercel-no-challenge', '1');
    response.headers.set('cache-control', 'no-store, max-age=0');
    response.headers.set('x-robots-tag', 'noindex');
    
    // Add CORS headers for Auth0
    response.headers.set('access-control-allow-origin', '*');
    response.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    response.headers.set('access-control-allow-headers', 'content-type, authorization');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/auth/:path*'
  ]
}; 