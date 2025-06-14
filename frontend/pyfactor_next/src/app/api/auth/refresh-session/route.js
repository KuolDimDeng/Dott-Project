import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';
import { logger } from '@/utils/logger';

/**
 * Session refresh endpoint to force reload of session data after onboarding
 */
export async function POST(request) {
  try {
    logger.info('[Session Refresh] Forcing session refresh after onboarding');
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Parse and update session data
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        logger.warn('[Session Refresh] Using legacy base64 format');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (error) {
      logger.error('[Session Refresh] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Fetch latest profile data from backend to get accurate onboarding status
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const profileResponse = await fetch(`${backendUrl}/api/users/me/`, {
        headers: {
          'Authorization': `Bearer ${sessionData.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        logger.info('[Session Refresh] Got profile data from backend:', {
          needs_onboarding: profileData.needs_onboarding,
          onboarding_completed: profileData.onboarding_completed,
          tenant_id: profileData.tenant_id
        });
        
        // Update session with backend data
        if (profileData.onboarding_completed === true) {
          logger.info('[Session Refresh] Updating session with onboarding completion from backend');
          // Set all onboarding status variations
          sessionData.user.needsOnboarding = false;
          sessionData.user.needs_onboarding = false;
          sessionData.user.onboardingCompleted = true;
          sessionData.user.onboarding_completed = true;
          sessionData.user.currentStep = 'completed';
          sessionData.user.current_onboarding_step = 'completed';
          sessionData.user.onboardingStatus = 'completed';
          sessionData.user.isOnboarded = true;
          sessionData.user.setupComplete = true;
          sessionData.user.setup_complete = true;
        }
        
        // Update tenant ID from backend
        if (profileData.tenant_id || profileData.tenantId) {
          sessionData.user.tenantId = profileData.tenant_id || profileData.tenantId;
          sessionData.user.tenant_id = profileData.tenant_id || profileData.tenantId;
        }
        
        // Update business info
        if (profileData.businessName) {
          sessionData.user.businessName = profileData.businessName;
        }
      }
    } catch (error) {
      logger.error('[Session Refresh] Error fetching backend profile:', error);
      // Continue with cookie-based refresh as fallback
    }
    
    // Update the session cookie with encryption
    const updatedCookie = encrypt(JSON.stringify(sessionData));
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Session refreshed',
      needsOnboarding: sessionData.user?.needsOnboarding || false
    });
    
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    };
    
    // Add domain in production to ensure cookie works across subdomains
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = '.dottapps.com'; // Leading dot allows subdomains
    }
    
    response.cookies.set('dott_auth_session', updatedCookie, cookieOptions);
    
    logger.info('[Session Refresh] Session refreshed successfully');
    return response;
    
  } catch (error) {
    console.error('[Session Refresh] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}