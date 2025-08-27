import { NextRequest, NextResponse } from 'next/server';

// Track used codes to prevent replay attacks
const usedCodes = new Map();

// Clean expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, timestamp] of usedCodes.entries()) {
    if (now - timestamp > 600000) { // 10 minutes
      usedCodes.delete(code);
    }
  }
}, 300000);

export async function GET(request) {
  const startTime = Date.now();
  console.log('🔄 [Exchange-V2] Starting OAuth token exchange');
  
  // Determine the proper base URL to use for redirects
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging.dottapps.com';
  
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('[Exchange-V2] OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${error}`, baseUrl)
      );
    }
    
    // Validate required parameters
    if (!code) {
      console.error('[Exchange-V2] Missing authorization code');
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', baseUrl)
      );
    }
    
    // Check for code reuse
    if (usedCodes.has(code)) {
      console.error('[Exchange-V2] Authorization code already used');
      return NextResponse.redirect(
        new URL('/auth/error?error=code_reused', baseUrl)
      );
    }
    
    // Mark code as used
    usedCodes.set(code, Date.now());
    
    // Get PKCE verifier from cookie
    const verifier = request.cookies.get('auth0_verifier');
    if (!verifier) {
      console.warn('[Exchange-V2] No PKCE verifier found');
    }
    
    // Exchange code for tokens via backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${apiUrl}/api/auth/oauth-exchange/`;
    
    // Use the same base URL we use for redirects
    const redirectUri = `${baseUrl}/auth/oauth-callback`;
    
    console.log('[Exchange-V2] Calling backend exchange:', backendUrl);
    console.log('[Exchange-V2] Using redirect_uri:', redirectUri);
    
    const exchangeResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier?.value || null,
        state
      })
    });
    
    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json().catch(() => ({}));
      console.error('[Exchange-V2] Backend exchange failed:', errorData);
      const errorDetails = errorData.error || errorData.message || 'Unknown error';
      return NextResponse.redirect(
        new URL(`/auth/error?error=exchange_failed&details=${encodeURIComponent(errorDetails)}`, baseUrl)
      );
    }
    
    const exchangeData = await exchangeResponse.json();
    console.log('[Exchange-V2] Exchange response from backend:', JSON.stringify(exchangeData, null, 2));
    console.log('[Exchange-V2] Exchange successful:', {
      hasUser: !!exchangeData.user,
      hasSessionToken: !!exchangeData.session_token,
      hasToken: !!exchangeData.token,
      hasAccessToken: !!exchangeData.access_token,
      sessionTokenLength: exchangeData.session_token?.length,
      needsOnboarding: exchangeData.needs_onboarding,
      authenticated: exchangeData.authenticated
    });
    
    // Check for session token in different possible fields
    const sessionToken = exchangeData.session_token || 
                        exchangeData.token || 
                        exchangeData.access_token ||
                        exchangeData.sessionToken;
    
    if (!sessionToken) {
      console.error('[Exchange-V2] No session token received from backend');
      console.error('[Exchange-V2] Full response:', exchangeData);
      return NextResponse.redirect(
        new URL('/auth/error?error=no_session_token', baseUrl)
      );
    }
    
    // Always redirect to callback-v2 which will handle onboarding check
    const response = NextResponse.redirect(
      new URL('/auth/callback-v2', baseUrl)
    );
    
    // Set session cookie (sid) - single source of truth
    if (exchangeData.session_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      const isStaging = baseUrl.includes('staging');
      
      console.log('[Exchange-V2] Setting session cookie:', {
        isProduction,
        isStaging,
        tokenLength: exchangeData.session_token.length,
        domain: isProduction || isStaging ? '.dottapps.com' : undefined
      });
      
      // Main session cookie
      response.cookies.set('sid', exchangeData.session_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // Use 'none' for cross-origin requests with Cloudflare
        path: '/',
        maxAge: 86400, // 24 hours
        ...((isProduction || isStaging) && { domain: '.dottapps.com' })
      });
      
      // Get OAuth provider from cookie to handle provider-specific data
      const provider = request.cookies.get('oauth_provider')?.value || 'google';
      
      // Set user data in a separate cookie for client access
      let userData = {
        email: exchangeData.user?.email,
        provider: provider,
        picture: exchangeData.user?.picture,
        tenantId: exchangeData.user?.tenant_id
      };
      
      // Handle provider-specific user data
      if (provider === 'apple') {
        // Apple provides name only on first sign-in
        userData.firstName = exchangeData.user?.given_name || 
                           exchangeData.user?.fullName?.givenName || 
                           exchangeData.user?.first_name || 
                           '';
        userData.lastName = exchangeData.user?.family_name || 
                          exchangeData.user?.fullName?.familyName || 
                          exchangeData.user?.last_name || 
                          '';
        userData.name = exchangeData.user?.name || 
                       `${userData.firstName} ${userData.lastName}`.trim() ||
                       exchangeData.user?.email?.split('@')[0];
        
        // Handle Apple's private relay email
        userData.isPrivateRelay = userData.email?.includes('@privaterelay.appleid.com');
      } else {
        // Google/other provider data handling
        userData.firstName = exchangeData.user?.given_name || 
                           exchangeData.user?.first_name || '';
        userData.lastName = exchangeData.user?.family_name || 
                          exchangeData.user?.last_name || '';
        userData.name = exchangeData.user?.name;
      }
      
      response.cookies.set('user_data', JSON.stringify(userData), {
        httpOnly: false, // Allow client access
        secure: true,
        sameSite: 'none', // Use 'none' for cross-origin requests with Cloudflare
        path: '/',
        maxAge: 86400,
        ...((isProduction || isStaging) && { domain: '.dottapps.com' })
      });
    }
    
    // Clean up OAuth cookies
    response.cookies.delete('auth0_state');
    response.cookies.delete('auth0_verifier');
    response.cookies.delete('auth0_nonce');
    
    console.log(`[Exchange-V2] Completed in ${Date.now() - startTime}ms, redirecting to /auth/callback-v2`);
    return response;
    
  } catch (error) {
    console.error('[Exchange-V2] Unexpected error:', error);
    return NextResponse.redirect(
      new URL(`/auth/error?error=unexpected_error&details=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }
}