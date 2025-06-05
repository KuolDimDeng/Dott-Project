///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    console.log('[SetupComplete] Processing onboarding completion request');
    
    // Get Auth0 session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No Auth0 session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    const { user, accessToken } = sessionData;
    const userEmail = user?.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }
    
    console.log('[SetupComplete] Completing onboarding for user:', userEmail);
    
    const completedAt = new Date().toISOString();
    
    // Update Django backend onboarding status
    let backendUpdateSuccessful = false;
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      
      console.log('[SetupComplete] Calling Django onboarding completion endpoint:', `${apiBaseUrl}/api/onboarding/complete/`);
      
      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-User-Email': userEmail,
          'X-User-Sub': user.sub,
        },
        body: JSON.stringify({
          completed_at: completedAt
        })
      });
      
      console.log('[SetupComplete] Backend response status:', backendResponse.status);
      
      if (backendResponse.ok) {
        const result = await backendResponse.json();
        console.log('[SetupComplete] ✅ Django onboarding completion successful:', result);
        backendUpdateSuccessful = true;
      } else {
        const errorText = await backendResponse.text();
        console.error('[SetupComplete] ❌ Django onboarding completion failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText,
          url: `${apiBaseUrl}/api/onboarding/complete/`
        });
        
        // Try alternative endpoint path in case of routing issues
        try {
          console.log('[SetupComplete] Trying alternative endpoint: /api/onboarding/complete');
          const altResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-User-Email': userEmail,
              'X-User-Sub': user.sub,
            },
            body: JSON.stringify({
              completed_at: completedAt
            })
          });
          
          if (altResponse.ok) {
            const altResult = await altResponse.json();
            console.log('[SetupComplete] ✅ Alternative endpoint successful:', altResult);
            backendUpdateSuccessful = true;
          }
        } catch (altError) {
          console.error('[SetupComplete] Alternative endpoint also failed:', altError);
        }
      }
    } catch (backendError) {
      console.error('[SetupComplete] ❌ Error calling Django onboarding completion:', backendError.message);
    }
    
    // Update Auth0 session cookie (critical for immediate session updates)
    try {
      const updatedSessionData = {
        ...sessionData,
        user: {
          ...sessionData.user,
          needsOnboarding: false,
          onboardingCompleted: true,
          onboarding_completed: true,
          needs_onboarding: false,
          currentStep: 'completed',
          current_onboarding_step: 'completed',
          setupCompletedAt: completedAt,
          lastUpdated: completedAt
        }
      };
      
      const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
      
      const response = NextResponse.json({
        success: true,
        message: 'Onboarding completion recorded successfully',
        onboarding_completed: true,
        needs_onboarding: false,
        current_step: 'completed',
        setup_completed_at: completedAt,
        backend_updated: backendUpdateSuccessful
      });
      
      // Update session cookie with new onboarding status
      response.cookies.set('appSession', updatedSessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });
      
      console.log('[SetupComplete] Session cookie updated with onboarding completion');
      return response;
      
    } catch (sessionError) {
      console.error('[SetupComplete] Error updating session cookie:', sessionError);
      
      // Return success even if session update fails, as long as backend was updated
      return NextResponse.json({
        success: backendUpdateSuccessful,
        message: backendUpdateSuccessful 
          ? 'Onboarding completed in backend, session update failed'
          : 'Onboarding completion failed',
        onboarding_completed: backendUpdateSuccessful,
        needs_onboarding: !backendUpdateSuccessful,
        current_step: backendUpdateSuccessful ? 'completed' : 'business_info',
        setup_completed_at: completedAt,
        backend_updated: backendUpdateSuccessful,
        session_error: sessionError.message
      });
    }
    
  } catch (error) {
    console.error('[SetupComplete] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}