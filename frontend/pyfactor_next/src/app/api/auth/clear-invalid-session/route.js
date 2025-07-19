import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Clear invalid session cookies
 * This endpoint is used when we detect that a session doesn't exist in the backend
 */
export async function POST(request) {
  try {
    console.log('[ClearInvalidSession] Clearing invalid session cookies...');
    
    const response = NextResponse.json({
      success: true,
      message: 'Invalid session cleared. Please log in again.'
    });
    
    // Clear all session-related cookies
    const cookiesToClear = [
      'sid',
      'session_token',
      'appSession',
      'dott_auth_session',
      'session_pending'
    ];
    
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 0,
      ...(isProduction && { domain: '.dottapps.com' })
    };
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', clearOptions);
      console.log(`[ClearInvalidSession] Cleared cookie: ${cookieName}`);
    });
    
    // Also clear sessionStorage indicator
    response.headers.set('X-Clear-Session-Storage', 'true');
    
    console.log('[ClearInvalidSession] All session cookies cleared');
    
    return response;
  } catch (error) {
    console.error('[ClearInvalidSession] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear session'
    }, { status: 500 });
  }
}

export async function GET() {
  // Simple GET endpoint to check if service is working
  return NextResponse.json({
    message: 'Use POST to clear invalid session'
  });
}