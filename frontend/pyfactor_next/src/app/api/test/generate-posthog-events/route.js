import { NextResponse } from 'next/server';
import { trackEvent, EVENTS } from '@/utils/posthogTracking';
import { captureEvent } from '@/lib/posthog';

export async function GET() {
  try {
    // Generate all tracking events for testing
    const testEmail = 'test@posthog.com';
    const testUserId = 'test-user-123';
    
    // Simulate sign up flow
    await captureEvent('Sign Up Started', { email: testEmail });
    await captureEvent('Sign Up Completed', { email: testEmail, userId: testUserId });
    
    // Simulate onboarding flow
    await captureEvent('Onboarding Started', { email: testEmail, userId: testUserId });
    
    await captureEvent('Onboarding Step Completed', {
      step: 'business_info',
      businessName: 'Test Business',
      businessType: 'retail',
      country: 'US'
    });
    
    await captureEvent('Subscription Plan Selected', {
      plan: 'professional',
      billingCycle: 'monthly',
      isFreePlan: false
    });
    
    await captureEvent('Onboarding Completed', {
      plan: 'professional',
      businessType: 'retail',
      tenantId: 'test-tenant-123'
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test events generated. Check PostHog Activity in 2-5 minutes.' 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}