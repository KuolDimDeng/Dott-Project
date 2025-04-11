// src/app/onboarding/validation/config.js
export const VALIDATION_CONFIG = {
  debounceTime: 3000,
  throttleDelay: 4000,
  minValidationGap: 3500,
  maxValidationRetries: 3,
  autoSaveDebounce: 2500,
  maxRetryDelay: 8000,
  maxStepRetries: 3,
  stepValidationTimeout: 5000
};

// Add validation tiers
export const VALIDATION_TIERS = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};