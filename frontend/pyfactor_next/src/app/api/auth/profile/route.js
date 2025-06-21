import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Simplified Profile API - Backend Single Source of Truth
 * Only fetches data from backend, no local overrides or complex logic
 */
export async function GET(request) {
  console.log('[Profile API] GET request - Simplified Version');
  
  try {
    const cookieStore = await cookies();
    
    // Check for session cookies (new v2 system)
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    console.log('[Profile API] Session cookies:', {
      hasSid: !!sidCookie,
      hasSessionToken: !!sessionTokenCookie
    });
    
    // If we have sid or session_token, use the new session system
    if (sidCookie || sessionTokenCookie) {
      console.log('[Profile API] Using new session system, fetching from backend');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      const token = sidCookie?.value || sessionTokenCookie?.value;
      
      try {
        // Fetch current session from backend
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `SessionID ${token}`,
            'Cookie': `session_token=${token}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          console.log('[Profile API] Backend session data:', {
            email: sessionData.email || sessionData.user?.email,
            tenantId: sessionData.tenant_id || sessionData.tenant?.id,
            needsOnboarding: sessionData.needs_onboarding,
            onboardingCompleted: sessionData.onboarding_completed
          });
          
          // Handle nested data structures from backend
          const userData = sessionData.user || sessionData;
          const tenantData = sessionData.tenant || {};
          
          // Also fetch user profile for complete data
          let profileData = null;
          try {
            const profileResponse = await fetch(`${API_URL}/api/users/me/session/`, {
              headers: {
                'Authorization': `Session ${token}`,
                'Cookie': `session_token=${token}`
              },
              cache: 'no-store'
            });
            
            if (profileResponse.ok) {
              profileData = await profileResponse.json();
              console.log('[Profile API] User profile data:', {
                needs_onboarding: profileData.needs_onboarding,
                onboarding_completed: profileData.onboarding_completed,
                tenant_name: profileData.tenant_name
              });
            }
          } catch (error) {
            console.warn('[Profile API] Failed to fetch user profile:', error);
          }
          
          // Return profile data ONLY from backend - no local overrides
          return NextResponse.json({
            authenticated: true,
            email: userData.email || sessionData.email || profileData?.email,
            // CRITICAL: Only trust backend's onboarding status
            needsOnboarding: profileData?.needs_onboarding ?? sessionData.needs_onboarding ?? true,
            onboardingCompleted: profileData?.onboarding_completed ?? sessionData.onboarding_completed ?? false,
            currentStep: sessionData.current_onboarding_step || 'business_info',
            tenantId: sessionData.tenant_id || tenantData.id || profileData?.tenant_id,
            tenant_id: sessionData.tenant_id || tenantData.id || profileData?.tenant_id,
            businessName: profileData?.tenant_name || tenantData.name || sessionData.business_name,
            subscriptionPlan: profileData?.subscription_plan || sessionData.subscription_plan || 'free',
            name: userData.name || sessionData.name || userData.email || profileData?.name,
            initials: (userData.name || sessionData.name || userData.email || profileData?.name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
            sessionSource: 'backend-v2-only'
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        } else {
          console.log('[Profile API] Backend session invalid:', response.status);
        }
      } catch (error) {
        console.error('[Profile API] Error fetching backend session:', error);
      }
    }
    
    // Check for authorization header as fallback
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Profile API] Found authorization header, using token');
      
      try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        console.log('[Profile API] Decoded token payload:', {
          sub: payload.sub,
          email: payload.email
        });
        
        // Return basic profile data based on token
        // Backend will determine onboarding status when they authenticate properly
        return NextResponse.json({
          authenticated: true,
          source: 'authorization-header',
          email: payload.email,
          sub: payload.sub,
          needsOnboarding: true, // Default to true, backend will correct this
          onboardingCompleted: false,
          currentStep: 'business_info'
        }, { status: 200 });
      } catch (decodeError) {
        console.error('[Profile API] Error decoding token:', decodeError);
      }
    }
    
    console.log('[Profile API] No valid session found');
    return NextResponse.json(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}