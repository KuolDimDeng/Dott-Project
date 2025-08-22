import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Look for session cookie (sid is the single source of truth)
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Session-V3] No session cookie found');
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      }, { status: 401 });
    }
    
    console.log('[Session-V3] Validating session:', sessionId.value.substring(0, 10) + '...');
    
    // Validate session with backend
    const response = await fetch(`${API_URL}/api/sessions/validate/${sessionId.value}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.log('[Session-V3] Session validation failed:', response.status);
      
      // Clear invalid session
      const res = NextResponse.json({ 
        authenticated: false,
        user: null 
      }, { status: 401 });
      
      res.cookies.delete('sid');
      res.cookies.delete('user_data');
      
      return res;
    }
    
    const data = await response.json();
    
    console.log('[Session-V3] Session valid:', {
      userId: data.user?.id,
      email: data.user?.email,
      tenantId: data.user?.tenant_id,
      onboardingCompleted: data.user?.onboarding_completed
    });
    
    return NextResponse.json({
      authenticated: true,
      user: data.user,
      session: {
        id: sessionId.value,
        expires_at: data.expires_at
      }
    });
    
  } catch (error) {
    console.error('[Session-V3] Error:', error);
    return NextResponse.json({ 
      authenticated: false,
      user: null,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (sessionId) {
      // Notify backend to delete session
      try {
        await fetch(`${API_URL}/api/sessions/${sessionId.value}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Session ${sessionId.value}`
          }
        });
      } catch (error) {
        console.error('[Session-V3] Error deleting backend session:', error);
      }
    }
    
    // Clear all session cookies
    const response = NextResponse.json({ 
      success: true,
      message: 'Session cleared' 
    });
    
    response.cookies.delete('sid');
    response.cookies.delete('user_data');
    response.cookies.delete('appSession');
    response.cookies.delete('auth0_access_token');
    response.cookies.delete('auth0_id_token');
    response.cookies.delete('session_token');
    
    return response;
    
  } catch (error) {
    console.error('[Session-V3] DELETE error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to clear session' 
    }, { status: 500 });
  }
}