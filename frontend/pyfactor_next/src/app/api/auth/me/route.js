import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * GET /api/auth/me
 * Legacy endpoint that proxies to our session endpoint for compatibility
 */
export async function GET(request) {
  try {
    // Get session cookie to get user info - try new name first, then old
    let sessionCookie = request.cookies.get('dott_auth_session') || request.cookies.get('appSession');
    
    // Check for session token in query params as fallback for immediate verification
    const { searchParams } = new URL(request.url);
    const tokenParam = searchParams.get('token');
    const fromSignIn = searchParams.get('fromSignIn') === 'true';
    
    // Check all possible cookie locations including Set-Cookie headers
    if (!sessionCookie) {
      // Try to get from response headers if they're being set
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const authSessionCookie = cookies.find(c => c.startsWith('dott_auth_session=') || c.startsWith('appSession='));
        if (authSessionCookie) {
          const [name, value] = authSessionCookie.split('=');
          sessionCookie = { name, value };
          console.log('[Auth Me] Found session cookie in header');
        }
      }
    }
    
    if (!sessionCookie) {
      // If we're immediately after sign-in and have a token param, give cookies time to propagate
      if (fromSignIn && tokenParam) {
        console.log('[Auth Me] Just signed in, checking for pending session...');
        
        // Check if we have status cookies indicating session is being set
        const statusCookie = request.cookies.get('onboarding_status');
        const justCompletedCookie = request.cookies.get('onboarding_just_completed');
        const sessionStatusCookie = request.cookies.get('dott_session_status');
        
        if (statusCookie || justCompletedCookie || sessionStatusCookie) {
          console.log('[Auth Me] Found status cookies, session is being set');
          // Return a temporary success to prevent redirect to login
          return NextResponse.json({
            authenticated: true,
            user: {
              email: 'loading@dottapps.com', // Placeholder
              sub: tokenParam,
              sessionPending: true
            },
            sessionPending: true,
            retryAfter: 1000
          });
        }
        
        // Check for pending session header (from sessionStorage)
        const pendingSessionHeader = request.headers.get('x-pending-session');
        if (pendingSessionHeader && fromSignIn) {
          try {
            const pendingSession = JSON.parse(pendingSessionHeader);
            console.log('[Auth Me] Found pending session from header');
            
            // Verify it's recent (within 30 seconds)
            if (pendingSession.timestamp && Date.now() - pendingSession.timestamp < 30000) {
              return NextResponse.json({
                authenticated: true,
                user: pendingSession.user || {
                  email: 'loading@dottapps.com',
                  sub: tokenParam
                },
                sessionPending: true,
                retryAfter: 500
              });
            }
          } catch (e) {
            console.error('[Auth Me] Error parsing pending session header:', e);
          }
        }
      }
      
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