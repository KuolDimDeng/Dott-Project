import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage (in production, use Redis)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // Max 10 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS) {
    return false; // Rate limited
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  return true; // Allowed
}

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
    
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // Only apply rate limiting to login route, not callback (callback is automated from Auth0)
    if (authRoute === 'login') {
      if (!checkRateLimit(ip)) {
        console.log('[Auth0 Route] Rate limit exceeded for IP:', ip);
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
    }

    console.log('[Auth0 Route] GET request:', { route: authRoute, ip });
    
    // Handle different auth routes
    switch (authRoute) {
      case 'login':
        // Redirect to Auth0 login
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
        
        console.log('[Auth0 Route] Redirecting to Auth0 login with state:', loginState);
        return NextResponse.redirect(loginUrl);
        
      case 'callback':
        // Handle OAuth callback from Auth0 (no rate limiting - this is automated)
        const code = url.searchParams.get('code');
        const callbackState = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        
        console.log('[Auth0 Callback] Received callback:', { 
          hasCode: !!code, 
          hasState: !!callbackState, 
          error,
          fullUrl: url.toString()
        });
        
        if (error) {
          console.error('[Auth0 Callback] Error from Auth0:', error);
          return NextResponse.redirect(new URL(`/auth/signin?error=${error}`, request.url));
        }
        
        if (!code) {
          console.error('[Auth0 Callback] Missing authorization code');
          return NextResponse.redirect(new URL('/auth/signin?error=missing_code', request.url));
        }
        
        try {
          // Exchange code for tokens
          console.log('[Auth0 Callback] Exchanging code for tokens...');
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
            const errorData = await tokenResponse.text();
            console.error('[Auth0 Callback] Token exchange failed:', errorData);
            throw new Error('Failed to exchange code for tokens');
          }
          
          const tokens = await tokenResponse.json();
          console.log('[Auth0 Callback] Token exchange successful');
          
          // Get user info from Auth0
          const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`
            }
          });
          
          if (!userResponse.ok) {
            throw new Error('Failed to get user info');
          }
          
          const user = await userResponse.json();
          console.log('[Auth0 Callback] User info retrieved:', { sub: user.sub, email: user.email });
          
          // Create a proper Auth0 session
          const sessionData = {
            user: user,
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
            state: callbackState
          };
          
          // Create response and set Auth0 session cookie
          const response = NextResponse.redirect(new URL('/auth/callback', request.url));
          
          // Set the Auth0 session cookie that the provider expects
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
          
          console.log('[Auth0 Callback] Session created, redirecting to frontend callback');
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
}