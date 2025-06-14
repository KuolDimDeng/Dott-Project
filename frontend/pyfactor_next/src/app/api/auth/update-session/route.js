import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { decrypt, encrypt } from '@/utils/sessionEncryption';

/**
 * Update the current session with new data
 * Used to update tenant ID and onboarding status after authentication
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, needsOnboarding, onboardingCompleted, subscriptionPlan, businessName, businessType } = body;
    
    logger.info('[UpdateSession] Updating session data', {
      tenantId,
      needsOnboarding,
      onboardingCompleted
    });
    
    // Get current session - try new name first, then old
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      logger.error('[UpdateSession] No session cookie found');
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }
    
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        logger.warn('[UpdateSession] Using legacy base64 format');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (parseError) {
      logger.error('[UpdateSession] Error parsing session cookie:', parseError);
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 400 }
      );
    }
    
    // Update session data with all status variations
    if (tenantId !== undefined) {
      sessionData.user.tenantId = tenantId;
      sessionData.user.tenant_id = tenantId;
    }
    
    if (needsOnboarding !== undefined) {
      sessionData.user.needsOnboarding = needsOnboarding;
      sessionData.user.needs_onboarding = needsOnboarding;
    }
    
    if (onboardingCompleted !== undefined) {
      sessionData.user.onboardingCompleted = onboardingCompleted;
      sessionData.user.onboarding_completed = onboardingCompleted;
      sessionData.user.isOnboarded = onboardingCompleted;
      sessionData.user.setupComplete = onboardingCompleted;
      sessionData.user.setup_complete = onboardingCompleted;
      
      // If onboarding is completed, ensure all related fields are set
      if (onboardingCompleted === true) {
        sessionData.user.currentStep = 'completed';
        sessionData.user.current_onboarding_step = 'completed';
        sessionData.user.onboardingStatus = 'completed';
      }
    }
    
    // Extract currentStep from body if provided
    const { currentStep } = body;
    if (currentStep !== undefined) {
      sessionData.user.currentStep = currentStep;
      sessionData.user.current_onboarding_step = currentStep;
    }
    
    // Update subscription plan if provided
    if (subscriptionPlan !== undefined) {
      // Store in all possible field names for compatibility
      sessionData.user.subscriptionPlan = subscriptionPlan;
      sessionData.user.subscription_plan = subscriptionPlan;
      sessionData.user.subscriptionType = subscriptionPlan;
      sessionData.user.subscription_type = subscriptionPlan;
      sessionData.user.selected_plan = subscriptionPlan;
      sessionData.user.selectedPlan = subscriptionPlan;
    }
    
    // Update business info if provided
    if (businessName !== undefined) {
      sessionData.user.businessName = businessName;
      sessionData.user.business_name = businessName;
    }
    
    if (businessType !== undefined) {
      sessionData.user.businessType = businessType;
      sessionData.user.business_type = businessType;
    }
    
    // Re-encrypt session
    const updatedSessionCookie = encrypt(JSON.stringify(sessionData));
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    });
    
    // Set updated session cookie
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
    
    response.cookies.set('dott_auth_session', updatedSessionCookie, cookieOptions);
    
    logger.info('[UpdateSession] Session updated successfully');
    
    return response;
    
  } catch (error) {
    logger.error('[UpdateSession] Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}