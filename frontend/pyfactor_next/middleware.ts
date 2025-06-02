import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Let all requests pass through normally for now
  // The auth routes will handle Auth0 directly
  return;
}

export const config = {
  matcher: [
    // Don't run middleware on static files or API routes for now
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}; 