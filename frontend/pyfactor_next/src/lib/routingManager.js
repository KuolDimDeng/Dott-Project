// routingManager.js
import { logger } from '@/utils/logger';

export class RoutingManager {
  static ROUTES = {
    HOME: '/',
    AUTH: {
      SIGNIN: '/auth/signin',
      SIGNUP: '/auth/signup',
      CALLBACK: '/api/auth/callback/google',
      ERROR: '/auth/error',
      VERIFY: '/auth/verify',
      SIGNOUT: '/auth/signout'
    },
    ONBOARDING: {
      BUSINESS_INFO: '/onboarding',
      SUBSCRIPTION: '/onboarding',
      PAYMENT: '/onboarding',
      SETUP: '/onboarding',
      DATABASE: '/onboarding',
    },
    DJANGO: {
      TOKEN_VERIFY: '/api/onboarding/token/verify',
      TOKEN_EXCHANGE: '/api/onboarding/token-exchange',
      TOKEN_REFRESH: '/token/refresh/',
    },
    DASHBOARD: {
      FREE: '/dashboard',
      PRO: '/pro/dashboard'
    },
    API: {
      AUTH: '/api/auth',
      ONBOARDING: '/api/onboarding',
      ENDPOINTS: {
        HEALTH: '/api/health',
        BUSINESS_INFO: '/api/onboarding/business-info',
        TOKEN_REFRESH: '/api/onboarding/auth/token/refresh',
        SYNC: '/api/onboarding/sync',
        PROGRESS: '/api/onboarding/progress',
        SUBSCRIPTION: {
          VALIDATE: '/api/onboarding/subscription/validate',
          SAVE: '/api/onboarding/subscription/save',
          STATUS: '/api/onboarding/subscription/status'
        },
        SETUP: {
          INITIALIZE: '/api/onboarding/setup/initialize',
          STATUS: '/api/onboarding/setup/status',
          COMPLETE: '/api/onboarding/setup/complete'
        }
      }
    }
  };

  static ONBOARDING_STEPS = {
    'business-info': {
      next: 'subscription',
      allowed: ['business-info', 'subscription'],
      required_fields: [
        'business_name',
        'business_type',
        'country',
        'legal_structure',
        'date_founded',
        'first_name',
        'last_name'
      ]
    },
    'subscription': {
      next: (tier) => tier === 'free' ? 'setup' : 'payment',
      allowed: ['subscription', 'business-info', 'payment', 'setup'],
      required_fields: ['selected_plan', 'billing_cycle']
    },
    'payment': {
      next: 'setup',
      allowed: ['payment', 'subscription', 'setup'],
      required_fields: ['payment_method_id', 'payment_intent_id']
    },
    'setup': {
      next: 'dashboard',
      allowed: ['setup', 'payment', 'subscription', 'dashboard'],
      required_fields: []
    },
    'complete': {
      next: 'dashboard',
      allowed: ['dashboard']
    }
  };

  static TIERS = {
    FREE: 'free',
    PROFESSIONAL: 'professional'
  };

  static isValidTier(tier) {
    return Object.values(this.TIERS).includes(tier);
  }

  static getDashboardPath(tier) {
    return tier === this.TIERS.PROFESSIONAL ? 
      this.ROUTES.DASHBOARD.PRO : 
      this.ROUTES.DASHBOARD.FREE;
  }

