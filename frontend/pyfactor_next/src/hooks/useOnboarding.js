///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { determineOnboardingStep, setOnboardingCookies } from '@/utils/cookieManager';

/**
 * Hook for managing onboarding state and navigation
 * Provides functionality for tracking progress, updating cookies,
 * and navigating between onboarding steps
 */
export default function useOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  
  // List of onboarding steps
  const steps = [
    { key: 'business-info', label: 'Business Info', path: '/onboarding/business-info' },
    { key: 'subscription', label: 'Subscription', path: '/onboarding/subscription' },
    { key: 'payment', label: 'Payment', path: '/onboarding/payment' },
    { key: 'setup', label: 'Setup', path: '/onboarding/setup' },
    { key: 'complete', label: 'Complete', path: '/onboarding/complete' }
  ];
  
  // Initialize onboarding state from cookies
  useEffect(() => {
    const checkOnboardingStatus = () => {
      try {
        // Get cookies directly
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        // Get current onboarding step from cookies
        const cookieStep = getCookie('onboardingStep');
        const status = getCookie('onboardedStatus');
        
        // Find index of current step
        const index = steps.findIndex(step => step.key === cookieStep);
        
        setCurrentStep(cookieStep || 'business-info');
        setOnboardingStatus(status || 'NOT_STARTED');
        setStepIndex(index !== -1 ? index : 0);
      } catch (error) {
        logger.error('[useOnboarding] Error checking onboarding status:', error);
        // Default to first step
        setCurrentStep('business-info');
        setStepIndex(0);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboardingStatus();
  }, []);
  
  // Calculate progress percentage based on current step
  const progressPercentage = stepIndex >= 0 ? (stepIndex / (steps.length - 1)) * 100 : 0;
  
  // Navigate to next step
  const goToNextStep = (userData = null) => {
    try {
      if (stepIndex < steps.length - 1) {
        const nextIndex = stepIndex + 1;
        const nextStep = steps[nextIndex];
        
        // Update cookies if user data provided
        if (userData) {
          setOnboardingCookies(userData);
        }
        
        // Navigate to next step
        router.push(`${nextStep.path}?ts=${Date.now()}`);
        
        // Update local state
        setCurrentStep(nextStep.key);
        setStepIndex(nextIndex);
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[useOnboarding] Error navigating to next step:', error);
      return false;
    }
  };
  
  // Navigate to a specific step
  const goToStep = (stepKey, userData = null) => {
    try {
      const targetIndex = steps.findIndex(step => step.key === stepKey);
      
      if (targetIndex !== -1) {
        const targetStep = steps[targetIndex];
        
        // Update cookies if user data provided
        if (userData) {
          setOnboardingCookies(userData);
        }
        
        // Navigate to target step
        router.push(`${targetStep.path}?ts=${Date.now()}`);
        
        // Update local state
        setCurrentStep(targetStep.key);
        setStepIndex(targetIndex);
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[useOnboarding] Error navigating to step:', error);
      return false;
    }
  };
  
  // Complete onboarding and go to dashboard
  const completeOnboarding = (userData = null) => {
    try {
      // Update cookies for completed onboarding
      const completedData = {
        ...userData,
        'custom:onboarding': 'COMPLETE',
        setupCompleted: true
      };
      
      setOnboardingCookies(completedData);
      
      // Redirect to dashboard
      router.push('/dashboard');
      
      return true;
    } catch (error) {
      logger.error('[useOnboarding] Error completing onboarding:', error);
      return false;
    }
  };
  
  return {
    loading,
    currentStep,
    onboardingStatus,
    stepIndex,
    steps,
    progressPercentage,
    goToNextStep,
    goToStep,
    completeOnboarding
  };
}