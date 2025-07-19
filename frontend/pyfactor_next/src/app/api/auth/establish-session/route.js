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
    
    // Clear ALL cookies before setting new ones to ensure clean state
    console.log('[EstablishSession] === COOKIE CLEANUP PHASE ===');
    
    console.log('[EstablishSession] Form data received');
    console.log('[EstablishSession] Token:', token?.substring(0, 20) + '...');
    console.log('[EstablishSession] Redirect URL:', redirectUrl);
    console.log('[EstablishSession] Base URL:', baseUrl);
    console.log('[EstablishSession] Request headers:', {
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      cookie: request.headers.get('cookie')
    });
    
    // Check if there are existing cookies
    const cookieStore = await cookies();
    const existingCookies = cookieStore.getAll();
    console.log('[EstablishSession] Existing cookies:', existingCookies.map(c => ({ 
      name: c.name, 
      value: c.name.includes('sid') || c.name.includes('session') ? c.value?.substring(0, 8) + '...' : 'non-session' 
    })));
    
    console.log('[EstablishSession] All cookies before cleanup:', existingCookies.map(c => ({ 
      name: c.name, 
      value: c.name.includes('sid') || c.name.includes('session') ? c.value?.substring(0, 8) + '...' : 'non-session' 
    })));
    
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
    
    // Instead of redirect, return HTML with meta refresh and JavaScript
    // This ensures cookies are set before navigation
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Establishing session...</title>
  <meta http-equiv="refresh" content="0; url=${fullRedirectUrl}">
  <script>
    // Set cookies via JavaScript as backup
    document.cookie = 'sid=${token}; path=/; max-age=86400${isProduction ? '; secure' : ''}; samesite=lax';
    document.cookie = 'session_token=${token}; path=/; max-age=86400${isProduction ? '; secure' : ''}; samesite=lax';
    
    // Clear old cookies
    ['sessionId', 'session_id', 'auth_session'].forEach(name => {
      document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });
    
    // Redirect after cookies are set
    setTimeout(() => {
      window.location.href = '${fullRedirectUrl}';
    }, 100);
  </script>
</head>
<body>
  <p>Establishing session... If you are not redirected, <a href="${fullRedirectUrl}">click here</a>.</p>
</body>
</html>`;
    
    // Create response with HTML content
    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    // First, clear any existing cookies to ensure clean state
    const clearOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 0
    };
    
    // Clear old cookies first - also clear any other session-related cookies
    const cookiesToClear = ['sid', 'session_token', 'sessionId', 'session_id', 'auth_session'];
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', clearOptions);
    });
    console.log('[EstablishSession] Cleared old cookies:', cookiesToClear);
    
    // Now set the new cookies on the response
    response.cookies.set('sid', token, cookieOptions);
    response.cookies.set('session_token', token, cookieOptions);
    
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
    
    return response;
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    // Redirect to signin with error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    return NextResponse.redirect(new URL('/auth/signin?error=session_error', baseUrl));
  }
}