  static canAccessOnboardingStep(currentStatus, requestedStep, formData = {}, tier = null) {
    try {
      logger.debug('Validating step access:', {
        currentStatus,
        requestedStep,
        hasFormData: !!formData,
        tier
      });

      // Special cases handling
      if (requestedStep === 'business-info') return true;
      
      if (requestedStep === 'subscription' && 
          ['business-info', 'subscription'].includes(currentStatus)) {
        return true;
      }

      const stepConfig = this.ONBOARDING_STEPS[currentStatus];
      if (!stepConfig) {
        logger.warn('Invalid step configuration:', {
          currentStatus,
          requestedStep
        });
        return false;
      }

      // Prevent skipping steps
      const currentStepIndex = Object.keys(this.ONBOARDING_STEPS).indexOf(currentStatus);
      const requestedStepIndex = Object.keys(this.ONBOARDING_STEPS).indexOf(requestedStep);
      
      if (requestedStepIndex > currentStepIndex + 1) {
        logger.warn('Attempted to skip steps:', {
          currentStatus,
          requestedStep,
          currentIndex: currentStepIndex,
          requestedIndex: requestedStepIndex
        });
        return false;
      }

      // Validate required fields
      if (stepConfig.required_fields?.length > 0) {
        const missingFields = stepConfig.required_fields.filter(
          field => !formData[field]
        );

        if (missingFields.length > 0) {
          logger.warn('Missing required fields:', {
            currentStatus,
            missingFields,
            formData: Object.keys(formData)
          });
          return false;
        }
      }

      // Handle tier-based routing
      if (currentStatus === 'subscription' && tier) {
        const next_step = stepConfig.next(tier);
        if (requestedStep === next_step) return true;
      }

      const canAccess = stepConfig.allowed.includes(requestedStep);
      
      logger.debug('Step access result:', {
        currentStatus,
        requestedStep,
        tier,
        canAccess,
        allowedSteps: stepConfig.allowed
      });

      return canAccess;

    } catch (error) {
      logger.error('Step access validation failed:', {
        error: error.message,
        currentStatus,
        requestedStep,
        tier
      });
      return false;
    }
  }

  static handleInitialRoute(pathname, session, onboardingStatus) {
    try {
      logger.debug('Processing initial route:', {
        pathname,
        hasSession: !!session,
        onboardingStatus,
        status: session?.user?.onboarding
      });

      // Special cases
      if (this.isCallbackRoute(pathname) || 
          pathname === this.ROUTES.HOME ||
          pathname === this.ROUTES.ONBOARDING.BUSINESS_INFO) {
        return pathname;
      }

      // Handle unauthenticated access
      if (!session) {
        return this.isPublicRoute(pathname) ? 
          pathname : 
          `${this.ROUTES.AUTH.SIGNIN}?callbackUrl=${encodeURIComponent(pathname)}`;
      }

      const status = onboardingStatus || 'business-info';
      const tier = session.user?.selected_plan;

      // Handle completed onboarding
      if (status === 'complete') {
        return this.getDashboardPath(tier);
      }

      // Validate onboarding step access
      if (pathname.startsWith('/onboarding/')) {
        const requestedStep = pathname.split('/').pop();
        return this.canAccessOnboardingStep(status, requestedStep, {}, tier) ?
          pathname :
          `/onboarding/${status}`;
      }

      return pathname;

    } catch (error) {
      logger.error('Route handling failed:', {
        error: error.message,
        pathname,
        onboardingStatus,
        status: session?.user?.onboarding
      });
      return this.ROUTES.AUTH.ERROR;
    }
  }


  static getNextStep(currentStatus, tier = null) {
    try {
      const stepConfig = this.ONBOARDING_STEPS[currentStatus];
      if (!stepConfig) {
        logger.warn('Invalid current step:', { currentStatus });
        return 'business-info';
      }

      const next_step = typeof stepConfig.next === 'function' ?
        stepConfig.next(tier) :
        stepConfig.next;

      logger.debug('Next step calculation:', {
        currentStatus,
        next_step,
        tier
      });

      return next_step;

    } catch (error) {
      logger.error('Next step calculation failed:', {
        error: error.message,
        currentStatus,
        tier
      });
      return 'business-info';
    }
  }
  static isPublicRoute(pathname) {
    const publicRoutes = [
      this.ROUTES.HOME,
      this.ROUTES.AUTH.SIGNIN,
      this.ROUTES.AUTH.SIGNUP,
      this.ROUTES.AUTH.CALLBACK,
      this.ROUTES.AUTH.VERIFY,
      this.ROUTES.AUTH.ERROR
    ];
    return publicRoutes.includes(pathname);
  }

  static isCallbackRoute(pathname) {
    return pathname === this.ROUTES.AUTH.CALLBACK;
  }
}