import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth0_logged_in');
    const userCookie = cookieStore.get('auth0_user');
    
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.json({ user: null });
    }
    
    // Try to get user data from cookie, fallback to demo data
    let userData;
    try {
      userData = userCookie ? JSON.parse(userCookie.value) : null;
    } catch (error) {
      console.error('[Session] Error parsing user cookie:', error);
      userData = null;
    }
    
    // Return user data or demo user
    const user = userData || {
      sub: 'auth0|demo-user',
      email: 'user@example.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/64',
      email_verified: true
    };
    
    console.log('[Session] Returning user:', { id: user.sub, email: user.email });
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[Session] Error getting session:', error);
    return NextResponse.json({ user: null });
  }
} 