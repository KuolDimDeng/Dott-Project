import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Get access token from secure session
 * This endpoint is used internally by the frontend to get the access token
 * for making authenticated API calls to the backend
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found' 
      }, { status: 401 });
    }
    
    // Parse secure session cookie
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      logger.error('[GetToken] Cookie parse error:', error);
      return NextResponse.json({ 
        error: 'Invalid session' 
      }, { status: 401 });
    }
    
    // Validate session
    if (!sessionData.accessToken) {
      return NextResponse.json({ 
        error: 'No access token in session' 
      }, { status: 401 });
    }
    
    // Check expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      logger.info('[GetToken] Session expired');
      return NextResponse.json({ 
        error: 'Session expired' 
      }, { status: 401 });
    }
    
    logger.info('[GetToken] Returning access token for:', sessionData.user?.email);
    
    // Return only the access token
    return NextResponse.json({
      access_token: sessionData.accessToken,
      expires_at: sessionData.expiresAt
    });
    
  } catch (error) {
    logger.error('[GetToken] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get token' 
    }, { status: 500 });
  }
}