import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/utils/csrf';

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
    
    // SINGLE SOURCE OF TRUTH: Use /api/users/me/session/ as authoritative source
    let profileData = null;
    
    try {
      const profileResponse = await fetch(`${API_URL}/api/users/me/session/`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `session_token=${sessionId.value}`
        },
        cache: 'no-store'
      });
      
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        console.log('[Session-V2] AUTHORITATIVE onboarding status from /api/users/me/session/:', {
          needs_onboarding: profileData.needs_onboarding,
          onboarding_completed: profileData.onboarding_completed,
          tenant_name: profileData.tenant_name,
          subscription_plan: profileData.subscription_plan,
          source: 'users_me_session_endpoint'
        });
      } else {
        console.error('[Session-V2] CRITICAL: Authoritative endpoint failed:', profileResponse.status);
        // Return error instead of continuing with inconsistent data
        return NextResponse.json({ 
          authenticated: false,
          error: 'Unable to fetch user profile' 
        }, { status: 500 });
      }
    } catch (error) {
      console.error('[Session-V2] CRITICAL: Authoritative endpoint error:', error);
      return NextResponse.json({ 
        authenticated: false,
        error: 'Profile service unavailable' 
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
        email: userData.email || sessionData.email || profileData?.email,
        // User name fields - prioritize profile data
        name: profileData?.name || userData.name || sessionData.name,
        given_name: profileData?.given_name || userData.given_name || userData.givenName || sessionData.given_name,
        family_name: profileData?.family_name || userData.family_name || userData.familyName || sessionData.family_name,
        // Business information - use tenant_name from profile data
        businessName: profileData?.tenant_name || tenantData.name || userData.businessName || userData.business_name || sessionData.business_name,
        business_name: profileData?.tenant_name || tenantData.name || userData.businessName || userData.business_name || sessionData.business_name,
        // Subscription information - prioritize profile data
        subscriptionPlan: profileData?.subscription_plan || sessionData.subscription_plan || userData.subscription_plan || sessionData.subscriptionPlan || 'free',
        subscription_plan: profileData?.subscription_plan || sessionData.subscription_plan || userData.subscription_plan || sessionData.subscriptionPlan || 'free',
        // SINGLE SOURCE OF TRUTH: Only use profileData from /api/users/me/session/
        needsOnboarding: profileData.needs_onboarding ?? true,
        onboardingCompleted: profileData.onboarding_completed ?? false,
        tenantId: sessionData.tenant_id || tenantData.id || userData.tenant_id || profileData?.tenant_id,
        tenant_id: sessionData.tenant_id || tenantData.id || userData.tenant_id || profileData?.tenant_id,
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