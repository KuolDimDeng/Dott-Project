import { NextResponse } from 'next/server';

// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;

/**
 * Auth0 login route handler
 * This provides a dedicated endpoint for Auth0 login redirects
 * Version: Updated to fix 500 error and improve domain handling
 */
export async function GET(request) {
  // Check if this is a prefetch request and block it
  const headers = request.headers;
  const isPrefetch = headers.get('x-purpose') === 'prefetch' || 
                     headers.get('purpose') === 'prefetch' ||
                     headers.get('sec-fetch-dest') === 'empty';
  
  if (isPrefetch) {
    // Return a response that tells Next.js not to prefetch this route
    return new Response(null, {
      status: 204,
      headers: {
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  }
  
  // Pre-declare variables for proper error handling scope
  let auth0Domain = 'auth.dottapps.com'; // Default to custom domain
  let clientId = null;
  let baseUrl = 'https://dottapps.com';
  let audience = 'https://api.dottapps.com';
  
  if (AUTH_DEBUG) {
    console.debug('[AUTH0-LOGIN] Auth login route called');
    console.debug('[AUTH0-LOGIN] Available environment variables:', {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'Not set',
      NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'Not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    });
  }
  
  try {
    console.log('[Auth Login Route] Processing login request');
    
    // Get Auth0 configuration from environment variables with fallbacks
    auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'auth.dottapps.com';
    clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH0_BASE_URL || 'https://dottapps.com';
    audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE || 'https://api.dottapps.com';
    
    console.log('[Auth Login Route] Using Auth0 domain:', auth0Domain);
    console.log('[Auth Login Route] Base URL:', baseUrl);
    console.log('[Auth Login Route] Client ID available:', !!clientId);
    
    // Enhanced validation
    if (!auth0Domain) {
      console.error('[Auth Login Route] Auth0 domain not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 domain not configured',
        env: process.env.NODE_ENV,
        availableVars: {
          NEXT_PUBLIC_AUTH0_DOMAIN: !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
          AUTH0_DOMAIN: !!process.env.AUTH0_DOMAIN
        }
      }, { status: 500 });
    }
    
    if (!clientId) {
      console.error('[Auth Login Route] Auth0 client ID not configured');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Auth0 client ID not configured',
        env: process.env.NODE_ENV,
        availableVars: {
          NEXT_PUBLIC_AUTH0_CLIENT_ID: !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          AUTH0_CLIENT_ID: !!process.env.AUTH0_CLIENT_ID
        }
      }, { status: 500 });
    }
    
    // Force auth.dottapps.com as the domain if we're using the default Auth0 domain
    if (auth0Domain.includes('.auth0.com')) {
      console.warn('[Auth Login Route] Detected default Auth0 domain, forcing custom domain');
      auth0Domain = 'auth.dottapps.com';
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
    
    // Handle additional parameters from the request
    const { searchParams } = new URL(request.url);
    
    // Add login_hint if provided (for email pre-fill)
    const loginHint = searchParams.get('login_hint');
    if (loginHint) {
      loginParams.append('login_hint', loginHint);
    }
    
    // Add connection if specified (e.g., google-oauth2)
    const connection = searchParams.get('connection');
    if (connection) {
      loginParams.append('connection', connection);
    }
    
    // Add screen_hint if specified (e.g., signup)
    const screenHint = searchParams.get('screen_hint');
    if (screenHint) {
      loginParams.append('screen_hint', screenHint);
    }
    
    // Normalize domain to ensure consistent format
    // Ensure domain is in the correct format
    const normalizeDomain = (domain) => {
      // Remove any protocol prefix if present
      let cleanDomain = domain.replace(/^https?:\/\//i, '');
      
      // Remove trailing slash if present
      cleanDomain = cleanDomain.endsWith('/') ? cleanDomain.slice(0, -1) : cleanDomain;
      
      console.log('[Auth Login Route] Normalized domain:', cleanDomain);
      return cleanDomain;
    };
    
    const cleanDomain = normalizeDomain(auth0Domain);
    
    // Construct the URL in the same way as [...auth0]/route.js for consistency
    const loginUrl = `https://${cleanDomain}/authorize?${loginParams}`;
    
    console.log('[Auth Login Route] Redirecting to Auth0:', loginUrl);
    
    // Create redirect response with proper cache headers
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    // Enhanced error handling with telemetry - variables are now in scope
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
      auth0Domain,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}