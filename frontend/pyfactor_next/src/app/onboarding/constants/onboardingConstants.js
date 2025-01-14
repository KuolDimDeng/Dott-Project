import { APP_CONFIG } from '@/config';

export const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
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
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  SETUP_REQUIRED: 'SETUP_REQUIRED'
};

export const validatePlanAccess = (stepName, selectedPlan) => {
  switch (stepName) {
    case ONBOARDING_STEPS.PAYMENT:
      if (selectedPlan !== PLANS.PROFESSIONAL) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'Payment is only available for Professional plan'
        };
      }
      break;
    case ONBOARDING_STEPS.SETUP:
      if (!selectedPlan) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'No subscription plan selected'
        };
      }
      break;
  }
  return { valid: true };
};

export const validateStepTransition = (currentStep, targetStep, formData) => {
  // Allow direct business-info access
  if (targetStep === ONBOARDING_STEPS.BUSINESS_INFO) return true;

  const selectedPlan = formData?.selectedPlan;
  
  // Special case for free plan setup access
  if (targetStep === ONBOARDING_STEPS.SETUP && 
      currentStep === ONBOARDING_STEPS.SUBSCRIPTION && 
      selectedPlan === PLANS.FREE) {
    return true;
  }

  return canNavigateToStep(targetStep, currentStep, formData);
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
    Object.values(PLANS).includes(data.selectedPlan) &&
    !!data?.billingCycle &&
    Object.values(BILLING_CYCLES).includes(data.billingCycle)
  ),

  'payment': (data) => (
    data?.selectedPlan === PLANS.FREE || 
    (data?.selectedPlan === PLANS.PROFESSIONAL && !!data?.paymentMethod)
  ),

  'setup': (data) => (
    data?.selectedPlan === PLANS.FREE ||
    (data?.selectedPlan === PLANS.PROFESSIONAL && !!data?.paymentMethod)
  )
};

export const STEP_REQUIREMENTS = {
  'business-info': [],
  'subscription': ['business-info'],
  'payment': ['subscription'],
  'setup': {
    [PLANS.FREE]: ['subscription'],
    [PLANS.PROFESSIONAL]: ['subscription', 'payment']
  }
};

export const getNextStep = (currentStep, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);

  // Special handling for subscription step
  if (currentStep === ONBOARDING_STEPS.SUBSCRIPTION) {
    return formData?.selectedPlan === PLANS.FREE 
      ? ONBOARDING_STEPS.SETUP 
      : ONBOARDING_STEPS.PAYMENT;
  }

  // Special handling for payment step
  if (currentStep === ONBOARDING_STEPS.PAYMENT && 
      formData?.selectedPlan === PLANS.PROFESSIONAL) {
    return ONBOARDING_STEPS.SETUP;
  }

  return stepOrder[currentIndex + 1] || ONBOARDING_STEPS.COMPLETE;
};

export const canNavigateToStep = (targetStep, currentStep, formData) => {
  // Always allow navigation to business-info
  if (targetStep === ONBOARDING_STEPS.BUSINESS_INFO) return true;

  const selectedPlan = formData?.selectedPlan;
  const stepRequirements = STEP_REQUIREMENTS[targetStep];

  // Handle plan-specific requirements
  if (typeof stepRequirements === 'object') {
    const planRequirements = stepRequirements[selectedPlan];
    if (!planRequirements) return false;
    return planRequirements.every(step => 
      STEP_VALIDATION[step]?.(formData)
    );
  }

  // Handle regular requirements
  return stepRequirements?.every(step => 
    STEP_VALIDATION[step]?.(formData)
  ) ?? true;
};

export const getPreviousStep = (currentStep, formData) => {
  const stepOrder = Object.values(ONBOARDING_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);

  // Special handling for setup step based on plan
  if (currentStep === ONBOARDING_STEPS.SETUP) {
    return formData?.selectedPlan === PLANS.FREE 
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