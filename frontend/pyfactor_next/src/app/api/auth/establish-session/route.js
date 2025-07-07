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
    
    if (!token) {
      // Redirect to signin with error
      return NextResponse.redirect(new URL('/auth/signin?error=no_session_token', baseUrl));
    }
    
    // Set session cookies
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 // 24 hours
    };
    
    console.log('[EstablishSession] Setting session cookies...');
    
    // Set both sid and session_token cookies
    cookieStore.set('sid', token, cookieOptions);
    cookieStore.set('session_token', token, cookieOptions);
    
    console.log('[EstablishSession] Session cookies set, redirecting to:', redirectUrl);
    
    // Construct proper redirect URL with correct domain
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);
    
    console.log('[EstablishSession] Full redirect URL:', fullRedirectUrl.toString());
    
    // Redirect to the target URL
    return NextResponse.redirect(fullRedirectUrl);
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    // Redirect to signin with error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    return NextResponse.redirect(new URL('/auth/signin?error=session_error', baseUrl));
  }
}