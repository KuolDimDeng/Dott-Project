import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Direct login that bypasses Auth0 and creates session with Django backend
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    console.log('[DirectLogin] Attempting direct Django login for:', email);
    
    // Get Cloudflare headers
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const origin = request.headers.get('origin') || 'https://dottapps.com';
    
    // Call Django backend directly to create session
    const response = await fetch(`${API_URL}/api/sessions/cloudflare/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward Cloudflare headers
        ...(cfConnectingIp && { 'CF-Connecting-IP': cfConnectingIp }),
        'Origin': origin,
        'User-Agent': request.headers.get('user-agent') || 'NextJS-Frontend'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    console.log('[DirectLogin] Backend response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
      console.error('[DirectLogin] Backend error:', error);
      return NextResponse.json(error, { status: response.status });
    }
    
    const sessionData = await response.json();
    console.log('[DirectLogin] Session created:', {
      authenticated: sessionData.authenticated,
      hasUser: !!sessionData.user,
      hasTenant: !!sessionData.tenant,
      userEmail: sessionData.user?.email
    });
    
    // Create response with session data
    const responseData = {
      success: true,
      authenticated: sessionData.authenticated,
      session_token: sessionData.session_token,
      user: sessionData.user,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.user?.needsOnboarding || sessionData.needsOnboarding || false,
      access_token: sessionData.session_token, // For compatibility
      id_token: null
    };
    
    const frontendResponse = NextResponse.json(responseData);
    
    // Set cookies with Cloudflare-compatible settings
    if (sessionData.session_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 86400, // 24 hours
        path: '/'
      };
      
      console.log('[DirectLogin] Setting cookies with options:', cookieOptions);
      
      frontendResponse.cookies.set('sid', sessionData.session_token, cookieOptions);
      frontendResponse.cookies.set('session_token', sessionData.session_token, cookieOptions);
    }
    
    return frontendResponse;
    
  } catch (error) {
    console.error('[DirectLogin] Error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message 
    }, { status: 500 });
  }
}