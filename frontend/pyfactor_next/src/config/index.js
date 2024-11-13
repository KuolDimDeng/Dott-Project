// src/config/index.js

// Move helper functions to top
const getWebSocketUrl = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8000`;
  };

  // Add helper for deep freezing objects
const deepFreeze = (obj) => {
    Object.keys(obj).forEach(prop => {
      if (typeof obj[prop] === 'object' && obj[prop] !== null) {
        deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  };
  
  
  export const APP_CONFIG = {
    api: {
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
        timeout: 40000,
        endpoints: {
          auth: {
            google: '/api/onboarding/token-exchange/',
            refresh: '/api/token/refresh/',
            verify: '/api/token/verify/',
            session: '/api/auth/session/',
          },
          onboarding: {
            status: '/api/onboarding/status/',
            step1: '/api/onboarding/save-step1/',
            step2: '/api/onboarding/save-step2/',
            step3: '/api/onboarding/save-step3/',
            step4: '/api/onboarding/save-step4/',
            complete: '/api/onboarding/complete/',
            taskStatus: (taskId) => `/api/onboarding/task-status/${taskId}/`
          }
        }
      },
  
    // Add type info for better intellisense
    /** @type {Record<string, (userId: string, token: string) => string>} */
    websocket: {
        baseURL: process.env.NEXT_PUBLIC_WS_URL || getWebSocketUrl(),
        reconnectAttempts: 3,
        reconnectInterval: 1000,
        endpoints: {
        onboarding: (userId, token) => `/ws/onboarding/${userId}/?token=${token}`
        }
    },
    
    app: {
      name: 'Dott',
      title: 'Dott - Small Business Platform',
      description: 'Streamline your business operations with Pyfactor',
      keywords: 'business management, finance, operations',
      favicon: '/static/images/favicon.png',
      logo: '/static/images/Pyfactor.png',
      version: '1.0.0',
      env: process.env.NODE_ENV,
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  
    routes: {
      public: ['/'],
      auth: {
        paths: ['/auth'],
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
        verifyRequest: '/auth/verify-request',
        callback: '/api/auth/callback'
      },
      static: [
        '/static',
        '/_next',
        '/favicon.ico',
        '/assets',
        '/images'
      ],
      onboarding: {
        paths: ['/onboarding'],
        root: '/onboarding',
        success: '/onboarding/success',
        error: '/onboarding/error',
        steps: {
          step1: '/onboarding/step1',
          step2: '/onboarding/step2',
          step3: '/onboarding/step3',
          step4: '/onboarding/step4',
        }
      },
      protected: [
        '/dashboard',
        '/settings',
        '/profile'
      ]
    },
  
    onboarding: {
      steps: {
        INITIAL: 'step1',
        PLAN: 'step2',
        PAYMENT: 'step3',
        SETUP: 'step4',
        COMPLETE: 'complete'
      },
      storage: {
        key: 'onboarding_data',
        version: '1.0'
      },
      queryKeys: {
        status: 'onboardingStatus',
        steps: 'onboardingSteps',
        progress: 'onboardingProgress'
      }
    },
  
    auth: {
      tokenGracePeriod: 5 * 60 * 1000, // 5 minutes
      sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
      refreshInterval: 60 * 60, // 1 hour
      providers: ['google', 'apple']
    },
  
    security: {
      headers: {
        'X-DNS-Prefetch-Control': 'on',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'X-XSS-Protection': '1; mode=block'
      },
      csrf: true,
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    },
  
    validation: {
      businessName: {
        minLength: 2,
        maxLength: 100
      },
      password: {
        minLength: 8,
        requireNumbers: true,
        requireSpecialChars: true
      }
    },
  
    storage: {
      prefix: 'app_',
      version: '1.0.0',
      keys: {
        auth: 'auth_state',
        theme: 'theme_preference',
        onboarding: 'onboarding_progress'
      }
    },
  
    ui: {
      theme: 'light',
      animation: {
        duration: 300
      },
      toast: {
        duration: 5000,
        position: 'top-right',
        limit: 3,
        style: {
          fontSize: '14px',
          padding: '16px',
        },
        toastStyle: {
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '16px',
        },
        toastClassName: "custom-toast-class"
      }
    },
  
    errors: {
      codes: {
        UNAUTHORIZED: 'unauthorized',
        SESSION_EXPIRED: 'session_expired',
        VALIDATION_ERROR: 'validation_error',
        SERVER_ERROR: 'server_error',
        NETWORK_ERROR: 'network_error'
      },
      messages: {
        default: 'An unexpected error occurred',
        network: 'Unable to connect to server',
        session: 'Your session has expired',
        unauthorized: 'You are not authorized to access this resource'
      }
    }
  };
  
// Add helper functions
export const getApiUrl = (endpoint) => `${APP_CONFIG.api.baseURL}${endpoint}`;
export const getWebsocketEndpoint = (path) => `${APP_CONFIG.websocket.baseURL}${path}`;
export const getStorageKey = (key) => `${APP_CONFIG.storage.prefix}${key}`;

// Deep freeze all nested objects
deepFreeze(APP_CONFIG);

// Type checking in development
if (process.env.NODE_ENV === 'development') {
  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_WS_URL',
    'NEXT_PUBLIC_APP_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} is not set`);
    }
  });

  // Validate config structure
  const validateConfig = (config) => {
    const required = [
      'api.baseURL',
      'api.endpoints.auth',
      'api.endpoints.onboarding',
      'websocket.baseURL',
      'routes.auth',
      'onboarding.steps',
      'auth.tokenGracePeriod',
      'security.headers'
    ];

    required.forEach(path => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], config);
      if (value === undefined) {
        throw new Error(`Required config path ${path} is missing`);
      }
    });
  };

  validateConfig(APP_CONFIG);
}

export { APP_CONFIG as default };