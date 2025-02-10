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
  PROGRESSION_ERROR: 'PROGRESSION_ERROR',
};

export const PLAN_TYPES = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
};

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
};

export const VALIDATION_DIRECTION = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
};

export const STEP_NAMES = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete',
};

export const STEP_PROGRESSION = {
  [STEP_NAMES.BUSINESS_INFO]: {
    next: ['subscription'],
    prev: [],
  },
  [STEP_NAMES.SUBSCRIPTION]: {
    next: ['payment', 'setup'],
    prev: ['business-info'],
  },
  [STEP_NAMES.PAYMENT]: {
    next: ['setup'],
    prev: ['subscription'],
  },
  [STEP_NAMES.SETUP]: {
    next: ['complete'],
    prev: ['payment', 'subscription'],
  },
};

// Updated to match backend field names
export const STEP_VALIDATION = {
  [STEP_NAMES.BUSINESS_INFO]: (data) => {
    const requiredFields = [
      'business_name',
      'business_type',
      'country',
      'legal_structure',
      'date_founded',
      'first_name',
      'last_name',
    ];

    // Add check for non-empty strings and valid date
    return requiredFields.every((field) => {
      if (field === 'date_founded') {
        const date = new Date(data?.[field]);
        return date instanceof Date && !isNaN(date) && date <= new Date();
      }
      return typeof data?.[field] === 'string' && data[field].trim().length > 0;
    });
  },
  [STEP_NAMES.SUBSCRIPTION]: (data) => {
    const plan = data?.selected_plan || data?.selected_plan;
    return (
      !!plan &&
      Object.values(PLAN_TYPES).includes(plan) &&
      (plan === PLAN_TYPES.FREE || !!data?.billing_cycle)
    );
  },
  [STEP_NAMES.PAYMENT]: (data) => {
    if (data?.selected_plan === PLAN_TYPES.FREE) return true;
    return (
      data?.selected_plan === PLAN_TYPES.PROFESSIONAL && !!data?.payment_method
    );
  },
  [STEP_NAMES.SETUP]: (data) => {
    // Allow setup if plan is selected
    return (
      !!data?.selected_plan && PLAN_TYPES[data.selected_plan.toUpperCase()]
    );
  },
};

export const STEP_METADATA = {
  [STEP_NAMES.BUSINESS_INFO]: {
    title: 'Business Information',
    description: 'Tell us about your business',
    next_step: '/onboarding/subscription',
    stepNumber: 1,
    isRequired: true,
    validationRules: [
      'business_name',
      'business_type',
      'country',
      'legal_structure',
      'date_founded',
      'first_name',
      'last_name',
    ],
    apiEndpoint: '/api/onboarding/business-info',
  },
  [STEP_NAMES.SUBSCRIPTION]: {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    next_step: (selected_plan) =>
      selected_plan === PLAN_TYPES.FREE
        ? '/onboarding/setup'
        : '/onboarding/payment',
    prevStep: '/onboarding/business-info',
    stepNumber: 2,
    isRequired: true,
    validationRules: ['selected_plan', 'billing_cycle'],
    apiEndpoint: '/api/onboarding/subscription/save',
  },
  [STEP_NAMES.PAYMENT]: {
    title: 'Payment Details',
    description: 'Complete your subscription',
    next_step: '/onboarding/setup',
    prevStep: '/onboarding/subscription',
    stepNumber: 3,
    isRequired: false,
    validationRules: ['payment_method'],
    apiEndpoint: '/api/onboarding/payment',
    requiredPlan: PLAN_TYPES.PROFESSIONAL,
  },
  [STEP_NAMES.SETUP]: {
    title: 'Setup Your Workspace',
    description: "We're getting everything ready for you",
    prevStep: (selected_plan) =>
      selected_plan === PLAN_TYPES.PROFESSIONAL
        ? '/onboarding/payment'
        : '/onboarding/subscription',
    stepNumber: 4,
    next_step: '/dashboard',
    isRequired: true,
    validationRules: [],
    apiEndpoint: '/api/onboarding/setup',
    basicSteps: [
      'Initializing workspace',
      'Setting up basic features',
      'Configuring default settings',
      'Completing setup',
    ],
    professionalSteps: [
      'Initializing professional workspace',
      'Setting up advanced features',
      'Configuring custom settings',
      'Setting up API access',
      'Configuring analytics',
      'Completing professional setup',
    ],
    getSteps: (selected_plan) =>
      selected_plan === PLAN_TYPES.PROFESSIONAL
        ? STEP_METADATA[STEP_NAMES.SETUP].professionalSteps
        : STEP_METADATA[STEP_NAMES.SETUP].basicSteps,
  },
  [STEP_NAMES.COMPLETE]: {
    title: 'Setup Complete',
    description: 'Your workspace is ready',
    stepNumber: 5, // After setup which is 4
    isRequired: false,
    validationRules: [], // No validation needed for completion
    apiEndpoint: '/api/onboarding/complete',
    next: [],
    prev: ['setup'],
    next_step: '/dashboard',
  },
};

