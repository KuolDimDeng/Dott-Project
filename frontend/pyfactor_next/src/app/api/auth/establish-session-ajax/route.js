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
      sameSite: isProduction ? 'none' : 'lax', // 'none' for Cloudflare compatibility in production
      path: '/',
      maxAge: 86400, // 24 hours
      // Remove domain specification for better Cloudflare compatibility
      // Cloudflare will handle cookie domain automatically
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
    console.log('🔍 [EstablishSessionAjax] Token value:', token);
    console.log('🔍 [EstablishSessionAjax] Token length:', token?.length);
    response.cookies.set('sid', token, cookieOptions);
    
    console.log('🔍 [EstablishSessionAjax] Setting cookie: session_token');
    response.cookies.set('session_token', token, cookieOptions);
    
    // Try to read back the cookies we just set
    console.log('🔍 [EstablishSessionAjax] Attempting to read back cookies from response...');
    const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    console.log('🔍 [EstablishSessionAjax] Set-Cookie headers count:', setCookieHeaders.length);
    setCookieHeaders.forEach((header, index) => {
      console.log(`🔍 [EstablishSessionAjax] Set-Cookie[${index}]:`, header);
      // Parse cookie attributes
      const parts = header.split(';').map(p => p.trim());
      const attributes = {};
      parts.forEach((part, i) => {
        if (i === 0) {
          const [name, value] = part.split('=');
          attributes.name = name;
          attributes.value = value ? value.substring(0, 20) + '...' : '';
        } else {
          const [key, val] = part.split('=');
          attributes[key.toLowerCase()] = val || true;
        }
      });
      console.log(`🔍 [EstablishSessionAjax] Cookie[${index}] attributes:`, attributes);
    });
    
    // Log the response headers to verify cookies are set
    console.log('🔍 [EstablishSessionAjax] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Log cookie details using the browser API
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('🔍 [EstablishSessionAjax] Set-Cookie header (single):', setCookieHeader);
    
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