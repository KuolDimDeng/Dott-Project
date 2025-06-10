import { NextResponse } from 'next/server';
// Remove Edge Runtime import as it's not compatible with current Auth0 SDK version
// import { withAuth0 } from '@auth0/nextjs-auth0/edge';

export async function GET(request, { params }) {
  try {
    const { auth0: segments } = await params;
    const route = segments?.join('/') || '';
    
    console.log('[Auth Route] Handling route:', route);
    
    const url = new URL(request.url);
    
    // Handle login route
    if (route === 'login') {
    try {
      console.log('[Auth Route] Processing login request with enhanced error handling');
      
      // Get Auth0 configuration from environment variables
      // Always use custom domain for embedded login experience
      const auth0Domain = 'auth.dottapps.com'; // Force custom domain
      const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
      const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
      
      console.log('[Auth Route] Using Auth0 domain:', auth0Domain);
      console.log('[Auth Route] Base URL:', baseUrl);
      
      // Verify required configuration
      if (!auth0Domain) {
        throw new Error('Auth0 domain not configured');
      }
      
      if (!clientId) {
        throw new Error('Auth0 client ID not configured');
      }
      
      // Create Auth0 authorize URL with validated parameters
      const loginParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        scope: 'openid profile email',
        audience: audience,
      });
      
      const loginUrl = `https://${auth0Domain}/authorize?${loginParams}`;
      
      console.log('[Auth Route] Redirecting to Auth0:', loginUrl);
      
      // Create redirect response with headers to prevent RSC payload fetch
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('x-middleware-rewrite', request.url);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return response;
    } catch (error) {
      console.error('[Auth Route] Login route error:', error);
      return NextResponse.json({ 
        error: 'Login redirect failed', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    }
    
    // Handle logout route  
    if (route === 'logout') {
      console.log('[Auth Route] Processing logout request');
      
      // Get current session to extract important data before logout
      const sessionCookie = request.cookies.get('appSession');
      let onboardingComplete = false;
      let tenantId = '';
      let crispEmail = '';
      let crispNickname = '';
      
      // Try to extract onboarding status and tenant ID from session before deleting
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
          if (sessionData.user) {
            // Check all possible locations for onboarding status
            const userMetadata = sessionData.user['https://dottapps.com/user_metadata'] || {};
            const appMetadata = sessionData.user['https://dottapps.com/app_metadata'] || {};
            
            // Check for onboarding completion in various metadata locations
            onboardingComplete = 
              userMetadata.onboardingComplete === 'true' || 
              userMetadata.custom_onboardingComplete === 'true' ||
              userMetadata.custom_onboarding === 'complete' ||
              appMetadata.onboardingComplete === 'true';
            
            // Extract tenant ID from various possible locations
            tenantId = userMetadata.tenantId || 
                      userMetadata.custom_tenantId || 
                      sessionData.user.custom_tenantId ||
                      sessionData.user.tenantId || 
                      '';
            
            // Extract Crisp data for session preservation
            crispEmail = sessionData.user.email || '';
            crispNickname = sessionData.user.name || sessionData.user.nickname || '';
                      
            console.log('[Auth Route] Extracted from session - onboardingComplete:', onboardingComplete, 'tenantId:', tenantId);
            
            // If we have a tenant ID but onboarding status is unclear, 
            // try to check localStorage as a last resort
            if (tenantId && !onboardingComplete) {
              // Can't directly access localStorage from server, but we'll set a flag
              // to check it on the client side during the signin redirect
              console.log('[Auth Route] Will check localStorage on client side');
            }
          }
        } catch (error) {
          console.error('[Auth Route] Error extracting session data:', error);
        }
      }
      
      // Create return URL - redirect to home page on logout
      let returnToUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/`;
      // Add logout=true parameter to indicate the user just signed out
      returnToUrl += '?logout=true';
      
      // Preserve onboarding status if completed
      // Preserve Crisp session data
      if (crispEmail) {
        returnToUrl += `&crispEmail=${encodeURIComponent(crispEmail)}`;
      }
      if (crispNickname) {
        returnToUrl += `&crispNickname=${encodeURIComponent(crispNickname)}`;
      }
      
      if (onboardingComplete && tenantId) {
        returnToUrl += `&preserveOnboarding=true&tenantId=${tenantId}`;
      } else if (tenantId) {
        // If we have tenantId but couldn't confirm onboarding status, 
        // add a flag to check localStorage on client side
        returnToUrl += `&checkLocalStorage=true&tenantId=${tenantId}`;
      }
      
      const logoutUrl = 'https://auth.dottapps.com/v2/logout?' +
        new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          returnTo: returnToUrl,
        });
      
      console.log('[Auth Route] Logout URL:', logoutUrl);
      console.log('[Auth Route] Return URL:', returnToUrl);
      
      // Clear session cookies before redirect
      const response = NextResponse.redirect(logoutUrl);
      
      // Clear all auth-related cookies
      response.cookies.delete('appSession');
      response.cookies.delete('auth0.is.authenticated');
      response.cookies.delete('auth0-session');
      
      // Set additional headers to prevent caching
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      console.log('[Auth Route] Redirecting to Auth0 logout with cleared cookies');
      return response;
    }
    
    // Handle callback route - Exchange code for tokens and create session
    if (route === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      
      if (error) {
        console.error('[Auth Route] Auth0 error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=${error}`);
      }
      
      if (!code) {
        console.error('[Auth Route] No authorization code received');
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=no_code`);
      }
      
      try {
        console.log('[Auth Route] Exchanging code for tokens...');
        
        // Exchange authorization code for tokens
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
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
          }),
        });
        
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('[Auth Route] Token exchange failed:', errorData);
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=token_exchange_failed`);
        }
        
        const tokens = await tokenResponse.json();
        console.log('[Auth Route] Token exchange successful');
        
        // Get user info
        const userResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        
        if (!userResponse.ok) {
          console.error('[Auth Route] Failed to get user info');
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=user_info_failed`);
        }
        
        const user = await userResponse.json();
        console.log('[Auth Route] User info retrieved:', user.email);
        
        // Create session data
        const sessionData = {
          user: user,
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
        };
        
        // Check URL params for preserved onboarding status
        const url = new URL(request.url);
        const preserveOnboarding = url.searchParams.get('preserveOnboarding') === 'true';
        const preservedTenantId = url.searchParams.get('tenantId');
        
        // Build callback URL with preserved information if available
        let callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;
        if (preserveOnboarding && preservedTenantId) {
          callbackUrl += `?cachedStatus=complete&tenantId=${preservedTenantId}`;
        }
        
        // Redirect to frontend callback with session cookie
        const response = NextResponse.redirect(callbackUrl);
        
        // Set session cookie
        const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        response.cookies.set('appSession', sessionCookie, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: tokens.expires_in || 3600,
          path: '/'
        });
        
        return response;
        
      } catch (error) {
        console.error('[Auth Route] Callback processing error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=callback_failed`);
      }
    }
    
    // Default response
    return NextResponse.json({ error: 'Unknown auth route' }, { status: 404 });
    
  } catch (error) {
    console.error('[Auth Route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
