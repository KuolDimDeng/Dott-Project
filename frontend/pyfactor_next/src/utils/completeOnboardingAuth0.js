import { logger } from './logger';

/**
 * Simplified onboarding completion - Backend Single Source of Truth
 * Only calls backend API, no local storage or complex syncing
 */
export async function completeOnboardingAuth0(onboardingData) {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  logger.info(`[completeOnboardingAuth0:${requestId}] Starting onboarding completion`);
  
  try {
    // Auto-detect user's timezone for global app support
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Call the consolidated onboarding API endpoint
    const response = await fetch('/api/onboarding/complete-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...onboardingData,
        timezone: onboardingData.timezone || detectedTimezone,
        requestId,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`[completeOnboardingAuth0:${requestId}] API error:`, {
        status: response.status,
        error: result.error,
        message: result.message
      });
      
      return {
        success: false,
        error: result.error || 'Failed to complete onboarding',
        message: result.message || 'Please try again or contact support',
        details: result
      };
    }
    
    logger.info(`[completeOnboardingAuth0:${requestId}] Onboarding completed successfully:`, {
      tenantId: result.tenant_id,
      redirectUrl: result.redirect_url
    });
    
    // Backend handles all session updates - no local storage needed
    return {
      success: true,
      tenantId: result.tenant_id || result.tenantId,
      redirectUrl: result.redirect_url || `/${result.tenant_id || result.tenantId}/dashboard`,
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
 * Simplified onboarding status check - Backend Single Source of Truth
 * Only checks backend, no localStorage fallback
 */
export async function isOnboardingCompleted() {
  try {
    const response = await fetch('/api/auth/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const profile = await response.json();
      // Only trust backend's needsOnboarding field
      return profile.needsOnboarding === false;
    }
    
    return false;
  } catch (error) {
    logger.error('[isOnboardingCompleted] Error checking onboarding status:', error);
    return false;
  }
}