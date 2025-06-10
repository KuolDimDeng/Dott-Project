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

    // Step 2: Check latest onboarding status from profile API
    let profileData = null;
    try {
      const profileResponse = await fetch('/api/auth/profile');
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

    // Step 3: Determine final user state and routing
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
                           userData.onboarding_status === 'complete';
    
    // Check onboarding status from multiple sources
    const isOnboardingComplete = 
      profileData?.onboardingCompleted === true ||
      userData.onboardingComplete === true ||
      backendCompleted ||
      (userData.isExistingUser && userData.tenantId && !profileData?.needsOnboarding);

    // Use profile data as the source of truth when available
    if (profileData) {
      if (profileData.tenantId) {
        finalUserData.tenantId = profileData.tenantId;
      }
      finalUserData.needsOnboarding = profileData.needsOnboarding === true;
      finalUserData.onboardingCompleted = profileData.onboardingCompleted === true;
      
      // Override with backend completion status if available
      if (backendCompleted) {
        finalUserData.needsOnboarding = false;
        finalUserData.onboardingCompleted = true;
      }
    }

    console.log('[AuthFlowHandler] Redirect decision factors:', {
      tenantId: finalUserData.tenantId,
      needsOnboarding: finalUserData.needsOnboarding,
      onboardingCompleted: finalUserData.onboardingCompleted,
      backendCompleted: backendCompleted,
      isOnboardingComplete: isOnboardingComplete,
      authMethod
    });

    // Determine redirect URL
    if (backendCompleted || (isOnboardingComplete && finalUserData.tenantId)) {
      // User has completed onboarding
      finalUserData.needsOnboarding = false;
      finalUserData.onboardingCompleted = true;
      if (finalUserData.tenantId) {
        finalUserData.redirectUrl = `/tenant/${finalUserData.tenantId}/dashboard`;
      } else {
        // Backend shows complete but no tenant ID - create a default tenant
        console.log('[AuthFlowHandler] Backend complete but no tenant ID - creating default tenant');
        
        // Generate a default tenant ID for this user
        const defaultTenantId = 'default-' + Date.now();
        finalUserData.tenantId = defaultTenantId;
        finalUserData.redirectUrl = `/tenant/${defaultTenantId}/dashboard`;
        
        // Update session with the new tenant ID
        try {
          await fetch('/api/auth/update-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: defaultTenantId,
              needsOnboarding: false,
              onboardingCompleted: true
            })
          });
        } catch (error) {
          console.error('[AuthFlowHandler] Failed to update session with tenant ID:', error);
        }
      }
    } else {
      // User needs onboarding
      finalUserData.needsOnboarding = true;
      finalUserData.onboardingCompleted = false;
      finalUserData.redirectUrl = '/onboarding';
    }

    // Step 4: Update session with consistent data
    try {
      await fetch('/api/auth/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: finalUserData.tenantId,
          needsOnboarding: finalUserData.needsOnboarding,
          onboardingCompleted: finalUserData.onboardingCompleted
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