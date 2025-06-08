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
    'Advanced inventory management with forecasting',
    'Automated invoicing and payment reminders',
    'Global payments with reduced transaction fees',
    'Invoice factoring for US and Canada businesses',
    '30 GB of storage',
    'Advanced reporting and analytics',
    'AI-powered business insights',
    'Priority support with dedicated account manager'
  ]
};

export const regionalFeatures = {
  africa: [
    'Mobile money integration (M-Pesa, MTN, Airtel)',
    'Multi-currency support',
    'Cross-border payment processing'
  ],
  northAmerica: [
    'Invoice factoring',
    'ACH payments',
    'Tax compliance automation'
  ],
  europe: [
    'SEPA integration',
    'VAT compliance',
    'Multi-language support'
  ],
  asia: [
    'Local payment methods (Alipay, WeChat Pay, UPI)',
    'Multi-language invoicing',
    'Regional compliance tools'
  ],
  latinAmerica: [
    'Local payment methods (PIX, Oxxo, PSE)',
    'Regional tax compliance',
    'Cross-border invoicing'
  ],
  global: [
    'Multiple currency support',
    'Global tax compliance assistance',
    'International payment processing'
  ]
};

export const getRegionalFeatures = (countryCode) => {
  if (['GH', 'KE', 'NG', 'ZA', 'TZ', 'UG', 'RW', 'ET', 'SN', 'CI'].includes(countryCode)) {
    return regionalFeatures.africa;
  } else if (['US', 'CA', 'MX'].includes(countryCode)) {
    return regionalFeatures.northAmerica;
  } else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PT', 'SE', 'DK', 'NO', 'FI'].includes(countryCode)) {
    return regionalFeatures.europe;
  } else if (['CN', 'JP', 'KR', 'IN', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID'].includes(countryCode)) {
    return regionalFeatures.asia;
  } else if (['BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'UY', 'PY', 'BO', 'VE'].includes(countryCode)) {
    return regionalFeatures.latinAmerica;
  } else {
    return regionalFeatures.global;
  }
};

export const addOnFeatures = {
  payrollTax: [
    'Multi-country payroll processing',
    'Automatic tax calculations',
    'Employee self-service portal',
    'Direct deposit and mobile money payments',
    'Compliance updates for multiple regions'
  ],
  hrCrm: [
    'Employee management across multiple regions',
    'Customer relationship tracking',
    'Lead and opportunity management',
    'Multi-currency sales forecasting',
    'Global support ticket system'
  ]
};