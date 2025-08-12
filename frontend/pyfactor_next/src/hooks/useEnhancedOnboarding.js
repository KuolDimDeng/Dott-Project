import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingService } from '@/services/onboardingService';
// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';

/**
 * Hook that provides enhanced onboarding functionality with consistent error handling
 * and state management across the onboarding flow.
 */
export function useEnhancedOnboarding() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Verify if the current state is valid for the requested step
   */
  const verifyState = useCallback(async (step) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await onboardingService.verifyState(step);
      return result;
    } catch (error) {
      logger.error('[useEnhancedOnboarding] Error verifying state:', error);
      setError('Failed to verify your current progress. Please try again.');
      return { isValid: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get the current onboarding state from the server
   */
  const getState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const state = await onboardingService.getState();
      return state;
    } catch (error) {
      logger.error('[useEnhancedOnboarding] Error getting state:', error);
      setError('Failed to retrieve your progress. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update state with consistent error handling
   */
  const updateState = useCallback(async (step, data) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update Cognito attributes first
      const userAttributes = {
        'custom:onboarding': onboardingService.stepToStatus(step),
        'custom:updated_at': new Date().toISOString()
      };
      
      // Add data-specific attributes
      if (step === 'business-info' && data?.businessName) {
        userAttributes['custom:businessName'] = data.businessName;
        if (data.businessType) {
          userAttributes['custom:businessType'] = data.businessType;
        }
      } else if (step === 'subscription' && data?.selectedPlan) {
        // Handle both free and basic plan values consistently
        let planValue = data.selectedPlan;
        
        // Normalize plan values - treat both 'free' and 'basic' as 'free' internally
        if (planValue.toLowerCase() === 'basic') {
          planValue = 'free';
        }
        
        userAttributes['custom:plan'] = planValue;
        if (data.pricingTier) {
          userAttributes['custom:pricing_tier'] = data.pricingTier;
        }
      }
      
      // Convert user attributes to format expected by Amplify v6
      const attributeUpdates = {};
      Object.entries(userAttributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          attributeUpdates[key] = value;
        }
      });
      
      // Update the user attributes using Amplify
      if (Object.keys(attributeUpdates).length > 0) {
        // Correct format for Amplify v6: { userAttributes: { key: value } }
        await updateUserAttributes({
          userAttributes: attributeUpdates
        });
        logger.debug('[useEnhancedOnboarding] Cognito attributes updated successfully');
      } else {
        logger.debug('[useEnhancedOnboarding] No valid attributes to update');
      }
      
      // Then update server state
      const result = await onboardingService.updateState(step, data);
      logger.debug('[useEnhancedOnboarding] Server state updated successfully');
      
      return result;
    } catch (error) {
      logger.error('[useEnhancedOnboarding] Error updating state:', error);
      setError('Failed to update your progress. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Navigate to the next step with server-side guidance
   */
  const navigateToNextStep = useCallback(async (currentStep, data = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get navigation instructions from server
      const navigationInstructions = await onboardingService.getNavigation(currentStep, data);
      logger.debug('[useEnhancedOnboarding] Navigation instructions received:', navigationInstructions);
      
      // Navigate based on server instructions
      if (navigationInstructions.navigationMethod === 'server-redirect') {
        // Server-side redirection
        try {
          logger.debug('[useEnhancedOnboarding] Using server-side redirect');
          
          // Create a form element that will submit to our redirection endpoint
          const redirectForm = document.createElement('form');
          redirectForm.style.display = 'none';
          redirectForm.method = 'POST';
          redirectForm.action = '/api/onboarding/redirect';
          
          // Add data as hidden inputs
          Object.entries(data).forEach(([key, value]) => {
            if (value) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = typeof value === 'object' ? JSON.stringify(value) : value;
              redirectForm.appendChild(input);
            }
          });
          
          // Add the target URL
          const targetInput = document.createElement('input');
          targetInput.type = 'hidden';
          targetInput.name = 'redirectUrl';
          targetInput.value = navigationInstructions.redirectUrl;
          redirectForm.appendChild(targetInput);
          
          // Add a timestamp
          const tsInput = document.createElement('input');
          tsInput.type = 'hidden';
          tsInput.name = 'ts';
          tsInput.value = Date.now().toString();
          redirectForm.appendChild(tsInput);
          
          // Submit the form
          document.body.appendChild(redirectForm);
          redirectForm.submit();
          
          logger.debug('[useEnhancedOnboarding] Server-side redirect form submitted');
          return true;
        } catch (redirectError) {
          logger.error('[useEnhancedOnboarding] Server redirect failed:', redirectError);
          // Fall through to client-side navigation
        }
      }
      
      // Client-side navigation as fallback
      logger.debug('[useEnhancedOnboarding] Using client-side navigation');
      router.push(navigationInstructions.redirectUrl);
      return true;
    } catch (error) {
      logger.error('[useEnhancedOnboarding] Navigation error:', error);
      setError('Failed to navigate to the next step. Please try again.');
      
      // Fallback navigation
      const nextStepMap = {
        'business-info': '/onboarding/subscription',
        'subscription': '/onboarding/payment',
        'payment': '/onboarding/setup',
        'setup': '/dashboard'
      };
      
      router.push(`${nextStepMap[currentStep] || '/onboarding/business-info'}?ts=${Date.now()}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    isLoading,
    error,
    verifyState,
    getState,
    updateState,
    navigateToNextStep
  };
} 