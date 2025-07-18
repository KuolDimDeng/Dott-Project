import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Establish session endpoint - receives form POST from session-bridge page
 * Sets session cookies and redirects to the appropriate page
 */
export async function POST(request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    const formData = await request.formData();
    const token = formData.get('token');
    const redirectUrl = formData.get('redirectUrl') || '/dashboard';
    
    console.log('[EstablishSession] Form data received');
    console.log('[EstablishSession] Token:', token?.substring(0, 20) + '...');
    console.log('[EstablishSession] Redirect URL:', redirectUrl);
    console.log('[EstablishSession] Base URL:', baseUrl);
    console.log('[EstablishSession] Request headers:', {
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      referer: request.headers.get('referer')
    });
    
    if (!token) {
      // Redirect to signin with error
      return NextResponse.redirect(new URL('/auth/signin?error=no_session_token', baseUrl));
    }
    
    // Configure cookie options
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Don't set domain - let it default to current domain
    // This ensures cookies work on the exact domain being accessed
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: 'lax', // Try 'lax' instead of 'none'
      path: '/',
      maxAge: 86400, // 24 hours
      // Remove domain setting to let it default
    };
    
    console.log('[EstablishSession] Setting session cookies with options:', cookieOptions);
    console.log('[EstablishSession] Is production:', isProduction);
    console.log('[EstablishSession] NODE_ENV:', process.env.NODE_ENV);
    
    // Note: Cookies can only be set on the response object, not directly on cookieStore
    console.log('[EstablishSession] Preparing to set cookies on redirect response...');
    
    console.log('[EstablishSession] Session cookies will be set, redirecting to:', redirectUrl);
    
    // Construct proper redirect URL with correct domain
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);
    
    console.log('[EstablishSession] Full redirect URL:', fullRedirectUrl.toString());
    
    // Create redirect response with proper headers
    const redirectResponse = NextResponse.redirect(fullRedirectUrl);
    
    // Ensure cookies are set in the redirect response
    redirectResponse.cookies.set('sid', token, cookieOptions);
    redirectResponse.cookies.set('session_token', token, cookieOptions);
    
    // Log server-side cookie setting for debugging
    console.log('[SERVER INFO] [EstablishSession] Setting cookies on redirect response:', {
      sid: token.substring(0, 8) + '...',
      cookieOptions,
      redirectTo: fullRedirectUrl.toString()
    });
    
    // Add cache control headers to prevent caching
    redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    
    // Log response headers for debugging
    console.log('[SERVER INFO] [EstablishSession] Response headers:', {
      'set-cookie': redirectResponse.headers.get('set-cookie'),
      location: redirectResponse.headers.get('location')
    });
    
    return redirectResponse;
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    // Redirect to signin with error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    return NextResponse.redirect(new URL('/auth/signin?error=session_error', baseUrl));
  }
}