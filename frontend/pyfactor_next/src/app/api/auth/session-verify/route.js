import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session Verification Endpoint
 * 
 * Verifies that a session is properly established and returns
 * the current session state including onboarding status.
 */
export async function GET(request) {
  console.log('[SessionVerify] Verifying session state');
  
  try {
    // Get session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        valid: false,
        reason: 'No session token found'
      });
    }
    
    // Verify with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionToken}`
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        reason: `Backend validation failed: ${response.status}`
      });
    }
    
    const sessionData = await response.json();
    
    // Check onboarding status from backend
    const onboardingResponse = await fetch(`${API_URL}/api/onboarding/status/`, {
      headers: {
        'Authorization': `Session ${sessionToken}`
      }
    });
    
    let actualNeedsOnboarding = sessionData.needs_onboarding;
    let actualTenantId = sessionData.tenant_id;
    
    if (onboardingResponse.ok) {
      const onboardingData = await onboardingResponse.json();
      actualNeedsOnboarding = !onboardingData.setup_completed && !onboardingData.onboarding_completed;
      if (onboardingData.tenant_id || onboardingData.tenant?.id) {
        actualTenantId = onboardingData.tenant_id || onboardingData.tenant?.id;
      }
    }
    
    return NextResponse.json({
      valid: true,
      session: {
        user_id: sessionData.user_id,
        email: sessionData.email,
        tenant_id: actualTenantId,
        needs_onboarding: actualNeedsOnboarding,
        expires_at: sessionData.expires_at
      }
    });
    
  } catch (error) {
    console.error('[SessionVerify] Error:', error);
    return NextResponse.json({
      valid: false,
      reason: error.message
    });
  }
}