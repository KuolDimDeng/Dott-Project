import { NextResponse } from 'next/server';

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 */
export async function GET(request) {
  try {
    console.log('[Auth Login Route] Processing login request');
    
    // Get Auth0 configuration from environment variables
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
    
    console.log('[Auth Login Route] Using Auth0 domain:', auth0Domain);
    console.log('[Auth Login Route] Base URL:', baseUrl);
    
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
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with headers to prevent RSC payload fetch
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-middleware-rewrite', request.url);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Auth Login Route] Error:', error);
    return NextResponse.json({ 
      error: 'Login redirect failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
