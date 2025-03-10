import { updateUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

/**
 * Utility function to mark onboarding as complete
 * This can be called from the dashboard to ensure the user's onboarding status is set to COMPLETE
 */
export async function completeOnboarding() {
  try {
    logger.debug('[completeOnboarding] Updating user attributes to mark onboarding as complete');
    
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': 'COMPLETE',
        'custom:setupdone': 'TRUE',
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    // Also update the cookies to match the user attributes
    try {
      const { tokens } = await fetchAuthSession();
      
      if (tokens?.idToken) {
        logger.debug('[completeOnboarding] Updating cookies to match user attributes');
        
        await fetch('/api/auth/set-cookies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: tokens.idToken.toString(),
            accessToken: tokens.accessToken.toString(),
            refreshToken: tokens.refreshToken?.toString(),
            onboardingStep: 'complete',
            onboardedStatus: 'COMPLETE',
            setupCompleted: true
          }),
        });
        
        logger.debug('[completeOnboarding] Successfully updated cookies');
      }
    } catch (cookieError) {
      logger.error('[completeOnboarding] Failed to update cookies:', cookieError);
      // Continue even if cookie update fails, as the user attributes were updated
    }
    
    logger.debug('[completeOnboarding] Successfully marked onboarding as complete');
    return true;
  } catch (error) {
    logger.error('[completeOnboarding] Failed to update user attributes:', error);
    return false;
  }
}