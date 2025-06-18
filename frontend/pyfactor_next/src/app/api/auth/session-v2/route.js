import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Server-Side Session Management - Version 2
 * Following Wave/Stripe pattern: Only session ID in cookies
 * All session data lives in Django backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Session-V2] No session ID found');
      return NextResponse.json({ 
        authenticated: false
      }, { status: 401 });
    }
    
    console.log('[Session-V2] Found session ID, validating with backend...');
    
    // Fetch session from backend - single source of truth
    const response = await fetch(`${API_URL}/api/sessions/${sessionId.value}/`, {
      headers: {
        'Authorization': `SessionID ${sessionId.value}`,
      },
      cache: 'no-store' // Never cache session data
    });
    
    if (!response.ok) {
      console.log('[Session-V2] Backend validation failed:', response.status);
      // Clear invalid session
      const res = NextResponse.json({ 
        authenticated: false
      }, { status: 401 });
      res.cookies.delete('sid');
      return res;
    }
    
    const sessionData = await response.json();
    console.log('[Session-V2] Backend session valid:', {
      email: sessionData.email,
      tenantId: sessionData.tenant_id,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    // Return session data from backend
    return NextResponse.json({
      authenticated: true,
      user: {
        email: sessionData.email,
        needsOnboarding: sessionData.needs_onboarding,
        onboardingCompleted: sessionData.onboarding_completed,
        tenantId: sessionData.tenant_id,
        permissions: sessionData.permissions
      }
    });
    
  } catch (error) {
    console.error('[Session-V2] Error:', error);
    return NextResponse.json({ 
      authenticated: false
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email, password, accessToken } = await request.json();
    
    console.log('[Session-V2] Creating new session for:', email);
    
    // Authenticate with backend
    const authResponse = await fetch(`${API_URL}/api/auth/login/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        email, 
        password,
        access_token: accessToken 
      })
    });
    
    if (!authResponse.ok) {
      console.log('[Session-V2] Authentication failed:', authResponse.status);
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 401 });
    }
    
    const { session_id, expires_at } = await authResponse.json();
    console.log('[Session-V2] Backend session created:', { session_id });
    
    // Set session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('sid', session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(expires_at),
      path: '/'
    });
    
    // Clear all old cookies that were causing conflicts
    const oldCookies = [
      'dott_auth_session',
      'session_token',
      'session_pending',
      'onboarding_status',
      'appSession',
      'businessInfoCompleted',
      'onboardingStep',
      'onboardingCompleted',
      'onboardedStatus',
      'onboarding_just_completed'
    ];
    
    oldCookies.forEach(name => {
      response.cookies.delete(name);
    });
    
    console.log('[Session-V2] Session created, old cookies cleared');
    
    return response;
    
  } catch (error) {
    console.error('[Session-V2] POST error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (sessionId) {
      // Revoke session in backend
      await fetch(`${API_URL}/api/sessions/${sessionId.value}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `SessionID ${sessionId.value}`,
        }
      });
    }
    
    const response = NextResponse.json({ success: true });
    response.cookies.delete('sid');
    return response;
    
  } catch (error) {
    console.error('[Session-V2] DELETE error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}