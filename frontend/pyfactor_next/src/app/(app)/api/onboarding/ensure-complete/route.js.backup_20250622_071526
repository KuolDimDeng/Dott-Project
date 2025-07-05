import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Ensure onboarding completion endpoint
 * This endpoint ensures that the backend properly marks onboarding as complete
 * Specifically designed to fix the Google OAuth redirect loop issue
 */
export async function POST(request) {
  console.log('[EnsureComplete] Starting onboarding completion enforcement');
  
  try {
    // Get session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: 'No session token found'
      }, { status: 401 });
    }
    
    // Parse request data
    const data = await request.json();
    const { tenantId, businessName, selectedPlan } = data;
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Call multiple backend endpoints to ensure onboarding is marked complete
    const updatePromises = [];
    
    // 1. Update session directly
    updatePromises.push(
      fetch(`${API_URL}/api/sessions/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken}`
        },
        body: JSON.stringify({
          needs_onboarding: false,
          onboarding_completed: true,
          tenant_id: tenantId,
          subscription_plan: selectedPlan,
          business_name: businessName
        })
      })
    );
    
    // 2. Mark onboarding complete
    updatePromises.push(
      fetch(`${API_URL}/api/onboarding/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken}`
        },
        body: JSON.stringify({
          force_complete: true,
          payment_verified: true,
          needs_onboarding: false,
          setup_done: true
        })
      })
    );
    
    // 3. Update user status
    updatePromises.push(
      fetch(`${API_URL}/api/users/update-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken}`
        },
        body: JSON.stringify({
          needs_onboarding: false,
          onboarding_completed: true,
          setup_done: true
        })
      })
    );
    
    // Execute all updates in parallel
    const results = await Promise.allSettled(updatePromises);
    
    // Log results
    results.forEach((result, index) => {
      const endpoints = ['sessions/update', 'onboarding/complete', 'users/update-status'];
      if (result.status === 'fulfilled' && result.value.ok) {
        console.log(`[EnsureComplete] ✅ ${endpoints[index]} succeeded`);
      } else {
        console.error(`[EnsureComplete] ❌ ${endpoints[index]} failed:`, result.reason || result.value?.status);
      }
    });
    
    // Clear session cache to force fresh data
    const clearCacheResponse = await fetch('/api/auth/clear-cache', {
      method: 'POST'
    });
    
    if (clearCacheResponse.ok) {
      console.log('[EnsureComplete] ✅ Session cache cleared');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completion enforced',
      results: results.map(r => r.status)
    });
    
  } catch (error) {
    console.error('[EnsureComplete] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  // Support GET for easy testing
  return NextResponse.json({
    message: 'Use POST to ensure onboarding completion',
    required: ['tenantId', 'businessName', 'selectedPlan']
  });
}