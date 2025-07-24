import { NextResponse } from 'next/server';

/**
 * Form-based session establishment endpoint
 * This is more reliable for setting cookies than AJAX in production
 */
export async function POST(request) {
  console.log('🔍 [EstablishSessionForm] ===== FORM SESSION ESTABLISHMENT START =====');
  console.log('🔍 [EstablishSessionForm] Timestamp:', new Date().toISOString());
  
  try {
    // Parse form data
    const formData = await request.formData();
    const token = formData.get('token');
    const redirectUrl = formData.get('redirectUrl') || '/dashboard';
    
    console.log('🔍 [EstablishSessionForm] Form data:');
    console.log('  - Token:', token ? `${token.substring(0, 20)}... (length: ${token.length})` : 'MISSING');
    console.log('  - Redirect URL:', redirectUrl);
    console.log('🔴 [EstablishSessionForm] CRITICAL: Full token:', token);
    console.log('🔴 [EstablishSessionForm] Token type check:', {
      isUUID: token && token.length === 36 && token.includes('-'),
      tokenValue: token
    });
    
    if (!token) {
      // Return error page
      return new NextResponse(
        `<html><body><h1>Error</h1><p>No session token provided</p></body></html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
    // Extract additional data that might be needed
    const userEmail = formData.get('userEmail');
    const accessToken = formData.get('accessToken');
    
    console.log('🔍 [EstablishSessionForm] Additional form data:');
    console.log('  - User Email:', userEmail);
    console.log('  - Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecureContext = request.headers.get('x-forwarded-proto') === 'https' || 
                           request.url.startsWith('https://') ||
                           isProduction;
    
    console.log('🔍 [EstablishSessionForm] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      isSecureContext,
      hostname: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      url: request.url
    });
    
    // Create redirect response with proper base URL
    // Check if we're on staging or production based on the actual host
    let baseUrl;
    const host = request.headers.get('host');
    
    if (host && host.includes('staging')) {
      // Staging environment
      baseUrl = `https://${host}`;
    } else if (isProduction) {
      // Production environment - but check the actual host to be sure
      baseUrl = host ? `https://${host}` : 'https://dottapps.com';
    } else {
      // Development environment
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${host}`;
    }
    
    const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : `${baseUrl}${redirectUrl}`;
    
    console.log('🔍 [EstablishSessionForm] Redirect URL construction:');
    console.log('  - Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('  - Base URL:', baseUrl);
    console.log('  - Relative redirect URL:', redirectUrl);
    console.log('  - Absolute redirect URL:', absoluteUrl);
    
    // Instead of redirect, return HTML with JavaScript that sets cookies then redirects
    // This approach works better with Cloudflare
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Setting up your session...</title>
  <script>
    // Set cookies via JavaScript
    const token = '${token}';
    const maxAge = 86400; // 24 hours
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    
    // Set cookies with all necessary attributes
    document.cookie = 'sid=' + token + '; path=/; max-age=' + maxAge + '; expires=' + expires + '; secure; samesite=none';
    document.cookie = 'session_token=' + token + '; path=/; max-age=' + maxAge + '; expires=' + expires + '; secure; samesite=none';
    
    // Redirect after cookies are set
    window.location.href = '${absoluteUrl}';
  </script>
</head>
<body>
  <p>Setting up your session...</p>
</body>
</html>`;
    
    console.log('✅ [EstablishSessionForm] Returning HTML to set cookies via JavaScript');
    console.log('🔍 [EstablishSessionForm] ===== FORM SESSION ESTABLISHMENT END =====');
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    });
    
  } catch (error) {
    console.error('❌ [EstablishSessionForm] Error:', error);
    console.error('❌ [EstablishSessionForm] Error stack:', error.stack);
    
    return new NextResponse(
      `<html><body><h1>Error</h1><p>Failed to establish session: ${error.message}</p></body></html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}