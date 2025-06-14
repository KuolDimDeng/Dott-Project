import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

const AUTH0_BASE_URL = process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL || 'https://auth.dottapps.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_SECRET = process.env.AUTH0_SECRET;
const AUTH0_AUDIENCE = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';

// Generate random state for CSRF protection
function generateState() {
  return crypto.randomBytes(32).toString('base64url');
}

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

async function handleLogin(request, { params }) {
  const { auth0: action } = params;
  
  if (action === 'login') {
    // Extract connection parameter from URL
    const url = new URL(request.url);
    const connection = url.searchParams.get('connection') || 'google-oauth2';
    const state = generateState();
    const { verifier, challenge } = generatePKCE();
    
    // Store state and PKCE verifier in cookies with proper settings
    const headers = new Headers();
    const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`;
    
    // Set cookies with proper domain handling
    headers.set('Set-Cookie', `auth0_state=${state}; ${cookieOptions}`);
    headers.append('Set-Cookie', `auth0_verifier=${verifier}; ${cookieOptions}`);
    
    logger.info('[Auth0] Setting auth cookies:', { state, hasVerifier: !!verifier });
    
    // Build Auth0 authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: AUTH0_CLIENT_ID,
      redirect_uri: `${AUTH0_BASE_URL}/api/auth/callback`,
      scope: 'openid profile email',
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      connection: connection,
      audience: AUTH0_AUDIENCE
    });
    
    const authUrl = `${AUTH0_ISSUER_BASE_URL}/authorize?${authParams.toString()}`;
    
    logger.info('[Auth0] Redirecting to login:', { connection, authUrl });
    
    return NextResponse.redirect(authUrl, { headers });
  }
  
  return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
}

async function handleCallback(request, { params }) {
  const { auth0: action } = params;
  
  if (action === 'callback') {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    // Handle errors from Auth0
    if (error) {
      logger.error('[Auth0] Callback error:', { error, errorDescription });
      return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=${encodeURIComponent(errorDescription || error)}`);
    }
    
    // Verify state
    const cookies = request.headers.get('cookie') || '';
    const storedState = cookies.match(/auth0_state=([^;]+)/)?.[1];
    const storedVerifier = cookies.match(/auth0_verifier=([^;]+)/)?.[1];
    
    logger.info('[Auth0] State verification:', { 
      receivedState: state,
      storedState,
      hasStoredVerifier: !!storedVerifier,
      cookies: cookies.substring(0, 100) + '...'
    });
    
    if (!storedState || state !== storedState) {
      logger.error('[Auth0] State mismatch:', {
        expected: storedState,
        received: state
      });
      return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=state_mismatch`);
    }
    
    if (!code) {
      logger.error('[Auth0] No authorization code');
      return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=no_code`);
    }
    
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(`${AUTH0_ISSUER_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: AUTH0_CLIENT_ID,
          client_secret: AUTH0_CLIENT_SECRET,
          code: code,
          redirect_uri: `${AUTH0_BASE_URL}/api/auth/callback`,
          code_verifier: storedVerifier
        })
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        logger.error('[Auth0] Token exchange failed:', errorData);
        return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=token_exchange_failed`);
      }
      
      const tokens = await tokenResponse.json();
      
      // Get user info
      const userInfoResponse = await fetch(`${AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });
      
      if (!userInfoResponse.ok) {
        logger.error('[Auth0] Failed to get user info');
        return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=userinfo_failed`);
      }
      
      const userInfo = await userInfoResponse.json();
      
      logger.info('[Auth0] Successful authentication:', { 
        userId: userInfo.sub,
        email: userInfo.email,
        emailVerified: userInfo.email_verified 
      });
      
      // Check if email is verified
      if (userInfo.email_verified === false) {
        logger.error('[Auth0] Email not verified for user:', userInfo.email);
        // Clear cookies and redirect to login with error
        const headers = new Headers();
        const clearCookieOptions = `Path=/; HttpOnly; Max-Age=0; Secure`;
        headers.set('Set-Cookie', `auth0_state=; ${clearCookieOptions}`);
        headers.append('Set-Cookie', `auth0_verifier=; ${clearCookieOptions}`);
        
        return NextResponse.redirect(
          `${AUTH0_BASE_URL}/login?error=email_not_verified&email=${encodeURIComponent(userInfo.email)}`,
          { headers }
        );
      }
      
      // Create session
      const sessionResponse = await fetch(`${AUTH0_BASE_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          user: {
            ...userInfo,
            userId: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture
          }
        })
      });
      
      if (!sessionResponse.ok) {
        logger.error('[Auth0] Failed to create session');
        return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=session_failed`);
      }
      
      const sessionData = await sessionResponse.json();
      
      // Clear auth cookies
      const headers = new Headers();
      const clearCookieOptions = `Path=/; HttpOnly; Max-Age=0; Secure`;
      headers.set('Set-Cookie', `auth0_state=; ${clearCookieOptions}`);
      headers.append('Set-Cookie', `auth0_verifier=; ${clearCookieOptions}`);
      
      // Redirect based on session data
      let redirectUrl = '/dashboard';
      if (sessionData.needsOnboarding) {
        redirectUrl = '/onboarding';
      } else if (sessionData.tenantId) {
        redirectUrl = `/tenant/${sessionData.tenantId}/dashboard`;
      }
      
      return NextResponse.redirect(`${AUTH0_BASE_URL}${redirectUrl}`, { headers });
      
    } catch (error) {
      logger.error('[Auth0] Callback processing error:', error);
      return NextResponse.redirect(`${AUTH0_BASE_URL}/login?error=callback_error`);
    }
  }
  
  return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
}

export async function GET(request, { params }) {
  const { auth0: action } = params;
  
  logger.info('[Auth0] Route handler:', { action, method: 'GET' });
  
  switch (action) {
    case 'login':
      return handleLogin(request, { params });
    case 'callback':
      return handleCallback(request, { params });
    case 'logout':
      // Clear session and redirect to Auth0 logout
      const logoutUrl = `${AUTH0_ISSUER_BASE_URL}/v2/logout?` + new URLSearchParams({
        client_id: AUTH0_CLIENT_ID,
        returnTo: AUTH0_BASE_URL
      });
      return NextResponse.redirect(logoutUrl);
    default:
      return NextResponse.json({ error: 'Unknown auth action' }, { status: 404 });
  }
}

export async function POST(request, { params }) {
  const { auth0: action } = params;
  
  logger.info('[Auth0] Route handler:', { action, method: 'POST' });
  
  // POST methods typically not used for OAuth flow, but keep for compatibility
  return NextResponse.json({ error: 'Method not supported' }, { status: 405 });
}