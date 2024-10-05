import { NextResponse } from 'next/server';

export function middleware(request) {
  console.log('Middleware executed for path:', request.nextUrl.pathname);

  // Skip middleware for Auth0 callback
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Create a new response
  const response = NextResponse.next();

  // Set the cookie header
  response.headers.set('Set-Cookie', 'SameSite=Lax; Secure; HttpOnly; Path=/');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};