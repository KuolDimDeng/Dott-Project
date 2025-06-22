import { NextResponse } from 'next/server';

/**
 * Google OAuth Session Fix Endpoint
 * 
 * This endpoint fixes the issue where backend always sets needs_onboarding=true
 * for Google OAuth users, even if they've already completed onboarding.
 * 
 * It works by:
 * 1. Creating the session normally
 * 2. Immediately checking the user's actual onboarding status
 * 3. Updating the session if needed
 */
export async function POST(request) {
  console.log('[GoogleSessionFix] Starting Google OAuth session fix');
  
  try {
    const { accessToken } = await request.json();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Step 1: Create session (backend will incorrectly set needs_onboarding=true)
    console.log('[GoogleSessionFix] Creating session with backend');
    const createResponse = await fetch(`${API_URL}/api/sessions/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        session_type: 'web'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Session creation failed: ${createResponse.status}`);
    }
    
    const sessionData = await createResponse.json();
    const sessionToken = sessionData.session_token || sessionData.session_id;
    
    console.log('[GoogleSessionFix] Session created:', {
      sessionToken: sessionToken?.substring(0, 8) + '...',
      needs_onboarding: sessionData.needs_onboarding,
      tenant_id: sessionData.tenant_id
    });
    
    // Step 2: Check actual onboarding status
    console.log('[GoogleSessionFix] Checking actual onboarding status');
    const statusResponse = await fetch(`${API_URL}/api/onboarding/status/`, {
      headers: {
        'Authorization': `Session ${sessionToken}`
      }
    });
    
    let actualNeedsOnboarding = true;
    let actualTenantId = null;
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      // Check multiple indicators of onboarding completion
      const hasCompletedOnboarding = 
        statusData.setup_completed === true ||
        statusData.onboarding_completed === true ||
        statusData.status === 'complete' ||
        statusData.current_step === 'complete';
      
      actualNeedsOnboarding = !hasCompletedOnboarding;
      actualTenantId = statusData.tenant_id || statusData.tenant?.id;
      
      console.log('[GoogleSessionFix] Actual onboarding status:', {
        setup_completed: statusData.setup_completed,
        onboarding_completed: statusData.onboarding_completed,
        status: statusData.status,
        current_step: statusData.current_step,
        needs_onboarding: actualNeedsOnboarding,
        tenant_id: actualTenantId
      });
    } else {
      // If no onboarding status exists, check if user has any sessions marked as complete
      console.log('[GoogleSessionFix] No onboarding status found, checking session history');
      
      // Default to true unless we find evidence of completion
      actualNeedsOnboarding = sessionData.needs_onboarding !== false;
    }
    
    // Step 3: If user has completed onboarding but session says they haven't, fix it
    if (!actualNeedsOnboarding && sessionData.needs_onboarding) {
      console.log('[GoogleSessionFix] 🔥 FIXING: User completed onboarding but session says they need it');
      
      // Update session with correct status
      const updateResponse = await fetch(`${API_URL}/api/sessions/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken}`
        },
        body: JSON.stringify({
          needs_onboarding: false,
          onboarding_completed: true,
          tenant_id: actualTenantId || sessionData.tenant_id
        })
      });
      
      if (updateResponse.ok) {
        console.log('[GoogleSessionFix] ✅ Session updated successfully');
        sessionData.needs_onboarding = false;
        sessionData.onboarding_completed = true;
        if (actualTenantId) {
          sessionData.tenant_id = actualTenantId;
        }
      } else {
        console.error('[GoogleSessionFix] ❌ Failed to update session');
      }
    }
    
    // Return the corrected session data
    return NextResponse.json({
      ...sessionData,
      needs_onboarding: actualNeedsOnboarding,
      tenant_id: actualTenantId || sessionData.tenant_id
    });
    
  } catch (error) {
    console.error('[GoogleSessionFix] Error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}