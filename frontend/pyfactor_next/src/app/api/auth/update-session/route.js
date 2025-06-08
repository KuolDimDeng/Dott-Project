import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Update session endpoint to properly persist Auth0 session data
 */
export async function POST(request) {
  try {
    console.log('[Update Session] Updating Auth0 session data');
    
    const updates = await request.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Parse current session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[Update Session] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Update session with new data
    if (updates.tenantId) {
      sessionData.user.tenantId = updates.tenantId;
      sessionData.user.tenant_id = updates.tenantId;
    }
    
    if (updates.needsOnboarding !== undefined) {
      sessionData.user.needsOnboarding = updates.needsOnboarding;
      sessionData.user.needs_onboarding = updates.needsOnboarding;
    }
    
    if (updates.onboardingCompleted !== undefined) {
      sessionData.user.onboardingCompleted = updates.onboardingCompleted;
      sessionData.user.onboarding_completed = updates.onboardingCompleted;
    }
    
    if (updates.currentStep) {
      sessionData.user.currentStep = updates.currentStep;
      sessionData.user.current_onboarding_step = updates.currentStep;
    }
    
    // Add timestamp
    sessionData.user.lastUpdated = new Date().toISOString();
    
    console.log('[Update Session] Updated user data:', {
      email: sessionData.user.email,
      tenantId: sessionData.user.tenantId,
      needsOnboarding: sessionData.user.needsOnboarding,
      onboardingCompleted: sessionData.user.onboardingCompleted
    });
    
    // Encode updated session
    const updatedCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Session updated successfully',
      updates: {
        tenantId: sessionData.user.tenantId,
        needsOnboarding: sessionData.user.needsOnboarding,
        onboardingCompleted: sessionData.user.onboardingCompleted
      }
    });
    
    // Set the updated session cookie
    response.cookies.set('appSession', updatedCookie, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    return response;
    
  } catch (error) {
    console.error('[Update Session] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}