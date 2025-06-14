import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * GET /api/auth/me
 * Legacy endpoint that proxies to our session endpoint for compatibility
 */
export async function GET(request) {
  try {
    // Get session cookie to get user info - try new name first, then old
    const sessionCookie = request.cookies.get('dott_auth_session') || request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found', authenticated: false }, { status: 401 });
    }
    
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session', authenticated: false }, { status: 401 });
    }
    
    if (!sessionData.user) {
      return NextResponse.json({ error: 'No user in session', authenticated: false }, { status: 401 });
    }
    
    // Return user data in expected format
    const userData = {
      authenticated: true,
      user: {
        email: sessionData.user.email,
        sub: sessionData.user.sub,
        name: sessionData.user.name,
        picture: sessionData.user.picture,
        email_verified: sessionData.user.email_verified
      },
      accessToken: sessionData.accessToken,
      idToken: sessionData.idToken
    };
    
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('[Auth Me] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      authenticated: false 
    }, { status: 500 });
  }
} 