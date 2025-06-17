import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * Verify that the session is ready before redirecting to dashboard
 * This helps prevent the issue where the dashboard redirects to login
 * because the session cookie hasn't been properly set yet
 */
export async function GET(request) {
  try {
    // Check for session token in query params (fallback for immediate verification)
    const { searchParams } = new URL(request.url);
    const tokenParam = searchParams.get('token');
    
    // Debug logging
    console.log('[Verify Session Ready] Starting verification');
    console.log('[Verify Session Ready] Token param:', !!tokenParam);
    console.log('[Verify Session Ready] Raw cookie header:', request.headers.get('cookie'));
    
    // If token is provided in query, consider session ready
    if (tokenParam) {
      console.log('[Verify Session Ready] Session token provided in query, session is ready');
      return NextResponse.json({ 
        ready: true,
        reason: 'Session token provided',
        hasToken: true
      });
    }
    
    // Force fresh cookie read by awaiting cookies()
    const cookieStore = await cookies();
    
    // Check for session cookie - try multiple times as cookies may take time to propagate
    let sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    // Also check for backend session token
    const sessionTokenCookie = cookieStore.get('session_token');
    
    // Also check for onboarding status cookie (client-readable)
    const statusCookie = cookieStore.get('onboarding_status');
    
    // Also check if cookie exists but might be in process of being set
    const allCookies = cookieStore.getAll();
    const hasCookieHeader = request.headers.get('cookie')?.includes('dott_auth_session');
    const hasSessionTokenHeader = request.headers.get('cookie')?.includes('session_token');
    
    console.log('[Verify Session Ready] Cookie detection:', {
      sessionCookieFound: !!sessionCookie,
      sessionTokenFound: !!sessionTokenCookie,
      statusCookieFound: !!statusCookie,
      totalCookies: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      hasCookieHeader,
      hasSessionTokenHeader
    });
    
    // If we have the status cookie, the session is being set
    if (statusCookie && !sessionCookie) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'Session cookie is being set',
        retry: true,
        debug: {
          hasStatusCookie: true,
          statusCookieValue: statusCookie.value,
          cookieCount: allCookies.length
        }
      });
    }
    
    if (!sessionCookie && !sessionTokenCookie && !hasCookieHeader && !hasSessionTokenHeader) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'No session cookie found',
        debug: {
          cookieCount: allCookies.length,
          cookieNames: allCookies.map(c => c.name),
          hasCookieHeader,
          hasSessionTokenHeader
        }
      });
    }
    
    // If we have cookie header but not parsed yet, wait a bit and try again
    if (!sessionCookie && (hasCookieHeader || hasSessionTokenHeader)) {
      // Cookie exists in header but not parsed yet - consider it as being set
      return NextResponse.json({ 
        ready: false, 
        reason: 'Session cookie is being set',
        retry: true
      });
    }
    
    // If we have session token but no main session cookie, consider it ready
    // (the dashboard will handle getting full session data)
    if (!sessionCookie && sessionTokenCookie) {
      return NextResponse.json({ 
        ready: true,
        hasSessionToken: true,
        sessionToken: sessionTokenCookie.value,
        reason: 'Session token available'
      });
    }
    
    // Try to decrypt and validate the session directly
    try {
      let sessionData;
      
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
      
      // Check if session has required data
      if (!sessionData.user || !sessionData.user.email) {
        return NextResponse.json({ 
          ready: false, 
          reason: 'Invalid session data' 
        });
      }
      
      // Session is ready
      return NextResponse.json({ 
        ready: true,
        user: sessionData.user,
        accessToken: sessionData.accessToken,
        needsOnboarding: sessionData.needsOnboarding,
        tenantId: sessionData.tenantId
      });
      
    } catch (error) {
      // If we can't decrypt/parse the session, it's not ready
      return NextResponse.json({ 
        ready: false, 
        reason: 'Session validation failed',
        error: error.message 
      });
    }
    
  } catch (error) {
    console.error('[Verify Session Ready] Error:', error);
    return NextResponse.json({ 
      ready: false, 
      reason: 'Internal error',
      error: error.message 
    });
  }
}