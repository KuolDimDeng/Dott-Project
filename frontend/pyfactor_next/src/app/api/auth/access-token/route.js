import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET(request) {
  try {
    console.log('[Auth Access Token] Getting access token');
    
    // Try to get session and access token
    const session = await auth0.getSession(request);
    
    if (!session || !session.user) {
      console.log('[Auth Access Token] No session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Try to get access token
    try {
      const accessToken = await auth0.getAccessToken(request);
      
      if (!accessToken) {
        console.log('[Auth Access Token] No access token available');
        return NextResponse.json({ error: 'No access token available' }, { status: 401 });
      }
      
      console.log('[Auth Access Token] Access token retrieved');
      
      return NextResponse.json({ 
        access_token: accessToken.accessToken,
        expires_in: accessToken.expiresIn 
      });
      
    } catch (tokenError) {
      console.error('[Auth Access Token] Error getting access token:', tokenError);
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[Auth Access Token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 