export const STEP_ROUTES = {
  [STEP_NAMES.BUSINESS_INFO]: '/onboarding/business-info',
  [STEP_NAMES.SUBSCRIPTION]: '/onboarding/subscription',
  [STEP_NAMES.PAYMENT]: '/onboarding/payment',
  [STEP_NAMES.SETUP]: '/onboarding/setup',
  [STEP_NAMES.COMPLETE]: '/dashboard',
};

export const validatePlanAccess = (stepName, selected_plan) => {
  switch (stepName) {
    case STEP_NAMES.PAYMENT:
      if (selected_plan !== PLAN_TYPES.PROFESSIONAL) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'Payment is only available for Professional plan',
        };
      }
      break;
    case STEP_NAMES.SETUP:
      if (!selected_plan) {
        return {
          valid: false,
          error: ERROR_TYPES.INVALID_PLAN,
          message: 'No subscription plan selected',
        };
      }
      break;
  }
  return { valid: true };
};

export const canTransitionToStep = (current_step, targetStep, formData) => {
  try {
    if (!STEP_NAMES[current_step] || !STEP_NAMES[targetStep]) {
      logger.error('Invalid step transition:', {
        from: current_step,
        to: targetStep,
        formData,
      });
      return false;
    }

    // Validate current step data before allowing transition
    const currentValidation = validateStep(current_step, formData);
    if (!currentValidation.valid) {
      return false;
    }

    const progression = STEP_PROGRESSION[current_step];
    if (!progression) return false;

    const direction =
      STEP_METADATA[targetStep].stepNumber >
      STEP_METADATA[current_step].stepNumber
        ? VALIDATION_DIRECTION.FORWARD
        : VALIDATION_DIRECTION.BACKWARD;

    const allowedSteps =
      direction === VALIDATION_DIRECTION.FORWARD
        ? progression.next
        : progression.prev;

    // Special handling for subscription to setup transition
    if (
      current_step === STEP_NAMES.SUBSCRIPTION &&
      targetStep === STEP_NAMES.SETUP &&
      formData?.selected_plan === PLAN_TYPES.FREE
    ) {
      return true;
    }

    return allowedSteps.includes(targetStep);
  } catch (error) {
    logger.error('Step transition validation error:', error);
    return false;
  }
};

export const validateStep = (
  stepName,
  formData,
  direction = VALIDATION_DIRECTION.FORWARD
) => {
  try {
    const validation = STEP_VALIDATION[stepName];
    if (!validation) {
      logger.error(`Invalid step validation: ${stepName}`);
      return {
        valid: false,
        error: ERROR_TYPES.INVALID_STEP,
        message: `Invalid step: ${stepName}`,
      };
    }

    const progression = STEP_PROGRESSION[stepName];
    if (!progression) {
      return {
        valid: false,
        error: ERROR_TYPES.INVALID_STEP,
        message: `Invalid step progression for: ${stepName}`,
      };
    }

    const allowedSteps =
      direction === VALIDATION_DIRECTION.FORWARD
        ? progression.next
        : progression.prev;

    const isValidTier = validatePlanAccess(stepName, formData?.selected_plan);
    if (!isValidTier.valid) {
      return isValidTier;
    }

    const isValid = validation(formData);
    const metadata = STEP_METADATA[stepName];
    const missingFields = metadata.validationRules.filter(
      (rule) => !formData?.[rule]
    );

    const next_step =
      typeof metadata.next_step === 'function'
        ? metadata.next_step(formData?.selected_plan)
        : metadata.next_step;

    return {
      valid: isValid,
      error: isValid ? null : ERROR_TYPES.VALIDATION_FAILED,
      message: isValid ? null : 'Please complete all required fields',
      missingFields,
      allowedSteps,
      stepMetadata: {
        ...metadata,
        next_step,
      },
    };
  } catch (error) {
    logger.error('Validation error:', error);
    return {
      valid: false,
      error: ERROR_TYPES.DATA_ERROR,
      message: 'An error occurred during validation',
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

  return (
    <LoadingStateWithProgress
      message={`Loading Step ${stepNumber}...`}
      showSpinner={true}
    />
  );
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
    // Update path to match your folder structure
    () =>
      import(`@/app/onboarding/components/steps/${stepName}`).catch((error) => {
        logger.error(`Failed to load ${stepName}:`, error);
        throw error;
      }),
    {
      loading: ({ error, retry }) => (
        <DynamicLoadingComponent
          stepNumber={stepNumber}
          error={error}
          retry={retry}
        />
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
  [STEP_NAMES.COMPLETE]: createDynamicStep(STEP_NAMES.COMPLETE),
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
