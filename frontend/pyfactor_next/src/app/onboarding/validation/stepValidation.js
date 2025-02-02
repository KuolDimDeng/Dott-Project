// src/app/onboarding/validation/stepValidation.js
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { 
  ONBOARDING_STEPS, 
  validateStepData, 
  getnext_step,
  canAccessStep 
} from '@/config/steps';

export const VALIDATION_REASONS = {
  VALID: 'valid',
  INVALID: 'invalid',
  INITIAL_ACCESS: 'initial_access',
  INVALID_STEP: 'invalid_step',
  INVALID_DATA: 'invalid_data',
  ACCESS_DENIED: 'access_denied',
  INVALID_TRANSITION: 'invalid_transition',
  ERROR: 'error',
  FREE_TIER_SETUP: 'free_tier_setup',
  PROFESSIONAL_TIER_PAYMENT: 'professional_tier_payment',
  PROFESSIONAL_TIER_SETUP: 'professional_tier_setup',
  TIER_RESTRICTION: 'tier_restriction'
};

function validateTierRequirements(step, selected_plan) {
  if (step === 'payment') {
    if (selected_plan !== 'professional') {
      return {
        isValid: false,
        allowedSteps: ['setup'],
        reason: VALIDATION_REASONS.TIER_RESTRICTION,
        error: 'Payment step is only available for professional tier'
      };
    }
  }

  return {
    isValid: true,
    allowedSteps: Object.keys(ONBOARDING_STEPS)
  };
}

export async function validateStep(context) {
  const { current_step, requested_step, form_data, metadata } = context;
  const selected_plan = form_data?.selected_plan || context?.selected_plan;
  const request_id = generateRequestId();

  logger.debug('Step validation started:', {
    request_id,
    current_step,
    requested_step,
    selected_plan,
    type: 'step_validation_start'
  });

  try {
    // Always allow business-info access
    if (requested_step === 'business-info') {
      return {
        isValid: true,
        allowedSteps: ['business-info'],
        reason: VALIDATION_REASONS.INITIAL_ACCESS
      };
    }

    // Validate step exists
    const stepConfig = ONBOARDING_STEPS[requested_step];
    if (!stepConfig) {
      return {
        isValid: false,
        allowedSteps: [current_step],
        reason: VALIDATION_REASONS.INVALID_STEP,
        error: 'Invalid step requested'
      };
    }

    // Validate step data if provided
    if (form_data) {
      const validation = await validateStepData(requested_step, form_data);
      if (!validation.isValid) {
        return {
          isValid: false,
          allowedSteps: [current_step],
          reason: VALIDATION_REASONS.INVALID_DATA,
          errors: validation.errors
        };
      }
    }

    // Check tier requirements
    const tierValidation = validateTierRequirements(requested_step, selected_plan);
    if (!tierValidation.isValid) {
      return tierValidation;
    }

    // Get next step based on current state
    const next_step = getnext_step(current_step, form_data);
    
    // Check access permission
    const canAccess = canAccessStep(requested_step, {
      current_step,
      selected_plan,
      form_data
    });

    if (!canAccess) {
      return {
        isValid: false,
        allowedSteps: [current_step],
        reason: VALIDATION_REASONS.ACCESS_DENIED,
        error: 'Cannot access requested step'
      };
    }

    // Always allow transition from business-info to subscription
    if (current_step === 'business-info' && requested_step === 'subscription') {
    return {
        isValid: true,
        allowedSteps: ['subscription'],
        reason: VALIDATION_REASONS.VALID
    };
}

    // Handle special transitions
    if (current_step === 'subscription') {
      if (selected_plan === 'free' && requested_step === 'setup') {
        return {
          isValid: true,
          allowedSteps: ['setup'],
          reason: VALIDATION_REASONS.FREE_TIER_SETUP
        };
      }
      if (selected_plan === 'professional' && requested_step === 'payment') {
        return {
          isValid: true,
          allowedSteps: ['payment'],
          reason: VALIDATION_REASONS.PROFESSIONAL_TIER_PAYMENT
        };
      }
    }

    // Validate transition
    const isValidTransition = next_step === requested_step;
    return {
      isValid: isValidTransition,
      allowedSteps: isValidTransition ? [next_step] : [current_step],
      reason: isValidTransition ? VALIDATION_REASONS.VALID : VALIDATION_REASONS.INVALID_TRANSITION
    };

  } catch (error) {
    logger.error('Step validation error:', {
      request_id,
      error: error.message,
      context,
      type: 'step_validation_error'
    });
    
    return {
      isValid: false,
      allowedSteps: [current_step],
      reason: VALIDATION_REASONS.ERROR,
      error: error.message
    };
  }
}

export class StepValidator {
  static async validateStepTransition(context) {
    const operation_id = generateRequestId();
    
    logger.debug('Starting step validation:', {
      operation_id,
      ...context,
      type: 'step_validation_operation'
    });

    try {
      const result = await validateStep(context);

      logger.debug('Step validation completed:', {
        operation_id,
        result,
        type: 'step_validation_complete'
      });

      return result;

    } catch (error) {
      logger.error('Step validation failed:', {
        operation_id,
        error: error.message,
        context,
        type: 'step_validation_failure'
      });
      throw error;
    }
  }

  static canNavigate(current_step, target_step, selected_plan) {
    const result = validateStep({
      current_step,
      requested_step: target_step,
      selected_plan,
      form_data: { selected_plan }
    });
    return result.isValid;
  }

  static validateTier(step, selected_plan) {
    return validateTierRequirements(step, selected_plan);
  }

  static getAllowedSteps(current_step, selected_plan) {
    const result = validateStep({
      current_step,
      requested_step: current_step,
      selected_plan,
      form_data: { selected_plan }
    });
    return result.allowedSteps;
  }
}