'use client';


/**
 * Onboarding steps configuration
 * This file defines the steps, their metadata, and navigation logic for the onboarding flow
 */

import { ONBOARDING_STEPS } from '../constants/onboardingConstants';

// Step names used for navigation and state management
export const STEP_NAMES = {
  BUSINESS_INFO: 'businessinfo',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

// Metadata for each step - used for UI components
export const STEP_METADATA = {
  [STEP_NAMES.BUSINESS_INFO]: {
    title: 'Business Information',
    description: 'Tell us about your business',
    next_step: STEP_NAMES.SUBSCRIPTION,
    prevStep: null,
    isRequired: true,
    route: '/onboarding/business-info'
  },
  [STEP_NAMES.SUBSCRIPTION]: {
    title: 'Choose Your Subscription',
    description: 'Select the plan that fits your business needs',
    next_step: STEP_NAMES.PAYMENT,
    prevStep: STEP_NAMES.BUSINESS_INFO,
    isRequired: true,
    route: '/onboarding/subscription'
  },
  [STEP_NAMES.PAYMENT]: {
    title: 'Payment Details',
    description: 'Complete your subscription with payment information',
    next_step: STEP_NAMES.SETUP,
    prevStep: STEP_NAMES.SUBSCRIPTION,
    isRequired: false, // Only required for paid plans
    route: '/onboarding/payment'
  },
  [STEP_NAMES.SETUP]: {
    title: 'Setup Your Account',
    description: 'Configure your account settings to get started',
    next_step: STEP_NAMES.COMPLETE,
    prevStep: STEP_NAMES.PAYMENT,
    isRequired: true,
    route: '/onboarding/setup'
  },
  [STEP_NAMES.COMPLETE]: {
    title: 'Onboarding Complete',
    description: 'Your account is ready to use',
    next_step: null,
    prevStep: STEP_NAMES.SETUP,
    isRequired: false,
    route: '/onboarding/complete'
  }
};

// Map legacy step numbers to step names for backward compatibility
export const LEGACY_STEP_MAP = {
  1: STEP_NAMES.BUSINESS_INFO,
  2: STEP_NAMES.SUBSCRIPTION,
  3: STEP_NAMES.PAYMENT,
  4: STEP_NAMES.SETUP,
  5: STEP_NAMES.COMPLETE
};

// Step validation functions - returns true if step data is valid
export const STEP_VALIDATION = {
  [STEP_NAMES.BUSINESS_INFO]: (data) => {
    const required = ['legal_name', 'business_type', 'legal_structure', 'country'];
    return required.every(field => !!data?.[field]);
  },
  [STEP_NAMES.SUBSCRIPTION]: (data) => {
    return !!data?.planId && ['free', 'professional', 'enterprise'].includes(data.planId);
  },
  [STEP_NAMES.PAYMENT]: (data) => {
    // Free plan doesn't require payment
    if (data?.planId === 'free') return true;
    
    // Paid plans require payment details
    return !!data?.paymentMethod && !!data?.paymentCompleted;
  },
  [STEP_NAMES.SETUP]: (data) => {
    return !!data?.setupCompleted;
  }
};

// Get the next step based on current step and form data
export const getNextStep = (currentStep, formData) => {
  // Handle special case for subscription step
  if (currentStep === STEP_NAMES.SUBSCRIPTION) {
    // Free plan users skip payment
    if (formData?.planId === 'free') {
      return STEP_NAMES.SETUP;
    }
  }
  
  return STEP_METADATA[currentStep]?.next_step || STEP_NAMES.COMPLETE;
};

// Determine if a user can navigate to a step
export const canAccessStep = (stepName, completedSteps) => {
  // Users can always access business info
  if (stepName === STEP_NAMES.BUSINESS_INFO) return true;
  
  // For subscription step, business info must be completed
  if (stepName === STEP_NAMES.SUBSCRIPTION) {
    return completedSteps?.includes(STEP_NAMES.BUSINESS_INFO);
  }
  
  // For payment step, subscription must be completed
  if (stepName === STEP_NAMES.PAYMENT) {
    return completedSteps?.includes(STEP_NAMES.SUBSCRIPTION);
  }
  
  // For setup step, either payment or subscription must be completed (depends on plan)
  if (stepName === STEP_NAMES.SETUP) {
    return completedSteps?.includes(STEP_NAMES.SUBSCRIPTION);
  }
  
  return false;
};

export default {
  STEP_NAMES,
  STEP_METADATA,
  LEGACY_STEP_MAP,
  STEP_VALIDATION,
  getNextStep,
  canAccessStep
}; 