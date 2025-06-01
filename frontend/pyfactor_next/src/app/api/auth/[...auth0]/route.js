import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';

// Create Auth0 client instance
const auth0Client = new Auth0Client({
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com',
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
});

// Handle all Auth0 routes
export async function GET(request, { params }) {
  try {
    const { auth0: authParams } = await params;
    const authRoute = authParams?.join('/');
    
    console.log('[Auth0 Route] GET request:', { route: authRoute });
    
    // Handle different auth routes
    switch (authRoute) {
      case 'login':
        // Redirect to Auth0 login
        const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` +
          new URLSearchParams({
            response_type: 'code',
            client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
            scope: 'openid profile email',
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`,
            state: Math.random().toString(36).substring(7)
          });
        return NextResponse.redirect(loginUrl);
        
      case 'callback':
        // Handle callback - this should be handled by the callback route
        return NextResponse.redirect(new URL('/auth/callback', request.url));
        
      case 'logout':
        // Handle logout
        const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +
          new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
            returnTo: process.env.NEXT_PUBLIC_BASE_URL
          });
        
        // Clear session cookies
        const response = NextResponse.redirect(logoutUrl);
        response.cookies.delete('appSession');
        return response;
        
      default:
        return NextResponse.json({ error: 'Unknown auth route' }, { status: 404 });
    }
  } catch (error) {
    console.error('[Auth0 Route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  // Handle POST requests if needed
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}