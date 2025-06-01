import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request) {
  // Use Auth0's middleware handler
  const auth0Response = await auth0.middleware(request);
  
  // If Auth0 middleware returns a response, use it
  if (auth0Response) {
    return auth0Response;
  }
  
  // Otherwise continue with custom logic
  const { pathname } = request.nextUrl;
  
  // Allow all auth routes to pass through
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }
  
  // Check if user has an Auth0 session
  const session = await auth0.getSession(request);
  
  // Protected routes that require authentication
  const protectedRoutes = [
    '/tenant/',
    '/dashboard',
    '/api/me',
    '/api/hr/',
    '/api/inventory/',
    '/api/customers/',
    '/api/invoices/',
    '/api/estimates/',
    '/api/bills/',
    '/api/onboarding/',
  ];
  
  // Check if current path is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtected && !session) {
    // Redirect to login
    const url = new URL('/api/auth/login', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|public/).*)',
  ],
};