import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';

/**
 * Session API Route
 * Manages session lifecycle through backend API
 */

export async function GET(request) {
  try {
    console.log('[Session API] Getting session');
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      console.log('[Session API] No session token found');
      return NextResponse.json(null, { status: 401 });
    }
    
    // Get session from backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionToken.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('[Session API] Backend error:', response.status);
      
      if (response.status === 401) {
        // Clear invalid session token
        const res = NextResponse.json(null, { status: 401 });
        res.cookies.set('session_token', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
        return res;
      }
      
      return NextResponse.json(null, { status: response.status });
    }
    
    const sessionData = await response.json();
    console.log('[Session API] Session retrieved successfully');
    
    // Add cache control headers
    const res = NextResponse.json(sessionData);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    
    return res;
    
  } catch (error) {
    console.error('[Session API] GET error:', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('[Session API] Creating new session');
    
    const body = await request.json();
    const { accessToken, user } = body;
    
    if (!accessToken || !user) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Create session in backend
    const response = await fetch(`${API_URL}/api/sessions/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        needs_onboarding: body.needs_onboarding,
        onboarding_completed: body.onboarding_completed,
        subscription_plan: body.subscription_plan || 'free'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Session API] Backend error:', errorText);
      throw new Error('Failed to create session');
    }
    
    const sessionData = await response.json();
    console.log('[Session API] Session created:', sessionData.session_token);
    
    // Set session cookie
    const res = NextResponse.json(sessionData);
    res.cookies.set('session_token', sessionData.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    });
    
    return res;
    
  } catch (error) {
    console.error('[Session API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    console.log('[Session API] Updating session');
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const updates = await request.json();
    
    // Update session in backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sessionToken.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    
    const sessionData = await response.json();
    console.log('[Session API] Session updated successfully');
    
    return NextResponse.json(sessionData);
    
  } catch (error) {
    console.error('[Session API] PATCH error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    console.log('[Session API] Deleting session');
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (sessionToken) {
      // Delete session in backend
      await fetch(`${API_URL}/api/sessions/current/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Session ${sessionToken.value}`
        }
      });
    }
    
    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    });
    
    console.log('[Session API] Session deleted');
    
    return response;
    
  } catch (error) {
    console.error('[Session API] DELETE error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}