// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.types.js

// Plan types
export const PLAN_TYPES = {
    FREE: 'free',
    PROFESSIONAL: 'professional'
  };
  
  // Billing cycles
  export const BILLING_CYCLES = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual'
  };
  
  // PropTypes for the component
  export const subscriptionPropTypes = {
    metadata: {
      title: 'string',
      description: 'string',
      next_step: 'string?',
      prevStep: 'string?'
    }
  };
  
  // Default values for the form
  export const subscriptionDefaultValues = {
    selected_plan: null,
    billingCycle: 'monthly',
    tier: null
  };
  
  // Validation rules
  export const subscriptionValidation = {
    selected_plan: {
      required: 'Please select a plan',
      validate: value => 
        Object.values(PLAN_TYPES).includes(value) || 'Invalid plan selected'
    },
    billingCycle: {
      required: 'Please select a billing cycle',
      validate: value => 
        Object.values(BILLING_CYCLES).includes(value) || 'Invalid billing cycle selected'
    }
  };
  
  // Plan configuration
  export const PLAN_CONFIG = {
    [PLAN_TYPES.FREE]: {
      next_step: 'setup',
      requiresPayment: false
    },
    [PLAN_TYPES.PROFESSIONAL]: {
      next_step: 'payment',
      requiresPayment: true
    }
  };
  
  // Step navigation configuration
  export const STEPS = {
    BUSINESS_INFO: 'business-info',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SETUP: 'setup'
  };
  
  // Step transition rules
  export const STEP_TRANSITIONS = {
    [STEPS.SUBSCRIPTION]: {
      [PLAN_TYPES.FREE]: STEPS.SETUP,
      [PLAN_TYPES.PROFESSIONAL]: STEPS.PAYMENT
    }
  };