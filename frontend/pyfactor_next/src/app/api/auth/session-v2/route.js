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
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
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
    console.log('[Session-V2] Full backend response:', sessionData);
    console.log('[Session-V2] Backend session valid:', {
      email: sessionData.email || sessionData.user?.email,
      tenantId: sessionData.tenant_id || sessionData.tenant?.id,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    // WORKAROUND: If session says needs_onboarding but user has tenant_id,
    // double-check with the user profile endpoint which checks OnboardingProgress
    let finalNeedsOnboarding = sessionData.needs_onboarding;
    let finalOnboardingCompleted = sessionData.onboarding_completed;
    
    if (sessionData.needs_onboarding === true && sessionData.tenant_id) {
      console.log('[Session-V2] Session has tenant_id but needs_onboarding=true, checking user profile...');
      
      try {
        const profileResponse = await fetch(`${API_URL}/api/users/me/session/`, {
          headers: {
            'Authorization': `Session ${sessionId.value}`,
            'Cookie': `session_token=${sessionId.value}`
          },
          cache: 'no-store'
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('[Session-V2] User profile check:', {
            needs_onboarding: profileData.needs_onboarding,
            onboarding_completed: profileData.onboarding_completed
          });
          
          // Trust the user profile data over session data
          if (profileData.needs_onboarding === false) {
            finalNeedsOnboarding = false;
            finalOnboardingCompleted = true;
            console.log('[Session-V2] ✅ User has completed onboarding (per OnboardingProgress), overriding session default');
          }
        }
      } catch (error) {
        console.warn('[Session-V2] Failed to check user profile, using session data:', error);
      }
    }
    
    // Return session data from backend
    // Check if data is nested in a 'user' object
    const userData = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    return NextResponse.json({
      authenticated: true,
      user: {
        email: userData.email || sessionData.email,
        // Use the corrected onboarding status
        needsOnboarding: finalNeedsOnboarding ?? true,
        onboardingCompleted: finalOnboardingCompleted ?? false,
        tenantId: sessionData.tenant_id || tenantData.id || userData.tenant_id,
        tenant_id: sessionData.tenant_id || tenantData.id || userData.tenant_id,
        permissions: userData.permissions || sessionData.permissions || []
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
    const { accessToken, idToken, user } = await request.json();
    
    console.log('[Session-V2] Creating new session for:', user?.email);
    
    // Create session with Django backend using Auth0 token
    const authResponse = await fetch(`${API_URL}/api/sessions/create/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ 
        // Send empty body - Django will create session from the Auth0 token
        // The serializer has defaults for all fields
      })
    });
    
    if (!authResponse.ok) {
      console.log('[Session-V2] Session creation failed:', authResponse.status);
      const errorData = await authResponse.text();
      console.log('[Session-V2] Error details:', errorData);
      return NextResponse.json({ 
        error: 'Session creation failed' 
      }, { status: 401 });
    }
    
    const sessionData = await authResponse.json();
    console.log('[Session-V2] Backend session created:', { 
      session_token: sessionData.session_token?.substring(0, 8) + '...',
      session_token_length: sessionData.session_token?.length,
      expires_at: sessionData.expires_at,
      needs_onboarding: sessionData.needs_onboarding,
      user_email: sessionData.user?.email,
      tenant_id: sessionData.tenant?.id
    });
    
    // Set session cookie with the session token from Django
    const response = NextResponse.json({ 
      success: true,
      user: sessionData.user,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.needs_onboarding,
      session_token: sessionData.session_token // Include session token in response
    });
    
    response.cookies.set('sid', sessionData.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(sessionData.expires_at),
      path: '/'
    });
    
    // Also set the session_token cookie for backward compatibility
    response.cookies.set('session_token', sessionData.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(sessionData.expires_at),
      path: '/'
    });
    
    // Clear all old cookies that were causing conflicts
    const oldCookies = [
      'dott_auth_session',
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