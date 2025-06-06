import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Create Auth0 authorization URL
  const authUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` + 
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
      scope: 'openid profile email',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
    });
  
  console.log('[Auth Login Route] Redirecting to Auth0:', authUrl);
  
  // Create a response that redirects to Auth0
  const response = NextResponse.redirect(authUrl);
  
  // Set headers to prevent RSC payload fetch errors
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}
