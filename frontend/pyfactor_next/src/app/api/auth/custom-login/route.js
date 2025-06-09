import { NextResponse } from 'next/server';

/**
 * Custom Domain Login Route
 * This handles login through Auth0 custom domain with proper configuration
 */
export async function GET(request) {
  try {
    // Use custom domain explicitly
    const customDomain = 'auth.dottapps.com';
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID not configured' }, { status: 500 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    
    // Build authorize URL with custom domain
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/auth/callback`,
      scope: 'openid profile email',
      audience: 'https://api.dottapps.com',
      state: Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        returnTo: searchParams.get('returnTo') || '/dashboard'
      })).toString('base64')
    });
    
    // Add optional parameters
    const loginHint = searchParams.get('login_hint');
    if (loginHint) {
      params.append('login_hint', loginHint);
    }
    
    const connection = searchParams.get('connection');
    if (connection) {
      params.append('connection', connection);
    }
    
    // IMPORTANT: For custom domains, we need to specify the mode
    params.append('mode', 'login');
    
    const loginUrl = `https://${customDomain}/authorize?${params}`;
    
    console.log('[Custom Login] Redirecting to:', loginUrl);
    
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[Custom Login] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}