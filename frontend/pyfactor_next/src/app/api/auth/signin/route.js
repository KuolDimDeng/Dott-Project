/**
 * Sign In API Route
 * Industry-standard authentication endpoint
 */

import { NextResponse } from 'next/server';
import { createSession, setSessionCookie } from '@/lib/auth/session-manager';

/**
 * POST /api/auth/signin
 * Authenticates user and creates session
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create session with backend
    const sessionData = await createSession({ email, password });
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: sessionData.user,
      message: 'Sign in successful'
    });
    
    // Set session cookie
    setSessionCookie(response, sessionData.session_token);
    
    return response;
  } catch (error) {
    console.error('[SignIn] Error:', error);
    
    // Check for specific error types
    if (error.message.includes('Invalid credentials')) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}