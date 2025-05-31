import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow all auth routes to pass through
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }
  
  // Check if user has an Auth0 session
  const sessionCookie = request.cookies.get('appSession');
  
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
  
  if (isProtected && !sessionCookie) {
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