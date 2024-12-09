// /src/app/onboarding/components/registry.js
import dynamic from 'next/dynamic';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';

// Error types
export const ERROR_TYPES = {
  INVALID_STEP: 'INVALID_STEP',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  API_ERROR: 'API_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// Step names from APP_CONFIG
export const STEP_NAMES = {
  STEP1: APP_CONFIG.onboarding.steps.INITIAL,
  STEP2: APP_CONFIG.onboarding.steps.PLAN,
  STEP3: APP_CONFIG.onboarding.steps.PAYMENT,
  STEP4: APP_CONFIG.onboarding.steps.SETUP,
  COMPLETE: APP_CONFIG.onboarding.steps.COMPLETE
};

// Validation with more specific checks
export const STEP_VALIDATION = {
  [STEP_NAMES.STEP1]: (data) => {
    const requiredFields = ['businessName', 'industry', 'country', 'legalStructure'];
    return requiredFields.every(field => !!data?.[field]);
  },
  [STEP_NAMES.STEP2]: (data) => {
    return !!data?.selectedPlan && 
           ['Basic', 'Professional'].includes(data.selectedPlan) &&
           !!data?.billingCycle && 
           ['monthly', 'annual'].includes(data.billingCycle);
  },
  [STEP_NAMES.STEP3]: (data) => {
    if (data?.selectedPlan === 'Basic') return true;
    return data?.selectedPlan === 'Professional' && !!data?.paymentMethod;
  },
  [STEP_NAMES.STEP4]: (data) => {
    return data?.selectedPlan === 'Basic' || 
           (data?.selectedPlan === 'Professional' && !!data?.paymentMethod);
  }
};

// Metadata using APP_CONFIG endpoints
export const STEP_METADATA = {
  [STEP_NAMES.STEP1]: {
    title: 'Business Information',
    description: 'Tell us about your business',
    nextStep: STEP_NAMES.STEP2.toLowerCase(),
    stepNumber: 1,
    isRequired: true,
    validationRules: ['businessName', 'industry', 'country', 'legalStructure'],
    apiEndpoint: APP_CONFIG.api.endpoints.onboarding.step1
  },
  [STEP_NAMES.STEP2]: {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    nextStep: STEP_NAMES.STEP3.toLowerCase(),
    prevStep: STEP_NAMES.STEP1.toLowerCase(),
    stepNumber: 2,
    isRequired: true,
    validationRules: ['selectedPlan', 'billingCycle'],
    apiEndpoint: APP_CONFIG.api.endpoints.onboarding.step2
  },
  [STEP_NAMES.STEP3]: {
    title: 'Payment Details',
    description: 'Complete your subscription',
    nextStep: STEP_NAMES.STEP4.toLowerCase(),
    prevStep: STEP_NAMES.STEP2.toLowerCase(),
    stepNumber: 3,
    isRequired: false,
    validationRules: ['paymentMethod'],
    apiEndpoint: APP_CONFIG.api.endpoints.onboarding.step3
  },
  [STEP_NAMES.STEP4]: {
    title: 'Setup Your Workspace',
    description: "We're getting everything ready for you",
    prevStep: STEP_NAMES.STEP3.toLowerCase(),
    stepNumber: 4,
    isRequired: true,
    validationRules: [],
    apiEndpoint: APP_CONFIG.api.endpoints.onboarding.step4
  }
};

// Step routes from APP_CONFIG
export const STEP_ROUTES = {
  [STEP_NAMES.STEP1.toLowerCase()]: APP_CONFIG.routes.onboarding.steps.step1,
  [STEP_NAMES.STEP2.toLowerCase()]: APP_CONFIG.routes.onboarding.steps.step2,
  [STEP_NAMES.STEP3.toLowerCase()]: APP_CONFIG.routes.onboarding.steps.step3,
  [STEP_NAMES.STEP4.toLowerCase()]: APP_CONFIG.routes.onboarding.steps.step4,
  [STEP_NAMES.COMPLETE.toLowerCase()]: '/dashboard'
};

// Validation utility with detailed error messages
export const validateStep = (stepName, formData) => {
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
    
    const isValid = validation(formData);
    const metadata = STEP_METADATA[stepName];
    const missingFields = metadata.validationRules.filter(rule => !formData?.[rule]);
    
    return {
      valid: isValid,
      error: isValid ? null : ERROR_TYPES.VALIDATION_FAILED,
      message: isValid ? null : 'Please complete all required fields',
      missingFields,
      stepMetadata: metadata
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

// Loading component with retry logic
const DynamicLoadingComponent = ({ stepNumber, error, retry }) => {
  if (error) {
    logger.error(`Error loading step ${stepNumber}:`, {
      type: ERROR_TYPES.LOAD_FAILED,
      step: stepNumber,
      error
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

// Error boundary wrapper
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

// Dynamic import utility
const createDynamicStep = (stepNumber) => {
  const DynamicComponent = dynamic(
    () => import(`./Step${stepNumber}`).catch(error => {
      logger.error(`Failed to load Step${stepNumber}:`, error);
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
      ssr: false
    }
  );

  return withErrorBoundary(DynamicComponent, stepNumber);
};

// Dynamic imports with error handling
const Step1 = createDynamicStep(1);
const Step2 = createDynamicStep(2);
const Step3 = createDynamicStep(3);
const Step4 = createDynamicStep(4);

// Component mapping
export const STEP_COMPONENTS = {
  [STEP_NAMES.STEP1]: Step1,
  [STEP_NAMES.STEP2]: Step2,
  [STEP_NAMES.STEP3]: Step3,
  [STEP_NAMES.STEP4]: Step4
};

// Utility function for getting components
export const getStepComponent = (stepName, formData) => {
  const component = STEP_COMPONENTS[stepName];
  if (!component) {
    logger.error(`Invalid step name: ${stepName}`, {
      type: ERROR_TYPES.INVALID_STEP
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

// Development utilities
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  DynamicLoadingComponent.propTypes = {
    stepNumber: PropTypes.number.isRequired,
    error: PropTypes.shape({
      message: PropTypes.string,
      type: PropTypes.oneOf(Object.values(ERROR_TYPES))
    }),
    retry: PropTypes.func.isRequired
  };

  Object.values(STEP_METADATA).forEach(metadata => {
    PropTypes.checkPropTypes({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      stepNumber: PropTypes.number.isRequired,
      isRequired: PropTypes.bool.isRequired,
      validationRules: PropTypes.arrayOf(PropTypes.string).isRequired,
      apiEndpoint: PropTypes.string
    }, metadata, 'prop', 'StepMetadata');
  });
}