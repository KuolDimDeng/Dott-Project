// src/app/onboarding/validation/stepValidation.js
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { STEPS, STEP_ORDER, VALIDATION_REASONS } from './constants';

// Validation utilities
function validateTierRequirements(step, selectedPlan) {
  // Payment step is only for professional tier
  if (step === STEPS.PAYMENT) {
    if (selectedPlan !== 'professional') {
      return {
        isValid: false,
        allowedSteps: [STEPS.SETUP],
        reason: VALIDATION_REASONS.TIER_RESTRICTION,
        error: 'Payment step is only available for professional tier'
      };
    }
  }

  // Setup step is allowed for all tiers
  if (step === STEPS.SETUP) {
    return {
      isValid: true,
      allowedSteps: [STEPS.SETUP],
      reason: VALIDATION_REASONS.VALID
    };
  }

  return {
    isValid: true,
    allowedSteps: STEP_ORDER
  };
}

export function validateStep(context) {
  const { currentStep, requestedStep, formData, metadata } = context;
  // Get selectedPlan from either formData or context
  const selectedPlan = formData?.selectedPlan || context?.selectedPlan || context?.tier;

  logger.debug('Step validation started:', {
    currentStep,
    requestedStep,
    selectedPlan,
    formData,
    metadata,
    type: 'step_validation_start'
  });

  // Handle initial state or business-info access
  if (!currentStep || requestedStep === STEPS.BUSINESS_INFO) {
    return {
      isValid: true,
      allowedSteps: [STEPS.BUSINESS_INFO],
      reason: VALIDATION_REASONS.INITIAL
    };
  }

  // Allow subscription access from business-info
  if (requestedStep === STEPS.SUBSCRIPTION && 
      (currentStep === STEPS.BUSINESS_INFO || currentStep === STEPS.SUBSCRIPTION)) {
    return {
      isValid: true,
      allowedSteps: [STEPS.SUBSCRIPTION],
      reason: VALIDATION_REASONS.VALID
    };
  }

  try {
    // Validate steps exist
    if (!STEP_ORDER.includes(requestedStep)) {
      logger.error('Invalid step requested:', { requestedStep });
      return {
        isValid: false,
        allowedSteps: [currentStep],
        reason: VALIDATION_REASONS.INVALID,
        error: 'Invalid step requested'
      };
    }

    // Special handling for subscription -> setup transition for free tier
    if (currentStep === STEPS.SUBSCRIPTION && requestedStep === STEPS.SETUP && selectedPlan === 'free') {
      logger.debug('Allowing free tier setup access', {
        currentStep,
        requestedStep,
        selectedPlan
      });
      return {
        isValid: true,
        allowedSteps: [STEPS.SETUP],
        reason: VALIDATION_REASONS.FREE_TIER_SETUP
      };
    }

    // Special handling for subscription -> payment for professional tier
    if (currentStep === STEPS.SUBSCRIPTION && requestedStep === STEPS.PAYMENT && selectedPlan === 'professional') {
      logger.debug('Allowing subscription to payment access', {
        currentStep,
        requestedStep,
        selectedPlan
      });
      return {
        isValid: true,
        allowedSteps: [STEPS.PAYMENT],
        reason: VALIDATION_REASONS.PROFESSIONAL_TIER_PAYMENT
      };
    }

    // Special handling for payment -> setup for professional tier
    if (currentStep === STEPS.PAYMENT && requestedStep === STEPS.SETUP && selectedPlan === 'professional') {
      logger.debug('Allowing payment to setup access', {
        currentStep,
        requestedStep,
        selectedPlan
      });
      return {
        isValid: true,
        allowedSteps: [STEPS.SETUP],
        reason: VALIDATION_REASONS.PROFESSIONAL_TIER_SETUP
      };
    }

    const currentIdx = STEP_ORDER.indexOf(currentStep);
    const requestedIdx = STEP_ORDER.indexOf(requestedStep);

    // Allow backward navigation only to the immediate previous step
    if (requestedIdx < currentIdx && requestedIdx === currentIdx - 1) {
      return {
        isValid: true,
        allowedSteps: [STEP_ORDER[requestedIdx]],
        reason: VALIDATION_REASONS.VALID
      };
    }

    // Prevent skipping steps (except for setup after subscription for free tier)
    if (requestedIdx > currentIdx + 1) {
      return {
        isValid: false,
        allowedSteps: [currentStep],
        reason: VALIDATION_REASONS.INVALID_TRANSITION,
        error: 'Cannot skip steps'
      };
    }

    // Add tier-specific validation
    const tierValidation = validateTierRequirements(requestedStep, selectedPlan);
    if (!tierValidation.isValid) {
      return tierValidation;
    }

    // Calculate allowed next steps based on selectedPlan
    let allowedSteps = [currentStep];
    if (selectedPlan === 'free' && currentStep === STEPS.SUBSCRIPTION) {
      allowedSteps.push(STEPS.SETUP);
    } else if (selectedPlan === 'professional') {
      if (currentStep === STEPS.SUBSCRIPTION) {
        allowedSteps.push(STEPS.PAYMENT);
      } else if (currentStep === STEPS.PAYMENT) {
        allowedSteps.push(STEPS.SETUP);
      }
    } else {
      allowedSteps.push(STEP_ORDER[currentIdx + 1]);
    }

    // Determine if step transition is valid
    const isValid = allowedSteps.includes(requestedStep);

    logger.debug('Step validation result:', {
      currentStep,
      requestedStep,
      isValid,
      allowedSteps,
      selectedPlan,
      type: 'step_validation_result'
    });

    return {
      isValid,
      allowedSteps,
      reason: isValid ? VALIDATION_REASONS.VALID : VALIDATION_REASONS.INVALID_TRANSITION
    };

  } catch (error) {
    logger.error('Step validation error:', {
      error: error.message,
      context,
      type: 'step_validation_error'
    });
    return {
      isValid: false,
      allowedSteps: [currentStep],
      reason: VALIDATION_REASONS.ERROR,
      error: error.message || 'Unknown validation error'
    };
  }
}

export class StepValidator {
  static async validateStepTransition(context) {
    const operationId = generateRequestId();
    
    logger.debug('Starting step validation:', {
      operationId,
      ...context,
      type: 'step_validation_operation'
    });

    try {
      const result = validateStep(context);

      logger.debug('Step validation completed:', {
        operationId,
        result,
        type: 'step_validation_complete'
      });

      return result;

    } catch (error) {
      logger.error('Step validation failed:', {
        operationId,
        error: error.message,
        context,
        type: 'step_validation_failure'
      });
      throw error;
    }
  }

  static canNavigate(currentStep, targetStep, selectedPlan) {
    const result = validateStep({
      currentStep,
      requestedStep: targetStep,
      selectedPlan,
      formData: { selectedPlan }
    });
    return result.isValid;
  }

  static validateTier(step, selectedPlan) {
    return validateTierRequirements(step, selectedPlan);
  }

  static getAllowedSteps(currentStep, selectedPlan) {
    const result = validateStep({
      currentStep,
      requestedStep: currentStep,
      selectedPlan,
      formData: { selectedPlan }
    });
    return result.allowedSteps;
  }
}