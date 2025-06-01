import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get session cookie to get user info
    const sessionCookie = request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    if (!sessionData.user) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 });
    }
    
    console.log('[User Current] Fetching user data for:', sessionData.user.email);
    
    // Call backend API to get user profile
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const response = await fetch(`${backendUrl}/api/users/profile/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken}`,
          'X-User-Email': sessionData.user.email,
          'X-User-Sub': sessionData.user.sub,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('[User Current] Backend user data retrieved:', {
          email: userData.email,
          tenantId: userData.tenant_id,
          onboardingCompleted: userData.onboarding_completed
        });
        
        // Transform backend data to frontend format
        const userProfile = {
          email: userData.email,
          sub: sessionData.user.sub,
          name: userData.name || sessionData.user.name,
          picture: userData.picture || sessionData.user.picture,
          tenantId: userData.tenant_id,
          needsOnboarding: !userData.onboarding_completed,
          onboardingCompleted: userData.onboarding_completed || false,
          currentStep: userData.current_onboarding_step,
          isNewUser: false
        };
        
        return NextResponse.json(userProfile);
      } else if (response.status === 404) {
        // User not found in backend - treat as new user
        console.log('[User Current] User not found in backend, treating as new user');
        
        const newUserProfile = {
          email: sessionData.user.email,
          sub: sessionData.user.sub,
          name: sessionData.user.name,
          picture: sessionData.user.picture,
          tenantId: null,
          needsOnboarding: true,
          onboardingCompleted: false,
          currentStep: 'business_info',
          isNewUser: true
        };
        
        return NextResponse.json(newUserProfile);
      } else {
        console.error('[User Current] Backend API error:', response.status, response.statusText);
        throw new Error(`Backend API returned ${response.status}`);
      }
    } catch (fetchError) {
      console.error('[User Current] Failed to fetch from backend:', fetchError);
      
      // Fallback: return session user data with new user defaults
      const fallbackProfile = {
        email: sessionData.user.email,
        sub: sessionData.user.sub,
        name: sessionData.user.name,
        picture: sessionData.user.picture,
        tenantId: null,
        needsOnboarding: true,
        onboardingCompleted: false,
        currentStep: 'business_info',
        isNewUser: true
      };
      
      return NextResponse.json(fallbackProfile);
    }
    
  } catch (error) {
    console.error('[User Current] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 