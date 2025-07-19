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
    
    try {
      console.log('[Auth0 Exchange] Starting OAuth exchange process...');
      
      // Check which redirect URI was used
      const referer = request.headers.get('referer');
      let redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/oauth-callback`;
      
      console.log('[Auth0 Exchange] Initial redirect_uri:', redirectUri);
      console.log('[Auth0 Exchange] Referer:', referer);
      console.log('[Auth0 Exchange] Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
      
      // Get PKCE verifier from cookie
      console.log('🔄 [Auth0Exchange] ========== RETRIEVING PKCE VERIFIER ==========');
      const verifier = request.cookies.get('auth0_verifier');
      console.log('🔄 [Auth0Exchange] PKCE verifier found:', !!verifier);
      console.log('🔄 [Auth0Exchange] Verifier value:', verifier?.value ? `${verifier.value.substring(0, 10)}...` : 'NOT FOUND');
      console.log('🔄 [Auth0Exchange] ========== END PKCE VERIFIER ==========');
      
      let tokens;
      let user;
      
      // Check if we should proxy through backend (when AUTH0_CLIENT_SECRET is not available)
      if (!process.env.AUTH0_CLIENT_SECRET) {
        console.log('🔄 [Auth0Exchange] ========== PROXYING THROUGH BACKEND ==========');
        console.log('🔄 [Auth0Exchange] AUTH0_CLIENT_SECRET not available in frontend');
        console.log('🔄 [Auth0Exchange] Proxying OAuth exchange through backend for security');
        
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
          const backendUrl = `${apiUrl}/api/auth/oauth-exchange/`;
          
          console.log('🔄 [Auth0Exchange] Backend URL:', backendUrl);
          console.log('🔄 [Auth0Exchange] Request payload:', {
            code: code ? `${code.substring(0, 10)}...` : 'null',
            redirect_uri: redirectUri,
            has_code_verifier: !!verifier?.value
          });
          
          // Send the authorization code to backend for secure token exchange
          const backendResponse = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: code,
              redirect_uri: redirectUri,
              code_verifier: verifier?.value || null
            })
          });
        
          console.log('🔄 [Auth0Exchange] Backend response status:', backendResponse.status);
          console.log('🔄 [Auth0Exchange] Backend response OK:', backendResponse.ok);
          
          if (!backendResponse.ok) {
            const errorData = await backendResponse.json();
            console.error('❌ [Auth0Exchange] Backend OAuth exchange failed:', errorData);
            console.error('❌ [Auth0Exchange] Error details:', {
              status: backendResponse.status,
              error: errorData.error,
              message: errorData.message,
              details: errorData.details
            });
            return NextResponse.json({ 
              error: errorData.error || 'OAuth exchange failed',
              message: errorData.message || 'Authentication failed',
              details: errorData.details,
              status: backendResponse.status
            }, { status: backendResponse.status });
          }
          
          // Get tokens from backend response
          const backendTokens = await backendResponse.json();
          console.log('✅ [Auth0Exchange] Backend OAuth exchange successful:', {
            hasAccessToken: !!backendTokens.access_token,
            hasIdToken: !!backendTokens.id_token,
            hasRefreshToken: !!backendTokens.refresh_token
          });
          
          // Use tokens from backend
          tokens = backendTokens;
          console.log('🔄 [Auth0Exchange] ========== END BACKEND PROXY ==========');
          
        } catch (error) {
          console.error('❌ [Auth0Exchange] Error calling backend OAuth exchange:', error);
          console.error('❌ [Auth0Exchange] Error details:', {
            message: error.message,
            stack: error.stack
          });
          return NextResponse.json({ 
            error: 'OAuth exchange failed',
            details: error.message
          }, { status: 500 });
        }
      } else {
        // Direct OAuth exchange (when AUTH0_CLIENT_SECRET is available)
        console.log('🔑 [Auth0Exchange] Using direct OAuth exchange (AUTH0_CLIENT_SECRET available)');
        
        // [Original direct OAuth exchange code would go here]
        // For now, return error since we want to always use backend proxy
        return NextResponse.json({ 
          error: 'Server configuration error',
          details: 'Direct OAuth exchange not implemented - use backend proxy'
        }, { status: 500 });
      }
      
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
      
      user = await userResponse.json();
      console.log('[Auth0 Exchange] User info retrieved:', { 
        sub: user.sub, 
        email: user.email,
        name: user.name,
        picture: user.picture
      });
      
      // First create or update the user in the backend
      let backendUser = null;
      try {
        console.log('[Auth0 Exchange] Creating/updating user in backend...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        
        // Call the Auth0 user creation endpoint first
        const userCreateResponse = await fetch(`${apiUrl}/api/auth0/create-user/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access_token}`,
          },
          body: JSON.stringify({
            email: user.email,
            sub: user.sub,
            auth0_sub: user.sub,
            name: user.name,
            picture: user.picture,
            email_verified: user.email_verified
          })
        });
        
        if (userCreateResponse.ok) {
          backendUser = await userCreateResponse.json();
          console.log('[Auth0 Exchange] User created/updated in backend:', {
            userId: backendUser.user?.id,
            email: backendUser.user?.email,
            tenantId: backendUser.tenant_id,
            needsOnboarding: backendUser.needs_onboarding
          });
        } else {
          const errorData = await userCreateResponse.json();
          console.error('[Auth0 Exchange] User creation/update failed:', errorData);
        }
      } catch (error) {
        console.error('[Auth0 Exchange] Error creating/updating user:', error);
      }

      // Now create backend session
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
        needsOnboarding: backendSession?.needs_onboarding || backendUser?.needs_onboarding || false,
        tenantId: backendSession?.user?.tenant_id || backendUser?.tenant_id
      };
      
      // Set session cookies and return success
      const response = NextResponse.json({ 
        success: true, 
        user: user,
        authenticated: backendSession?.authenticated || false,
        needsOnboarding: backendSession?.needs_onboarding || backendUser?.needs_onboarding || false,
        tenantId: backendSession?.user?.tenant_id || backendUser?.tenant_id
      });
      
      // Set the Auth0 session cookie
      const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = isProduction ? '.dottapps.com' : undefined;
      
      const baseCookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        ...(cookieDomain && { domain: cookieDomain })
      };
      
      response.cookies.set('appSession', sessionCookie, {
        ...baseCookieOptions,
        maxAge: tokens.expires_in || 3600
      });
      
      // Set backend session token if available
      if (backendSession?.session_token) {
        response.cookies.set('sid', backendSession.session_token, {
          ...baseCookieOptions,
          maxAge: 86400 // 24 hours
        });
        response.cookies.set('session_token', backendSession.session_token, {
          ...baseCookieOptions,
          maxAge: 86400 // 24 hours
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