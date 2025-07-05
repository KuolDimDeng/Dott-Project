import { NextResponse } from 'next/server';

/**
 * Universal Login Route
 * This bypasses the embedded login form and goes directly to Auth0's hosted login page
 */
export async function GET(request) {
  try {
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    
    // Build authorize URL for Universal Login
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/auth/callback`,
      scope: 'openid profile email',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
      state: Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        returnTo: searchParams.get('returnTo') || '/dashboard'
      })).toString('base64')
    });
    
    // Add any additional parameters
    const loginHint = searchParams.get('login_hint');
    if (loginHint) {
      params.append('login_hint', loginHint);
    }
    
    const connection = searchParams.get('connection');
    if (connection) {
      params.append('connection', connection);
    }
    
    // Force Universal Login (not embedded)
    params.append('prompt', 'login');
    
    const loginUrl = `https://${auth0Domain}/authorize?${params}`;
    
    console.log('[Universal Login] Redirecting to:', loginUrl);
    
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[Universal Login] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}