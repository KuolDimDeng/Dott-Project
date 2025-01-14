// /src/app/onboarding/components/registry.js
import dynamic from 'next/dynamic';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';

export const ERROR_TYPES = {
  INVALID_STEP: 'INVALID_STEP',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  API_ERROR: 'API_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_TIER: 'INVALID_TIER',
  PROGRESSION_ERROR: 'PROGRESSION_ERROR'
};

export const PLAN_TYPES = {
  FREE: 'free',
  PROFESSIONAL: 'professional'
};

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual'
};


export const VALIDATION_DIRECTION = {
  FORWARD: 'forward',
  BACKWARD: 'backward'
};

export const STEP_NAMES = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

export const STEP_PROGRESSION = {
  [STEP_NAMES.BUSINESS_INFO]: {
    next: ['subscription'],
    prev: []
  },
  [STEP_NAMES.SUBSCRIPTION]: {
    next: ['payment', 'setup'],
    prev: ['business-info']
  },
  [STEP_NAMES.PAYMENT]: {
    next: ['setup'],
    prev: ['subscription']
  },
  [STEP_NAMES.SETUP]: {
    next: ['complete'],
    prev: ['payment', 'subscription']
  }
};

export const STEP_VALIDATION = {
  [STEP_NAMES.BUSINESS_INFO]: (data) => {
    const requiredFields = ['businessName', 'industry', 'country', 'legalStructure'];
    return requiredFields.every((field) => !!data?.[field]);
  },
  [STEP_NAMES.SUBSCRIPTION]: (data) => {
    return (
      !!data?.selectedPlan &&
      Object.values(PLAN_TYPES).includes(data.selectedPlan) &&
      !!data?.billingCycle &&
      Object.values(BILLING_CYCLES).includes(data.billingCycle)
    );
  },
  [STEP_NAMES.PAYMENT]: (data) => {
    if (data?.selectedPlan === PLAN_TYPES.FREE) return true;
    return data?.selectedPlan === PLAN_TYPES.PROFESSIONAL && !!data?.paymentMethod;
  },
  [STEP_NAMES.SETUP]: (data) => {
    return (
      data?.selectedPlan === PLAN_TYPES.FREE ||
      (data?.selectedPlan === PLAN_TYPES.PROFESSIONAL && !!data?.paymentMethod)
    );
  },
};


export const STEP_METADATA = {
  [STEP_NAMES.BUSINESS_INFO]: {
    title: 'Business Information',
    description: 'Tell us about your business',
    nextStep: '/onboarding/subscription',
    stepNumber: 1,
    isRequired: true,
    validationRules: ['businessName', 'industry', 'country', 'legalStructure'],
    apiEndpoint: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/business-info/`,
  },
  [STEP_NAMES.SUBSCRIPTION]: {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    nextStep: (selectedPlan) => selectedPlan === PLAN_TYPES.FREE ? '/onboarding/setup' : '/onboarding/payment',
    prevStep: '/onboarding/business-info',
    stepNumber: 2,
    isRequired: true,
    validationRules: ['selectedPlan', 'billingCycle'],
    apiEndpoint: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/subscription/`,
  },
  [STEP_NAMES.PAYMENT]: {
    title: 'Payment Details',
    description: 'Complete your subscription',
    nextStep: '/onboarding/setup',
    prevStep: '/onboarding/subscription',
    stepNumber: 3,
    isRequired: false,
    validationRules: ['paymentMethod'],
    apiEndpoint: `${APP_CONFIG.api.base}/onboarding/payment`,
    requiredPlan: PLAN_TYPES.PROFESSIONAL
  },
  [STEP_NAMES.SETUP]: {
    title: 'Setup Your Workspace',
    description: "We're getting everything ready for you",
    prevStep: (selectedPlan) => selectedPlan === PLAN_TYPES.PROFESSIONAL ? '/onboarding/payment' : '/onboarding/subscription',
    stepNumber: 4,
    isRequired: true,
    validationRules: [],
    apiEndpoint: `${APP_CONFIG.api.base}/onboarding/setup`,
    basicSteps: [
      'Initializing workspace',
      'Setting up basic features',
      'Configuring default settings',
      'Completing setup'
    ],
    professionalSteps: [
      'Initializing professional workspace',
      'Setting up advanced features',
      'Configuring custom settings',
      'Setting up API access',
      'Configuring analytics',
      'Completing professional setup'
    ],
    getSteps: (selectedPlan) => selectedPlan === PLAN_TYPES.PROFESSIONAL ? 
      STEP_METADATA[STEP_NAMES.SETUP].professionalSteps : 
      STEP_METADATA[STEP_NAMES.SETUP].basicSteps
  },
};


