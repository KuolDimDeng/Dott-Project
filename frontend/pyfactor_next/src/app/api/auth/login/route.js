import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const authUrl = new URL('/api/auth/login', request.url);
  
  // Create a response that redirects to Auth0
  const response = NextResponse.redirect(authUrl);
  
  // Set headers to prevent RSC payload fetch errors
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('x-middleware-rewrite', request.url);
  
  return response;
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}
