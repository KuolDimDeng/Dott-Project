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
    const url = new URL(request.url);
    
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
        // Handle OAuth callback from Auth0
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        
        if (error) {
          console.error('[Auth0 Callback] Error from Auth0:', error);
          return NextResponse.redirect(new URL(`/auth/signin?error=${error}`, request.url));
        }
        
        if (!code) {
          console.error('[Auth0 Callback] No authorization code received');
          return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
        }
        
        try {
          // Exchange code for tokens
          const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
              client_secret: process.env.AUTH0_CLIENT_SECRET,
              code: code,
              redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
            }),
          });
          
          if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for tokens');
          }
          
          const tokens = await tokenResponse.json();
          
          // Create response with tokens in secure cookies
          const response = NextResponse.redirect(new URL('/auth/callback', request.url));
          
          // Set secure, httpOnly cookies for tokens
          response.cookies.set('access_token', tokens.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: tokens.expires_in || 3600
          });
          
          if (tokens.id_token) {
            response.cookies.set('id_token', tokens.id_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              maxAge: tokens.expires_in || 3600
            });
          }
          
          return response;
          
        } catch (error) {
          console.error('[Auth0 Callback] Token exchange failed:', error);
          return NextResponse.redirect(new URL('/auth/signin?error=token_exchange_failed', request.url));
        }
        
      case 'logout':
        // Handle logout
        const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +
          new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
            returnTo: process.env.NEXT_PUBLIC_BASE_URL
          });
        
        // Clear session cookies
        const response = NextResponse.redirect(logoutUrl);
        response.cookies.delete('access_token');
        response.cookies.delete('id_token');
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