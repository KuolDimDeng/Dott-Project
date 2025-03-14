import { updateUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { logMemoryUsage, trackMemory, detectMemorySpike } from '@/utils/memoryDebug';

/**
 * Optimized utility function to mark onboarding as complete
 * Memory optimizations:
 * - Reduced logging verbosity
 * - Minimized object creation
 * - Simplified error handling
 * - Reused objects where possible
 * - Added memory tracking to identify potential memory leaks
 */
export async function completeOnboarding() {
  // Track memory at the start of the function
  trackMemory('completeOnboarding', 'start');
  logMemoryUsage('completeOnboarding', 'start');
  
  try {
    // Minimal logging
    logger.debug('[Onboarding] Updating to COMPLETE');
    
    // Update user attributes with minimal object creation
    const userAttributes = {
      'custom:onboarding': 'COMPLETE',
      'custom:setupdone': 'TRUE',
      'custom:updated_at': new Date().toISOString()
    };
    
    // Track memory before updating user attributes
    trackMemory('completeOnboarding', 'before-updateUserAttributes');
    
    await updateUserAttributes({ userAttributes });
    
    // Track memory after updating user attributes
    trackMemory('completeOnboarding', 'after-updateUserAttributes');
    
    // Check for memory spikes after user attribute update
    const attributeSpike = detectMemorySpike(15);
    if (attributeSpike) {
      console.warn('[Memory Spike after User Attribute Update]', attributeSpike);
    }
    
    // Update cookies in a separate try block to continue even if it fails
    try {
      // Track memory before fetching auth session
      trackMemory('completeOnboarding', 'before-fetchAuthSession');
      
      const { tokens } = await fetchAuthSession();
      
      // Track memory after fetching auth session
      trackMemory('completeOnboarding', 'after-fetchAuthSession');
      
      if (tokens?.idToken) {
        // Create cookie payload with minimal properties
        const cookiePayload = {
          idToken: tokens.idToken.toString(),
          accessToken: tokens.accessToken.toString(),
          onboardingStep: 'complete',
          onboardedStatus: 'COMPLETE',
          setupCompleted: true
        };
        
        // Add refreshToken only if it exists
        if (tokens.refreshToken) {
          cookiePayload.refreshToken = tokens.refreshToken.toString();
        }
        
        // Track memory before cookie API call
        trackMemory('completeOnboarding', 'before-cookieAPI');
        
        // Make the request with minimal headers
        await fetch('/api/auth/set-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cookiePayload)
        });
        
        // Track memory after cookie API call
        trackMemory('completeOnboarding', 'after-cookieAPI');
        
        // Check for memory spikes after cookie API call
        const cookieSpike = detectMemorySpike(15);
        if (cookieSpike) {
          console.warn('[Memory Spike after Cookie API Call]', cookieSpike);
        }
      }
    } catch (cookieError) {
      // Track memory on cookie error
      trackMemory('completeOnboarding', 'cookie-error');
      
      // Simplified error logging
      logger.error(`[Onboarding] Cookie update failed: ${cookieError.message}`);
    }
    
    // Track memory at the end of successful execution
    trackMemory('completeOnboarding', 'end-success');
    logMemoryUsage('completeOnboarding', 'end-success');
    
    return true;
  } catch (error) {
    // Track memory on exception
    trackMemory('completeOnboarding', 'exception');
    logMemoryUsage('completeOnboarding', 'error');
    
    // Simplified error logging
    logger.error(`[Onboarding] Update failed: ${error.message}`);
    return false;
  }
}