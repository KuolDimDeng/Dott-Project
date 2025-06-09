import { logger } from './logger';

/**
 * Complete onboarding process for Auth0 users
 * This handles the full onboarding completion including:
 * 1. Updating the local session
 * 2. Creating/updating backend records
 * 3. Updating Auth0 user metadata
 * 
 * @param {Object} onboardingData - The onboarding form data
 * @returns {Promise<Object>} Result object with success status and redirect URL
 */
export async function completeOnboardingAuth0(onboardingData) {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  logger.info(`[completeOnboardingAuth0:${requestId}] Starting Auth0 onboarding completion`);
  
  try {
    // Call the consolidated onboarding API endpoint
    const response = await fetch('/api/onboarding/complete-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...onboardingData,
        requestId,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      // Log detailed error information
      logger.error(`[completeOnboardingAuth0:${requestId}] API error:`, {
        status: response.status,
        error: result.error,
        message: result.message,
        missingFields: result.missingFields
      });
      
      // Return error with details
      return {
        success: false,
        error: result.error || 'Failed to complete onboarding',
        message: result.message || 'Please try again or contact support',
        details: result
      };
    }
    
    logger.info(`[completeOnboardingAuth0:${requestId}] Onboarding completed successfully:`, {
      tenantId: result.tenant_id,
      redirectUrl: result.redirect_url,
      backendSuccess: result.backend?.success
    });
    
    // Store onboarding completion in localStorage as backup
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('tenantId', result.tenant_id || result.tenantId);
        localStorage.setItem('businessName', onboardingData.businessName);
        localStorage.setItem('subscriptionPlan', onboardingData.selectedPlan);
        localStorage.setItem('onboardingCompletedAt', new Date().toISOString());
        
        // Also set a cookie for server-side checking
        document.cookie = `onboardingCompleted=true; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days
        document.cookie = `tenantId=${result.tenant_id || result.tenantId}; path=/; max-age=${30 * 24 * 60 * 60}`;
      } catch (storageError) {
        logger.warn(`[completeOnboardingAuth0:${requestId}] Failed to update localStorage:`, storageError);
      }
    }
    
    // Force a session refresh to pick up the new onboarding status
    try {
      await fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: result.tenant_id || result.tenantId,
          onboardingCompleted: true
        })
      });
    } catch (refreshError) {
      logger.warn(`[completeOnboardingAuth0:${requestId}] Session refresh failed:`, refreshError);
    }
    
    return {
      success: true,
      tenantId: result.tenant_id || result.tenantId,
      redirectUrl: result.redirect_url || `/tenant/${result.tenant_id || result.tenantId}/dashboard`,
      message: result.message || 'Onboarding completed successfully!',
      user: result.user,
      nextSteps: result.nextSteps
    };
    
  } catch (error) {
    logger.error(`[completeOnboardingAuth0:${requestId}] Unexpected error:`, error);
    
    return {
      success: false,
      error: 'Network error',
      message: 'Failed to complete onboarding. Please check your connection and try again.',
      details: error.message
    };
  }
}

/**
 * Check if onboarding is completed for the current user
 * @returns {Promise<boolean>}
 */
export async function isOnboardingCompleted() {
  try {
    // First check localStorage for quick response
    if (typeof window !== 'undefined') {
      const localCompleted = localStorage.getItem('onboardingCompleted') === 'true';
      if (localCompleted) {
        return true;
      }
    }
    
    // Then check the session
    const response = await fetch('/api/auth/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const profile = await response.json();
      return profile.onboardingCompleted === true || profile.needsOnboarding === false;
    }
    
    return false;
  } catch (error) {
    logger.error('[isOnboardingCompleted] Error checking onboarding status:', error);
    return false;
  }
}