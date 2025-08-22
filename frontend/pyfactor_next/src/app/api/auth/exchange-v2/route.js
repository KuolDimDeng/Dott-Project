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
    
    console.log('[Exchange-V2] Calling backend exchange:', backendUrl);
    
    const exchangeResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/oauth-callback`,
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
    console.log('[Exchange-V2] Exchange successful:', {
      hasUser: !!exchangeData.user,
      hasSessionToken: !!exchangeData.session_token,
      needsOnboarding: exchangeData.needs_onboarding
    });
    
    // Always redirect to callback-v2 which will handle onboarding check
    const response = NextResponse.redirect(
      new URL('/auth/callback-v2', baseUrl)
    );
    
    // Set session cookie (sid) - single source of truth
    if (exchangeData.session_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Main session cookie
      response.cookies.set('sid', exchangeData.session_token, {
        httpOnly: true,
        secure: true,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 86400, // 24 hours
        ...(isProduction && { domain: '.dottapps.com' })
      });
      
      // Set user data in a separate cookie for client access
      const userData = {
        email: exchangeData.user?.email,
        name: exchangeData.user?.name,
        picture: exchangeData.user?.picture,
        tenantId: exchangeData.user?.tenant_id
      };
      
      response.cookies.set('user_data', JSON.stringify(userData), {
        httpOnly: false, // Allow client access
        secure: true,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 86400,
        ...(isProduction && { domain: '.dottapps.com' })
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