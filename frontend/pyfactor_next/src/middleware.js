import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    console.log('Middleware:', { pathname, token });
    console.log('Token:', token);
    console.log('Pathname:', pathname);
    console.log('Is authenticated:',!!token);
    console.log('Is onboarded:',!!token?.isOnboarded);
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');

    if (!token && !pathname.startsWith('/auth/signin')) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    if (token && !token.isOnboarded && !pathname.startsWith('/onboarding')) {
      return NextResponse.redirect('/onboarding');
    }
    console.log('-------------------------------------------');

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
);
console.log('Middleware configured');
export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/auth/:path*'],
};