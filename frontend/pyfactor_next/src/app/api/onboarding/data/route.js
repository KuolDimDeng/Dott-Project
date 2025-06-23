import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Get actual onboarding data including business name from OnboardingProgress
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    
    // Get session token from cookies
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!sidCookie && !sessionTokenCookie) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const sessionToken = sidCookie?.value || sessionTokenCookie?.value;
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ 
        error: 'tenantId parameter is required' 
      }, { status: 400 });
    }
    
    // Call backend onboarding data endpoint
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${API_URL}/api/onboarding/data/?tenant_id=${tenantId}`, {
      headers: {
        'Authorization': `Session ${sessionToken}`,
        'Cookie': `session_token=${sessionToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[OnboardingData] Backend request failed:', response.status);
      return NextResponse.json({ 
        error: 'Failed to fetch onboarding data' 
      }, { status: response.status });
    }
    
    const onboardingData = await response.json();
    console.log('[OnboardingData] Backend response:', {
      business_name: onboardingData.business_name,
      legal_name: onboardingData.legal_name,
      selected_plan: onboardingData.selected_plan
    });
    
    return NextResponse.json(onboardingData);
    
  } catch (error) {
    console.error('[OnboardingData] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}