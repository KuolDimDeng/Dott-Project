import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function getSecureSession(request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return null;
    }

    // Decode the session (you may need to verify with a secret)
    const session = JSON.parse(sessionCookie.value);
    
    // Return session with user info
    return {
      id: session.id,
      user: {
        id: session.userId,
        email: session.email,
        tenantId: session.tenantId
      },
      accessToken: session.accessToken
    };
  } catch (error) {
    console.error('[sessionUtils-v2] Error getting session:', error);
    return null;
  }
}

export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}