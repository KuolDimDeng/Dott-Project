import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * Verify that the session is ready before redirecting to dashboard
 * This helps prevent the issue where the dashboard redirects to login
 * because the session cookie hasn't been properly set yet
 */
export async function GET(request) {
  try {
    // Check for session cookie
    const sessionCookie = request.cookies.get('dott_auth_session') || request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'No session cookie found' 
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