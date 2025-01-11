// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.types.js
export const subscriptionPropTypes = {
    metadata: {
      title: 'string',
      description: 'string',
      nextStep: 'string?',
      prevStep: 'string?'
    }
  };
  
  export const subscriptionDefaultValues = {
    selectedPlan: '',
    billingCycle: 'monthly',
    tier: '' // Add tier
  };
  
  export const planTypes = {
    FREE: 'free',
    PROFESSIONAL: 'professional'
  };
  
  export const billingCycleTypes = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual'
  };
  
  export const subscriptionValidation = {
    selectedPlan: {
      required: 'Please select a plan'
    },
    billingCycle: {
      required: 'Please select a billing cycle'
    },
    tier: {
      required: 'Please select a tier'
    }
  };