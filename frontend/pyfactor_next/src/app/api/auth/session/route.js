import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    const session = await auth0.getSession(request);
    
    if (!session) {
      return NextResponse.json({ user: null });
    }
    
    return NextResponse.json({
      user: session.user
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ user: null });
  }
} 