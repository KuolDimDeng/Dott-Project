import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Auth Profile] Getting user session and profile');
    
    // Try to get session from custom cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    let user = null;
    let accessToken = null;
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[Auth Profile] Session expired');
          return NextResponse.json(null, { status: 200 });
        }
        
        user = sessionData.user;
        accessToken = sessionData.accessToken;
        console.log('[Auth Profile] Session found for user:', user.email);
        
      } catch (parseError) {
        console.error('[Auth Profile] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: try Auth0 SDK session
    if (!user) {
      try {
        const { auth0 } = await import('@/lib/auth0');
        const session = await auth0.getSession(request);
        
        if (session && session.user) {
          user = session.user;
          accessToken = session.accessToken;
          console.log('[Auth Profile] Auth0 SDK session found for user:', session.user.email);
        }
      } catch (auth0Error) {
        console.log('[Auth Profile] Auth0 SDK session not available:', auth0Error.message);
      }
    }
    
    if (!user) {
      console.log('[Auth Profile] No session found');
      return NextResponse.json(null, { status: 200 });
    }
    
    // Now fetch the complete user profile from Django backend
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiBaseUrl && accessToken) {
        console.log('[Auth Profile] Fetching complete profile from backend');
        
        const backendResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-User-Email': user.email,
            'X-Source': 'auth-profile-route'
          },
          timeout: 5000
        });
        
        if (backendResponse.ok) {
          const backendUserData = await backendResponse.json();
          console.log('[Auth Profile] Backend profile loaded:', {
            hasUserData: !!backendUserData,
            currentStep: backendUserData.currentStep,
            hasTenant: !!backendUserData.tenantId,
            needsOnboarding: backendUserData.needsOnboarding
          });
          
          // Merge Auth0 data with backend profile data
          const completeProfile = {
            ...user, // Auth0 user data (email, name, picture, sub)
            ...backendUserData, // Backend data (tenantId, currentStep, needsOnboarding, etc.)
            source: 'merged' // Indicate this is merged data
          };
          
          return NextResponse.json(completeProfile);
        } else {
          console.log('[Auth Profile] Backend profile not available, status:', backendResponse.status);
        }
      }
    } catch (backendError) {
      console.error('[Auth Profile] Error fetching backend profile:', backendError.message);
      // Continue with Auth0 data only
    }
    
    // Return Auth0 user data with basic defaults if backend unavailable
    const basicProfile = {
      ...user,
      needsOnboarding: true, // Default to needing onboarding
      currentStep: 'business_info', // Default step
      tenantId: null,
      source: 'auth0-only'
    };
    
    console.log('[Auth Profile] Returning basic Auth0 profile with defaults');
    return NextResponse.json(basicProfile);
    
  } catch (error) {
    console.error('[Auth Profile] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 