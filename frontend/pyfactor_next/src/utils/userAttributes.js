'use client';

import { logger } from './logger';

// Function to generate a business ID (UUID v4)
export const generateBusinessId = () => {
  try {
    const uuid = crypto.randomUUID();
    // Validate the UUID meets our length constraint
    if (uuid.length !== FIELD_CONSTRAINTS['custom:businessid'].min) {
      throw new Error(
        `Generated business ID length (${uuid.length}) does not match required length (${FIELD_CONSTRAINTS['custom:businessid'].min})`
      );
    }
    logger.debug('Generated business ID:', uuid);
    return uuid;
  } catch (error) {
    logger.error('Failed to generate business ID:', error);
    throw new Error('Failed to generate valid business ID');
  }
};

// Constants for attribute validation with exact Cognito constraints
export const ONBOARDING_STATES = [
  'notstarted',
  'business-info',
  'subscription',
  'payment',
  'setup',
  'complete',
];

export const USER_ROLES = ['owner', 'admin']; // 4-6 chars
export const ACCOUNT_STATUSES = ['pending', 'active']; // 6-9 chars
export const SUBSCRIPTION_PLANS = ['free', 'professional']; // 4-12 chars

// Field length constraints from Cognito
const FIELD_CONSTRAINTS = {
  'custom:acctstatus': { min: 6, max: 9 },
  'custom:businessid': { min: 36, max: 36 },
  'custom:firstname': { min: 1, max: 256 },
  'custom:lastlogin': { min: 24, max: 24 },
  'custom:lastname': { min: 1, max: 256 },
  'custom:onboarding': { min: 1, max: 256 },
  'custom:preferences': { min: 2, max: 2048 },
  'custom:subplan': { min: 4, max: 12 },
  'custom:userrole': { min: 4, max: 6 },
};

