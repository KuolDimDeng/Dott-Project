/**
 * Auth Flow Handler v2 - Improved authentication flow with proper tenant isolation
 * This replaces the old authFlowHandler.js to fix the tenant ID sharing issue
 */

import { logger } from '@/utils/logger';
import { auth0Service } from '@/services/auth0Service';

/**
 * Handle post-authentication flow with proper tenant isolation
 * @param {Object} authData - Authentication data from Auth0
 * @param {string} authMethod - 'oauth' or 'email-password'
 * @returns {Object} User data with routing information
 */
export async function handlePostAuthFlow(authData, authMethod = 'oauth') {
  logger.info(`[AuthFlowV2] Starting post-auth flow for ${authMethod}`, {
    email: authData.user?.email,
    hasAccessToken: !!authData.accessToken,
    auth0Sub: authData.user?.sub
  });

  try {
    // Validate input data
    if (!authData.user?.sub || !authData.user?.email) {
      throw new Error('Invalid authentication data');
    }

    // Step 1: Create or get user with proper tenant isolation
    const userData = await auth0Service.createOrGetUser({
      user: authData.user,
      accessToken: authData.accessToken || authData.access_token
    });

    logger.info('[AuthFlowV2] User data retrieved:', {
      email: userData.email,
      tenantId: userData.tenant_id,
      needsOnboarding: userData.needs_onboarding,
      isExistingUser: userData.is_existing_user
    });

    // Step 2: Check latest onboarding status from backend
    let onboardingStatus;
    try {
      onboardingStatus = await auth0Service.checkOnboardingStatus(
        authData.user.sub,
        authData.accessToken || authData.access_token
      );
    } catch (error) {
      logger.warn('[AuthFlowV2] Could not fetch onboarding status, using user data');
      onboardingStatus = {
        needs_onboarding: userData.needs_onboarding,
        onboarding_completed: userData.onboarding_completed,
        current_step: userData.current_step || 'business_info'
      };
    }

    // Step 3: Determine routing based on onboarding status
    const finalUserData = {
      ...authData.user,
      tenantId: userData.tenant_id,
      tenant_id: userData.tenant_id, // Include both formats
      needsOnboarding: onboardingStatus.needs_onboarding,
      onboardingCompleted: onboardingStatus.onboarding_completed,
      currentStep: onboardingStatus.current_step,
      redirectUrl: null
    };

    // Determine redirect URL based on onboarding status
    if (onboardingStatus.onboarding_completed && userData.tenant_id) {
      // User has completed onboarding and has valid tenant
      finalUserData.redirectUrl = `/${userData.tenant_id}/dashboard`;
    } else if (userData.tenant_id && !onboardingStatus.needs_onboarding) {
      // User has tenant but onboarding status is unclear - redirect to dashboard
      finalUserData.redirectUrl = `/${userData.tenant_id}/dashboard`;
    } else {
      // User needs onboarding
      finalUserData.redirectUrl = '/onboarding';
    }

    // Step 4: Update session with user data
    try {
      await fetch('/api/auth/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: userData.tenant_id,
          needsOnboarding: finalUserData.needsOnboarding,
          onboardingCompleted: finalUserData.onboardingCompleted,
          currentStep: finalUserData.currentStep
        })
      });
    } catch (error) {
      logger.error('[AuthFlowV2] Failed to update session', error);
    }

    logger.info('[AuthFlowV2] Auth flow completed', {
      email: finalUserData.email,
      tenantId: finalUserData.tenantId,
      redirectUrl: finalUserData.redirectUrl
    });

    return finalUserData;

  } catch (error) {
    logger.error('[AuthFlowV2] Auth flow error', error);
    
    // Return safe fallback data
    return {
      ...authData.user,
      needsOnboarding: true,
      onboardingCompleted: false,
      redirectUrl: '/onboarding',
      error: error.message
    };
  }
}

/**
 * Update onboarding completion status
 */
export async function updateOnboardingCompletion(auth0Sub, onboardingData) {
  try {
    const result = await auth0Service.completeOnboarding(auth0Sub, onboardingData);
    
    logger.info('[AuthFlowV2] Onboarding completed', {
      auth0Sub,
      tenantId: result.tenant_id
    });
    
    // Update Auth0 metadata
    await auth0Service.updateUserMetadata(auth0Sub, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      tenant_id: result.tenant_id
    });
    
    return result;
  } catch (error) {
    logger.error('[AuthFlowV2] Failed to complete onboarding', error);
    throw error;
  }
}

/**
 * Handle account closure
 */
export async function closeUserAccount(userId, reason, feedback) {
  try {
    const result = await auth0Service.closeUserAccount(userId, reason, feedback);
    
    logger.info('[AuthFlowV2] Account closed successfully', {
      userId,
      reason
    });
    
    return result;
  } catch (error) {
    logger.error('[AuthFlowV2] Failed to close account', error);
    throw error;
  }
}