import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Extract Auth0 configuration
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';

    // Construct Auth0 authorization URL
    const authUrl = new URL(`https://${auth0Domain}/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('audience', audience);

    console.log('[Login Route] Redirecting to Auth0:', authUrl.toString());
    
    // Redirect to Auth0 for authentication
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[Login Route] Error:', error);
    return NextResponse.json({ error: 'Login configuration error' }, { status: 500 });
  }
}

export async function POST(request) {
  // For POST requests, redirect to GET handler
  return GET(request);
}
