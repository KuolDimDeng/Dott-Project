import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }
    
    console.log(`[DEBUG] Checking onboarding status for: ${email}`);
    
    // Get session for auth token
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session');
    
    let accessToken = null;
    if (sessionCookie) {
      try {
        const { decrypt } = await import('@/utils/sessionEncryption');
        const decrypted = decrypt(sessionCookie.value);
        const sessionData = JSON.parse(decrypted);
        accessToken = sessionData.accessToken;
      } catch (e) {
        console.error('[DEBUG] Error decrypting session:', e);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid session found' }, { status: 401 });
    }
    
    // Call backend to get detailed user info
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${apiUrl}/api/users/me/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: response.status });
    }
    
    const userData = await response.json();
    
    // Get onboarding progress details
    let onboardingProgress = null;
    try {
      const progressResponse = await fetch(`${apiUrl}/api/onboarding/progress/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (progressResponse.ok) {
        onboardingProgress = await progressResponse.json();
      }
    } catch (e) {
      console.error('[DEBUG] Error fetching onboarding progress:', e);
    }
    
    // Return comprehensive debug info
    return NextResponse.json({
      email,
      backend_data: {
        user_id: userData.id,
        email: userData.email,
        tenant_id: userData.tenant_id,
        needs_onboarding: userData.needs_onboarding,
        onboarding_completed: userData.onboarding_completed,
        setup_done: userData.setup_done,
        current_onboarding_step: userData.current_onboarding_step,
        onboarding_status: userData.onboarding_status,
        date_joined: userData.date_joined,
        has_tenant: !!userData.tenant_id
      },
      onboarding_progress: onboardingProgress,
      analysis: {
        should_be_complete: !!userData.tenant_id && userData.needs_onboarding === false,
        has_inconsistency: !!userData.tenant_id && userData.needs_onboarding === true,
        missing_data: !userData.tenant_id && !userData.needs_onboarding,
        recommendation: getRecommendation(userData, onboardingProgress)
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

function getRecommendation(userData, progress) {
  if (userData.tenant_id && userData.needs_onboarding === true) {
    return 'User has tenant but marked as needs_onboarding. Run fix script.';
  }
  if (!userData.tenant_id && userData.needs_onboarding === false) {
    return 'User marked as onboarding complete but no tenant. Data inconsistency.';
  }
  if (progress?.payment_completed && userData.needs_onboarding === true) {
    return 'Payment completed but still needs onboarding. Run fix script.';
  }
  if (userData.needs_onboarding === false && userData.onboarding_completed === true) {
    return 'Status is correct - onboarding complete.';
  }
  return 'Status appears normal.';
}