// Default preferences structure
const DEFAULT_PREFERENCES = {
  notifications: true,
  theme: 'light',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Validation functions with length checks
export const validateOnboardingState = (state) => {
  if (!ONBOARDING_STATES.includes(state)) {
    throw new Error(`Invalid onboarding state: ${state}`);
  }
  if (
    state.length < FIELD_CONSTRAINTS['custom:onboarding'].min ||
    state.length > FIELD_CONSTRAINTS['custom:onboarding'].max
  ) {
    throw new Error(
      `Onboarding state must be between ${FIELD_CONSTRAINTS['custom:onboarding'].min} and ${FIELD_CONSTRAINTS['custom:onboarding'].max} characters`
    );
  }
  return state;
};

export const validateUserRole = (role) => {
  if (!USER_ROLES.includes(role)) {
    throw new Error(`Invalid user role: ${role}`);
  }
  if (
    role.length < FIELD_CONSTRAINTS['custom:userrole'].min ||
    role.length > FIELD_CONSTRAINTS['custom:userrole'].max
  ) {
    throw new Error(
      `User role must be between ${FIELD_CONSTRAINTS['custom:userrole'].min} and ${FIELD_CONSTRAINTS['custom:userrole'].max} characters`
    );
  }
  return role;
};

export const validateAccountStatus = (status) => {
  if (!ACCOUNT_STATUSES.includes(status)) {
    throw new Error(`Invalid account status: ${status}`);
  }
  if (
    status.length < FIELD_CONSTRAINTS['custom:acctstatus'].min ||
    status.length > FIELD_CONSTRAINTS['custom:acctstatus'].max
  ) {
    throw new Error(
      `Account status must be between ${FIELD_CONSTRAINTS['custom:acctstatus'].min} and ${FIELD_CONSTRAINTS['custom:acctstatus'].max} characters`
    );
  }
  return status;
};

export const validateSubscriptionPlan = (plan) => {
  if (!SUBSCRIPTION_PLANS.includes(plan)) {
    throw new Error(`Invalid subscription plan: ${plan}`);
  }
  if (
    plan.length < FIELD_CONSTRAINTS['custom:subplan'].min ||
    plan.length > FIELD_CONSTRAINTS['custom:subplan'].max
  ) {
    throw new Error(
      `Subscription plan must be between ${FIELD_CONSTRAINTS['custom:subplan'].min} and ${FIELD_CONSTRAINTS['custom:subplan'].max} characters`
    );
  }
  return plan;
};

export const validatePreferences = (preferences) => {
  try {
    const prefsString =
      typeof preferences === 'string'
        ? preferences
        : JSON.stringify(preferences);

    if (
      prefsString.length < FIELD_CONSTRAINTS['custom:preferences'].min ||
      prefsString.length > FIELD_CONSTRAINTS['custom:preferences'].max
    ) {
      throw new Error(
        `Preferences string must be between ${FIELD_CONSTRAINTS['custom:preferences'].min} and ${FIELD_CONSTRAINTS['custom:preferences'].max} characters`
      );
    }

    return prefsString;
  } catch (error) {
    throw new Error('Invalid preferences format');
  }
};

export const validateName = (name, field) => {
  if (
    name.length < FIELD_CONSTRAINTS[`custom:${field}`].min ||
    name.length > FIELD_CONSTRAINTS[`custom:${field}`].max
  ) {
    throw new Error(
      `${field} must be between ${FIELD_CONSTRAINTS[`custom:${field}`].min} and ${FIELD_CONSTRAINTS[`custom:${field}`].max} characters`
    );
  }
  return name;
};

// Helper functions for attribute management
export const getCurrentTimestamp = () => {
  const timestamp = new Date().toISOString();
  // Ensure exactly 24 characters as per Cognito constraint
  if (timestamp.length !== FIELD_CONSTRAINTS['custom:lastlogin'].min) {
    throw new Error('Invalid timestamp format');
  }
  return timestamp;
};

// Initial attribute sets
export const getInitialAttributes = () => {
  const timestamp = getCurrentTimestamp();
  const attributes = {
    'custom:onboarding': 'notstarted',
    'custom:userrole': 'owner',
    'custom:acctstatus': 'pending',
    'custom:lastlogin': timestamp,
    'custom:subplan': 'free',
    'custom:preferences': JSON.stringify(DEFAULT_PREFERENCES),
  };

  logger.info('Generated initial attributes:', {
    attributes,
    timestamp,
  });

  return attributes;
};

export const getBusinessAttributes = (businessId) => {
  if (businessId.length !== FIELD_CONSTRAINTS['custom:businessid'].min) {
    throw new Error(
      `Business ID must be exactly ${FIELD_CONSTRAINTS['custom:businessid'].min} characters`
    );
  }

  const attributes = {
    'custom:businessid': businessId,
    'custom:onboarding': 'business-info',
    'custom:acctstatus': 'active',
  };

  logger.info('Generated business attributes:', {
    attributes,
    timestamp: getCurrentTimestamp(),
  });

  return attributes;
};

export const getSubscriptionAttributes = (plan) => {
  const attributes = {
    'custom:subplan': validateSubscriptionPlan(plan),
    'custom:onboarding': 'subscription',
  };

  logger.info('Generated subscription attributes:', {
    attributes,
    timestamp: getCurrentTimestamp(),
  });

  return attributes;
};

export const getPaymentAttributes = () => {
  const attributes = {
    'custom:onboarding': 'setup',
    'custom:acctstatus': 'active',
  };

  logger.info('Generated payment attributes:', {
    attributes,
    timestamp: getCurrentTimestamp(),
  });

  return attributes;
};

// Utility function to safely parse preferences
export const parsePreferences = (preferencesString) => {
  try {
    return JSON.parse(preferencesString);
  } catch (error) {
    logger.error('Failed to parse preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

// Recovery functions for missing or invalid attributes
export const recoverMissingAttributes = (attributes = {}) => {
  const initialAttributes = getInitialAttributes();
  const recoveredAttributes = {};
  let hasRecovered = false;

  // First, ensure we have a valid object to work with
  const safeAttributes = attributes || {};

  // Copy all existing valid attributes
  Object.entries(safeAttributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      recoveredAttributes[key] = value;
    }
  });

  // Add any missing attributes from initialAttributes
  Object.entries(initialAttributes).forEach(([key, defaultValue]) => {
    if (!recoveredAttributes[key]) {
      recoveredAttributes[key] = defaultValue;
      hasRecovered = true;
      logger.warn(`Recovered missing attribute: ${key} with default value`, {
        key,
        defaultValue,
        timestamp: getCurrentTimestamp(),
      });
    }
  });

  return { recoveredAttributes, hasRecovered };
};

// Enhanced validation with detailed error reporting
export const validateAttributes = (attributes) => {
  const validatedAttributes = {};
  const validationErrors = [];
  const validationWarnings = [];

  // Validation with detailed error collection
  try {
    if (attributes['custom:onboarding']) {
      validatedAttributes['custom:onboarding'] = validateOnboardingState(
        attributes['custom:onboarding']
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'onboarding', error: error.message });
  }

  try {
    if (attributes['custom:userrole']) {
      validatedAttributes['custom:userrole'] = validateUserRole(
        attributes['custom:userrole']
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'userrole', error: error.message });
  }

  try {
    if (attributes['custom:acctstatus']) {
      validatedAttributes['custom:acctstatus'] = validateAccountStatus(
        attributes['custom:acctstatus']
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'acctstatus', error: error.message });
  }

  try {
    if (attributes['custom:subplan']) {
      validatedAttributes['custom:subplan'] = validateSubscriptionPlan(
        attributes['custom:subplan']
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'subplan', error: error.message });
  }

  try {
    if (attributes['custom:businessid']) {
      if (
        attributes['custom:businessid'].length !==
        FIELD_CONSTRAINTS['custom:businessid'].min
      ) {
        throw new Error(
          `Business ID must be exactly ${FIELD_CONSTRAINTS['custom:businessid'].min} characters`
        );
      }
      validatedAttributes['custom:businessid'] =
        attributes['custom:businessid'];
    }
  } catch (error) {
    validationErrors.push({ field: 'businessid', error: error.message });
  }

  try {
    if (attributes['custom:lastlogin']) {
      const timestamp = attributes['custom:lastlogin'];
      if (timestamp.length !== FIELD_CONSTRAINTS['custom:lastlogin'].min) {
        throw new Error(
          `Last login timestamp must be exactly ${FIELD_CONSTRAINTS['custom:lastlogin'].min} characters`
        );
      }
      validatedAttributes['custom:lastlogin'] = timestamp;
    }
  } catch (error) {
    validationWarnings.push({ field: 'lastlogin', warning: error.message });
    validatedAttributes['custom:lastlogin'] = getCurrentTimestamp();
  }

  try {
    if (attributes['custom:preferences']) {
      validatedAttributes['custom:preferences'] = validatePreferences(
        attributes['custom:preferences']
      );
    }
  } catch (error) {
    validationWarnings.push({ field: 'preferences', warning: error.message });
    validatedAttributes['custom:preferences'] =
      JSON.stringify(DEFAULT_PREFERENCES);
  }

  try {
    if (attributes['custom:firstname']) {
      validatedAttributes['custom:firstname'] = validateName(
        attributes['custom:firstname'],
        'firstname'
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'firstname', error: error.message });
  }

  try {
    if (attributes['custom:lastname']) {
      validatedAttributes['custom:lastname'] = validateName(
        attributes['custom:lastname'],
        'lastname'
      );
    }
  } catch (error) {
    validationErrors.push({ field: 'lastname', error: error.message });
  }

  // Log validation results
  if (validationErrors.length > 0 || validationWarnings.length > 0) {
    logger.warn('Attribute validation issues detected', {
      errors: validationErrors,
      warnings: validationWarnings,
      timestamp: getCurrentTimestamp(),
    });
  }

  return {
    attributes: validatedAttributes,
    errors: validationErrors,
    warnings: validationWarnings,
  };
};
