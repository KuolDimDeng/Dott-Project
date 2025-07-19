import { NextResponse } from 'next/server';

/**
 * AJAX version of establish-session endpoint
 * Returns JSON response instead of redirecting, allowing client-side navigation
 * This avoids potential issues with cookie setting during redirects
 */
export async function POST(request) {
  console.log('🔍 [EstablishSessionAjax] ===== AJAX SESSION ESTABLISHMENT START =====');
  console.log('🔍 [EstablishSessionAjax] Timestamp:', new Date().toISOString());
  console.log('🔍 [EstablishSessionAjax] Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('🔍 [EstablishSessionAjax] Request URL:', request.url);
  console.log('🔍 [EstablishSessionAjax] Request cookies:', request.cookies.getAll());
  
  try {
    const body = await request.json();
    console.log('🔍 [EstablishSessionAjax] Request body:', JSON.stringify(body, null, 2));
    
    const { token, redirectUrl = '/dashboard' } = body;
    
    console.log('🔍 [EstablishSessionAjax] Parsed data:');
    console.log('  - Token:', token ? `${token.substring(0, 20)}... (length: ${token.length})` : 'MISSING');
    console.log('  - Redirect URL:', redirectUrl);
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session token provided' 
      }, { status: 400 });
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🔍 [EstablishSessionAjax] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      hostname: request.headers.get('host')
    });
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'lax', // Changed from 'none' to 'lax' for better compatibility
      path: '/',
      maxAge: 86400, // 24 hours
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    console.log('🔍 [EstablishSessionAjax] Cookie options to be used:', JSON.stringify(cookieOptions, null, 2));
    
    // Create response first
    const responseData = { 
      success: true,
      redirectUrl,
      message: 'Session established successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 [EstablishSessionAjax] Creating response with data:', responseData);
    const response = NextResponse.json(responseData);
    
    // Set cookies on the response object
    console.log('🔍 [EstablishSessionAjax] Setting cookie: sid');
    response.cookies.set('sid', token, cookieOptions);
    
    console.log('🔍 [EstablishSessionAjax] Setting cookie: session_token');
    response.cookies.set('session_token', token, cookieOptions);
    
    // Log the response headers to verify cookies are set
    console.log('🔍 [EstablishSessionAjax] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Log cookie details
    const setCookieHeaders = response.headers.get('set-cookie');
    console.log('🔍 [EstablishSessionAjax] Set-Cookie headers:', setCookieHeaders);
    
    console.log('✅ [EstablishSessionAjax] Cookies set successfully');
    console.log('🔍 [EstablishSessionAjax] ===== AJAX SESSION ESTABLISHMENT END =====');
    
    return response;
    
  } catch (error) {
    console.error('❌ [EstablishSessionAjax] Error:', error);
    console.error('❌ [EstablishSessionAjax] Error stack:', error.stack);
    console.log('🔍 [EstablishSessionAjax] ===== AJAX SESSION ESTABLISHMENT END (ERROR) =====');
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to establish session',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}