import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to check cookie status
 * Helps diagnose cookie issues after authentication
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Get specific session cookies
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('session_token');
    
    // Get request headers
    const cookieHeader = request.headers.get('cookie');
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      cookies: {
        all: allCookies.map(c => ({
          name: c.name,
          value: c.value ? `${c.value.substring(0, 8)}...` : 'empty',
          length: c.value ? c.value.length : 0
        })),
        sid: sid ? {
          exists: true,
          value: `${sid.value.substring(0, 8)}...`,
          length: sid.value.length
        } : { exists: false },
        sessionToken: sessionToken ? {
          exists: true,
          value: `${sessionToken.value.substring(0, 8)}...`,
          length: sessionToken.value.length
        } : { exists: false }
      },
      headers: {
        cookieHeader: cookieHeader || 'none',
        userAgent: userAgent || 'none',
        referer: referer || 'none'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL
      }
    };
    
    console.log('[CookieCheck] Debug info:', debugInfo);
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('[CookieCheck] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to check cookies',
      details: error.message
    }, { status: 500 });
  }
}