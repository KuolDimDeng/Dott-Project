import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { logger } from '@/utils/logger';

// Handle all Auth0 routes
export async function GET(request, { params }) {
  try {
    const { auth0: authParams } = await params;
    const authRoute = authParams?.join('/');
    
    logger.debug('[Auth0 Route] GET request:', { route: authRoute });
    
    // Handle different auth routes
    switch (authRoute) {
      case 'login':
        // Redirect to Auth0 login
        const loginUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?` +
          new URLSearchParams({
            response_type: 'code',
            client_id: process.env.AUTH0_CLIENT_ID,
            redirect_uri: `${process.env.AUTH0_BASE_URL || request.nextUrl.origin}/api/auth/callback`,
            scope: 'openid profile email',
            state: Math.random().toString(36).substring(7)
          });
        return NextResponse.redirect(loginUrl);
        
      case 'callback':
        // Handle callback - this should be handled by the callback route
        return NextResponse.redirect(new URL('/auth/callback', request.url));
        
      case 'logout':
        // Handle logout
        const logoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
          new URLSearchParams({
            client_id: process.env.AUTH0_CLIENT_ID,
            returnTo: process.env.AUTH0_BASE_URL || request.nextUrl.origin
          });
        
        // Clear session cookies
        const response = NextResponse.redirect(logoutUrl);
        response.cookies.delete('appSession');
        return response;
        
      default:
        return NextResponse.json({ error: 'Unknown auth route' }, { status: 404 });
    }
  } catch (error) {
    logger.error('[Auth0 Route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  // Handle POST requests if needed
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}