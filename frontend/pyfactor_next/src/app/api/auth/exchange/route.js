import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache to prevent duplicate authorization code usage
const usedCodes = new Set();
const codeExpiryTime = new Map(); // Track when codes were used

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const exchangeState = url.searchParams.get('state');
    
    console.log('🔄 [Auth0Exchange] ========== STEP 5: TOKEN EXCHANGE REQUEST RECEIVED ==========');
    console.log('🔄 [Auth0Exchange] Timestamp:', new Date().toISOString());
    console.log('🔄 [Auth0Exchange] Request URL:', request.url);
    console.log('🔄 [Auth0Exchange] Authorization code:', code ? `${code.substring(0, 10)}...` : 'MISSING');
    console.log('🔄 [Auth0Exchange] Code length:', code?.length);
    console.log('🔄 [Auth0Exchange] State:', exchangeState || 'MISSING');
    console.log('🔄 [Auth0Exchange] Available cookies:', {
      auth0_state: !!request.cookies.get('auth0_state'),
      auth0_verifier: !!request.cookies.get('auth0_verifier'),
      appSession: !!request.cookies.get('appSession'),
      sid: !!request.cookies.get('sid'),
      all: request.cookies.getAll().map(c => c.name)
    });
    console.log('🔄 [Auth0Exchange] Environment:', {
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    });
    console.log('🔄 [Auth0Exchange] ========== END STEP 5 ==========');
    
    if (!code) {
      console.error('[Auth0 Exchange] Missing authorization code');
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // Check for duplicate authorization code usage
    if (usedCodes.has(code)) {
      console.log('❌ [Auth0Exchange] Authorization code already used (duplicate request detected)');
      return NextResponse.json({ 
        error: 'Token exchange failed',
        message: 'The authorization code has already been used. Please try signing in again.',
        details: 'Duplicate request detected',
        error_code: 'code_reused',
        status: 400
      }, { status: 400 });
    }

    // Mark code as used and set expiry (10 minutes from now)
    usedCodes.add(code);
    codeExpiryTime.set(code, Date.now() + 10 * 60 * 1000);

    // Clean up expired codes to prevent memory leak
    const now = Date.now();
    for (const [expiredCode, expiry] of codeExpiryTime.entries()) {
      if (now > expiry) {
        usedCodes.delete(expiredCode);
        codeExpiryTime.delete(expiredCode);
      }
    }
    
    if (!process.env.AUTH0_CLIENT_SECRET) {
      console.error('❌ [Auth0Exchange] ========== MISSING CLIENT SECRET ==========');
      console.error('❌ [Auth0Exchange] AUTH0_CLIENT_SECRET environment variable not found');
      console.error('❌ [Auth0Exchange] This is required for token exchange with Auth0');
      console.error('❌ [Auth0Exchange] Available env vars:', Object.keys(process.env).filter(key => key.includes('AUTH')));
      console.error('❌ [Auth0Exchange] ========== END CLIENT SECRET ERROR ==========');
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'AUTH0_CLIENT_SECRET environment variable not configured'
      }, { status: 500 });
    }
    
    try {
      console.log('[Auth0 Exchange] Exchanging code for tokens...');
      
      // Check which redirect URI was used - if the callback came to /auth/oauth-callback,
      // we need to use that as the redirect_uri for token exchange
      const referer = request.headers.get('referer');
      const isOAuthCallbackPage = referer && referer.includes('/auth/oauth-callback');
      
      // Auth0 might be configured to use /auth/oauth-callback as the callback URL
      // Try the OAuth callback URL first, fallback to API callback if that fails
      let redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/oauth-callback`;
      
      console.log('[Auth0 Exchange] Initial redirect_uri attempt:', redirectUri);
      console.log('[Auth0 Exchange] Referer:', referer);
      console.log('[Auth0 Exchange] Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
      
      // Get PKCE verifier from cookie (set during login)
      console.log('🔄 [Auth0Exchange] ========== STEP 5A: RETRIEVING PKCE VERIFIER ==========');
      const verifier = request.cookies.get('auth0_verifier');
      console.log('🔄 [Auth0Exchange] Looking for auth0_verifier cookie...');
      console.log('🔄 [Auth0Exchange] PKCE verifier found:', !!verifier);
      console.log('🔄 [Auth0Exchange] Verifier value:', verifier?.value ? `${verifier.value.substring(0, 10)}...` : 'NOT FOUND');
      console.log('🔄 [Auth0Exchange] All cookies:', request.cookies.getAll().map(c => ({
        name: c.name,
        value: c.value ? `${c.value.substring(0, 10)}...` : 'empty'
      })));
      console.log('🔄 [Auth0Exchange] ========== END STEP 5A ==========');
      
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
      };
      
      // Add PKCE verifier if available
      if (verifier?.value) {
        tokenRequestBody.code_verifier = verifier.value;
        console.log('🔄 [Auth0Exchange] ========== STEP 5B: ADDING PKCE VERIFIER ==========');
        console.log('🔄 [Auth0Exchange] Added code_verifier to token request');
        console.log('🔄 [Auth0Exchange] Verifier length:', verifier.value.length);
        console.log('🔄 [Auth0Exchange] ========== END STEP 5B ==========');
      } else {
        console.log('🔄 [Auth0Exchange] ⚠️ WARNING: No PKCE verifier found in cookies!');
        console.log('🔄 [Auth0Exchange] This will likely cause "Parameter code_verifier is required" error');
      }
      
      console.log('[Auth0 Exchange] Token request body:', {
        grant_type: tokenRequestBody.grant_type,
        client_id: tokenRequestBody.client_id,
        redirect_uri: tokenRequestBody.redirect_uri,
        has_code: !!tokenRequestBody.code,
        has_client_secret: !!tokenRequestBody.client_secret,
        has_code_verifier: !!tokenRequestBody.code_verifier,
        referer: referer,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL
      });
      
      // Try to exchange code for tokens
      let tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequestBody),
      });
      
      console.log('🔄 [Auth0Exchange] ========== STEP 5C: AUTH0 TOKEN RESPONSE ==========');
      console.log('🔄 [Auth0Exchange] Response status:', tokenResponse.status);
      console.log('🔄 [Auth0Exchange] Response status text:', tokenResponse.statusText);
      console.log('🔄 [Auth0Exchange] Response OK:', tokenResponse.ok);
      console.log('🔄 [Auth0Exchange] Redirect URI used:', redirectUri);
      console.log('🔄 [Auth0Exchange] Had PKCE verifier:', !!tokenRequestBody.code_verifier);
      console.log('🔄 [Auth0Exchange] Response headers:', Object.fromEntries(tokenResponse.headers.entries()));
      console.log('🔄 [Auth0Exchange] ========== END STEP 5C ==========');
      
      // Declare error variables in outer scope
      let errorText;
      let errorData;
      
      // Handle token exchange failure
      if (!tokenResponse.ok) {
        // Read the response body only once
        try {
          errorText = await tokenResponse.text();
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: 'unknown', error_description: errorText || 'Failed to parse error response' };
        }
        
        console.log('🔄 [Auth0Exchange] ========== STEP 5D: TOKEN EXCHANGE FAILED ==========');
        console.log('🔄 [Auth0Exchange] Error details:', {
          status: tokenResponse.status,
          error: errorData.error,
          error_description: errorData.error_description,
          hadPKCEVerifier: !!tokenRequestBody.code_verifier,
          redirectUriUsed: redirectUri
        });
        
        // Log specific issue if PKCE verifier was missing
        if (!tokenRequestBody.code_verifier && errorData.error_description?.includes('code_verifier')) {
          console.log('🔄 [Auth0Exchange] ❌ ISSUE IDENTIFIED: PKCE verifier cookie was not found');
          console.log('🔄 [Auth0Exchange] Possible causes:');
          console.log('🔄 [Auth0Exchange]   - Cookie was not set in /api/auth/login');
          console.log('🔄 [Auth0Exchange]   - Cookie expired (10 minute timeout)');
          console.log('🔄 [Auth0Exchange]   - Cookie domain/path mismatch');
          console.log('🔄 [Auth0Exchange]   - SameSite policy blocking cookie');
        }
        console.log('🔄 [Auth0Exchange] ========== END STEP 5D ==========');
        
        // If the first attempt fails with invalid_grant due to redirect_uri mismatch, try alternative
        if (tokenResponse.status === 400 && 
            errorData.error === 'invalid_grant' && 
            errorData.error_description?.includes('redirect_uri')) {
          
          console.log('[Auth0 Exchange] Redirect URI mismatch detected, trying alternative...');
          
          // Try the alternative redirect URI
          const alternativeRedirectUri = redirectUri.includes('/auth/oauth-callback')
            ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
            : `${process.env.NEXT_PUBLIC_BASE_URL}/auth/oauth-callback`;
          
          console.log('[Auth0 Exchange] Trying alternative redirect_uri:', alternativeRedirectUri);
          
          tokenRequestBody.redirect_uri = alternativeRedirectUri;
          
          // Retry with alternative redirect URI
          tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenRequestBody),
          });
          
          console.log('[Auth0 Exchange] Alternative token response status:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            ok: tokenResponse.ok,
            redirect_uri_used: alternativeRedirectUri
          });
          
          // Update redirectUri for logging
          redirectUri = alternativeRedirectUri;
          
          // If still not ok, read the new error
          if (!tokenResponse.ok) {
            try {
              errorText = await tokenResponse.text();
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { error_description: errorText || 'Failed to parse error response' };
            }
          }
        }
      }
      
      // Final check after potential retry
      if (!tokenResponse.ok) {
        // errorData is already populated from above
        
        console.error('[Auth0 Exchange] Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData,
          error_description: errorData.error_description,
          error_code: errorData.error,
          redirect_uri_used: redirectUri,
          auth0_domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN
        });
        
        // Common Auth0 errors
        let userMessage = 'Authentication failed. Please try again.';
        if (errorData.error === 'invalid_grant') {
          if (errorData.error_description?.includes('redirect_uri')) {
            userMessage = 'Configuration error: Redirect URI mismatch. Please contact support.';
          } else if (errorData.error_description?.includes('code')) {
            userMessage = 'The authorization code has expired or is invalid. Please try signing in again.';
          }
        } else if (errorData.error === 'unauthorized_client') {
          userMessage = 'Configuration error: Client not authorized. Please contact support.';
        }
        
        return NextResponse.json({ 
          error: 'Token exchange failed',
          message: userMessage,
          details: errorData.error_description || errorText,
          error_code: errorData.error,
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
      
      // Try to create backend session first
      let backendSession = null;
      try {
        console.log('[Auth0 Exchange] Creating backend session...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        
        // Use the cloudflare-session endpoint for better compatibility
        const sessionResponse = await fetch(`${apiUrl}/api/sessions/cloudflare/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access_token}`,
          },
          body: JSON.stringify({
            auth0_token: tokens.access_token,
            auth0_sub: user.sub,
            email: user.email,
            name: user.name
          })
        });
        
        if (sessionResponse.ok) {
          backendSession = await sessionResponse.json();
          console.log('[Auth0 Exchange] Backend session created:', {
            authenticated: backendSession.authenticated,
            hasSessionToken: !!backendSession.session_token,
            needsOnboarding: backendSession.needs_onboarding
          });
        } else {
          const errorData = await sessionResponse.json();
          console.error('[Auth0 Exchange] Backend session creation failed:', errorData);
        }
      } catch (error) {
        console.error('[Auth0 Exchange] Error creating backend session:', error);
      }
      
      // Create session data
      const sessionData = {
        user: user,
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
        state: exchangeState,
        // Include backend session info if available
        backendAuthenticated: backendSession?.authenticated || false,
        backendSessionToken: backendSession?.session_token,
        needsOnboarding: backendSession?.needs_onboarding || false
      };
      
      // Set session cookies and return success
      const response = NextResponse.json({ 
        success: true, 
        user: user,
        authenticated: backendSession?.authenticated || false,
        needsOnboarding: backendSession?.needs_onboarding || false
      });
      
      // Set the Auth0 session cookie
      const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      response.cookies.set('appSession', sessionCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: tokens.expires_in || 3600,
        path: '/'
      });
      
      // Set backend session token if available
      if (backendSession?.session_token) {
        response.cookies.set('sid', backendSession.session_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 86400, // 24 hours
          path: '/'
        });
        response.cookies.set('session_token', backendSession.session_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 86400, // 24 hours
          path: '/'
        });
      }
      
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
    
  } catch (error) {
    console.error('[Auth0 Exchange] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 