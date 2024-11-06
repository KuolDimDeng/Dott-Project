// /src/middleware.js

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Define public and auth routes
const publicRoutes = ['/', '/about', '/contact'];
const authRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
const staticPaths = ['/static', '/images', '/api/auth'];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    console.log('Middleware:', { pathname });

    // Allow static and API routes
    if (staticPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Allow auth routes without authentication
    if (authRoutes.includes(pathname)) {
      return NextResponse.next();
    }

    // Allow public routes without authentication
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }

    // Allow onboarding routes with or without authentication
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.next();
    }

    // If user is not authenticated and tries to access protected route
    if (!req.nextauth.token && !publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Allow the request to continue
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        // Allow access to auth routes without token
        if (authRoutes.includes(pathname)) return true;
        // Allow access to public routes without token
        if (publicRoutes.includes(pathname)) return true;
        // Allow access to onboarding routes with or without token
        if (pathname.startsWith('/onboarding')) return true;
        // Allow access to static paths
        if (staticPaths.some(path => pathname.startsWith(path))) return true;
        // Require token for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};