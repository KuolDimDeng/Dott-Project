import { NextResponse } from 'next/server';

// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 * Version: Updated to fix 500 error and improve domain handling
 */
export async function GET(request) {
  if (AUTH_DEBUG) {
    console.debug('[AUTH0-LOGIN] Auth login route called');
    console.debug('[AUTH0-LOGIN] Available environment variables:', {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    });
  }
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
      
    // Normalize domain to ensure consistent format
    const normalizeDomain = (domain) => {
      // Add https if protocol is missing
      let normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`;
      // Remove trailing slash if present
      normalizedDomain = normalizedDomain.endsWith('/') ? normalizedDomain.slice(0, -1) : normalizedDomain;
      console.log('[Auth Login Route] Normalized domain:', normalizedDomain);
      return normalizedDomain;
    };
    
    const cleanDomainUrl = normalizeDomain(domainUrl);
    
    const loginUrl = `${cleanDomainUrl}/authorize?${loginParams}`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with proper cache headers
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    // Enhanced error handling with telemetry
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      auth0Domain,
      baseUrl,
      clientIdAvailable: !!clientId,
      nodeEnv: process.env.NODE_ENV
    };
    console.error('[Auth Login Route] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Log specific error types to help with troubleshooting
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[Auth Login Route] Network error: Unable to connect to Auth0 domain. This could indicate DNS issues or networking problems.');
    } else if (error.message.includes('certificate')) {
      console.error('[Auth Login Route] SSL error: There may be issues with the SSL certificate for the Auth0 domain.');
    }
    console.error('[Auth Login Route] Error:', error);
    return NextResponse.json({ 
      error: 'Login redirect failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}