import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    
    try {
      // Decode session data
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      
      // Check if session is expired
      if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
        return NextResponse.json({ user: null, error: 'Session expired' }, { status: 200 });
      }
      
      // Return user data (without sensitive tokens)
      return NextResponse.json({
        user: sessionData.user,
        isAuthenticated: true,
        expiresAt: sessionData.accessTokenExpiresAt
      }, { status: 200 });
      
    } catch (error) {
      console.error('[Auth Session] Error decoding session:', error);
      return NextResponse.json({ user: null, error: 'Invalid session' }, { status: 200 });
    }
    
  } catch (error) {
    console.error('[Auth Session] Error:', error);
    return NextResponse.json({ user: null, error: 'Internal error' }, { status: 500 });
  }
} 