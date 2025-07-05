import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session verification endpoint
 * Used to verify session cookies are properly set after onboarding
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('session_token');
    const onboardingCompleted = cookieStore.get('onboardingCompleted');
    const userTenantId = cookieStore.get('user_tenant_id');
    
    console.log('[SessionVerify] Checking session state:', {
      hasSid: !!sid,
      hasSessionToken: !!sessionToken,
      onboardingCompleted: onboardingCompleted?.value,
      userTenantId: userTenantId?.value
    });
    
    // Verify session with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const token = sid?.value || sessionToken?.value;
    
    if (!token) {
      return NextResponse.json({
        valid: false,
        reason: 'No session token found',
        cookies: {
          sid: false,
          sessionToken: false
        }
      }, { status: 401 });
    }
    
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        reason: 'Backend validation failed',
        status: response.status
      }, { status: 401 });
    }
    
    const sessionData = await response.json();
    
    return NextResponse.json({
      valid: true,
      session: {
        email: sessionData.user?.email,
        tenantId: sessionData.tenant?.id || sessionData.tenant_id,
        needsOnboarding: sessionData.needs_onboarding,
        onboardingCompleted: sessionData.onboarding_completed
      },
      cookies: {
        sid: !!sid,
        sessionToken: !!sessionToken,
        onboardingCompleted: !!onboardingCompleted,
        userTenantId: !!userTenantId
      }
    });
    
  } catch (error) {
    console.error('[SessionVerify] Error:', error);
    return NextResponse.json({
      valid: false,
      reason: 'Server error',
      error: error.message
    }, { status: 500 });
  }
}