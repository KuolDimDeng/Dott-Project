import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';

/**
 * Force backend sync endpoint - Ensures session is synced with backend state
 * GET: Force sync current session with backend
 */
export async function GET(request) {
  try {
    console.log('[Force Backend Sync] Starting forced sync');
    
    const cookieStore = await cookies();
    
    // Get current session
    const dottSessionCookie = cookieStore.get('dott_auth_session');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!dottSessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }
    
    let sessionData = null;
    let accessToken = null;
    
    // Decrypt session data
    try {
      const decrypted = decrypt(dottSessionCookie.value);
      sessionData = JSON.parse(decrypted);
      accessToken = sessionData.accessToken;
    } catch (error) {
      console.error('[Force Backend Sync] Failed to decrypt session:', error);
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token'
      }, { status: 401 });
    }
    
    // Call backend to get FRESH user state
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[Force Backend Sync] Fetching FRESH user state from backend');
    
    // Force cache bypass with timestamp
    const userResponse = await fetch(`${apiUrl}/api/users/me/?_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!userResponse.ok) {
      console.error('[Force Backend Sync] Failed to fetch user data:', userResponse.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user data'
      }, { status: userResponse.status });
    }
    
    const userData = await userResponse.json();
    console.log('[Force Backend Sync] Fresh backend data:', {
      email: userData.email,
      needs_onboarding: userData.needs_onboarding,
      onboarding_completed: userData.onboarding_completed,
      tenant_id: userData.tenant_id,
      setup_done: userData.setup_done
    });
    
    // Force update session with backend state
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        // Force update ALL fields to backend values
        needsOnboarding: userData.needs_onboarding === true,
        needs_onboarding: userData.needs_onboarding === true,
        onboardingCompleted: userData.onboarding_completed === true,
        onboarding_completed: userData.onboarding_completed === true,
        setupDone: userData.setup_done === true,
        setup_done: userData.setup_done === true,
        tenantId: userData.tenant_id,
        tenant_id: userData.tenant_id,
        businessName: userData.business_name || userData.businessName,
        business_name: userData.business_name || userData.businessName,
        subscriptionPlan: userData.subscription_plan || userData.selected_plan || 'free',
        subscription_plan: userData.subscription_plan || userData.selected_plan || 'free',
        // Force update timestamp
        lastBackendSync: Date.now()
      }
    };
    
    // Encrypt and save updated session
    const encryptedSession = encrypt(JSON.stringify(updatedSession));
    
    const response = NextResponse.json({
      success: true,
      message: 'Session force synced with backend',
      backendState: {
        needsOnboarding: userData.needs_onboarding,
        onboardingCompleted: userData.onboarding_completed,
        setupDone: userData.setup_done,
        tenantId: userData.tenant_id
      },
      sessionState: {
        needsOnboarding: updatedSession.user.needsOnboarding,
        onboardingCompleted: updatedSession.user.onboardingCompleted,
        tenantId: updatedSession.user.tenantId
      }
    });
    
    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    // Force update all session cookies
    response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
    response.cookies.set('appSession', encryptedSession, cookieOptions); // Backward compatibility
    
    // Update status cookie (client-readable)
    const statusCookie = {
      needsOnboarding: userData.needs_onboarding === true,
      onboardingCompleted: userData.onboarding_completed === true,
      setupDone: userData.setup_done === true,
      tenantId: userData.tenant_id,
      hasSession: true,
      lastSync: Date.now(),
      forceSync: true
    };
    
    response.cookies.set('onboarding_status', JSON.stringify(statusCookie), {
      ...cookieOptions,
      httpOnly: false // Client-readable
    });
    
    // If onboarding is complete, set completion marker
    if (userData.onboarding_completed === true || userData.setup_done === true) {
      response.cookies.set('onboarding_force_completed', 'true', {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 60 * 60 // 1 hour
      });
    }
    
    console.log('[Force Backend Sync] Session force synced successfully');
    
    // Clear cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('[Force Backend Sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Force sync failed'
    }, { status: 500 });
  }
}