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
    
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.json({ user: null });
    }
    
    // Return a simple user object - in production you'd verify JWT tokens
    return NextResponse.json({
      user: {
        sub: 'auth0|demo-user',
        email: 'user@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/64',
        email_verified: true
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ user: null });
  }
} 