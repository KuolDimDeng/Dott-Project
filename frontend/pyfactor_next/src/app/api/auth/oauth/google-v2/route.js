import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  try {
    console.log('[Google-OAuth-V2] Starting Google OAuth flow');
    
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('return_url') || '/dashboard';
    const platform = searchParams.get('platform'); // 'mobile' or null
    const device = searchParams.get('device'); // 'ios', 'android', or null
    
    // Generate PKCE challenge
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    // Generate state for CSRF protection - include platform info
    const stateData = {
      random: crypto.randomBytes(16).toString('base64url'),
      platform: platform,
      device: device,
      returnUrl: returnUrl
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');
    
    // Build Auth0 authorization URL
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging.dottapps.com';
    
    if (!auth0Domain || !clientId) {
      console.error('[Google-OAuth-V2] Missing Auth0 configuration');
      return NextResponse.json(
        { error: 'OAuth configuration missing' },
        { status: 500 }
      );
    }
    
    // Use different callback URL based on platform
    let redirectUri;
    if (platform === 'mobile') {
      // For mobile, we still need to use the web callback because Auth0 doesn't support custom schemes
      // But we'll handle the redirect back to the app in the callback handler
      redirectUri = `${baseUrl}/auth/mobile-oauth-callback`;
    } else {
      redirectUri = `${baseUrl}/auth/oauth-callback`;
    }
    
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access',
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      connection: 'google-oauth2', // Force Google connection
      prompt: 'select_account' // Allow account selection
    });
    
    const authUrl = `https://${auth0Domain}/authorize?${authParams.toString()}`;
    
    console.log('[Google-OAuth-V2] Redirecting to Auth0:', {
      domain: auth0Domain,
      redirectUri,
      connection: 'google-oauth2'
    });
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl);
    
    // Set PKCE cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    response.cookies.set('auth0_state', state, cookieOptions);
    response.cookies.set('auth0_verifier', verifier, cookieOptions);
    response.cookies.set('auth0_return_url', returnUrl, cookieOptions);
    
    // Clear any existing session cookies to ensure clean auth
    response.cookies.delete('sid');
    response.cookies.delete('user_data');
    response.cookies.delete('appSession');
    
    return response;
    
  } catch (error) {
    console.error('[Google-OAuth-V2] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}