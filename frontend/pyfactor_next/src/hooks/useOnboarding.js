'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js

import { useState, useEffect } from 'react';
import { 
  getOnboardingStatus, 
  getOnboardingStep, 
  updateOnboardingData,
  PREF_KEYS 
} from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

/**
 * Hook for managing onboarding state
 * Uses Cognito attributes for persistence and AppCache for performance
 * 
 * @returns {Object} Onboarding state and methods
 */
export function useOnboarding() {
  const [status, setStatus] = useState('not_started');
  const [step, setStep] = useState('business_info');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load onboarding data from Cognito/AppCache
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // First check AppCache
        const cachedStatus = getCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STATUS}`);
        const cachedStep = getCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STEP}`);
        
        if (cachedStatus && cachedStep) {
          setStatus(cachedStatus);
          setStep(cachedStep);
          setIsLoaded(true);
          return;
        }
        
        // If not in cache, fetch from Cognito
        const storedStatus = await getOnboardingStatus();
        const storedStep = await getOnboardingStep();
        
        setStatus(storedStatus || 'not_started');
        setStep(storedStep || 'business_info');
        
        // Update AppCache
        if (storedStatus) {
          setCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STATUS}`, storedStatus);
        }
        if (storedStep) {
          setCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STEP}`, storedStep);
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadOnboardingData();
  }, []);
  
  /**
   * Update onboarding status and step
   * 
   * @param {string} newStatus - New onboarding status
   * @param {string} newStep - New onboarding step
   */
  const updateOnboarding = async (newStatus, newStep) => {
    try {
      // Update state immediately
      if (newStatus) setStatus(newStatus);
      if (newStep) setStep(newStep);
      
      // Update AppCache
      if (newStatus) {
        setCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STATUS}`, newStatus);
      }
      if (newStep) {
        setCacheValue(`user_pref_${PREF_KEYS.ONBOARDING_STEP}`, newStep);
      }
      
      // Save to Cognito
      await updateOnboardingData({
        status: newStatus || status,
        step: newStep || step
      });
    } catch (error) {
      console.error('Error updating onboarding data:', error);
    }
  };
  
  /**
   * Mark onboarding as complete
   */
  const completeOnboarding = async () => {
    await updateOnboarding('completed', 'done');
  };
  
  /**
   * Move to next onboarding step
   * 
   * @param {string} nextStep - The next step to move to
   */
  const goToStep = async (nextStep) => {
    if (!nextStep) return;
    
    let newStatus = status;
    
    // If moving from not_started to any step, update status to in_progress
    if (status === 'not_started') {
      newStatus = 'in_progress';
    }
    
    await updateOnboarding(newStatus, nextStep);
  };
  
  return {
    status,
    step,
    isLoaded,
    updateOnboarding,
    completeOnboarding,
    goToStep,
    isComplete: status === 'completed'
  };
}

// Default export for backward compatibility
export default useOnboarding;