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
    
    // SINGLE SOURCE OF TRUTH: Only use /api/users/me/session/ for onboarding status
    if (sessionToken) {
      try {
        // Use ONLY the authoritative endpoint for consistency
        const statusResponse = await fetch(`${apiUrl}/api/users/me/session/`, {
          headers: {
            'Authorization': `Session ${sessionToken.value}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (statusResponse.ok) {
          const userData = await statusResponse.json();
          console.log('[Onboarding Status API] AUTHORITATIVE data from /api/users/me/session/:', {
            needs_onboarding: userData.needs_onboarding,
            onboarding_completed: userData.onboarding_completed,
            source: 'users_me_session_endpoint'
          });
          
          // Return data using ONLY the authoritative source
          return NextResponse.json({
            onboarding_status: userData.onboarding_completed ? 'complete' : 'incomplete',
            setup_completed: userData.onboarding_completed ?? false,
            needs_onboarding: userData.needs_onboarding ?? true,
            current_step: userData.onboarding_completed ? 'completed' : (userData.current_onboarding_step || 'business_info')
          });
        } else {
          console.error('[Onboarding Status API] CRITICAL: Authoritative endpoint failed:', statusResponse.status, await statusResponse.text());
          // Don't use fallback endpoints - return error for consistency
          return NextResponse.json({ 
            error: 'Unable to fetch onboarding status',
            message: 'Authoritative endpoint unavailable'
          }, { status: 500 });
        }
      } catch (error) {
        console.error('[Onboarding Status API] CRITICAL: Authoritative endpoint error:', error);
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