///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboardingProgress.js
'use client';

import { appCache } from '../utils/appCache';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { appCache } from '../utils/appCache';
import { useSession } from '@/hooks/useSession';
import { appCache } from '../utils/appCache';
import { useRouter } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { appCache } from '../utils/appCache';
import { persistenceService } from '@/services/persistenceService';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';
import { appCache } from '../utils/appCache';
import { RoutingManager } from '@/lib/routingManager';
import { appCache } from '../utils/appCache';
import { axiosInstance } from '@/lib/axiosConfig';
import * as OnboardingUtils from '@/utils/onboardingUtils';
import { appCache } from '../utils/appCache';
import { saveUserPreferences, PREF_KEYS } from '@/utils/userPreferences';

/**
 * Custom hook for managing onboarding progress
 * Uses AppCache instead of cookies/localStorage for data persistence
 */
export function useOnboardingProgress() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [currentStep, setCurrentStep] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Step constants
  const STEPS = {
    BUSINESS_INFO: 'business_info',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SETUP: 'setup',
    COMPLETE: 'complete'
  };

  // Route constants
  const ROUTES = {
    BUSINESS_INFO: '/onboarding/business-info',
    SUBSCRIPTION: '/onboarding/subscription',
    PAYMENT: '/onboarding/payment',
    SETUP: '/onboarding/setup',
    DASHBOARD: '/dashboard'
  };

  // Get current step from session
  const getCurrentStep = useCallback(() => {
    if (!session?.user) return STEPS.BUSINESS_INFO;
    
    const onboardingStep = session.user['custom:onboarding'];
    if (!onboardingStep) return STEPS.BUSINESS_INFO;
    
    // Convert to lowercase and normalize
    const normalizedStep = onboardingStep.toLowerCase();
    
    // Check if it's a valid step
    const isValidStep = Object.values(STEPS).includes(normalizedStep);
    return isValidStep ? normalizedStep : STEPS.BUSINESS_INFO;
  }, [session, STEPS]);

  // Update onboarding step in Cognito
  const updateOnboardingStep = async (step, additionalAttributes = {}) => {
    logger.debug(`Setting onboarding step to: ${step}`);
    setUpdating(true);
    setError(null);
    
    try {
      // Store properties including additional attributes
      const timestamp = new Date().toISOString();
      
      // Update AppCache first for immediate UI feedback
      updateOnboardingAppCache(step);
      
      // Use the Cognito attribute update mechanism
      // This is now the source of truth, not cookies or localStorage
      const result = await OnboardingUtils.updateOnboardingStatus(step, {
        ...additionalAttributes,
        step,
        timestamp
      });
      
      if (!result) {
        throw new Error('Failed to update onboarding status in Cognito');
      }
      
      logger.debug(`Updated onboarding step to: ${step}`);
      
      // Update local state
      await getCurrentStep();
      return true;
    } catch (error) {
      logger.error('Error updating onboarding step:', error);
      setError(error.message || 'Failed to update onboarding step');
      
      // Even if the API call fails, we've updated the AppCache
      // so the UI can still function correctly
      logger.info('API update failed, but AppCache is set. Proceeding with navigation.');
      return true; // Return true so navigation can still occur
    } finally {
      setUpdating(false);
    }
  };

  // Navigate to a step and update Cognito
  const navigateToStep = useCallback(async (step) => {
    const normalizedStep = step.toLowerCase();
    
    if (!Object.values(STEPS).includes(normalizedStep)) {
      logger.error(`Invalid step: ${step}`);
      return false;
    }
    
    const updated = await updateOnboardingStep(normalizedStep);
    
    if (updated) {
      const route = ROUTES[normalizedStep];
      if (route) {
        router.push(route);
        return true;
      }
    }
    
    return false;
  }, [updateOnboardingStep, router, ROUTES, STEPS]);

  // Navigate to next step
  const goToNextStep = useCallback(async () => {
    const currentStep = getCurrentStep();
    
    // Map to next step
    const nextStepMap = {
      [STEPS.BUSINESS_INFO]: STEPS.SUBSCRIPTION,
      [STEPS.SUBSCRIPTION]: STEPS.PAYMENT,
      [STEPS.PAYMENT]: STEPS.SETUP,
      [STEPS.SETUP]: STEPS.COMPLETE,
      [STEPS.COMPLETE]: STEPS.COMPLETE // No next step after complete
    };
    
    const nextStep = nextStepMap[currentStep] || STEPS.BUSINESS_INFO;
    return navigateToStep(nextStep);
  }, [getCurrentStep, navigateToStep, STEPS]);

  // Check if a step is complete
  const isStepComplete = useCallback((step) => {
    const currentStep = getCurrentStep();
    
    // Define step order for comparison
    const stepOrder = [
      STEPS.BUSINESS_INFO,
      STEPS.SUBSCRIPTION,
      STEPS.PAYMENT,
      STEPS.SETUP,
      STEPS.COMPLETE
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const checkIndex = stepOrder.indexOf(step.toLowerCase());
    
    // If current step is after the checked step, then the checked step is complete
    return currentIndex > checkIndex;
  }, [getCurrentStep, STEPS]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    return updateOnboardingStep('complete', {
      'custom:setupdone': 'true',
      'custom:updated_at': new Date().toISOString()
    });
  }, [updateOnboardingStep]);

  // Helper function to update onboarding step
  const updateOnboardingCookies = (step) => {
    if (typeof document === 'undefined') return;
    
    // Normalize step value to lowercase
    const normalizedStep = step.toLowerCase();
    
    // Store in app cache instead of localStorage and cookies
    try {
      // Ensure app cache exists
      if (typeof window !== 'undefined') {
        appCache.getAll() = appCache.getAll() || {};
        appCache.getAll().onboarding = appCache.getAll().onboarding || {};
        
        // Store in app cache
        appCache.set('onboarding.step', normalizedStep);
        appCache.set('onboarding.status', normalizedStep);
        appCache.set('onboarding.lastUpdated', new Date().toISOString());
        
        // Update Cognito attributes in background
        saveUserPreferences({
          [PREF_KEYS.ONBOARDING_STEP]: normalizedStep,
          [PREF_KEYS.ONBOARDING_STATUS]: normalizedStep
        }).catch(err => {
          logger.warn('Failed to update Cognito onboarding attributes:', err);
        });
      }
    } catch (e) {
      // Ignore storage errors
      logger.warn('Failed to set onboarding data in app cache:', e);
    }
    
    logger.debug(`Onboarding step updated to ${normalizedStep}`);
  };

  // Helper function to update onboarding progress in AppCache
  const updateOnboardingAppCache = (step) => {
    if (typeof window === 'undefined') return;
    
    // Normalize step value to lowercase
    const normalizedStep = step.toLowerCase();
    
    // Store in app cache
    try {
      // Ensure app cache exists
      appCache.getAll() = appCache.getAll() || {};
      appCache.getAll().onboarding = appCache.getAll().onboarding || {};
      
      // Store in app cache
      appCache.set('onboarding.step', normalizedStep);
      appCache.set('onboarding.status', normalizedStep);
      appCache.set('onboarding.lastUpdated', new Date().toISOString());
      
      // Update completed state if step is 'complete'
      if (normalizedStep === 'complete') {
        appCache.set('onboarding.completed', true);
      }
      
      logger.debug(`Onboarding state set in AppCache to ${normalizedStep}`);
    } catch (e) {
      // Ignore storage errors
      logger.warn('Failed to set onboarding data in app cache:', e);
    }
  };

  return {
    STEPS,
    ROUTES,
    getCurrentStep,
    updateOnboardingStep,
    navigateToStep,
    goToNextStep,
    isStepComplete,
    completeOnboarding,
    updating,
    error
  };
}
