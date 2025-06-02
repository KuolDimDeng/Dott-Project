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
        // Redirect to Auth0 login with frontend callback
        const loginState = Math.random().toString(36).substring(7);
        const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` +
          new URLSearchParams({
            response_type: 'code',
            client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
            scope: 'openid profile email',
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`,
            state: loginState
          });
        
        console.log('[Auth0 Route] Redirecting to Auth0 login with frontend callback');
        return NextResponse.redirect(loginUrl);
        
      case 'exchange':
        // NEW: API endpoint for token exchange (called from frontend)
        const code = url.searchParams.get('code');
        const exchangeState = url.searchParams.get('state');
        
        console.log('[Auth0 Exchange] Exchange request received:', {
          hasCode: !!code,
          codeLength: code?.length,
          hasState: !!exchangeState,
          domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
          clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
          redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL
        });
        
        if (!code) {
          console.error('[Auth0 Exchange] Missing authorization code');
          return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
        }
        
        if (!process.env.AUTH0_CLIENT_SECRET) {
          console.error('[Auth0 Exchange] Missing AUTH0_CLIENT_SECRET environment variable');
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        
        try {
          console.log('[Auth0 Exchange] Exchanging code for tokens...');
          
          const tokenRequestBody = {
            grant_type: 'authorization_code',
            client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            code: code,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
          };
          
          console.log('[Auth0 Exchange] Token request body:', {
            grant_type: tokenRequestBody.grant_type,
            client_id: tokenRequestBody.client_id,
            redirect_uri: tokenRequestBody.redirect_uri,
            has_code: !!tokenRequestBody.code,
            has_client_secret: !!tokenRequestBody.client_secret
          });
          
          // Exchange code for tokens
          const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenRequestBody),
          });
          
          console.log('[Auth0 Exchange] Token response status:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            ok: tokenResponse.ok
          });
          
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('[Auth0 Exchange] Token exchange failed:', {
              status: tokenResponse.status,
              statusText: tokenResponse.statusText,
              error: errorData
            });
            return NextResponse.json({ 
              error: 'Token exchange failed',
              details: errorData,
              status: tokenResponse.status
            }, { status: 400 });
          }
          
          const tokens = await tokenResponse.json();
          console.log('[Auth0 Exchange] Token exchange successful:', {
            hasAccessToken: !!tokens.access_token,
            hasIdToken: !!tokens.id_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresIn: tokens.expires_in
          });
          
          // Get user info from Auth0
          console.log('[Auth0 Exchange] Fetching user info...');
          const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`
            }
          });
          
          console.log('[Auth0 Exchange] User info response status:', {
            status: userResponse.status,
            statusText: userResponse.statusText,
            ok: userResponse.ok
          });
          
          if (!userResponse.ok) {
            const userErrorData = await userResponse.text();
            console.error('[Auth0 Exchange] Failed to get user info:', {
              status: userResponse.status,
              error: userErrorData
            });
            return NextResponse.json({ 
              error: 'Failed to get user info',
              details: userErrorData
            }, { status: 400 });
          }
          
          const user = await userResponse.json();
          console.log('[Auth0 Exchange] User info retrieved:', { 
            sub: user.sub, 
            email: user.email,
            name: user.name,
            picture: user.picture
          });
          
          // Create session data
          const sessionData = {
            user: user,
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
            state: exchangeState
          };
          
          // Set session cookies and return success
          const response = NextResponse.json({ success: true, user: user });
          
          // Set the Auth0 session cookie
          const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
          response.cookies.set('appSession', sessionCookie, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: tokens.expires_in || 3600,
            path: '/'
          });
          
          // Also set individual tokens for easier access
          response.cookies.set('auth0_access_token', tokens.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: tokens.expires_in || 3600,
            path: '/'
          });
          
          if (tokens.id_token) {
            response.cookies.set('auth0_id_token', tokens.id_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              maxAge: tokens.expires_in || 3600,
              path: '/'
            });
          }
          
          console.log('[Auth0 Exchange] Session created successfully');
          return response;
          
        } catch (error) {
          console.error('[Auth0 Exchange] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          return NextResponse.json({ 
            error: 'Token exchange failed',
            details: error.message
          }, { status: 500 });
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
        response.cookies.delete('appSession');
        response.cookies.delete('auth0_access_token');
        response.cookies.delete('auth0_id_token');
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
}// Force deployment trigger Sun Jun  1 09:33:09 MDT 2025
