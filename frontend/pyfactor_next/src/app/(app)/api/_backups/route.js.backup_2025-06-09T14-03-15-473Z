import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session refresh endpoint to force reload of session data after onboarding
 */
export async function POST(request) {
  try {
    console.log('[Session Refresh] Forcing session refresh after onboarding');
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Parse and update session data
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[Session Refresh] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Check if onboarding was completed
    const onboardingCompletedCookie = cookieStore.get('onboardingCompleted');
    if (onboardingCompletedCookie?.value === 'true' && sessionData.user) {
      console.log('[Session Refresh] Updating session with onboarding completion');
      sessionData.user.needsOnboarding = false;
      sessionData.user.onboardingCompleted = true;
      sessionData.user.currentStep = 'completed';
      
      // Get tenant ID from cookie
      const tenantIdCookie = cookieStore.get('user_tenant_id');
      if (tenantIdCookie?.value) {
        sessionData.user.tenantId = tenantIdCookie.value;
        sessionData.user.tenant_id = tenantIdCookie.value;
      }
      
      // Update the session cookie
      const updatedCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'Session refreshed',
        needsOnboarding: false 
      });
      
      response.cookies.set('appSession', updatedCookie, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });
      
      return response;
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'No updates needed' 
    });
    
  } catch (error) {
    console.error('[Session Refresh] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}