import { updateUserAttributes } from 'aws-amplify/auth';
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
    
    logger.debug('[completeOnboarding] Successfully marked onboarding as complete');
    return true;
  } catch (error) {
    logger.error('[completeOnboarding] Failed to update user attributes:', error);
    return false;
  }
}