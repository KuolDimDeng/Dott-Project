///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/constants/onboardingConstants.js
import { APP_CONFIG } from '@/config';

export const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  COMPLETE: 'complete'
};

export const PLANS = {
  FREE: 'free',
  PROFESSIONAL: 'professional'
};

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual'
};

export const ERROR_TYPES = {
  INVALID_PLAN: 'INVALID_PLAN',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_STEP: 'INVALID_STEP',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED'
};

export const validatePlanAccess = (stepName, selected_plan) => {
  switch (stepName) {
    case ONBOARDING_STEPS.PAYMENT:
      if (selected_plan !== PLANS.PROFESSIONAL) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'Payment is only available for Professional plan'
        };
      }
      break;
  }
  return { valid: true };
};

export const validateStepTransition = (current_step, targetStep, formData) => {
  // Allow direct business-info access
  if (targetStep === ONBOARDING_STEPS.BUSINESS_INFO) return true;

  return canNavigateToStep(targetStep, current_step, formData);
};

export const LEGACY_STEP_MAPPING = {
  'step1': ONBOARDING_STEPS.BUSINESS_INFO,
  'step2': ONBOARDING_STEPS.SUBSCRIPTION,
  'step3': ONBOARDING_STEPS.PAYMENT
};

export const STEP_ROUTES = {
  'business-info': APP_CONFIG.routes.onboarding.steps.businessInfo,
  'subscription': APP_CONFIG.routes.onboarding.steps.subscription,
  'payment': APP_CONFIG.routes.onboarding.steps.payment,
  'complete': APP_CONFIG.routes.onboarding.steps.complete || '/dashboard'
};

export const API_ENDPOINTS = {
  'business-info': APP_CONFIG.api.endpoints.onboarding.businessInfo,
  'subscription': APP_CONFIG.api.endpoints.onboarding.subscription,
  'payment': APP_CONFIG.api.endpoints.onboarding.payment,
  'complete': APP_CONFIG.api.endpoints.onboarding.complete,
  'status': APP_CONFIG.api.endpoints.onboarding.status
};

export const STEP_VALIDATION = {
  'business-info': (data) => {
    const required = ['businessName', 'industry', 'country', 'legalStructure'];
    return required.every(field => !!data?.[field]);
  },

  'subscription': (data) => (
    !!data?.selected_plan &&
    Object.values(PLANS).includes(data.selected_plan) &&
    !!data?.billingCycle &&
    Object.values(BILLING_CYCLES).includes(data.billingCycle)
  ),

  'payment': (data) => (
    data?.selected_plan === PLANS.FREE ||
    (data?.selected_plan === PLANS.PROFESSIONAL && !!data?.paymentMethod)
  )
};

export const STEP_REQUIREMENTS = {
  'business-info': [],
  'subscription': ['business-info'],
  'payment': ['subscription']
};

export const getnext_step = (current_step, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(current_step);

  // Special handling for subscription step
  if (current_step === ONBOARDING_STEPS.SUBSCRIPTION) {
    return formData?.selected_plan === PLANS.FREE
      ? ONBOARDING_STEPS.COMPLETE
      : ONBOARDING_STEPS.PAYMENT;
  }

  // Special handling for payment step
  if (current_step === ONBOARDING_STEPS.PAYMENT &&
      formData?.selected_plan === PLANS.PROFESSIONAL) {
    return ONBOARDING_STEPS.COMPLETE;
  }

  return stepOrder[currentIndex + 1] || ONBOARDING_STEPS.COMPLETE;
};

export const canNavigateToStep = (targetStep, current_step, formData) => {
  // Always allow navigation to business-info
  if (targetStep === ONBOARDING_STEPS.BUSINESS_INFO) return true;

  const selected_plan = formData?.selected_plan;

  // Handle subscription access from business-info
  if (targetStep === ONBOARDING_STEPS.SUBSCRIPTION &&
      current_step === ONBOARDING_STEPS.BUSINESS_INFO) {
    return true;
  }

  // Handle complete access from subscription for free plan
  if (targetStep === ONBOARDING_STEPS.COMPLETE &&
      current_step === ONBOARDING_STEPS.SUBSCRIPTION &&
      selected_plan === PLANS.FREE) {
    return true;
  }

  // Handle complete access from payment for professional plan
  if (targetStep === ONBOARDING_STEPS.COMPLETE &&
      current_step === ONBOARDING_STEPS.PAYMENT &&
      selected_plan === PLANS.PROFESSIONAL) {
    return true;
  }

  const stepRequirements = STEP_REQUIREMENTS[targetStep];

  // Handle regular requirements
  return stepRequirements?.every(step =>
    STEP_VALIDATION[step]?.(formData)
  ) ?? true;
};

export const getPreviousStep = (current_step, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(current_step);

  // Special handling for complete step based on plan
  if (current_step === ONBOARDING_STEPS.COMPLETE) {
    return formData?.selected_plan === PLANS.FREE
      ? ONBOARDING_STEPS.SUBSCRIPTION
      : ONBOARDING_STEPS.PAYMENT;
  }

  return stepOrder[currentIndex - 1] || ONBOARDING_STEPS.BUSINESS_INFO;
};

export const {
  isStepValid,
  getStepRoute,
  getStepApiEndpoint,

} = {
  isStepValid: (step, data) => STEP_VALIDATION[step]?.(data) ?? true,
  getStepRoute: (step) => STEP_ROUTES[step] || STEP_ROUTES['business-info'],
  getStepApiEndpoint: (step) => API_ENDPOINTS[step] || API_ENDPOINTS['business-info'],
  validatePlanAccess,
  validateStepTransition
};