import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { auth0: segments } = await params;
    const route = segments?.join('/') || '';
    
    console.log('[Auth Route] Handling route:', route);
    
    const url = new URL(request.url);
    
    // Handle login route
    if (route === 'login') {
      const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` + 
        new URLSearchParams({
          response_type: 'code',
          client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
          scope: 'openid profile email',
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
        });
      
      console.log('[Auth Route] Redirecting to Auth0:', loginUrl);
      return NextResponse.redirect(loginUrl);
    }
    
    // Handle logout route  
    if (route === 'logout') {
      console.log('[Auth Route] Processing logout request');
      
      // **TEMP FIX: Use signin URL (likely whitelisted) with logout parameter**
      const returnToUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?logout=true`;
      
      const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +
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
        
        // Redirect to frontend callback with session cookie
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`);
        
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