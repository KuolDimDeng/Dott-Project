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
    // IMPORTANT: Force custom domain for embedded login to work properly
    auth0Domain = 'auth.dottapps.com'; // Force custom domain - required for email/password
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
    
    // Log which domain we're using
    console.log('[Auth Login Route] Using Auth0 domain:', auth0Domain);
    
    // Verify domain format
    if (!auth0Domain.includes('.') || auth0Domain.startsWith('http')) {
      console.error('[Auth Login Route] Invalid Auth0 domain format:', auth0Domain);
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: `Invalid Auth0 domain format: ${auth0Domain}`
      }, { status: 500 });
    }
    
    // Forward to the main Auth0 route handler instead of handling directly
    const { searchParams } = new URL(request.url);
    
    // Build the URL for the main Auth0 handler
    const forwardUrl = new URL(`${baseUrl}/api/auth/login`);
    
    // Copy all query parameters
    for (const [key, value] of searchParams) {
      forwardUrl.searchParams.set(key, value);
    }
    
    // Add connection if not already specified
    if (!forwardUrl.searchParams.has('connection') && searchParams.get('connection')) {
      forwardUrl.searchParams.set('connection', searchParams.get('connection'));
    }
    
    console.log('[Auth Login Route] Forwarding to main Auth0 handler:', forwardUrl.toString());
    
    // Redirect to the main Auth0 handler which will properly set cookies
    const response = NextResponse.redirect(forwardUrl);
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