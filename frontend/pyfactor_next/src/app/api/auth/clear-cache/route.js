import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Clear all session-related cookies to force fresh data fetch
 * This is useful after fixing backend onboarding status
 */
export async function GET(request) {
  try {
    console.log('[Clear Cache] Clearing all session cookies');
    
    const cookieStore = await cookies();
    
    // List of cookies to clear
    const cookiesToClear = [
      'dott_auth_session',
      'appSession',
      'session_token',
      'onboarding_status',
      'authjs.csrf-token',
      'authjs.callback-url',
      'authjs.session-token'
    ];
    
    // Clear each cookie
    cookiesToClear.forEach(cookieName => {
      if (cookieStore.get(cookieName)) {
        console.log(`[Clear Cache] Clearing cookie: ${cookieName}`);
        cookieStore.delete(cookieName);
      }
    });
    
    // Also set them with maxAge 0 to ensure they're cleared
    const response = NextResponse.json({ 
      success: true, 
      message: 'All session cookies cleared' 
    });
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
      });
    });
    
    return response;
    
  } catch (error) {
    console.error('[Clear Cache] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear cache' 
    }, { status: 500 });
  }
}

// Handle POST as well for flexibility
export async function POST(request) {
  return GET(request);
}