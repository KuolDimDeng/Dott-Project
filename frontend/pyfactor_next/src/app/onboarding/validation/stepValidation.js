// src/app/onboarding/validation/stepValidation.js
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { STEPS, STEP_ORDER, VALIDATION_REASONS } from './constants';

// Validation utilities
function validateTierRequirements(step, tier) {
  if (step === STEPS.PAYMENT && tier !== 'professional') {
    return {
      isValid: false,
      allowedSteps: [STEPS.SETUP],
      reason: VALIDATION_REASONS.TIER_RESTRICTION,
      error: 'Payment step is only available for professional tier'
    };
  }

  return {
    isValid: true,
    allowedSteps: STEP_ORDER
  };
}

export function validateStep(context) {
  const { currentStep, requestedStep, tier, metadata } = context;

  logger.debug('Step validation started:', {
    currentStep,
    requestedStep,
    tier,
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

  // Special handling for subscription transition
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

    const currentIdx = STEP_ORDER.indexOf(currentStep);
    const requestedIdx = STEP_ORDER.indexOf(requestedStep);

    // Prevent backward navigation
    if (requestedIdx < currentIdx) {
      return {
        isValid: false,
        allowedSteps: [currentStep],
        reason: VALIDATION_REASONS.INVALID_TRANSITION,
        error: 'Cannot navigate to previous steps'
      };
    }

    // Only allow moving to next step or setup
    if (requestedIdx > currentIdx + 1 && requestedStep !== STEPS.SETUP) {
      return {
        isValid: false,
        allowedSteps: [currentStep],
        reason: VALIDATION_REASONS.INVALID_TRANSITION,
        error: 'Can only move to next step'
      };
    }

    // Special handling for subscription -> setup (free tier)
    if (currentStep === STEPS.SUBSCRIPTION && requestedStep === STEPS.SETUP && tier !== 'professional') {
      return {
        isValid: true,
        allowedSteps: [STEPS.SETUP],
        reason: VALIDATION_REASONS.VALID
      };
    }

    // Special handling for payment -> setup (professional tier)
    if (currentStep === STEPS.PAYMENT && requestedStep === STEPS.SETUP && tier === 'professional') {
      return {
        isValid: true,
        allowedSteps: [STEPS.SETUP],
        reason: VALIDATION_REASONS.VALID
      };
    }

    // Add tier-specific validation
    const tierValidation = validateTierRequirements(requestedStep, tier);
    if (!tierValidation.isValid) {
      return tierValidation;
    }

    // Calculate allowed next step
    const allowedSteps = [currentStep, STEP_ORDER[currentIdx + 1]].filter(Boolean);

    // Determine if step transition is valid
    const isValid = requestedIdx === currentIdx + 1;

    logger.debug('Step validation result:', {
      currentStep,
      requestedStep,
      isValid,
      allowedSteps,
      tier,
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

  static canNavigate(currentStep, targetStep, tier) {
    const result = validateStep({
      currentStep,
      requestedStep: targetStep,
      tier
    });
    return result.isValid;
  }

  static validateTier(step, tier) {
    return validateTierRequirements(step, tier);
  }

  static getAllowedSteps(currentStep, tier) {
    const result = validateStep({
      currentStep,
      requestedStep: currentStep,
      tier
    });
    return result.allowedSteps;
  }
}

