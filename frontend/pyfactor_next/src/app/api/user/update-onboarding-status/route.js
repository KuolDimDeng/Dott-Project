import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Update Onboarding Status API
 * Ensures onboarding completion is persisted in the backend
 */
export async function POST(request) {
  console.log('[UPDATE_ONBOARDING_STATUS] Starting status update');
  
  try {
    // 1. Get session - try new name first, then old
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[UPDATE_ONBOARDING_STATUS] No session cookie found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // 2. Parse session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[UPDATE_ONBOARDING_STATUS] Failed to parse session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const user = sessionData.user;
    const accessToken = sessionData.accessToken || sessionData.access_token;
    
    if (!user || !accessToken) {
      console.error('[UPDATE_ONBOARDING_STATUS] Missing user or token in session');
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    console.log('[UPDATE_ONBOARDING_STATUS] User authenticated:', user.email);
    
    // 3. Get request data
    const requestData = await request.json();
    const { 
      tenant_id, 
      onboarding_completed = true,
      current_step = 'complete'
    } = requestData;
    
    if (!tenant_id) {
      console.error('[UPDATE_ONBOARDING_STATUS] No tenant_id provided');
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }
    
    // 4. Call backend to update status
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[UPDATE_ONBOARDING_STATUS] Calling backend:', `${backendUrl}/api/users/update-onboarding-status/`);
    
    const backendResponse = await fetch(`${backendUrl}/api/users/update-onboarding-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        user_id: user.sub,
        tenant_id: tenant_id,
        onboarding_completed: onboarding_completed,
        needs_onboarding: !onboarding_completed,
        current_step: current_step
      })
    });
    
    const responseText = await backendResponse.text();
    let backendResult;
    
    try {
      backendResult = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('[UPDATE_ONBOARDING_STATUS] Failed to parse backend response:', responseText);
      backendResult = { error: 'Invalid response from backend' };
    }
    
    console.log('[UPDATE_ONBOARDING_STATUS] Backend response:', {
      status: backendResponse.status,
      ok: backendResponse.ok,
      result: backendResult
    });
    
    if (!backendResponse.ok) {
      return NextResponse.json({ 
        error: backendResult.error || 'Failed to update status',
        message: backendResult.message || backendResult.detail || 'Please try again.'
      }, { status: backendResponse.status });
    }
    
    // 5. Update session to reflect the change
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        tenant_id: tenant_id,
        tenantId: tenant_id,
        needsOnboarding: false,
        onboardingCompleted: true,
        needs_onboarding: false,
        onboarding_completed: true,
        currentStep: 'complete',
        current_step: 'complete'
      }
    };
    
    const response = NextResponse.json({
      success: true,
      message: 'Onboarding status updated successfully',
      data: backendResult.data
    });
    
    // Update session cookie
    response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
    
  } catch (error) {
    console.error('[UPDATE_ONBOARDING_STATUS] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to update onboarding status',
      message: error.message
    }, { status: 500 });
  }
}