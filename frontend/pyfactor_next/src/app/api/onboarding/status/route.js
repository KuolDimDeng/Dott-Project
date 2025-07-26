import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Frontend API route to check onboarding status
 * Forwards request to backend /api/onboarding/status/ endpoint
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Get session token
    const sessionToken = cookieStore.get('session_token') || cookieStore.get('sid');
    const authSession = cookieStore.get('dott_auth_session');
    
    if (!sessionToken && !authSession) {
      logger.warn('[Onboarding Status API] No session found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get backend API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    
    // Get Auth0 access token for backend authentication
    let accessToken = null;
    try {
      const tokenResponse = await fetch(`${request.nextUrl.origin}/api/auth/token`);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.accessToken;
      }
    } catch (tokenError) {
      logger.warn('[Onboarding Status API] Failed to get access token:', tokenError);
    }
    
    // Prepare headers for backend request
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add authentication header
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken.value}`;
    } else if (authSession) {
      headers['Cookie'] = `dott_auth_session=${authSession.value}`;
    }
    
    logger.debug('[Onboarding Status API] Calling backend endpoint', {
      url: `${apiUrl}/api/onboarding/status/`,
      hasAccessToken: !!accessToken,
      hasSessionToken: !!sessionToken
    });
    
    // Call backend onboarding status endpoint
    try {
      const backendResponse = await fetch(`${apiUrl}/api/onboarding/status/`, {
        method: 'GET',
        headers: headers,
        cache: 'no-store'
      });
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        logger.error('[Onboarding Status API] Backend request failed', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Handle specific error cases
        if (backendResponse.status === 401) {
          return NextResponse.json({ 
            error: 'Authentication required',
            message: 'Session expired or invalid'
          }, { status: 401 });
        }
        
        return NextResponse.json({ 
          error: 'Backend request failed',
          message: `Status ${backendResponse.status}: ${backendResponse.statusText}`
        }, { status: backendResponse.status });
      }
      
      const data = await backendResponse.json();
      logger.debug('[Onboarding Status API] Backend response received', {
        success: data.success,
        hasData: !!data.data
      });
      
      // Extract the data from the backend response
      if (data.success && data.data) {
        return NextResponse.json({
          onboarding_status: data.data.onboarding_status,
          current_step: data.data.current_step,
          next_step: data.data.next_step,
          completed_steps: data.data.completed_steps,
          business_info_completed: data.data.business_info_completed,
          subscription_selected: data.data.subscription_selected,
          payment_completed: data.data.payment_completed,
          setup_completed: data.data.setup_completed,
          onboarding_completed: data.data.onboarding_completed,
          selected_plan: data.data.selected_plan,
          billing_cycle: data.data.billing_cycle,
          needs_onboarding: !data.data.onboarding_completed,
          source: 'backend-onboarding-status'
        });
      } else {
        // Return the raw response if it doesn't match expected format
        return NextResponse.json(data);
      }
      
    } catch (fetchError) {
      logger.error('[Onboarding Status API] Network error calling backend:', {
        error: fetchError.message,
        stack: fetchError.stack
      });
      
      return NextResponse.json({ 
        error: 'Network error',
        message: 'Unable to connect to backend service'
      }, { status: 503 });
    }
    
  } catch (error) {
    logger.error('[Onboarding Status API] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}