export const STEP_ROUTES = {
  [STEP_NAMES.BUSINESS_INFO]: '/onboarding/business-info',
  [STEP_NAMES.SUBSCRIPTION]: '/onboarding/subscription',
  [STEP_NAMES.PAYMENT]: '/onboarding/payment',
  [STEP_NAMES.SETUP]: '/onboarding/setup',
  [STEP_NAMES.COMPLETE]: '/dashboard',
};

export const validatePlanAccess = (stepName, selectedPlan) => {
  switch (stepName) {
    case STEP_NAMES.PAYMENT:
      if (selectedPlan !== PLAN_TYPES.PROFESSIONAL) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'Payment is only available for Professional plan'
        };
      }
      break;
    case STEP_NAMES.SETUP:
      if (!selectedPlan) {
        return {
          valid: false, 
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'No subscription plan selected'
        };
      }
      break;
  }
  return { valid: true };
};


export const canTransitionToStep = (currentStep, targetStep, selectedPlan) => {
  try {
    if (!STEP_NAMES[currentStep] || !STEP_NAMES[targetStep]) {
      logger.error('Invalid step transition:', {
        from: currentStep,
        to: targetStep,
        selectedPlan
      });
      return false;
    }

    const progression = STEP_PROGRESSION[currentStep];
    if (!progression) return false;

    const direction = STEP_METADATA[targetStep].stepNumber > STEP_METADATA[currentStep].stepNumber
      ? VALIDATION_DIRECTION.FORWARD
      : VALIDATION_DIRECTION.BACKWARD;

    const allowedSteps = direction === VALIDATION_DIRECTION.FORWARD
      ? progression.next
      : progression.prev;

    if (targetStep === STEP_NAMES.PAYMENT && selectedPlan !== PLAN_TYPES.PROFESSIONAL) {
      return false;
    }

    return allowedSteps.includes(targetStep);
  } catch (error) {
    logger.error('Step transition validation error:', error);
    return false;
  }
};

export const validateStep = (stepName, formData, direction = VALIDATION_DIRECTION.FORWARD) => {
  try {
    const validation = STEP_VALIDATION[stepName];
    if (!validation) {
      logger.error(`Invalid step validation: ${stepName}`);
      return {
        valid: false,
        error: ERROR_TYPES.INVALID_STEP,
        message: `Invalid step: ${stepName}`
      };
    }

    const progression = STEP_PROGRESSION[stepName];
    if (!progression) {
      return {
        valid: false,
        error: ERROR_TYPES.INVALID_STEP,
        message: `Invalid step progression for: ${stepName}`
      };
    }

    const allowedSteps = direction === VALIDATION_DIRECTION.FORWARD 
      ? progression.next 
      : progression.prev;

    const isValidTier = validatePlanAccess(stepName, formData?.selectedPlan);
    if (!isValidTier.valid) {
      return isValidTier;
    }

    const isValid = validation(formData);
    const metadata = STEP_METADATA[stepName];
    const missingFields = metadata.validationRules.filter((rule) => !formData?.[rule]);

    const nextStep = typeof metadata.nextStep === 'function' 
      ? metadata.nextStep(formData?.selectedPlan)
      : metadata.nextStep;

    return {
      valid: isValid,
      error: isValid ? null : ERROR_TYPES.VALIDATION_FAILED,
      message: isValid ? null : 'Please complete all required fields',
      missingFields,
      allowedSteps,
      stepMetadata: {
        ...metadata,
        nextStep
      }
    };
  } catch (error) {
    logger.error('Validation error:', error);
    return {
      valid: false,
      error: ERROR_TYPES.DATA_ERROR,
      message: 'An error occurred during validation'
    };
  }
};

