import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * AJAX version of establish-session endpoint
 * Returns JSON response instead of redirecting, allowing client-side navigation
 * This avoids potential issues with cookie setting during redirects
 */
export async function POST(request) {
  try {
    const { token, redirectUrl = '/dashboard' } = await request.json();
    
    console.log('[EstablishSessionAjax] AJAX POST received');
    console.log('[EstablishSessionAjax] Token:', token?.substring(0, 20) + '...');
    console.log('[EstablishSessionAjax] Redirect URL:', redirectUrl);
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session token provided' 
      }, { status: 400 });
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieStore = cookies();
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'lax', // Changed from 'none' to 'lax' for better compatibility
      path: '/',
      maxAge: 86400, // 24 hours
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    console.log('[EstablishSessionAjax] Setting cookies with options:', cookieOptions);
    
    // Set cookies using Next.js cookies API
    cookieStore.set('sid', token, cookieOptions);
    cookieStore.set('session_token', token, cookieOptions);
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      redirectUrl,
      message: 'Session established successfully'
    });
    
    // Also set cookies using headers for redundancy
    const cookieString = `sid=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax${isProduction ? '; Secure' : ''}${isProduction ? '; Domain=.dottapps.com' : ''}`;
    const sessionCookieString = `session_token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax${isProduction ? '; Secure' : ''}${isProduction ? '; Domain=.dottapps.com' : ''}`;
    
    response.headers.append('Set-Cookie', cookieString);
    response.headers.append('Set-Cookie', sessionCookieString);
    
    console.log('[EstablishSessionAjax] Cookies set successfully');
    console.log('[EstablishSessionAjax] Response headers:', {
      'Set-Cookie': response.headers.get('Set-Cookie')
    });
    
    return response;
    
  } catch (error) {
    console.error('[EstablishSessionAjax] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to establish session',
      details: error.message
    }, { status: 500 });
  }
}