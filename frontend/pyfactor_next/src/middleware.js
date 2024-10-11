import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    console.log('Middleware:', { pathname });

    // List of public routes that don't require authentication
    const publicRoutes = ['/', '/about', '/contact', '/auth/signin', '/auth/signup'];
    
    // Allow access to onboarding routes without authentication
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.next();
    }

    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }

    // If the user is not authenticated and trying to access a protected route, redirect to signin
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
        const publicRoutes = ['/', '/about', '/contact', '/auth/signin', '/auth/signup', '/onboarding'];
        return !!token || publicRoutes.includes(pathname) || pathname.startsWith('/onboarding');
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};