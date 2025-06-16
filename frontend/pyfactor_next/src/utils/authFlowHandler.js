/**
 * Unified authentication flow handler for both Google OAuth and email/password
 * Ensures consistent user creation, tenant assignment, and routing logic
 */

import { logger } from '@/utils/logger';

/**
 * Handle post-authentication flow
 * @param {Object} authData - Authentication data from Auth0
 * @param {string} authMethod - 'oauth' or 'email-password'
 * @returns {Object} User data with routing information
 */
export async function handlePostAuthFlow(authData, authMethod = 'oauth') {
  logger.info(`[AuthFlowHandler] Starting post-auth flow for ${authMethod}`, {
    email: authData.user?.email,
    hasAccessToken: !!authData.accessToken
  });

  try {
    // Step 1: Create or get user in Django backend
    // Pass the session data directly to avoid cookie timing issues
    const createUserResponse = await fetch('/api/user/create-auth0-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        email: authData.user.email,
        sub: authData.user.sub,
        name: authData.user.name,
        picture: authData.user.picture,
        auth_method: authMethod,
        // Pass session data directly
        sessionData: {
          user: authData.user,
          accessToken: authData.accessToken || authData.access_token,
          idToken: authData.idToken || authData.id_token
        }
      })
    });

    if (!createUserResponse.ok) {
      logger.error('[AuthFlowHandler] User creation failed', {
        status: createUserResponse.status
      });
      throw new Error('Failed to create user in backend');
    }

    const userData = await createUserResponse.json();
    logger.info('[AuthFlowHandler] User creation/retrieval successful', {
      tenantId: userData.tenantId,
      isExistingUser: userData.isExistingUser,
      onboardingComplete: userData.onboardingComplete
    });

    // Step 2: Force backend sync to get latest state
    try {
      const syncResponse = await fetch('/api/auth/force-backend-sync', {
        credentials: 'include'
      });
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        logger.info('[AuthFlowHandler] Forced backend sync completed', syncData.backendState);
      }
    } catch (error) {
      logger.warn('[AuthFlowHandler] Force sync failed', error);
    }
    
    // Step 3: Check latest onboarding status from profile API
    let profileData = null;
    try {
      const profileResponse = await fetch('/api/auth/profile', {
        credentials: 'include' // Include cookies
      });
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        logger.info('[AuthFlowHandler] Profile data retrieved', {
          needsOnboarding: profileData.needsOnboarding,
          onboardingCompleted: profileData.onboardingCompleted
        });
      }
    } catch (error) {
      logger.warn('[AuthFlowHandler] Could not fetch profile', error);
    }

    // Step 4: Determine final user state and routing
    const finalUserData = {
      ...authData.user,
      tenantId: userData.tenantId || profileData?.tenantId,
      needsOnboarding: false,
      onboardingCompleted: false,
      redirectUrl: null
    };

    // Check backend completion status
    const backendCompleted = profileData?.backendCompleted === true ||
                           userData.backendCompleted === true ||
                           userData.onboardingComplete === true ||
                           userData.setupDone === true ||
                           userData.onboarding_status === 'complete' ||
                           userData.onboarding_completed === true ||
                           (userData.backendOnboardingStatus === 'complete');
    
    // Check onboarding status from multiple sources
    const isOnboardingComplete = 
      profileData?.onboardingCompleted === true ||
      userData.onboardingComplete === true ||
      userData.onboarding_completed === true ||
      backendCompleted ||
      (userData.isExistingUser && userData.tenantId && !profileData?.needsOnboarding);
    
    logger.info('[AuthFlowHandler] Backend completion check:', {
      backendCompleted,
      userData_backendCompleted: userData.backendCompleted,
      userData_setupDone: userData.setupDone,
      userData_onboarding_completed: userData.onboarding_completed,
      userData_backendOnboardingStatus: userData.backendOnboardingStatus,
      profileData_backendCompleted: profileData?.backendCompleted
    });

    // Use profile data as the source of truth when available
    if (profileData) {
      if (profileData.tenantId) {
        finalUserData.tenantId = profileData.tenantId;
      }
      // Trust the backend's onboarding status
      finalUserData.needsOnboarding = profileData.needsOnboarding === true;
      finalUserData.onboardingCompleted = profileData.onboardingCompleted === true;
    }
    
    // Also check userData for tenant and onboarding status (from create-auth0-user response)
    if (!finalUserData.tenantId && userData.tenantId) {
      finalUserData.tenantId = userData.tenantId;
    }
    
    // If userData shows onboarding is complete, respect that
    if (userData.onboardingComplete === true || userData.onboardingCompleted === true) {
      finalUserData.onboardingCompleted = true;
      finalUserData.needsOnboarding = false;
    }

    console.log('[AuthFlowHandler] Redirect decision factors:', {
      tenantId: finalUserData.tenantId,
      needsOnboarding: finalUserData.needsOnboarding,
      onboardingCompleted: finalUserData.onboardingCompleted,
      backendCompleted: backendCompleted,
      isOnboardingComplete: isOnboardingComplete,
      authMethod
    });

    // Determine redirect URL based on backend status
    // CRITICAL: For new users, always check profile data first
    if (profileData && profileData.needsOnboarding === true) {
      // Profile API says user needs onboarding - trust this
      finalUserData.redirectUrl = '/onboarding';
    } else if (finalUserData.needsOnboarding || !finalUserData.onboardingCompleted) {
      // User needs to complete onboarding
      finalUserData.redirectUrl = '/onboarding';
    } else if (finalUserData.onboardingCompleted && finalUserData.tenantId) {
      // User has completed onboarding AND has a valid tenant ID
      finalUserData.redirectUrl = `/tenant/${finalUserData.tenantId}/dashboard`;
    } else if (finalUserData.onboardingCompleted && !finalUserData.tenantId) {
      // Backend shows complete but no tenant ID - this is a data inconsistency
      // Force re-onboarding to fix the data
      logger.warn('[AuthFlowHandler] Backend shows onboarding complete but no tenant ID found - forcing re-onboarding');
      
      finalUserData.needsOnboarding = true;
      finalUserData.onboardingCompleted = false;
      finalUserData.redirectUrl = '/onboarding';
      
      // Update session to reflect that onboarding is needed
      try {
        await fetch('/api/auth/update-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Use 'include' for cross-subdomain
          body: JSON.stringify({
            needsOnboarding: true,
            onboardingCompleted: false
          })
        });
      } catch (error) {
        logger.error('[AuthFlowHandler] Failed to update session:', error);
      }
    } else {
      // User needs onboarding
      finalUserData.needsOnboarding = true;
      finalUserData.onboardingCompleted = false;
      finalUserData.redirectUrl = '/onboarding';
    }

    // Step 5: Update session with consistent data
    try {
      await fetch('/api/auth/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Use 'include' for cross-subdomain
        body: JSON.stringify({
          tenantId: finalUserData.tenantId,
          needsOnboarding: finalUserData.needsOnboarding,
          onboardingCompleted: finalUserData.onboardingCompleted,
          businessName: profileData?.businessName || userData.businessName,
          businessType: profileData?.businessType || userData.businessType,
          subscriptionPlan: profileData?.subscriptionPlan || profileData?.subscriptionType || userData.subscriptionPlan
        })
      });
    } catch (error) {
      logger.error('[AuthFlowHandler] Failed to update session', error);
    }

    logger.info('[AuthFlowHandler] Auth flow completed', {
      email: finalUserData.email,
      tenantId: finalUserData.tenantId,
      redirectUrl: finalUserData.redirectUrl
    });

    return finalUserData;

  } catch (error) {
    logger.error('[AuthFlowHandler] Auth flow error', error);
    
    // Return fallback data
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
 * Update Auth0 user metadata for onboarding completion
 * @param {string} userId - Auth0 user ID
 * @param {Object} metadata - Metadata to update
 */
export async function updateAuth0Metadata(userId, metadata) {
  try {
    const response = await fetch('/api/auth/update-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update Auth0 metadata');
    }

    logger.info('[AuthFlowHandler] Auth0 metadata updated', { userId, metadata });
  } catch (error) {
    logger.error('[AuthFlowHandler] Failed to update Auth0 metadata', error);
  }
}