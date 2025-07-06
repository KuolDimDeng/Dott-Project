import { NextResponse } from 'next/server';

/**
 * Cloudflare-compatible session creation endpoint
 * Creates sessions directly with the backend using Cloudflare-friendly settings
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
console.log('[CloudflareSession] API_URL configuration:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  API_URL: API_URL,
  NODE_ENV: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  isUsingDefault: !process.env.NEXT_PUBLIC_API_URL,
  hostHeader: 'N/A', // Will be set in request
  apiHostname: new URL(API_URL).hostname,
  apiProtocol: new URL(API_URL).protocol
});

// Helper function to test DNS resolution
async function testDNSResolution(hostname) {
  try {
    const dns = await import('dns').then(m => m.promises);
    const addresses = await dns.resolve4(hostname);
    return { success: true, addresses, hostname };
  } catch (error) {
    return { success: false, error: error.message, hostname };
  }
}

export async function POST(request) {
  try {
    console.log('[CloudflareSession] Creating session through Cloudflare-compatible endpoint');
    
    // Test DNS resolution for the API URL
    const apiHostname = new URL(API_URL).hostname;
    const dnsTest = await testDNSResolution(apiHostname);
    console.log('[CloudflareSession] DNS resolution test:', dnsTest);
    
    const data = await request.json();
    
    // Get real IP and Cloudflare headers
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const cfRay = request.headers.get('cf-ray');
    const cfCountry = request.headers.get('cf-ipcountry');
    const origin = request.headers.get('origin') || 'https://dottapps.com';
    
    console.log('[CloudflareSession] Request data:', {
      hasEmail: !!data.email,
      hasPassword: !!data.password,
      hasAuth0Token: !!data.auth0_token,
      hasAuth0Sub: !!data.auth0_sub,
      cfRay: cfRay,
      cfCountry: cfCountry,
      origin: origin,
      hostHeader: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      allHeaders: Object.fromEntries(request.headers.entries())
    });
    
    // Call backend Cloudflare session endpoint with cache bypass
    const timestamp = Date.now();
    const endpoint = `${API_URL}/api/sessions/cloudflare/create/?_t=${timestamp}`;
    console.log('[CloudflareSession] Calling backend:', endpoint);
    console.log('[CloudflareSession] Full URL breakdown:', {
      protocol: new URL(endpoint).protocol,
      hostname: new URL(endpoint).hostname,
      pathname: new URL(endpoint).pathname,
      searchParams: new URL(endpoint).searchParams.toString(),
      fullUrl: endpoint
    });
    
    // Add DNS resolution logging
    console.log('[CloudflareSession] Attempting to resolve DNS for:', new URL(endpoint).hostname);
    console.log('[CloudflareSession] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      BACKEND_API_URL: process.env.BACKEND_API_URL,
      isProduction: process.env.NODE_ENV === 'production',
      isRender: !!process.env.RENDER,
      renderServiceName: process.env.RENDER_SERVICE_NAME
    });
    
    // Add pre-flight test to check connectivity
    console.log('[CloudflareSession] Testing connectivity to backend...');
    try {
      const testResponse = await fetch(`${API_URL}/health/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dott-Frontend-Test'
        }
      });
      console.log('[CloudflareSession] Health check response:', {
        status: testResponse.status,
        ok: testResponse.ok,
        headers: Object.fromEntries(testResponse.headers.entries())
      });
    } catch (testError) {
      console.error('[CloudflareSession] Health check failed:', {
        message: testError.message,
        type: testError.constructor.name,
        code: testError.code
      });
    }
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Force no cache and DNS refresh
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-DNS-Prefetch-Control': 'off',
          // Forward Cloudflare headers
          ...(cfConnectingIp && { 'CF-Connecting-IP': cfConnectingIp }),
          ...(cfRay && { 'CF-Ray': cfRay }),
          ...(cfCountry && { 'CF-IPCountry': cfCountry }),
          // Add origin for CORS
          'Origin': origin,
          // Forward the real user agent
          'User-Agent': request.headers.get('user-agent') || 'NextJS-Frontend'
        },
        body: JSON.stringify(data)
      });
    } catch (fetchError) {
      console.error('[CloudflareSession] Network error:', {
        message: fetchError.message,
        type: fetchError.constructor.name,
        cause: fetchError.cause,
        apiUrl: API_URL,
        stack: fetchError.stack,
        endpoint: endpoint,
        errorCode: fetchError.code,
        errorErrno: fetchError.errno,
        errorSyscall: fetchError.syscall,
        timestamp: new Date().toISOString(),
        envVars: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          BACKEND_API_URL: process.env.BACKEND_API_URL,
          NODE_ENV: process.env.NODE_ENV
        }
      });
      
      // Check if this is a DNS error
      if (fetchError.message.includes('ENOTFOUND') || 
          fetchError.message.includes('getaddrinfo') ||
          fetchError.message.includes('DNS')) {
        return NextResponse.json({
          error: 'Backend unavailable',
          message: 'The backend server is temporarily unavailable. This is likely a DNS issue that should resolve shortly.',
          details: `DNS lookup failed for ${API_URL}`,
          debugInfo: {
            apiUrl: API_URL,
            errorType: 'DNS_RESOLUTION_FAILED',
            timestamp: new Date().toISOString()
          }
        }, { status: 503 });
      }
      
      return NextResponse.json({
        error: 'Network error',
        message: fetchError.message,
        details: 'Unable to connect to backend server'
      }, { status: 503 });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CloudflareSession] Raw error response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorTextLength: errorText.length,
        isCloudflareError: errorText.includes('Cloudflare'),
        hasError1000: errorText.includes('Error 1000') || errorText.includes('DNS points to prohibited IP'),
        isDNSError: errorText.includes('DNS points to prohibited IP'),
        errorPreview: errorText.substring(0, 200),
        apiEndpoint: endpoint,
        apiHost: API_URL,
        timestamp: new Date().toISOString(),
        cfRayId: response.headers.get('cf-ray'),
        isProhibitedIP: errorText.includes('prohibited IP')
      });
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: 'Session creation failed', details: errorText };
      }
      console.error('[CloudflareSession] Backend error:', {
        status: response.status,
        error: error,
        requestData: {
          hasEmail: !!data.email,
          hasAuth0Token: !!data.auth0_token,
          auth0Sub: data.auth0_sub
        },
        isDNSIssue: error.details && error.details.includes('DNS points to prohibited IP'),
        suggestion: error.details && error.details.includes('DNS points to prohibited IP') 
          ? 'DNS configuration issue detected. API URL may be pointing to a Cloudflare IP address.'
          : 'Unknown error'
      });
      
      // If it's a DNS error, provide a more user-friendly message
      if (error.details && error.details.includes('DNS points to prohibited IP')) {
        console.error('[CloudflareSession] Detected DNS/Cloudflare Error 1000');
        return NextResponse.json({
          error: 'DNS Configuration Issue',
          message: 'The API server is temporarily unavailable due to DNS configuration. Please contact support or try again later.',
          technicalDetails: {
            originalError: error.error,
            apiUrl: API_URL,
            suggestion: 'The API domain is resolving to a Cloudflare IP which is prohibited. DNS configuration needs to be updated.',
            actualErrorText: errorText.substring(0, 500),
            isHtmlError: errorText.includes('<!DOCTYPE'),
            errorCode: response.headers.get('cf-error-code') || 'unknown'
          }
        }, { status: 503 });
      }
      
      return NextResponse.json(error, { status: response.status });
    }
    
    const sessionData = await response.json();
    console.log('[CloudflareSession] Session created successfully:', {
      authenticated: sessionData.authenticated,
      hasUser: !!sessionData.user,
      hasTenant: !!sessionData.tenant,
      userEmail: sessionData.user?.email
    });
    
    // Create response with success flag
    const responseData = {
      success: true,
      authenticated: sessionData.authenticated,
      session_token: sessionData.session_token,
      user: sessionData.user,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.user?.needsOnboarding || sessionData.needsOnboarding || false
    };
    
    const frontendResponse = NextResponse.json(responseData);
    
    // Set cookies on frontend response with Cloudflare-compatible settings
    if (sessionData.session_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // For production with Cloudflare, use specific settings
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Only secure in production
        sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for better compatibility
        maxAge: 86400, // 24 hours
        path: '/'
        // Don't set domain to allow it to default to current domain
      };
      
      console.log('[CloudflareSession] Setting cookies with options:', cookieOptions);
      
      frontendResponse.cookies.set('sid', sessionData.session_token, cookieOptions);
      frontendResponse.cookies.set('session_token', sessionData.session_token, cookieOptions);
      
      // Clear any old cookies that might interfere
      const oldCookies = ['dott_auth_session', 'appSession', 'session_pending'];
      oldCookies.forEach(name => {
        frontendResponse.cookies.delete(name);
      });
    }
    
    // Add CORS headers for Cloudflare
    frontendResponse.headers.set('Access-Control-Allow-Origin', origin);
    frontendResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return frontendResponse;
    
  } catch (error) {
    console.error('[CloudflareSession] Error:', error);
    return NextResponse.json(
      { error: 'Session creation failed', details: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://dottapps.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}