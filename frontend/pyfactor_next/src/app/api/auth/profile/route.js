import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET(request) {
  try {
    console.log('[Auth Profile] Getting user session');
    
    // Try to get session from Auth0
    const session = await auth0.getSession(request);
    
    if (!session || !session.user) {
      console.log('[Auth Profile] No session found');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[Auth Profile] Session found for user:', session.user.email);
    
    // Return user profile
    return NextResponse.json(session.user);
    
  } catch (error) {
    console.error('[Auth Profile] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 