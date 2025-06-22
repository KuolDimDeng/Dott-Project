import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';

/**
 * Force clear onboarding status for users who have completed onboarding
 * This helps fix the redirect loop issue
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Get current session from backend
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionToken.value}`,
        'Content-Type': 'application/json'
      }
    });

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = await sessionResponse.json();
    
    // Check if user has tenant but still marked as needs_onboarding
    if (sessionData.tenant_id && sessionData.needs_onboarding) {
      console.log('[ForceClearOnboarding] User has tenant but needs_onboarding=true, fixing...');
      
      // Update session to clear onboarding flag
      const updateResponse = await fetch(`${API_URL}/api/sessions/current/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Session ${sessionToken.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          needs_onboarding: false,
          onboarding_completed: true,
          onboarding_status: 'complete'
        })
      });

      if (updateResponse.ok) {
        const updatedData = await updateResponse.json();
        
        // Also update the user's onboarding status directly
        const userUpdateResponse = await fetch(`${API_URL}/api/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Session ${sessionToken.value}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            needs_onboarding: false,
            onboarding_completed: true,
            setup_done: true,
            current_onboarding_step: 'completed',
            onboarding_status: 'complete'
          })
        });

        console.log('[ForceClearOnboarding] Onboarding status cleared successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Onboarding status cleared',
          sessionData: updatedData,
          userUpdateSuccess: userUpdateResponse.ok
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'User does not need onboarding status fix',
      currentStatus: {
        hasTenant: !!sessionData.tenant_id,
        needsOnboarding: sessionData.needs_onboarding,
        onboardingCompleted: sessionData.onboarding_completed
      }
    });

  } catch (error) {
    console.error('[ForceClearOnboarding] Error:', error);
    return NextResponse.json({ error: 'Failed to clear onboarding status' }, { status: 500 });
  }
}