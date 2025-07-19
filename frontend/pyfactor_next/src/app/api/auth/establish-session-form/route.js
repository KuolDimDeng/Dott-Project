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
    
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🔍 [EstablishSessionForm] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      hostname: request.headers.get('host')
    });
    
    // Create redirect response
    const response = NextResponse.redirect(new URL(redirectUrl, request.url), 303);
    
    // Set cookies with explicit options
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 hours
      // Only set domain in production
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    console.log('🔍 [EstablishSessionForm] Setting cookies with options:', JSON.stringify(cookieOptions, null, 2));
    
    // Set both cookie variants
    response.cookies.set('sid', token, cookieOptions);
    response.cookies.set('session_token', token, cookieOptions);
    
    // Also try setting via headers directly
    const cookieString = `sid=${token}; HttpOnly; Secure=${isProduction}; SameSite=lax; Path=/; Max-Age=86400${isProduction ? '; Domain=.dottapps.com' : ''}`;
    const sessionTokenString = `session_token=${token}; HttpOnly; Secure=${isProduction}; SameSite=lax; Path=/; Max-Age=86400${isProduction ? '; Domain=.dottapps.com' : ''}`;
    
    response.headers.append('Set-Cookie', cookieString);
    response.headers.append('Set-Cookie', sessionTokenString);
    
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