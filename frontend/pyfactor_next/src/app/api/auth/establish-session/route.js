import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Establish session endpoint - receives form POST from session-bridge page
 * Sets session cookies and redirects to the appropriate page
 * 
 * IMPORTANT: This uses form POST which handles cookies differently than API responses
 * This is the documented solution for Next.js cookie setting issues
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token');
    const redirectUrl = formData.get('redirectUrl') || '/dashboard';
    
    console.log('[EstablishSession] Form POST received');
    console.log('[EstablishSession] Token:', token?.substring(0, 20) + '...');
    console.log('[EstablishSession] Redirect URL:', redirectUrl);
    
    if (!token) {
      // Redirect to signin with error
      return NextResponse.redirect(new URL('/auth/signin?error=no_session_token', request.url));
    }
    
    // Form POST handler that sets cookies and redirects
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 // 24 hours
    };
    
    // Clear old session cookies first
    cookieStore.set('sid', '', { ...cookieOptions, maxAge: 0 });
    cookieStore.set('session_token', '', { ...cookieOptions, maxAge: 0 });
    
    // Set new session cookies
    cookieStore.set('sid', token, cookieOptions);
    cookieStore.set('session_token', token, cookieOptions);
    
    console.log('[EstablishSession] Cookies set successfully');
    console.log('[EstablishSession] Redirecting to:', redirectUrl);
    
    // Return redirect response - cookies will be set on this response
    return NextResponse.redirect(new URL(redirectUrl, request.url));
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    // Redirect to signin with error
    return NextResponse.redirect(new URL('/auth/signin?error=session_error', request.url));
  }
}