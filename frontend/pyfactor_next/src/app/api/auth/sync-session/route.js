import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';
import { logger } from '@/utils/logger';

/**
 * Session synchronization endpoint
 * Ensures session state is properly synchronized after onboarding or payment
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, needsOnboarding = false, onboardingCompleted = true, subscriptionPlan } = body;
    
    logger.info('[SyncSession] === SESSION SYNC STARTED ===');
    logger.info('[SyncSession] Requested updates:', {
      tenantId,
      needsOnboarding,
      onboardingCompleted,
      subscriptionPlan
    });
    
    // Get current session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    logger.info('[SyncSession] Session cookie found:', !!sessionCookie);
    logger.info('[SyncSession] Cookie name:', sessionCookie?.name);
    logger.info('[SyncSession] Cookie size:', sessionCookie?.value?.length || 0);
    
    if (!sessionCookie) {
      logger.error('[SyncSession] No session cookie found!');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Decrypt current session
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
      logger.info('[SyncSession] Session decrypted successfully');
    } catch (decryptError) {
      logger.warn('[SyncSession] Failed to decrypt, trying base64 fallback');
      // Fallback to base64 for backward compatibility
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        logger.info('[SyncSession] Session parsed with base64 fallback');
      } catch (base64Error) {
        logger.error('[SyncSession] Failed to parse session:', base64Error);
        return NextResponse.json({ error: 'Invalid session format' }, { status: 400 });
      }
    }
    
    logger.info('[SyncSession] Current session user data BEFORE update:', {
      email: sessionData.user?.email,
      needsOnboarding: sessionData.user?.needsOnboarding,
      onboardingCompleted: sessionData.user?.onboardingCompleted,
      tenantId: sessionData.user?.tenantId
    });
    
    // Update session with new values
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        // Update all onboarding-related fields
        needsOnboarding: needsOnboarding,
        needs_onboarding: needsOnboarding,
        onboardingCompleted: onboardingCompleted,
        onboarding_completed: onboardingCompleted,
        currentStep: onboardingCompleted ? 'completed' : sessionData.user?.currentStep,
        current_onboarding_step: onboardingCompleted ? 'completed' : sessionData.user?.current_onboarding_step,
        onboardingStatus: onboardingCompleted ? 'completed' : sessionData.user?.onboardingStatus,
        isOnboarded: onboardingCompleted,
        setupComplete: onboardingCompleted,
        setup_complete: onboardingCompleted,
        
        // Update tenant ID if provided
        ...(tenantId && {
          tenantId: tenantId,
          tenant_id: tenantId
        }),
        
        // Update subscription plan if provided
        ...(subscriptionPlan && {
          subscriptionPlan: subscriptionPlan,
          subscription_plan: subscriptionPlan,
          subscriptionType: subscriptionPlan,
          subscription_type: subscriptionPlan,
          selected_plan: subscriptionPlan,
          selectedPlan: subscriptionPlan
        }),
        
        // Update timestamp
        lastUpdated: new Date().toISOString()
      }
    };
    
    logger.info('[SyncSession] Updated session user data AFTER update:', {
      email: updatedSession.user?.email,
      needsOnboarding: updatedSession.user?.needsOnboarding,
      onboardingCompleted: updatedSession.user?.onboardingCompleted,
      tenantId: updatedSession.user?.tenantId,
      lastUpdated: updatedSession.user?.lastUpdated
    });
    
    // Encrypt and save updated session
    const encryptedSession = encrypt(JSON.stringify(updatedSession));
    logger.info('[SyncSession] Session encrypted, size:', encryptedSession.length);
    
    const response = NextResponse.json({
      success: true,
      message: 'Session synchronized',
      tenantId: tenantId || updatedSession.user?.tenantId,
      needsOnboarding: updatedSession.user?.needsOnboarding,
      onboardingCompleted: updatedSession.user?.onboardingCompleted
    });
    
    // Set cookie with proper options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    logger.info('[SyncSession] Setting cookie with options:', cookieOptions);
    
    // CRITICAL: Set the cookie directly on the response
    // Use the cookies() API properly - it returns a ResponseCookies instance
    response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
    
    // Also update the old cookie name for backward compatibility
    response.cookies.set('appSession', encryptedSession, cookieOptions);
    
    // Set a non-httpOnly cookie for client-side checking
    const statusCookie = JSON.stringify({
      completed: onboardingCompleted,
      tenantId: tenantId || updatedSession.user?.tenantId,
      needsOnboarding: updatedSession.user?.needsOnboarding,
      timestamp: new Date().toISOString()
    });
    response.cookies.set('onboarding_status', statusCookie, {
      ...cookieOptions,
      httpOnly: false // Allow client-side access
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    logger.info('[SyncSession] === SESSION SYNC COMPLETED ===');
    logger.info('[SyncSession] Final state:', {
      needsOnboarding: updatedSession.user?.needsOnboarding,
      onboardingCompleted: updatedSession.user?.onboardingCompleted,
      cookieSet: true
    });
    
    return response;
  } catch (error) {
    logger.error('[SyncSession] Error:', error);
    return NextResponse.json({ error: 'Failed to sync session' }, { status: 500 });
  }
}

// GET endpoint to check current sync status
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        synced: false, 
        error: 'No session found' 
      }, { status: 401 });
    }
    
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
    } catch (decryptError) {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    }
    
    return NextResponse.json({
      synced: true,
      tenantId: sessionData.user?.tenantId || sessionData.user?.tenant_id,
      needsOnboarding: sessionData.user?.needsOnboarding || sessionData.user?.needs_onboarding || false,
      onboardingCompleted: sessionData.user?.onboardingCompleted || sessionData.user?.onboarding_completed || false,
      subscriptionPlan: sessionData.user?.subscriptionPlan || sessionData.user?.subscription_plan
    });
  } catch (error) {
    logger.error('[SyncSession] GET error:', error);
    return NextResponse.json({ 
      synced: false, 
      error: 'Failed to check sync status' 
    }, { status: 500 });
  }
}