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
    
    let attributeUpdateSuccess = false;
    
    try {
      // First attempt: Use Amplify updateUserAttributes
      await updateUserAttributes({ userAttributes });
      attributeUpdateSuccess = true;
      logger.debug('[Onboarding] Attributes updated via Amplify');
    } catch (updateError) {
      logger.error(`[Onboarding] Amplify update failed: ${updateError.message}`);
      
      // If Amplify update fails, try the direct API call as a backup
      try {
        // Get current session for authentication
        const { tokens } = await fetchAuthSession();
        
        // Make direct API call to update attributes
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            attributes: {
              'custom:onboarding': 'COMPLETE',
              'custom:setupdone': 'TRUE',
              'custom:updated_at': new Date().toISOString()
            },
            forceUpdate: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          attributeUpdateSuccess = true;
          logger.debug('[Onboarding] Attributes updated via direct API call:', result);
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (apiError) {
        logger.error(`[Onboarding] Direct API update failed: ${apiError.message}`);
        // Third fallback: Try server-side update
        try {
          const response = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            attributeUpdateSuccess = true;
            logger.debug('[Onboarding] Attributes updated via server endpoint');
          }
        } catch (serverError) {
          logger.error(`[Onboarding] Server-side update failed: ${serverError.message}`);
        }
      }
    }
    
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
    
    return attributeUpdateSuccess;
  } catch (error) {
    // Track memory on exception
    trackMemory('completeOnboarding', 'exception');
    logMemoryUsage('completeOnboarding', 'error');
    
    // Simplified error logging
    logger.error(`[Onboarding] Update failed: ${error.message}`);
    return false;
  }
}