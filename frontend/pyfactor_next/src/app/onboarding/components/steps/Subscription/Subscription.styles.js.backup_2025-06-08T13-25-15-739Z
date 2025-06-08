// Tailwind CSS equivalents for styles

// No longer need a theme definition with Tailwind, as styles are applied directly via classes
export const theme = {
  // Keep any theme-specific values needed by components
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    }
  },
};

// Tailwind classes as strings for compatibility
export const BillingToggle = "inline-flex items-center bg-gray-100 border border-gray-200 rounded-full p-0.5 relative cursor-pointer mb-8 shadow-sm";

// CSS classes for toggle options to be applied in the component
export const billingToggleOptionClasses = {
  base: "px-5 py-2 rounded-full relative z-10 transition-colors duration-200 text-gray-800 font-medium select-none",
  hover: "hover:bg-gray-200",
  active: "bg-blue-600 text-white shadow-md"
};

export const FeatureIcon = "w-5 h-5 flex items-center justify-center mr-2";

export const HighlightedFeature = "bg-amber-50 rounded-lg p-1 mb-1 flex items-center";

export const tiers = [
  {
    title: 'Basic',
    type: 'free',
    price: {
      monthly: 0,
      annual: 0,
    },
    description: [
      '1 user included',
      'Track income and expenses',
      'Basic inventory management',
      'Send invoices and quotes',
      'Global payments: Stripe, PayPal, and mobile money',
      '3 GB of storage',
      'Basic reporting',
      'Email support',
    ],
    addOns: [
      'Payroll & Tax processing available as add-on',
      'HR & CRM modules available as add-on',
    ],
    globalFeatures: [
      'Accept payments in 100+ countries',
      'Mobile money support in select regions',
      'Multi-currency support',
    ],
    buttonText: 'Get started for free',
    buttonVariant: 'outlined',
  },
  {
    title: 'Professional',
    type: 'professional',
    subheader: 'Popular',
    price: {
      monthly: 15,
      annual: 150,
    },
    description: [
      'Up to 3 users',
      'Advanced inventory management with forecasting',
      'Automated invoicing and payment reminders',
      'Global payments with reduced transaction fees',
      'Invoice factoring for US and Canada businesses',
      'Unlimited income & expense tracking',
      '15 GB of storage',
      'Advanced reporting and analytics',
      'AI-powered business insights',
      'Priority support',
    ],
    addOns: [
      'Discounted rates on Payroll & Tax processing',
      'Discounted rates on HR & CRM modules',
    ],
    globalFeatures: [
      'Enhanced global payment processing',
      'Region-specific financial tools',
      'Advanced multi-currency support',
      'Cross-border invoice management',
    ],
    buttonText: 'Start Professional',
    buttonVariant: 'contained',
  },
  {
    title: 'Enterprise',
    type: 'enterprise',
    subheader: 'Best Value',
    price: {
      monthly: 45,
      annual: 450,
    },
    description: [
      'Unlimited users',
      'Everything in Professional',
      'Preferential transaction fees',
      'Unlimited storage',
      'Custom roles & permissions',
      'Dedicated account manager',
      'Advanced security features',
      'Full API access with higher rate limits',
      'Advanced data analytics and insights',
      'White-label options',
    ],
    addOns: [
      'Full Payroll & Tax processing included',
      'Integrated HR & CRM modules',
    ],
    globalFeatures: [
      'Enterprise-grade global payment infrastructure',
      'Custom payment gateway integrations',
      'Advanced fraud protection',
      'Custom regional adaptations',
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'contained',
  }
];

export const FeatureCategories = [
  {
    name: 'Core Business Features',
    basic: ['Track income and expenses', 'Send invoices and quotes', 'Basic reporting'],
    professional: ['Unlimited income & expense tracking', 'Automated invoicing and payment reminders', 'Advanced reporting and analytics', 'AI-powered business insights'],
    enterprise: ['Custom reporting dashboards', 'Workflow automation', 'Advanced data analytics', 'White-label options'],
    highlight: false,
  },
  {
    name: 'Global Payment Solutions',
    basic: ['Accept payments in 100+ countries', 'Basic multi-currency support'],
    professional: ['Reduced global transaction fees', 'Enhanced multi-currency support', 'Invoice factoring (US & Canada)', 'Mobile money optimizations'],
    enterprise: ['Preferential transaction fees', 'Custom payment gateway integrations', 'Advanced fraud protection', 'Enterprise-grade global payment infrastructure'],
    highlight: true,
  },
  {
    name: 'Inventory Management',
    basic: ['Basic inventory tracking', 'Low stock alerts'],
    professional: ['Advanced inventory management', 'Inventory forecasting', 'Multi-location inventory', 'Barcode scanning'],
    enterprise: ['Supply chain optimization', 'Custom inventory workflows', 'Advanced inventory analytics', 'Integration with physical systems'],
    highlight: true,
  },
  {
    name: 'Team and Support',
    basic: ['1 user included', 'Email support'],
    professional: ['Up to 3 users', 'Priority support'],
    enterprise: ['Unlimited users', 'Dedicated account manager', 'Custom roles & permissions', '24/7 premium support'],
    highlight: false,
  },
  {
    name: 'Technical Resources',
    basic: ['3 GB storage', 'Basic API access'],
    professional: ['15 GB storage', 'Full API access', 'Webhook integrations', 'Advanced data exports'],
    enterprise: ['Unlimited storage', 'Enhanced API with higher rate limits', 'Custom integrations', 'Full data control and compliance tools'],
    highlight: false,
  },
];

export const regionalHighlights = {
  africa: {
    title: 'Optimized for African Businesses',
    features: [
      'Mobile money integration (M-Pesa, MTN, Airtel)',
      'Local payment processing with reduced fees',
      'Cross-border payment support',
    ],
    enterpriseFeatures: [
      'Custom mobile money integrations',
      'Preferential transaction rates',
      'Advanced regional compliance tools',
    ]
  },
  northAmerica: {
    title: 'Enhanced for US & Canada',
    features: [
      'Invoice factoring with competitive rates',
      'Integrated tax compliance',
      'ACH & EFT payment processing',
    ],
    enterpriseFeatures: [
      'Custom payment gateway integrations',
      'Advanced tax compliance automation',
      'Enterprise fraud protection',
    ]
  },
  europe: {
    title: 'Built for European Businesses',
    features: [
      'SEPA integration',
      'VAT compliance assistance',
      'Multi-language invoicing',
    ],
    enterpriseFeatures: [
      'Advanced GDPR compliance tools',
      'Custom VAT handling',
      'Regional banking integration',
    ]
  },
  asia: {
    title: 'Tailored for Asian Markets',
    features: [
      'Integration with regional payment platforms',
      'Multi-language support',
      'Regional compliance tools',
    ],
    enterpriseFeatures: [
      'Custom regional payment integrations',
      'Advanced cross-border transactions',
      'Enterprise-grade security',
    ]
  },
  latinAmerica: {
    title: 'Optimized for Latin America',
    features: [
      'Regional payment method integration',
      'Local tax compliance assistance',
      'Cross-border invoicing support',
    ],
    enterpriseFeatures: [
      'Custom banking integrations',
      'Advanced regional tax compliance',
      'Custom currency handling',
    ]
  },
  global: {
    title: 'Global Business Solution',
    features: [
      'Support for 100+ countries',
      'Multiple currency management',
      'International payment processing',
    ],
    enterpriseFeatures: [
      'Custom global payment solutions',
      'Advanced multi-currency management',
      'Enterprise compliance across regions',
    ]
  }
};

export const getRegionFromCountry = (countryCode) => {
  if (['GH', 'KE', 'NG', 'ZA', 'TZ', 'UG', 'RW', 'ET', 'SN', 'CI'].includes(countryCode)) {
    return 'africa';
  } else if (['US', 'CA', 'MX'].includes(countryCode)) {
    return 'northAmerica';
  } else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PT', 'SE', 'DK', 'NO', 'FI'].includes(countryCode)) {
    return 'europe';
  } else if (['CN', 'JP', 'KR', 'IN', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID'].includes(countryCode)) {
    return 'asia';
  } else if (['BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'UY', 'PY', 'BO', 'VE'].includes(countryCode)) {
    return 'latinAmerica';
  } else {
    return 'global';
  }
};