const DynamicLoadingComponent = ({ stepNumber, error, retry }) => {
  if (error) {
    logger.error(`Error loading step ${stepNumber}:`, {
      type: ERROR_TYPES.LOAD_FAILED,
      step: stepNumber,
      error,
    });
    return (
      <ErrorStep
        error={error}
        stepNumber={stepNumber}
        onRetry={retry}
        type={ERROR_TYPES.LOAD_FAILED}
        message="Failed to load step component"
      />
    );
  }

  return <LoadingStateWithProgress message={`Loading Step ${stepNumber}...`} showSpinner={true} />;
};

const withErrorBoundary = (Component, stepNumber) => {
  return function ErrorBoundaryWrapper(props) {
    return (
      <OnboardingErrorBoundary
        stepNumber={stepNumber}
        onError={(error) => {
          logger.error(`Step ${stepNumber} error:`, error);
        }}
      >
        <Component {...props} />
      </OnboardingErrorBoundary>
    );
  };
};

const createDynamicStep = (stepName) => {
  const stepNumber = STEP_METADATA[stepName].stepNumber;
  
  const DynamicComponent = dynamic(
    () => import(`./steps/${stepName}`).catch((error) => {
      logger.error(`Failed to load ${stepName}:`, error);
      throw error;
    }),
    {
      loading: ({ error, retry }) => (
        <DynamicLoadingComponent stepNumber={stepNumber} error={error} retry={retry} />
      ),
      ssr: false,
    }
  );

  return withErrorBoundary(DynamicComponent, stepNumber);
};

export const STEP_COMPONENTS = {
  [STEP_NAMES.BUSINESS_INFO]: createDynamicStep(STEP_NAMES.BUSINESS_INFO),
  [STEP_NAMES.SUBSCRIPTION]: createDynamicStep(STEP_NAMES.SUBSCRIPTION),
  [STEP_NAMES.PAYMENT]: createDynamicStep(STEP_NAMES.PAYMENT),
  [STEP_NAMES.SETUP]: createDynamicStep(STEP_NAMES.SETUP),
};

export const getStepComponent = (stepName, formData) => {
  const component = STEP_COMPONENTS[stepName];
  if (!component) {
    logger.error(`Invalid step name: ${stepName}`, {
      type: ERROR_TYPES.INVALID_STEP,
    });
    return null;
  }

  const validationResult = validateStep(stepName, formData);
  if (!validationResult.valid) {
    logger.warn(`Validation failed for step ${stepName}:`, validationResult);
    return null;
  }

  return component;
};

if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  DynamicLoadingComponent.propTypes = {
    stepNumber: PropTypes.number.isRequired,
    error: PropTypes.shape({
      message: PropTypes.string,
      type: PropTypes.oneOf(Object.values(ERROR_TYPES)),
    }),
    retry: PropTypes.func.isRequired,
  };

  Object.values(STEP_METADATA).forEach((metadata) => {
    PropTypes.checkPropTypes(
      {
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        stepNumber: PropTypes.number.isRequired,
        isRequired: PropTypes.bool.isRequired,
        validationRules: PropTypes.arrayOf(PropTypes.string).isRequired,
        apiEndpoint: PropTypes.string,
      },
      metadata,
      'prop',
      'StepMetadata'
    );
  });
}

// At the end of registry.js, add:
export const validateTierAccess = validatePlanAccess; // Backwards compatibility