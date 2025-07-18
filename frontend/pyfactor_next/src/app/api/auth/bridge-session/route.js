import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Bridge session endpoint - exchanges a bridge token for session cookies
 * This is called by the session-bridge page to establish the actual session
 * 
 * For our use case, the "bridge token" IS the actual session token from the backend
 * We just need to set it as a cookie
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    console.log('[BridgeSession] Bridge token received:', token?.substring(0, 20) + '...');
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No bridge token provided' 
      }, { status: 400 });
    }
    
    // The token IS the session token (UUID from backend)
    // We just need to set it as a cookie
    const cookieStore = await cookies();
    
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
    
    console.log('[BridgeSession] Setting session cookies...');
    
    // Create response with cookies set properly
    const response = NextResponse.json({
      success: true,
      sessionToken: token,
      message: 'Session established'
    });
    
    // Set both sid and session_token cookies on the response
    response.cookies.set('sid', token, cookieOptions);
    response.cookies.set('session_token', token, cookieOptions);
    
    console.log('[BridgeSession] Session cookies set on response');
    
    return response;
    
  } catch (error) {
    console.error('[BridgeSession] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to establish session',
      message: error.message 
    }, { status: 500 });
  }
}