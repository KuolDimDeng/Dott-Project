///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Check Auth0 v4.x authentication via appSession cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required - no session found' },
        { status: 401 }
      );
    }

    // Validate session has user data
    let userEmail = null;
    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      if (!sessionData.user || !sessionData.user.email) {
        return NextResponse.json(
          { error: 'Invalid session - no user data' },
          { status: 401 }
        );
      }
      userEmail = sessionData.user.email;
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid session format' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[SetupComplete] Request body:', body);

    // For background completion, we don't need all the fields
    const { status, completedAt, background, source } = body;

    // **NEW: Update user onboarding status in Django backend**
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.DJANGO_API_URL || 'https://api.dottapps.com';
      const updateUrl = `${backendUrl}/api/users/me/`;  // Use the correct Django endpoint
      
      console.log('[SetupComplete] Updating onboarding status for user:', userEmail);
      
      // Get Auth0 access token for Django authentication
      let authHeaders = {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail, // Pass user email for identification
      };

      // Try to get access token from Auth0 session
      try {
        const { getAccessToken } = await import('@auth0/nextjs-auth0');
        const accessToken = await getAccessToken();
        if (accessToken) {
          authHeaders['Authorization'] = `Bearer ${accessToken}`;
          console.log('[SetupComplete] Using Auth0 access token for Django authentication');
        }
      } catch (tokenError) {
        console.log('[SetupComplete] Could not get Auth0 access token, using session cookie method:', tokenError.message);
        // Fallback: include session cookie for Django session authentication
        authHeaders['Cookie'] = `appSession=${sessionCookie.value}`;
      }
      
      const backendResponse = await fetch(updateUrl, {
        method: 'PATCH',  // Use PATCH method for updating user profile
        headers: authHeaders,
        body: JSON.stringify({
          onboarding_status: 'complete',  // Use Django field names
          needs_onboarding: false,
          current_step: 'completed',
          setup_completed_at: completedAt || new Date().toISOString()
        })
      });

      if (backendResponse.ok) {
        const backendResult = await backendResponse.json();
        console.log('[SetupComplete] Backend update successful:', backendResult);
      } else {
        const errorText = await backendResponse.text();
        console.warn('[SetupComplete] Backend update failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Try alternative endpoint if main one fails
        if (backendResponse.status === 404) {
          console.log('[SetupComplete] Trying alternative Django endpoint...');
          try {
            const altResponse = await fetch(`${backendUrl}/api/auth/update-user-profile/`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                email: userEmail,
                onboarding_completed: true,
                needs_onboarding: false,
                current_step: 'completed'
              })
            });
            
            if (altResponse.ok) {
              console.log('[SetupComplete] Alternative endpoint successful');
            } else {
              console.warn('[SetupComplete] Alternative endpoint also failed:', altResponse.status);
            }
          } catch (altError) {
            console.error('[SetupComplete] Alternative endpoint error:', altError);
          }
        }
        
        // Continue anyway - don't fail the frontend flow if backend update fails
      }
    } catch (backendError) {
      console.error('[SetupComplete] Error updating backend onboarding status:', backendError);
      // Continue anyway - don't fail the frontend flow if backend update fails
    }

    // Return success response
    const response = {
      success: true,
      message: 'Setup completed successfully',
      completedAt: completedAt || new Date().toISOString(),
      background: background || false,
      source: source || 'manual',
      onboardingCompleted: true,
      needsOnboarding: false
    };

    console.log('[SetupComplete] Success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[SetupComplete] Error completing setup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}