import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Not available in production' 
    }, { status: 404 });
  }
  
  try {
    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Get specific cookies
    const dottAuthSession = cookieStore.get('dott_auth_session');
    const sessionToken = cookieStore.get('session_token');
    const onboardingStatus = cookieStore.get('onboarding_status');
    
    // Check raw cookie header
    const rawCookieHeader = request.headers.get('cookie');
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cookies: {
        total: allCookies.length,
        names: allCookies.map(c => c.name),
        dottAuthSession: {
          exists: !!dottAuthSession,
          size: dottAuthSession?.value?.length || 0
        },
        sessionToken: {
          exists: !!sessionToken,
          value: sessionToken?.value || null
        },
        onboardingStatus: {
          exists: !!onboardingStatus,
          value: onboardingStatus?.value || null
        }
      },
      headers: {
        rawCookie: rawCookieHeader || 'No cookie header',
        host: request.headers.get('host'),
        origin: request.headers.get('origin')
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}