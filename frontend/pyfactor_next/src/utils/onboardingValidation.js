import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

const ONBOARDING_STEPS = {
  not_started: {
    next: 'business_info',
    route: '/onboarding/business-info',
    required: ['email']
  },
  business_info: {
    next: 'subscription',
    route: '/onboarding/subscription',
    required: [
      'custom:businessname',
      'custom:businesstype',
      'custom:businessid',
      'custom:businesscountry',
      'custom:legalstructure',
      'custom:datefounded'
    ]
  },
  subscription: {
    next: 'payment',
    route: '/onboarding/payment',
    required: [
      'custom:subplan',
      'custom:subscriptioninterval'
    ]
  },
  payment: {
    next: 'setup',
    route: '/onboarding/setup',
    required: [
      'custom:paymentid',
      'custom:payverified'
    ]
  },
  setup: {
    next: 'complete',
    route: '/onboarding/complete',
    required: []
  },
  complete: {
    next: null,
    route: '/dashboard',
    required: ['custom:setupdone']
  }
};

export async function validateOnboardingStep(step) {
  try {
    // Get current session using v6 API
    const { tokens } = await fetchAuthSession();
    if (!tokens?.idToken) {
      throw new Error('No valid session');
    }

    // Get current user using v6 API
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No current user found');
    }

    const attributes = user.attributes || {};
    const currentStep = attributes['custom:onboarding'] || 'not_started';
    const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true';

    // If setup is done, only allow dashboard access
    if (setupDone && step !== 'complete') {
      return {
        isValid: false,
        redirectTo: '/dashboard',
        reason: 'Setup already completed'
      };
    }

    // Get step configuration
    const stepConfig = ONBOARDING_STEPS[step];
    if (!stepConfig) {
      return {
        isValid: false,
        redirectTo: ONBOARDING_STEPS[currentStep]?.route || '/onboarding/business-info',
        reason: 'Invalid step'
      };
    }

    // Check if user has completed previous steps
    const stepOrder = Object.keys(ONBOARDING_STEPS);
    const currentStepIndex = stepOrder.indexOf(currentStep);
    const requestedStepIndex = stepOrder.indexOf(step);

    if (requestedStepIndex > currentStepIndex + 1) {
      return {
        isValid: false,
        redirectTo: ONBOARDING_STEPS[currentStep]?.route || '/onboarding/business-info',
        reason: 'Step not yet available'
      };
    }

    // Check if user has all required attributes for this step
    const missingAttributes = stepConfig.required.filter(attr => !attributes[attr]);
    if (missingAttributes.length > 0) {
      logger.debug('[OnboardingValidation] Missing attributes:', {
        step,
        missing: missingAttributes
      });

      return {
        isValid: false,
        redirectTo: ONBOARDING_STEPS[currentStep]?.route || '/onboarding/business-info',
        reason: 'Missing required attributes'
      };
    }

    return {
      isValid: true,
      nextStep: stepConfig.next,
      nextRoute: ONBOARDING_STEPS[stepConfig.next]?.route
    };

  } catch (error) {
    logger.error('[OnboardingValidation] Validation failed:', error);
    return {
      isValid: false,
      redirectTo: '/auth/signin',
      reason: 'Authentication error'
    };
  }
}

export function getOnboardingProgress(attributes) {
  try {
    const currentStep = attributes['custom:onboarding'] || 'not_started';
    const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true';

    if (setupDone) {
      return {
        progress: 100,
        currentStep: 'complete',
        nextStep: null,
        nextRoute: '/dashboard'
      };
    }

    const stepOrder = Object.keys(ONBOARDING_STEPS);
    const currentStepIndex = stepOrder.indexOf(currentStep);
    const progress = Math.round((currentStepIndex / (stepOrder.length - 1)) * 100);

    return {
      progress,
      currentStep,
      nextStep: ONBOARDING_STEPS[currentStep]?.next,
      nextRoute: ONBOARDING_STEPS[ONBOARDING_STEPS[currentStep]?.next]?.route
    };

  } catch (error) {
    logger.error('[OnboardingValidation] Progress calculation failed:', error);
    return {
      progress: 0,
      currentStep: 'not_started',
      nextStep: 'business_info',
      nextRoute: '/onboarding/business-info'
    };
  }
}