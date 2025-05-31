import { NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/tenant',
  '/onboarding',
  '/reports',
  '/finance',
  '/inventory',
  '/crm'
];

// Define public routes that don't need auth
const publicRoutes = [
  '/',
  '/auth',
  '/api/auth',
  '/about',
  '/contact',
  '/press',
  '/careers',
  '/privacy',
  '/terms'
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, API routes, and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // For protected routes, check if user has auth cookies
  const authCookie = request.cookies.get('appSession');
  
  if (!authCookie) {
    // No session, redirect to login
    const loginUrl = new URL('/api/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Let the request through - detailed routing logic happens in callback page
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 