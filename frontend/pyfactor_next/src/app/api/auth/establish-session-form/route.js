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
    // In production, always use the production domain to avoid container addresses
    let baseUrl;
    if (isProduction) {
      // Always use production domain in production to avoid 0.0.0.0:10000 issues
      baseUrl = 'https://dottapps.com';
    } else {
      // In development, use environment variable or extract from request
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`;
    }
    
    const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : `${baseUrl}${redirectUrl}`;
    
    console.log('🔍 [EstablishSessionForm] Redirect URL construction:');
    console.log('  - Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('  - Base URL:', baseUrl);
    console.log('  - Relative redirect URL:', redirectUrl);
    console.log('  - Absolute redirect URL:', absoluteUrl);
    
    const response = NextResponse.redirect(absoluteUrl, 303);
    
    // Set cookies with explicit options
    const cookieOptions = {
      httpOnly: true,
      secure: isSecureContext, // Use secure context detection
      sameSite: isSecureContext ? 'none' : 'lax', // 'none' for secure contexts
      path: '/',
      maxAge: 86400, // 24 hours
      // Remove domain specification for better Cloudflare compatibility
      // Cloudflare will handle cookie domain automatically
    };
    
    console.log('🔍 [EstablishSessionForm] Setting cookies with options:', JSON.stringify(cookieOptions, null, 2));
    
    // Set both cookie variants
    response.cookies.set('sid', token, cookieOptions);
    response.cookies.set('session_token', token, cookieOptions);
    
    // Log the actual Set-Cookie headers
    console.log('🔍 [EstablishSessionForm] Getting Set-Cookie headers...');
    const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    console.log('🔍 [EstablishSessionForm] Set-Cookie headers:', setCookieHeaders);
    
    console.log('🔍 [EstablishSessionForm] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('✅ [EstablishSessionForm] Cookies set, redirecting to:', redirectUrl);
    console.log('🔍 [EstablishSessionForm] ===== FORM SESSION ESTABLISHMENT END =====');
    
    return response;
    
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