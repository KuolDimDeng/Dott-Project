import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session Verification Endpoint
 * Quickly checks if user has a valid session
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Check for session cookies
    const sessionId = cookieStore.get('sid');
    const sessionToken = cookieStore.get('session_token');
    const dottAuthSession = cookieStore.get('dott_auth_session');
    const appSession = cookieStore.get('appSession');
    
    console.log('[Session-Verify] Cookie check:', {
      hasSessionId: !!sessionId,
      hasSessionToken: !!sessionToken,
      hasDottAuth: !!dottAuthSession,
      hasAppSession: !!appSession
    });
    
    // If we have a session ID, verify it's valid
    if (sessionId || sessionToken) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      const token = sessionId?.value || sessionToken?.value;
      
      try {
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `SessionID ${token}`,
            'Cookie': `session_token=${token}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          return NextResponse.json({
            valid: true,
            hasSession: true,
            email: sessionData.email,
            needsOnboarding: sessionData.needs_onboarding
          });
        }
      } catch (error) {
        console.error('[Session-Verify] Backend check failed:', error);
      }
    }
    
    // Check for old-style session cookies
    if (dottAuthSession || appSession) {
      return NextResponse.json({
        valid: true,
        hasSession: true,
        legacy: true,
        reason: 'Legacy session format detected'
      });
    }
    
    return NextResponse.json({
      valid: false,
      hasSession: false,
      reason: 'No session token found'
    });
    
  } catch (error) {
    console.error('[Session-Verify] Error:', error);
    return NextResponse.json({
      valid: false,
      hasSession: false,
      reason: 'Verification error',
      error: error.message
    }, { status: 500 });
  }
}