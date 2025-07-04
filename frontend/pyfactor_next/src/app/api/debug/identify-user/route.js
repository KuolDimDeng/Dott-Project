import { NextResponse } from 'next/server';
import { initPostHog, identifyUser } from '@/lib/posthog';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';

export async function POST() {
  try {
    // Get current session
    const session = await sessionManagerEnhanced.getSession();
    
    if (!session?.authenticated || !session?.user) {
      return NextResponse.json({ 
        error: 'No authenticated user found',
        session: session 
      }, { status: 401 });
    }
    
    // Initialize PostHog
    const posthog = await initPostHog();
    
    if (!posthog) {
      return NextResponse.json({ 
        error: 'PostHog not initialized' 
      }, { status: 500 });
    }
    
    // Manually identify user
    const user = session.user;
    const userId = user.sub || user.id || user.email;
    const userProperties = {
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      tenant_id: user.tenantId || user.tenant_id,
      role: user.role,
      subscription_plan: user.subscriptionPlan || user.subscription_plan,
      onboarding_completed: user.onboardingCompleted || user.onboarding_completed
    };
    
    console.log('[Manual Identify] Identifying user:', userId, userProperties);
    
    // Call identify directly on posthog instance
    posthog.identify(userId, userProperties);
    
    // Force capture an event to ensure identification is sent
    posthog.capture('manual_identification_test', {
      timestamp: new Date().toISOString(),
      source: 'debug_endpoint'
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'User identified manually',
      userId: userId,
      properties: userProperties,
      posthogStatus: {
        distinctId: posthog.get_distinct_id(),
        isIdentified: posthog._isIdentified?.() || false
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to identify user',
      message: error.message 
    }, { status: 500 });
  }
}