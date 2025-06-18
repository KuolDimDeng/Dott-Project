import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }
    
    // For now, we'll just set the cookie and trust the token
    // In production, you'd validate this with your backend
    const cookieStore = await cookies();
    
    // Set the session token cookie
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    logger.info('[ValidateSession] Session cookie set successfully');
    
    return NextResponse.json({ 
      success: true,
      session_token: token 
    });
    
  } catch (error) {
    logger.error('[ValidateSession] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}