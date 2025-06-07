import { NextResponse } from 'next/server';

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 * Version: Updated to fix 500 error and improve domain handling
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
    console.log('[Auth Login Route] Client ID available:', !!clientId);
    
    // Enhanced validation
    if (!auth0Domain) {
      console.error('[Auth Login Route] Auth0 domain not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 domain not configured'
      }, { status: 500 });
    }
    
    if (!clientId) {
      console.error('[Auth Login Route] Auth0 client ID not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 client ID not configured'
      }, { status: 500 });
    }
    
    // Verify domain format
    if (!auth0Domain.includes('.') || auth0Domain.startsWith('http')) {
      console.error('[Auth Login Route] Invalid Auth0 domain format:', auth0Domain);
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: `Invalid Auth0 domain format: ${auth0Domain}`
      }, { status: 500 });
    }
    
    // Handle redirect URI
    const redirectUri = `${baseUrl}/api/auth/callback`;
    console.log('[Auth Login Route] Redirect URI:', redirectUri);
    
    // Create Auth0 authorize URL with validated parameters
    const loginParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      audience: audience,
    });
    
    // Add state parameter for security
    const state = Buffer.from(Date.now().toString()).toString('base64');
    loginParams.append('state', state);
    
    // Ensure domain uses https and doesn't have trailing slash
    const domainUrl = auth0Domain.startsWith('http') 
      ? auth0Domain 
      : `https://${auth0Domain}`;
      
    const cleanDomainUrl = domainUrl.endsWith('/') 
      ? domainUrl.slice(0, -1) 
      : domainUrl;
    
    const loginUrl = `${cleanDomainUrl}/authorize?${loginParams}`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with proper cache headers
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
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