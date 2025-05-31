import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { auth0 } = params;
  const action = auth0[0];

  try {
    // Check required environment variables
    const domain = process.env.AUTH0_ISSUER_BASE_URL || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
    const clientId = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ';
    const baseUrl = process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';

    console.log('[Auth0] Action:', action);
    console.log('[Auth0] Domain:', domain);
    console.log('[Auth0] Client ID:', clientId);
    console.log('[Auth0] Base URL:', baseUrl);

    if (!domain || !clientId) {
      console.error('[Auth0] Missing required environment variables');
      return NextResponse.json(
        { error: 'Auth0 configuration missing' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'login':
        const loginUrl = `https://${domain}/authorize?` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback')}&` +
          `scope=openid profile email`;
        
        console.log('[Auth0] Login URL:', loginUrl);
        return NextResponse.redirect(loginUrl);

      case 'logout':
        // Clear local session cookies first
        const logoutResponse = NextResponse.redirect('/auth/signin');
        
        logoutResponse.cookies.set('auth0_logged_in', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0,
          sameSite: 'lax'
        });
        
        logoutResponse.cookies.set('auth0_user', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0,
          sameSite: 'lax'
        });
        
        console.log('[Auth0] Logout - cleared local session cookies');
        return logoutResponse;

      case 'callback':
        // Handle OAuth callback
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        console.log('[Auth0] Callback - Code:', !!code);
        console.log('[Auth0] Callback - Error:', error);
        console.log('[Auth0] Callback - Error Description:', errorDescription);

        if (error) {
          console.error('[Auth0] OAuth error:', error, errorDescription);
          return NextResponse.redirect(`/auth/signin?error=${error}&description=${encodeURIComponent(errorDescription || '')}`);
        }

        if (!code) {
          console.error('[Auth0] No authorization code received');
          return NextResponse.redirect('/auth/signin?error=no_code');
        }

        // For now, just set a simple session and redirect to dashboard
        // In production, you'd exchange the code for tokens
        const response = NextResponse.redirect('/dashboard');
        
        // Set a simple session cookie
        response.cookies.set('auth0_logged_in', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 86400, // 24 hours
          sameSite: 'lax'
        });

        response.cookies.set('auth0_user', JSON.stringify({
          sub: 'auth0|demo-user',
          email: 'user@example.com',
          name: 'Demo User',
          picture: 'https://via.placeholder.com/64'
        }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 86400, // 24 hours
          sameSite: 'lax'
        });

        console.log('[Auth0] Successfully processed callback, redirecting to dashboard');
        return response;

      default:
        console.error('[Auth0] Invalid action:', action);
        return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Auth0] Route error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication error',
        details: error.message,
        action: action || 'unknown'
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  return GET(request, { params });
} 