import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/utils/csrf';

/**
 * PERMANENT FIX: Server-Side Session Management - Version 2
 * 
 * Now uses unified profile endpoint that applies business logic
 * to resolve onboarding status conflicts permanently.
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
    
    // PERMANENT FIX: Use unified profile endpoint for authoritative data
    let unifiedData = null;
    
    try {
      // Create a fake request object to pass cookies
      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://dottapps.com' : 'http://localhost:3000';
      const unifiedResponse = await fetch(`${baseUrl}/api/auth/unified-profile`, {
        headers: {
          'Cookie': `sid=${sessionId.value}; session_token=${sessionId.value}`
        },
        cache: 'no-store'
      });
      
      if (unifiedResponse.ok) {
        unifiedData = await unifiedResponse.json();
        console.log('[Session-V2] PERMANENT FIX - Unified data received:', {
          needsOnboarding: unifiedData.needsOnboarding,
          onboardingCompleted: unifiedData.onboardingCompleted,
          tenantId: unifiedData.tenantId,
          businessRule: unifiedData.businessRule
        });
      } else {
        console.error('[Session-V2] Unified endpoint failed:', unifiedResponse.status);
        return NextResponse.json({ 
          authenticated: false,
          error: 'Unable to fetch unified profile' 
        }, { status: 500 });
      }
    } catch (error) {
      console.error('[Session-V2] Unified endpoint error:', error);
      return NextResponse.json({ 
        authenticated: false,
        error: 'Unified profile service unavailable' 
      }, { status: 500 });
    }
    
    // Return session data from backend
    // Check if data is nested in a 'user' object
    const userData = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    return NextResponse.json({
      authenticated: true,
      csrfToken: generateCSRFToken(),
      user: {
        // Use unified data which has applied business logic
        email: unifiedData.email,
        name: unifiedData.name,
        given_name: unifiedData.given_name,
        family_name: unifiedData.family_name,
        // Business information from unified source
        businessName: unifiedData.businessName,
        business_name: unifiedData.business_name,
        // Subscription information from unified source
        subscriptionPlan: unifiedData.subscriptionPlan,
        subscription_plan: unifiedData.subscription_plan,
        // PERMANENT FIX: Authoritative onboarding status from business logic
        needsOnboarding: unifiedData.needsOnboarding,
        onboardingCompleted: unifiedData.onboardingCompleted,
        tenantId: unifiedData.tenantId,
        tenant_id: unifiedData.tenant_id,
        // Additional metadata
        businessRule: unifiedData.businessRule,
        sessionSource: 'unified-permanent-fix',
        permissions: sessionData.permissions || []
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
      csrfToken: generateCSRFToken(),
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