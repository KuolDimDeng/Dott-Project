// src/app/onboarding/constants/onboardingConstants.js
import { APP_CONFIG } from '@/config';

// Use the steps from APP_CONFIG
export const ONBOARDING_STEPS = APP_CONFIG.onboarding.steps;

// Use routes from APP_CONFIG
export const STEP_ROUTES = {
  step1: APP_CONFIG.routes.onboarding.steps.step1,
  step2: APP_CONFIG.routes.onboarding.steps.step2,
  step3: APP_CONFIG.routes.onboarding.steps.step3,
  step4: APP_CONFIG.routes.onboarding.steps.step4,
  complete: APP_CONFIG.routes.onboarding.steps.complete || '/dashboard'
};

// Use API endpoints from APP_CONFIG
export const API_ENDPOINTS = {
  step1: APP_CONFIG.api.endpoints.onboarding.step1,
  step2: APP_CONFIG.api.endpoints.onboarding.step2,
  step3: APP_CONFIG.api.endpoints.onboarding.step3,
  step4: APP_CONFIG.api.endpoints.onboarding.step4,
  complete: APP_CONFIG.api.endpoints.onboarding.complete,
  status: APP_CONFIG.api.endpoints.onboarding.status
};

// Keep validation logic here since it's specific to onboarding
export const STEP_VALIDATION = {
  step1: (data) => {
    const requiredFields = ['businessName', 'industry', 'country', 'legalStructure'];
    return requiredFields.every(field => !!data?.[field]);
  },
  
  step2: (data) => {
    return !!data?.selectedPlan && ['Basic', 'Professional'].includes(data.selectedPlan) &&
           !!data?.billingCycle && ['monthly', 'annual'].includes(data.billingCycle);
  },
  
  step3: (data) => {
    if (data?.selectedPlan === 'Basic') return true;
    return data?.selectedPlan === 'Professional' && !!data?.paymentMethod;
  },
  
  step4: (data) => {
    return data?.selectedPlan === 'Basic' || 
           (data?.selectedPlan === 'Professional' && !!data?.paymentMethod);
  }
};

// Add helper functions for step navigation
export const getNextStep = (currentStep, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);
  
  // Special case for Basic plan skipping step3
  if (currentStep === ONBOARDING_STEPS.PLAN && formData?.selectedPlan === 'Basic') {
    return ONBOARDING_STEPS.SETUP;
  }
  
  return stepOrder[currentIndex + 1] || ONBOARDING_STEPS.COMPLETE;
};

export const getPreviousStep = (currentStep) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);
  return stepOrder[currentIndex - 1] || ONBOARDING_STEPS.INITIAL;
};

// Add utility functions
export const isStepValid = (step, data) => {
  const validationFn = STEP_VALIDATION[step];
  return validationFn ? validationFn(data) : true;
};

export const getStepRoute = (step) => {
  return STEP_ROUTES[step] || STEP_ROUTES.step1;
};

export const getStepApiEndpoint = (step) => {
  return API_ENDPOINTS[step] || API_ENDPOINTS.step1;
};

// Add development checks
if (process.env.NODE_ENV === 'development') {
  // Validate routes match API endpoints
  Object.keys(STEP_ROUTES).forEach(step => {
    if (!API_ENDPOINTS[step]) {
      console.warn(`Warning: No API endpoint defined for step ${step}`);
    }
  });
}