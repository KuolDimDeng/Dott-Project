///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/constants/onboardingConstants.js
import { APP_CONFIG } from '@/config';

export const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

export const LEGACY_STEP_MAPPING = {
  'step1': ONBOARDING_STEPS.BUSINESS_INFO,
  'step2': ONBOARDING_STEPS.SUBSCRIPTION,
  'step3': ONBOARDING_STEPS.PAYMENT,
  'step4': ONBOARDING_STEPS.SETUP
};

export const STEP_ROUTES = {
  'business-info': APP_CONFIG.routes.onboarding.steps.businessInfo,
  'subscription': APP_CONFIG.routes.onboarding.steps.subscription,
  'payment': APP_CONFIG.routes.onboarding.steps.payment,
  'setup': APP_CONFIG.routes.onboarding.steps.setup,
  'complete': APP_CONFIG.routes.onboarding.steps.complete || '/dashboard'
};

export const API_ENDPOINTS = {
  'business-info': APP_CONFIG.api.endpoints.onboarding.businessInfo,
  'subscription': APP_CONFIG.api.endpoints.onboarding.subscription, 
  'payment': APP_CONFIG.api.endpoints.onboarding.payment,
  'setup': APP_CONFIG.api.endpoints.onboarding.setup.root,
  'complete': APP_CONFIG.api.endpoints.onboarding.complete,
  'status': APP_CONFIG.api.endpoints.onboarding.status
};

export const STEP_VALIDATION = {
  'business-info': (data) => {
    const required = ['businessName', 'industry', 'country', 'legalStructure'];
    return required.every(field => !!data?.[field]);
  },

  'subscription': (data) => (
    !!data?.selectedPlan &&
    ['Basic', 'Professional'].includes(data.selectedPlan) &&
    !!data?.billingCycle &&
    ['monthly', 'annual'].includes(data.billingCycle)
  ),

  'payment': (data) => (
    data?.selectedPlan === 'Basic' || 
    (data?.selectedPlan === 'Professional' && !!data?.paymentMethod)
  ),

  'setup': (data) => (
    data?.selectedPlan === 'Basic' ||
    (data?.selectedPlan === 'Professional' && !!data?.paymentMethod)
  )
};

export const getNextStep = (currentStep, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);

  if (currentStep === ONBOARDING_STEPS.SUBSCRIPTION && formData?.selectedPlan === 'Basic') {
    return ONBOARDING_STEPS.SETUP;
  }

  return stepOrder[currentIndex + 1] || ONBOARDING_STEPS.COMPLETE;
};

export const getPreviousStep = (currentStep) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);
  return stepOrder[currentIndex - 1] || ONBOARDING_STEPS.BUSINESS_INFO;
};

export const {
  isStepValid,
  getStepRoute,
  getStepApiEndpoint 
} = {
  isStepValid: (step, data) => STEP_VALIDATION[step]?.(data) ?? true,
  getStepRoute: (step) => STEP_ROUTES[step] || STEP_ROUTES['business-info'],
  getStepApiEndpoint: (step) => API_ENDPOINTS[step] || API_ENDPOINTS['business-info']
};