import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to manually trigger PostHog identification
 * Usage: POST /api/debug/posthog-identify
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get current session data
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    
    // Return user data that would be sent to PostHog
    const userData = sessionData.user || sessionData;
    const firstName = userData.firstName || userData.first_name || userData.given_name || '';
    const lastName = userData.lastName || userData.last_name || userData.family_name || '';
    const fullName = userData.name || `${firstName} ${lastName}`.trim() || userData.email?.split('@')[0] || 'User';
    
    const posthogData = {
      user_id: userData.sub || userData.id || userData.email,
      email: userData.email,
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      tenant_id: userData.tenant_id || userData.tenantId,
      tenant_name: userData.tenant_name || userData.tenantName || userData.businessName || userData.business_name,
      subscription_plan: userData.subscription_plan || userData.subscriptionPlan,
      onboarding_completed: userData.onboarding_completed || userData.onboardingCompleted || !userData.needsOnboarding,
      role: userData.role || 'USER',
      business_name: userData.businessName || userData.business_name
    };
    
    // Filter out undefined/null/empty values
    Object.keys(posthogData).forEach(key => {
      if (posthogData[key] === undefined || posthogData[key] === null || posthogData[key] === '') {
        delete posthogData[key];
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'PostHog identification data prepared',
      sessionData: {
        email: sessionData.email,
        hasUser: !!sessionData.user,
        userFields: sessionData.user ? Object.keys(sessionData.user) : []
      },
      posthogData,
      instructions: {
        frontend: 'Call identifyUser(posthogData) on the frontend',
        note: 'This endpoint shows what data would be sent to PostHog'
      }
    });
    
  } catch (error) {
    console.error('[PostHog Debug] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'PostHog identification debug endpoint',
    usage: 'POST to this endpoint to get PostHog identification data for current user'
  });
}