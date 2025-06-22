import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Frontend API route to check onboarding status
 * SINGLE SOURCE OF TRUTH: Only uses /api/users/me/session/ for consistency
 * This ensures all APIs return the same onboarding status
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Get session token
    const sessionToken = cookieStore.get('session_token');
    const authSession = cookieStore.get('dott_auth_session');
    
    if (!sessionToken && !authSession) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get backend API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    
    // Forward the request to backend
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add appropriate auth header
    if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken.value}`;
    } else if (authSession) {
      // Forward the cookie
      headers['Cookie'] = `dott_auth_session=${authSession.value}`;
    }
    
    // The backend expects a Bearer token for Auth0 endpoints
    // We need to get the user's Auth0 token from the session
    let backendHeaders = { ...headers };
    
    // PERMANENT FIX: Use unified profile endpoint for consistent onboarding status
    if (sessionToken) {
      try {
        console.log('[Onboarding Status API] PERMANENT FIX - Using unified profile endpoint');
        
        // Call our unified profile endpoint that implements business logic
        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://dottapps.com' : 'http://localhost:3000';
        const unifiedResponse = await fetch(`${baseUrl}/api/auth/unified-profile`, {
          headers: {
            'Cookie': `sid=${sessionToken.value}; session_token=${sessionToken.value}`
          },
          cache: 'no-store'
        });
        
        if (unifiedResponse.ok) {
          const unifiedData = await unifiedResponse.json();
          console.log('[Onboarding Status API] PERMANENT FIX - Unified data received:', {
            needsOnboarding: unifiedData.needsOnboarding,
            onboardingCompleted: unifiedData.onboardingCompleted,
            tenantId: unifiedData.tenantId,
            businessRule: unifiedData.businessRule
          });
          
          // Return data using the authoritative unified source
          return NextResponse.json({
            onboarding_status: unifiedData.onboardingCompleted ? 'complete' : 'incomplete',
            setup_completed: unifiedData.onboardingCompleted,
            needs_onboarding: unifiedData.needsOnboarding,
            current_step: unifiedData.onboardingCompleted ? 'completed' : (unifiedData.currentStep || 'business_info'),
            source: 'unified-profile-permanent-fix',
            businessRule: unifiedData.businessRule
          });
        } else {
          console.error('[Onboarding Status API] Unified endpoint failed:', unifiedResponse.status);
          return NextResponse.json({ 
            error: 'Unable to fetch onboarding status',
            message: 'Unified profile endpoint unavailable'
          }, { status: 500 });
        }
      } catch (error) {
        console.error('[Onboarding Status API] Unified endpoint error:', error);
        return NextResponse.json({ 
          error: 'Profile service unavailable',
          message: error.message
        }, { status: 500 });
      }
    }
    
    // No session token found - user must authenticate
    return NextResponse.json({ 
      error: 'Authentication required',
      message: 'No valid session token found'
    }, { status: 401 });
    
  } catch (error) {
    console.error('[Onboarding Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}