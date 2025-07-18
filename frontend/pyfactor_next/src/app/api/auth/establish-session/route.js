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
    const cookieStore = cookies();
    
    // In production, set domain to allow cookie sharing across subdomains
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Don't set domain - let it default to current domain
    // This ensures cookies work on the exact domain being accessed
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Must be true for SameSite=None cookies
      sameSite: 'none', // Changed from 'lax' to 'none' for Cloudflare compatibility
      path: '/',
      maxAge: 86400, // 24 hours
      // Remove domain setting to let it default
    };
    
    console.log('[EstablishSession] Setting session cookies with options:', cookieOptions);
    console.log('[EstablishSession] Is production:', isProduction);
    console.log('[EstablishSession] NODE_ENV:', process.env.NODE_ENV);
    
    // Set both sid and session_token cookies
    cookieStore.set('sid', token, cookieOptions);
    cookieStore.set('session_token', token, cookieOptions);
    
    // Debug: Verify cookies were set
    const verifySet = cookies();
    const sidCookie = verifySet.get('sid');
    const sessionCookie = verifySet.get('session_token');
    console.log('[EstablishSession] Cookies after setting:', {
      sid: sidCookie ? 'Set successfully' : 'Failed to set',
      session_token: sessionCookie ? 'Set successfully' : 'Failed to set'
    });
    
    console.log('[EstablishSession] Session cookies set, redirecting to:', redirectUrl);
    
    // Construct proper redirect URL with correct domain
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);
    
    console.log('[EstablishSession] Full redirect URL:', fullRedirectUrl.toString());
    
    // Create redirect response with proper headers
    const redirectResponse = NextResponse.redirect(fullRedirectUrl);
    
    // Ensure cookies are set in the redirect response
    redirectResponse.cookies.set('sid', token, cookieOptions);
    redirectResponse.cookies.set('session_token', token, cookieOptions);
    
    // Add cache control headers to prevent caching
    redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    
    return redirectResponse;
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    // Redirect to signin with error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    return NextResponse.redirect(new URL('/auth/signin?error=session_error', baseUrl));
  }
}