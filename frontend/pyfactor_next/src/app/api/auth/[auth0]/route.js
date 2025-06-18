import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import crypto from 'crypto';
import { encrypt } from '@/utils/sessionEncryption';

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
      
      // Check user's onboarding status from backend
      let needsOnboarding = true;
      let tenantId = null;
      let onboardingCompleted = false;
      let subscriptionPlan = 'free';
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
        const profileResponse = await fetch(`${apiUrl}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          logger.info('[Auth0] Backend profile data:', {
            needs_onboarding: profileData.needs_onboarding,
            onboarding_completed: profileData.onboarding_completed,
            tenant_id: profileData.tenant_id
          });
          
          needsOnboarding = profileData.needs_onboarding !== false;
          onboardingCompleted = profileData.onboarding_completed === true;
          tenantId = profileData.tenant_id;
          
          if (profileData.onboarding && profileData.onboarding.subscription_plan) {
            subscriptionPlan = profileData.onboarding.subscription_plan;
          }
        }
      } catch (error) {
        logger.error('[Auth0] Profile check error:', error);
      }
      
      // Create session data
      const sessionData = {
        user: {
          ...userInfo,
          userId: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          needsOnboarding,
          needs_onboarding: needsOnboarding,
          onboardingCompleted,
          onboarding_completed: onboardingCompleted,
          tenantId,
          tenant_id: tenantId,
          subscriptionPlan,
          subscription_plan: subscriptionPlan
        },
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      // Encrypt session data
      const encryptedSession = encrypt(JSON.stringify(sessionData));
      
      // Cookie configuration
      const COOKIE_OPTIONS = {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        domain: '.dottapps.com'
      };
      
      // Clear auth cookies and set session cookie
      const headers = new Headers();
      const clearCookieOptions = `Path=/; HttpOnly; Max-Age=0; Secure`;
      headers.set('Set-Cookie', `auth0_state=; ${clearCookieOptions}`);
      headers.append('Set-Cookie', `auth0_verifier=; ${clearCookieOptions}`);
      
      // Set the session cookie
      const cookieString = `dott_auth_session=${encryptedSession}; ` +
        `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; Domain=${COOKIE_OPTIONS.domain}`;
      headers.append('Set-Cookie', cookieString);
      
      // Also set a client-readable status cookie for immediate checks
      const statusCookie = `onboarding_status=${JSON.stringify({ needsOnboarding, tenantId })}; ` +
        `Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; Domain=${COOKIE_OPTIONS.domain}`;
      headers.append('Set-Cookie', statusCookie);
      
      // Create backend session
      let sessionToken = null;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
        const backendSessionResponse = await fetch(`${apiUrl}/api/sessions/create/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            needs_onboarding: needsOnboarding,
            onboarding_completed: onboardingCompleted,
            subscription_plan: subscriptionPlan,
            tenant_id: tenantId
          })
        });
        
        if (backendSessionResponse.ok) {
          const backendSession = await backendSessionResponse.json();
          sessionToken = backendSession.session_token;
          
          // Add backend session token to cookies
          const sessionTokenCookie = `session_token=${sessionToken}; ` +
            `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; Domain=${COOKIE_OPTIONS.domain}`;
          headers.append('Set-Cookie', sessionTokenCookie);
          
          logger.info('[Auth0] Backend session created successfully');
        }
      } catch (error) {
        logger.error('[Auth0] Backend session creation error:', error);
      }
      
      logger.info('[Auth0] Session created with cookies:', {
        needsOnboarding,
        tenantId,
        hasSessionToken: !!sessionToken,
        hasCookies: true
      });
      
      // Redirect based on session data
      let redirectUrl = '/dashboard';
      
      if (needsOnboarding) {
        redirectUrl = '/onboarding';
      } else if (tenantId) {
        redirectUrl = `/${tenantId}/dashboard`;
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