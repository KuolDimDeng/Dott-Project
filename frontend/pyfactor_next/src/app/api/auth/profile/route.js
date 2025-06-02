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
          
          // Check if session cookie has more recent onboarding status
          let sessionOnboardingData = {};
          if (sessionCookie) {
            try {
              const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
              if (sessionData.user) {
                sessionOnboardingData = {
                  currentStep: sessionData.user.currentStep,
                  needsOnboarding: sessionData.user.needsOnboarding,
                  onboardingCompleted: sessionData.user.onboardingCompleted,
                  businessInfoCompleted: sessionData.user.businessInfoCompleted
                };
                console.log('[Auth Profile] Session onboarding data:', sessionOnboardingData);
              }
            } catch (parseError) {
              console.error('[Auth Profile] Error parsing session for onboarding data:', parseError);
            }
          }
          
          // Fallback: Check individual cookies for onboarding status
          const businessInfoCompletedCookie = cookieStore.get('businessInfoCompleted')?.value;
          const onboardingStepCookie = cookieStore.get('onboardingStep')?.value;
          
          if (!sessionOnboardingData.currentStep && (businessInfoCompletedCookie === 'true' || onboardingStepCookie === 'subscription')) {
            sessionOnboardingData = {
              currentStep: 'subscription',
              needsOnboarding: true,
              onboardingCompleted: false,
              businessInfoCompleted: true
            };
            console.log('[Auth Profile] Using individual cookies for onboarding status:', sessionOnboardingData);
          }
          
          // Merge Auth0 data with backend profile data, prioritizing session data for onboarding
          const completeProfile = {
            ...user, // Auth0 user data (email, name, picture, sub)
            ...backendUserData, // Backend data (tenantId, etc.)
            // **CRITICAL FIX: Prioritize session data for onboarding status if available**
            ...(sessionOnboardingData.currentStep && {
              currentStep: sessionOnboardingData.currentStep,
              needsOnboarding: sessionOnboardingData.needsOnboarding !== undefined ? sessionOnboardingData.needsOnboarding : backendUserData.needsOnboarding,
              onboardingCompleted: sessionOnboardingData.onboardingCompleted !== undefined ? sessionOnboardingData.onboardingCompleted : backendUserData.onboardingCompleted,
              businessInfoCompleted: sessionOnboardingData.businessInfoCompleted !== undefined ? sessionOnboardingData.businessInfoCompleted : backendUserData.businessInfoCompleted
            }),
            // **ADDITIONAL FIX: Always check session for latest onboarding data even if currentStep is not set**
            ...(sessionOnboardingData.needsOnboarding !== undefined && {
              needsOnboarding: sessionOnboardingData.needsOnboarding,
              onboardingCompleted: sessionOnboardingData.onboardingCompleted,
              currentStep: sessionOnboardingData.currentStep || backendUserData.currentStep
            }),
            source: 'merged' // Indicate this is merged data
          };
          
          console.log('[Auth Profile] Final merged profile:', {
            currentStep: completeProfile.currentStep,
            needsOnboarding: completeProfile.needsOnboarding,
            onboardingCompleted: completeProfile.onboardingCompleted,
            businessInfoCompleted: completeProfile.businessInfoCompleted,
            source: completeProfile.source
          });
          
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
    
    // But check if session has onboarding status
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        if (sessionData.user) {
          // **CRITICAL FIX: Always prioritize session onboarding data**
          if (sessionData.user.needsOnboarding !== undefined) {
            basicProfile.needsOnboarding = sessionData.user.needsOnboarding;
          }
          if (sessionData.user.onboardingCompleted !== undefined) {
            basicProfile.onboardingCompleted = sessionData.user.onboardingCompleted;
          }
          if (sessionData.user.currentStep !== undefined) {
            basicProfile.currentStep = sessionData.user.currentStep;
          }
          if (sessionData.user.businessInfoCompleted !== undefined) {
            basicProfile.businessInfoCompleted = sessionData.user.businessInfoCompleted;
          }
          
          basicProfile.source = 'auth0-with-session';
          console.log('[Auth Profile] Updated basic profile with session data:', {
            currentStep: basicProfile.currentStep,
            needsOnboarding: basicProfile.needsOnboarding,
            onboardingCompleted: basicProfile.onboardingCompleted
          });
        }
      } catch (parseError) {
        console.error('[Auth Profile] Error parsing session for fallback profile:', parseError);
      }
    }
    
    // Additional fallback: Check individual cookies for onboarding status
    if (basicProfile.currentStep === 'business_info') {
      try {
        const businessInfoCompletedCookie = cookieStore.get('businessInfoCompleted')?.value;
        const onboardingStepCookie = cookieStore.get('onboardingStep')?.value;
        
        if (businessInfoCompletedCookie === 'true' || onboardingStepCookie === 'subscription') {
          basicProfile.currentStep = 'subscription';
          basicProfile.needsOnboarding = true;
          basicProfile.onboardingCompleted = false;
          basicProfile.businessInfoCompleted = true;
          basicProfile.source = 'auth0-with-individual-cookies';
          console.log('[Auth Profile] Updated basic profile with individual cookies:', {
            currentStep: basicProfile.currentStep,
            needsOnboarding: basicProfile.needsOnboarding
          });
        }
      } catch (cookieError) {
        console.error('[Auth Profile] Error checking individual cookies:', cookieError);
      }
    }
    
    console.log('[Auth Profile] Returning basic Auth0 profile with defaults');
    return NextResponse.json(basicProfile);
    
  } catch (error) {
    console.error('[Auth Profile] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 