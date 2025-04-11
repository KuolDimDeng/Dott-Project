// src/app/onboarding/validation/constants.js
export const STEPS = {
    BUSINESS_INFO: 'business-info',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SETUP: 'setup'
  };
  
  export const STEP_METADATA = {
    [STEPS.BUSINESS_INFO]: {
      title: 'Business Information',
      order: 0,
      requiredFields: ['businessName', 'industry', 'country']
    },
    [STEPS.SUBSCRIPTION]: {
      title: 'Choose Your Plan',
      order: 1,
      requiredFields: ['plan']
    },
    [STEPS.PAYMENT]: {
      title: 'Payment Details',
      order: 2,
      requiredFields: ['paymentMethod'],
      tierRequired: 'professional'
    },
    [STEPS.SETUP]: {
      title: 'Final Setup',
      order: 3,
      requiredFields: []
    }
  };
  
  export const STEP_ORDER = [
    STEPS.BUSINESS_INFO,
    STEPS.SUBSCRIPTION,
    STEPS.PAYMENT,
    STEPS.SETUP
  ];
  
  export const VALIDATION_REASONS = {
    INITIAL: 'initial_step',
    INVALID: 'invalid_step',
    VALID: 'valid_transition',
    INVALID_TRANSITION: 'invalid_transition',
    TIER_RESTRICTION: 'tier_restriction',
    ERROR: 'validation_error'
  };
  
  export const VALIDATION_STATES = {
    PENDING: 'pending',
    VALIDATING: 'validating',
    SUCCESS: 'success',
    ERROR: 'error'
  };