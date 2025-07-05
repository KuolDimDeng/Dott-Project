import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Quick session check endpoint
 * Used to verify if session cookies are set
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('session_token');
    
    const hasCookies = !!(sid || sessionToken);
    
    console.log('[SessionCheck] Cookie status:', {
      hasSid: !!sid,
      hasSessionToken: !!sessionToken,
      hasCookies
    });
    
    return NextResponse.json({
      hasCookies,
      cookies: {
        sid: !!sid,
        sessionToken: !!sessionToken
      }
    });
  } catch (error) {
    console.error('[SessionCheck] Error:', error);
    return NextResponse.json({
      hasCookies: false,
      error: error.message
    }, { status: 500 });
  }
}