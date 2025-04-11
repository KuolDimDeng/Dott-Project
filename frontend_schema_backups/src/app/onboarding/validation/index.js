// src/app/onboarding/validation/index.js
import { validateStep, StepValidator } from './stepValidation';
import { ValidationManager } from './validationManager';
import { VALIDATION_CONFIG } from './config';
import validationSchema from './schema';  // Import as default
import {
  STEPS,
  STEP_ORDER,
  VALIDATION_REASONS
} from './constants';

// Named exports
export {
  validateStep,
  StepValidator,
  ValidationManager,
  VALIDATION_CONFIG,
  validationSchema,
  STEPS,
  STEP_ORDER,
  VALIDATION_REASONS
};

// Backwards compatibility
export default {
  validateStep,
  StepValidator,
  STEP_ORDER,
  VALIDATION_REASONS,
  validationSchema
};