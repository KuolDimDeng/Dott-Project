import { NextResponse } from 'next/server';
import { initPostHog } from '@/lib/posthog';

export async function GET() {
  try {
    // Check if PostHog is initialized
    const posthog = await initPostHog();
    
    if (!posthog) {
      return NextResponse.json({ 
        error: 'PostHog not initialized',
        reason: 'Client is null' 
      });
    }
    
    // Get current state
    const status = {
      initialized: true,
      distinctId: posthog.get_distinct_id?.() || 'not available',
      sessionId: posthog.get_session_id?.() || 'not available',
      isIdentified: posthog._isIdentified?.() || false,
      apiHost: posthog.config?.api_host || 'not set',
      persistence: posthog.config?.persistence || 'not set',
      properties: posthog.get_property?.('$user_id') ? {
        userId: posthog.get_property('$user_id'),
        email: posthog.get_property('email'),
        name: posthog.get_property('name')
      } : 'No user properties found'
    };
    
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check PostHog status',
      message: error.message 
    }, { status: 500 });
  }
}