import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';

/**
 * Session Refresh Route
 * Extends session expiration
 */

export async function POST(request) {
  try {
    console.log('[Session Refresh] Refreshing session');
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const body = await request.json();
    const hours = body.hours || 24;
    
    // Refresh session in backend
    const response = await fetch(`${API_URL}/api/sessions/refresh/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionToken.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hours })
    });
    
    if (!response.ok) {
      console.error('[Session Refresh] Backend error:', response.status);
      return NextResponse.json({ error: 'Refresh failed' }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('[Session Refresh] Session refreshed successfully');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Session Refresh] Error:', error);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}