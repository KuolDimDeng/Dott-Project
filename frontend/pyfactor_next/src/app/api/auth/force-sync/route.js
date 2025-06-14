import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';
import { logger } from '@/utils/logger';

/**
 * Force session synchronization endpoint
 * This endpoint directly updates the session cookie without relying on caching
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, needsOnboarding = false, onboardingCompleted = true, subscriptionPlan } = body;
    
    logger.info('[ForceSync] === FORCE SESSION SYNC STARTED ===');
    logger.info('[ForceSync] Updates requested:', {
      tenantId,
      needsOnboarding,
      onboardingCompleted,
      subscriptionPlan
    });
    
    // Get current cookies
    const cookieStore = cookies();
    
    // Try to get existing session
    let sessionCookie = cookieStore.get('dott_auth_session');
    if (!sessionCookie) {
      sessionCookie = cookieStore.get('appSession');
    }
    
    if (!sessionCookie) {
      logger.error('[ForceSync] No session cookie found!');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Decrypt session
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
    } catch (error) {
      // Try base64 fallback
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      } catch (base64Error) {
        logger.error('[ForceSync] Failed to parse session');
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
      }
    }
    
    // Update session data
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        needsOnboarding: needsOnboarding,
        needs_onboarding: needsOnboarding,
        onboardingCompleted: onboardingCompleted,
        onboarding_completed: onboardingCompleted,
        currentStep: onboardingCompleted ? 'completed' : sessionData.user?.currentStep,
        tenantId: tenantId || sessionData.user?.tenantId,
        tenant_id: tenantId || sessionData.user?.tenant_id,
        subscriptionPlan: subscriptionPlan || sessionData.user?.subscriptionPlan,
        lastSyncedAt: new Date().toISOString()
      }
    };
    
    // Encrypt updated session
    const encryptedSession = encrypt(JSON.stringify(updatedSession));
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Session force synced',
      updates: {
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
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    // Set both cookie names for compatibility
    response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
    response.cookies.set('appSession', encryptedSession, cookieOptions);
    
    // Set status cookie (non-httpOnly)
    response.cookies.set('onboarding_status', JSON.stringify({
      completed: onboardingCompleted,
      tenantId: updatedSession.user.tenantId,
      needsOnboarding: updatedSession.user.needsOnboarding,
      lastSync: new Date().toISOString()
    }), {
      ...cookieOptions,
      httpOnly: false
    });
    
    // No-cache headers
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Session-Updated', 'true');
    
    logger.info('[ForceSync] === FORCE SYNC COMPLETED ===');
    
    return response;
    
  } catch (error) {
    logger.error('[ForceSync] Error:', error);
    return NextResponse.json({ error: 'Force sync failed' }, { status: 500 });
  }
}