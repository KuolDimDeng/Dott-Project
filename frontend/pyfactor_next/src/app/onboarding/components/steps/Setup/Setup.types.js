// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/Setup.types.js
export const setupPropTypes = {
    metadata: {
      title: 'string',
      description: 'string',
      nextStep: 'string?',
      prevStep: 'string?'
    }
  };
  
  export const setupStates = {
    INITIALIZING: 'initializing',
    CONNECTING: 'connecting',
    PROCESSING: 'processing',
    COMPLETE: 'complete',
    ERROR: 'error'
  };
  
  // Add tier types
  export const tierTypes = {
    FREE: 'free',
    PROFESSIONAL: 'professional'
  };
  
  // Add tier-specific slideshow configurations
  export const slideShowConfig = {
    INTERVAL: 5000,
    IMAGES: {
      free: [
        '/static/images/setup-slide-1.jpg',
        '/static/images/setup-slide-2.jpg',
        '/static/images/setup-slide-3.jpg',
      ],
      professional: [
        '/static/images/pro-setup-slide-1.jpg',
        '/static/images/pro-setup-slide-2.jpg',
        '/static/images/pro-setup-slide-3.jpg',
        '/static/images/pro-setup-slide-4.jpg',
      ]
    }
  };
  
  // Add tier-specific websocket configurations
  export const wsConfig = {
    free: {
      RECONNECT_ATTEMPTS: 3,
      RECONNECT_DELAY: 2000,
      CONNECTION_TIMEOUT: 10000
    },
    professional: {
      RECONNECT_ATTEMPTS: 5, // More attempts for professional
      RECONNECT_DELAY: 1000, // Faster reconnect for professional
      CONNECTION_TIMEOUT: 15000 // Longer timeout for professional
    }
  };
  
  // Add tier-specific setup steps
  export const setupSteps = {
    free: [
      'Initializing workspace',
      'Setting up basic features',
      'Configuring default settings',
      'Completing setup'
    ],
    professional: [
      'Initializing professional workspace',
      'Setting up advanced features',
      'Configuring custom settings',
      'Setting up API access',
      'Configuring analytics',
      'Completing professional setup'
    ]
  };
  
  // Add validation schemas
  export const setupValidation = {
    tier: {
      required: 'Tier selection is required',
      validate: (value) => 
        ['free', 'professional'].includes(value) || 
        'Invalid tier selected'
    }
  };

  // Add tier-specific timeout configurations
export const timeoutConfig = {
    free: {
      SETUP_TIMEOUT: 300000, // 5 minutes
      HEALTH_CHECK_INTERVAL: 10000 // 10 seconds
    },
    professional: {
      SETUP_TIMEOUT: 600000, // 10 minutes
      HEALTH_CHECK_INTERVAL: 5000 // 5 seconds
    }
  };
  
// Add tier-specific error messages
export const errorMessages = {
    free: {
      SETUP_FAILED: 'Basic setup failed. Please try again.',
      CONNECTION_FAILED: 'Connection lost during basic setup.',
      TIMEOUT: 'Basic setup timed out.'
    },
    professional: {
      SETUP_FAILED: 'Professional setup failed. Please contact support.',
      CONNECTION_FAILED: 'Connection lost during professional setup.',
      TIMEOUT: 'Professional setup timed out.'
    }
  };
  
  // Add tier-specific setup completion criteria
  export const setupCompletionConfig = {
    free: {
      REQUIRED_STEPS: ['workspace', 'features', 'settings'],
      MIN_PROGRESS: 100
    },
    professional: {
      REQUIRED_STEPS: ['workspace', 'features', 'settings', 'api', 'analytics'],
      MIN_PROGRESS: 100
    }
  };
