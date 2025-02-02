// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/Payment.types.js
export const paymentPropTypes = {
    metadata: {
      title: 'string',
      description: 'string',
      next_step: 'string?',
      prevStep: 'string?'
    },
    tier: 'string'
  };
  
  export const tierTypes = {
    FREE: 'free',
    PROFESSIONAL: 'professional'
  };
  
  export const paymentDefaultValues = {
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    name: '',
    email: '',
    tier: '',
    billingCycle: 'monthly'
  };
  
  export const pricingConfig = {
    professional: {
      monthly: 15,
      annual: 150
    }
  };
  
  export const paymentValidation = {
    cardNumber: {
      required: 'Card number is required',
      pattern: {
        value: /^[0-9]{16}$/,
        message: 'Invalid card number'
      }
    },
    expiryDate: {
      required: 'Expiry date is required',
      pattern: {
        value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
        message: 'Invalid expiry date (MM/YY)'
      }
    },
    cvc: {
      required: 'CVC is required',
      pattern: {
        value: /^[0-9]{3,4}$/,
        message: 'Invalid CVC'
      }
    },
    name: {
      required: 'Name is required'
    },
    email: {
      required: 'Email is required',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Invalid email address'
      }
    },
    tier: {
      required: 'Tier selection is required',
      validate: (value) => 
        ['free', 'professional'].includes(value) || 
        'Invalid tier selected'
    },
    billingCycle: {
      required: 'Billing cycle is required',
      validate: (value) =>
        ['monthly', 'annual'].includes(value) ||
        'Invalid billing cycle'
    }
  };
  
  export const featuresList = {
    professional: [
      'Unlimited users',
      'Payroll processing',
      '20 GB of storage',
      'Advanced analytics',
      'Priority support',
      'Custom reporting',
      'API access'
    ]
  };