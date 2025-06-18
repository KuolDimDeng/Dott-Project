import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Frontend API route to check onboarding status
 * This avoids SSL errors by making the backend call server-side
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
    
    // If we have a session token, we need to exchange it for user info first
    if (sessionToken) {
      try {
        // First try the session-based user profile endpoint that accepts session tokens
        const statusResponse = await fetch(`${apiUrl}/api/users/me/session/`, {
          headers: {
            'Authorization': `Session ${sessionToken.value}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (statusResponse.ok) {
          const userData = await statusResponse.json();
          return NextResponse.json({
            onboarding_status: userData.onboarding_status || 'complete',
            setup_completed: userData.onboarding_completed || true,
            needs_onboarding: userData.needs_onboarding || false,
            current_step: userData.current_onboarding_step || 'complete'
          });
        } else {
          console.error('[Onboarding Status API] Session profile endpoint failed:', statusResponse.status, await statusResponse.text());
          
          // Fallback: Try to get session data directly
          const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
            headers: {
              'Authorization': `Session ${sessionToken.value}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            return NextResponse.json({
              onboarding_status: sessionData.onboarding_status || 'complete',
              setup_completed: sessionData.onboarding_completed || true,
              needs_onboarding: sessionData.needs_onboarding || false,
              current_step: sessionData.onboarding_step || 'complete'
            });
          } else {
            console.error('[Onboarding Status API] Sessions current endpoint failed:', sessionResponse.status, await sessionResponse.text());
          }
        }
      } catch (error) {
        console.error('[Onboarding Status API] Session lookup error:', error);
      }
    }
    
    // If we couldn't get status from session/user endpoints, return a default
    // The backend /api/onboarding/status/ expects Bearer tokens, not Session tokens
    // So we'll return a sensible default for authenticated users
    return NextResponse.json({
      onboarding_status: 'complete',
      setup_completed: true,
      needs_onboarding: false,
      current_step: 'complete'
    });
    
  } catch (error) {
    console.error('[Onboarding Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}