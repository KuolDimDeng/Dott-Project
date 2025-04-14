import { setCacheValue } from '@/utils/appCache';
import { saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { logger } from '@/utils/logger';

const handleSelectPlan = (plan) => {
  if (isSubmitting) return;
  
  if (plan === 'free') {
    // Set loading state while we prepare
    setIsSubmitting(true);
    
    // Set all required configuration in AppCache
    setCacheValue('setupSkipDatabaseCreation', true);
    setCacheValue('setupUseRLS', true);
    setCacheValue('skipSchemaCreation', true);
    setCacheValue('freePlanSelected', true);
    setCacheValue('onboardingStep', 'complete');
    setCacheValue('onboardedStatus', 'COMPLETE');
    setCacheValue('setupCompleted', true);
    setCacheValue('setupTimestamp', Date.now());
    
    // Store in Cognito attributes (non-blocking)
    try {
      saveUserPreference(PREF_KEYS.ONBOARDING_STATUS, 'COMPLETE');
      saveUserPreference(PREF_KEYS.ONBOARDING_STEP, 'complete');
      saveUserPreference(PREF_KEYS.SUBSCRIPTION_PLAN, 'free');
    } catch (e) {
      // Log error but continue as AppCache can be our fallback
      logger.warn('[PlanSelector] Error saving preferences to Cognito:', e);
    }
    
    // Trigger background setup via a fire-and-forget API call
    const setupInBackground = async () => {
      try {
        // Generate a unique request ID
        const requestId = crypto.randomUUID();
        
        // Create URL with parameters for tracking
        const url = `/api/onboarding/background-setup?plan=free&timestamp=${Date.now()}&requestId=${requestId}&background=true`;
        
        // Use fetch with no-cors to avoid waiting for response
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Background-Setup': 'true',
            'X-Request-ID': requestId
          },
          // Don't wait for response with keepalive
          keepalive: true,
          // Add basic body data
          body: JSON.stringify({
            plan: 'free',
            timestamp: Date.now(),
            requestId
          })
        }).catch(() => {
          // Ignore errors - this is background processing
        });
        
      } catch (error) {
        // Ignore errors in background setup
        console.log('Background setup triggered');
      }
    };
    
    // Start the background process
    setupInBackground();
    
    // Immediately go to dashboard
    window.location.href = '/dashboard?newAccount=true&setupBackground=true';
    return;
  }
  
  // For other plans, use normal selection
  setSelectedPlan(plan);
}; 