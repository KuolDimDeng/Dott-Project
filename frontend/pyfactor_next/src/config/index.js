// src/config/index.js

// Helper functions - Now defined BEFORE being used in APP_CONFIG
const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8000`;
};

const deepFreeze = (obj) => {
  Object.keys(obj).forEach((prop) => {
    if (typeof obj[prop] === 'object' && obj[prop] !== null) {
      deepFreeze(obj[prop]);
    }
  });
  return Object.freeze(obj);
};

export const APP_CONFIG = {
  api: {
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://127.0.0.1:8000',
    endpoints: {
      auth: {
        profile: '/api/auth/profile',
        google: '/api/onboarding/token-exchange/',
        refresh: '/api/onboarding/token/refresh/',
        verify: '/api/onboarding/token/verify/',
      },
      onboarding: {
        status: '/api/onboarding/status/',
        businessInfo: '/api/onboarding/save-business-info/',
        subscription: '/api/onboarding/subscription/',
        payment: '/api/onboarding/payment/',
        setup: {
          root: '/api/onboarding/setup/',
          start: '/api/onboarding/setup/start/',
          status: '/api/onboarding/setup/status/',
          cancel: '/api/onboarding/setup/cancel/',
        },
        complete: '/api/onboarding/complete-all-all',
        taskStatus: (taskId) => `/api/onboarding/tasks/${taskId}/status/`,
      },
      database: {
        healthCheck: '/api/onboarding/database/health-check/',
        status: '/api/onboarding/database/status/',
        reset: '/api/onboarding/database/reset/'
      },
    }
  },
 
  websocket: {
    baseURL: process.env.NEXT_PUBLIC_WS_URL || getWebSocketUrl(),
    reconnectAttempts: 3,
    reconnectInterval: 1000,
    endpoints: {
      onboarding: (userId, token) => `/ws/onboarding/${userId}/?token=${token}`,
    },
  },
 
  app: {
    name: 'Dott',
    title: 'Dott: Business Software', 
    description: 'Streamline your business operations with Dott',
    keywords: 'business management, finance, operations',
    favicon: '/static/images/favicon.png',
    logo: '/static/images/Pyfactor.png',
    version: '1.0.0',
    env: process.env.NODE_ENV,
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
    plans: {
      validPlans: ['Basic', 'Professional'],
      validBillingCycles: ['monthly', 'annual'],
      defaultPlan: 'Basic',
      defaultBillingCycle: 'monthly',
    },
  },
 
  routes: {
    public: ['/'],
    auth: {
      paths: ['/auth'],
      signIn: '/auth/signin',
      signOut: '/auth/signout', 
      error: '/auth/error',
      verifyRequest: '/auth/verify-request',
      callback: '/api/auth/callback',
    },
    static: ['/static', '/_next', '/favicon.ico', '/assets', '/images'],
    onboarding: {
      paths: ['/onboarding'],
      root: '/onboarding',
      success: '/onboarding/success',
      error: '/onboarding/error',
      steps: {
        businessInfo: '/onboarding/business-info',
        subscription: '/onboarding/subscription',
        payment: '/onboarding/payment', 
        setup: '/onboarding/setup'
      },
    },
    protected: ['/dashboard', '/settings', '/profile'],
    database: {
      paths: ['/api/onboarding/database'],
      healthCheck: '/api/onboarding/database/health-check/',
      status: '/api/onboarding/database/status/',
      reset: '/api/onboarding/database/reset/'
    },
  },
 
  onboarding: {
    steps: {
      INITIAL: 'business-info',
      BUSINESS_INFO: 'business-info',
      SUBSCRIPTION: 'subscription',
      PAYMENT: 'payment',
      SETUP: 'setup',
      COMPLETE: 'complete'
    },
    transitions: {
      'business-info': ['subscription'],
      'subscription': ['payment', 'setup'],
      'payment': ['setup'],
      'setup': ['complete'],
      'complete': ['dashboard'],
    },
    storage: {
      key: 'onboarding_data',
      version: '1.0',
      draftExpiration: 24 * 60 * 60 * 1000,
    },
    queryKeys: {
      status: 'onboarding',
      steps: 'onboardingSteps',
      progress: 'onboardingProgress', 
    },
  },
 
  auth: {
    tokenGracePeriod: 3600 * 1000,  // 1 hour
    sessionMaxAge: 30 * 24 * 60 * 60,  // 30 days
    refreshInterval: 5 * 60,
    providers: ['google', 'apple'],
    retryDelay: 1000,
    maxRetries: 3,
  },
 
  security: {
    headers: {
      'X-DNS-Prefetch-Control': 'on',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'X-XSS-Protection': '1; mode=block',
    },
    csrf: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
  },
 
  validation: {
    businessName: {
      minLength: 2,
      maxLength: 100,
    },
    password: {
      minLength: 8,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },
 
  storage: {
    prefix: 'app_',
    version: '1.0.0',
    keys: {
      auth: 'auth_state',
      theme: 'theme_preference',
      onboarding: 'onboarding_progress',
      onboardingDrafts: 'onboarding_drafts',
    },
    draftExpiration: 24 * 60 * 60 * 1000,
  },
 
  ui: {
    theme: 'light',
    animation: {
      duration: 300,
    },
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#ffffff',
        paper: '#ffffff',
      },
    },
    toast: {
      duration: 5000,
      position: 'top-right',
      limit: 3,
      style: {
        fontSize: '14px',
        padding: '16px',
        backgroundColor: '#ffffff',
      },
      toastStyle: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '16px',
      },
      toastClassName: 'custom-toast-class',
    },
  },
 
  errors: {
    codes: {
      UNAUTHORIZED: 'unauthorized',
      SESSION_EXPIRED: 'session_expired', 
      VALIDATION_ERROR: 'validation_error',
      SERVER_ERROR: 'server_error',
      NETWORK_ERROR: 'network_error',
      REFRESH_TOKEN_FAILED: 'refresh_token_failed',
      TOKEN_EXPIRED: 'token_expired',
      AUTHENTICATION_FAILED: 'authentication_failed',
      PLAN_VALIDATION_ERROR: 'plan_validation_error',
      ONBOARDING_STEP_INVALID: 'onboarding_step_invalid',
      ONBOARDING_DATA_MISSING: 'onboarding_data_missing',
      ONBOARDING_TRANSITION_INVALID: 'onboarding_transition_invalid'
    },
    messages: {
      default: 'An unexpected error occurred',
      network: 'Unable to connect to server',
      session: 'Your session has expired. Please sign in again.',
      unauthorized: 'You are not authorized to access this resource',
      refresh_failed: 'Unable to refresh authentication. Please sign in again.',
      token_expired: 'Your session has expired. Please sign in again.',
      auth_failed: 'Authentication failed. Please try again.',
      validation_error: 'Please check your input and try again',
      plan_validation_error: 'Invalid plan selection',
      step_validation: 'Unable to proceed. Please complete the current step.',
      transition_error: 'Invalid step transition.',
      initialization_failed: 'Failed to initialize onboarding process.',
    },
  },
};
 
export const getApiUrl = (endpoint) => `${APP_CONFIG.api.baseURL}${endpoint}`;
export const getWebsocketEndpoint = (path) => `${APP_CONFIG.websocket.baseURL}${path}`;
export const getStorageKey = (key) => `${APP_CONFIG.storage.prefix}${key}`;
 
// Validation
if (process.env.NODE_ENV === 'development') {
  const requiredEnvVars = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL', 'NEXT_PUBLIC_APP_URL'];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) console.warn(`Warning: ${envVar} is not set`);
  });
 
  const validateConfig = (config) => {
    const required = [
      'api.baseURL',
      'api.endpoints.auth',
      'api.endpoints.onboarding',
      'websocket.baseURL',
      'routes.auth',
      'onboarding.steps',
      'auth.tokenGracePeriod',
      'security.headers',  
      'onboarding.transitions',
      'onboarding.storage',
      'app.plans',
    ];
 
    required.forEach((path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], config);
      if (value === undefined) throw new Error(`Required config path ${path} is missing`);
    });
  };
 
  validateConfig(APP_CONFIG);
}
 
deepFreeze(APP_CONFIG);
 
export default APP_CONFIG;