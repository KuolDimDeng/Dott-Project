import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to check cookie status
 * This helps diagnose why cookies might not be set
 */
export async function GET(request) {
  console.log('🔍 [DebugCookies] ===== COOKIE DEBUG START =====');
  console.log('🔍 [DebugCookies] Timestamp:', new Date().toISOString());
  console.log('🔍 [DebugCookies] Request URL:', request.url);
  console.log('🔍 [DebugCookies] Request headers:', Object.fromEntries(request.headers.entries()));
  
  // Get all cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  console.log('🔍 [DebugCookies] All cookies count:', allCookies.length);
  console.log('🔍 [DebugCookies] All cookies:', allCookies.map(c => ({
    name: c.name,
    valuePreview: c.value ? `${c.value.substring(0, 20)}...` : 'empty',
    length: c.value?.length || 0
  })));
  
  // Check specific cookies
  const sid = cookieStore.get('sid');
  const sessionToken = cookieStore.get('session_token');
  const appSession = cookieStore.get('appSession');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    },
    cookies: {
      total: allCookies.length,
      all: allCookies.map(c => ({
        name: c.name,
        value: c.value ? `${c.value.substring(0, 20)}...` : 'empty',
        length: c.value ? c.value.length : 0
      })),
      session: {
        sid: sid ? {
          exists: true,
          value: `${sid.value.substring(0, 20)}...`,
          length: sid.value.length
        } : { exists: false },
        session_token: sessionToken ? {
          exists: true,
          value: `${sessionToken.value.substring(0, 20)}...`,
          length: sessionToken.value.length
        } : { exists: false },
        appSession: appSession ? {
          exists: true,
          value: `${appSession.value.substring(0, 20)}...`,
          length: appSession.value.length
        } : { exists: false }
      }
    },
    headers: {
      cookie: request.headers.get('cookie'),
      setCookie: request.headers.get('set-cookie')
    }
  };
  
  console.log('🔍 [DebugCookies] Debug info:', JSON.stringify(debugInfo, null, 2));
  console.log('🔍 [DebugCookies] ===== COOKIE DEBUG END =====');
  
  return NextResponse.json(debugInfo);
}

export async function POST(request) {
  console.log('🔍 [DebugCookies] ===== TEST COOKIE SET START =====');
  
  try {
    const { testValue = 'test-cookie-value' } = await request.json();
    
    const response = NextResponse.json({
      success: true,
      message: 'Test cookie set',
      timestamp: new Date().toISOString()
    });
    
    // Try setting a test cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 // 1 hour
    };
    
    console.log('🔍 [DebugCookies] Setting test cookie with options:', cookieOptions);
    response.cookies.set('debug_test', testValue, cookieOptions);
    
    // Log response headers
    console.log('🔍 [DebugCookies] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('🔍 [DebugCookies] ===== TEST COOKIE SET END =====');
    
    return response;
  } catch (error) {
    console.error('❌ [DebugCookies] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}