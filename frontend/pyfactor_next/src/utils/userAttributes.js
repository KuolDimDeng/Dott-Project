import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

export const ONBOARDING_STATES = {
  NOT_STARTED: 'not_started',
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',        // When setup is in progress
  COMPLETE: 'complete'   // When onboarding is fully complete
};

export const ONBOARDED_STATES = {
  NOT_STARTED: 'not_started',
  SETUP: 'setup',        // During setup process
  COMPLETE: 'complete'   // After setup is complete
};

export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin'
};

export const ACCOUNT_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active'
};

export const STEP_ROUTES = {
  [ONBOARDING_STATES.BUSINESS_INFO]: '/onboarding/business-info',
  [ONBOARDING_STATES.SUBSCRIPTION]: '/onboarding/subscription',
  [ONBOARDING_STATES.PAYMENT]: '/onboarding/payment',
  [ONBOARDING_STATES.SETUP]: '/onboarding/setup',
  [ONBOARDING_STATES.COMPLETE]: '/dashboard',
};

export const STEP_ORDER = [
  ONBOARDING_STATES.BUSINESS_INFO,
  ONBOARDING_STATES.SUBSCRIPTION,
  ONBOARDING_STATES.PAYMENT,
  ONBOARDING_STATES.SETUP,
  ONBOARDING_STATES.COMPLETE,
];

export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

export const SUBSCRIPTION_INTERVALS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

/**
 * Color definitions for subscription plans
 * These can be used consistently across the application
 */
export const SUBSCRIPTION_PLAN_COLORS = {
  FREE: '#757575',        // Grey for Free plan
  PROFESSIONAL: '#1a5bc0', // Blue for Professional plan
  ENTERPRISE: '#673ab7',   // Purple for Enterprise plan
  // Fallback
  DEFAULT: '#757575'      // Default to grey
};

/**
 * Get the color for a subscription plan
 * @param {string} plan - The plan name/id ('free', 'professional', 'enterprise')
 * @returns {string} The color code for the plan
 */
export const getSubscriptionPlanColor = (plan) => {
  if (!plan) return SUBSCRIPTION_PLAN_COLORS.DEFAULT;
  
  // Normalize the plan name
  const normalizedPlan = typeof plan === 'string' ? plan.toLowerCase() : 'free';
  
  // Check if it includes one of our plan names (for flexibility)
  if (normalizedPlan.includes('free')) return SUBSCRIPTION_PLAN_COLORS.FREE;
  if (normalizedPlan.includes('pro')) return SUBSCRIPTION_PLAN_COLORS.PROFESSIONAL;
  if (normalizedPlan.includes('ent')) return SUBSCRIPTION_PLAN_COLORS.ENTERPRISE;
  
  // Default
  return SUBSCRIPTION_PLAN_COLORS.DEFAULT;
};

export async function getUserAttributes() {
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

    return user.attributes || {};
  } catch (error) {
    logger.error('[UserAttributes] Failed to get attributes:', error);
    throw error;
  }
}

export async function setUserAttributes(attributes) {
  try {
    // Get current session using v6 API
    const { tokens } = await fetchAuthSession();
    if (!tokens?.idToken) {
      throw new Error('No valid session');
    }

    // Format attributes according to Amplify v6 requirements
    const formattedAttributes = {};
    Object.entries(attributes).forEach(([key, value]) => {
      // Ensure all values are strings and lowercase
      formattedAttributes[key] = String(value).toLowerCase();
    });

    // Add updated_at timestamp
    formattedAttributes['custom:updated_at'] = new Date().toISOString();

    // Validate attributes before updating
    await validateAttributes(formattedAttributes);

    logger.debug('[UserAttributes] Updating attributes:', {
      attributes: Object.keys(formattedAttributes)
    });

    // Update user attributes using v6 API
    await updateUserAttributes({
      userAttributes: formattedAttributes
    });

    logger.debug('[UserAttributes] Attributes updated successfully');

    return true;
  } catch (error) {
    logger.error('[UserAttributes] Failed to update attributes:', {
      error: error.message,
      code: error.code,
      attributes: Object.keys(attributes)
    });
    throw error;
  }
}

export async function validateAttributes(attributes) {
  const validations = {
    'custom:onboarding': {
      values: Object.values(ONBOARDING_STATES),
      required: false
    },
    'custom:userrole': {
      values: Object.values(USER_ROLES),
      required: false
    },
    'custom:acctstatus': {
      values: Object.values(ACCOUNT_STATUSES),
      required: false
    },
    'custom:subplan': {
      values: Object.values(SUBSCRIPTION_PLANS),
      required: false
    },
    'custom:subscriptioninterval': {
      values: Object.values(SUBSCRIPTION_INTERVALS),
      required: false
    },
    'custom:setupdone': {
      values: ['true', 'false'],
      required: false
    },
    'custom:payverified': {
      values: ['true', 'false'],
      required: false
    }
  };

  const errors = [];

  // Validate each attribute
  Object.entries(attributes).forEach(([key, value]) => {
    // Skip validation for timestamp attributes
    if (key === 'custom:created_at' || key === 'custom:updated_at') {
      return;
    }

    const validation = validations[key];
    if (validation) {
      if (validation.required && !value) {
        errors.push(`${key} is required`);
      }
      if (validation.values && !validation.values.includes(value)) {
        errors.push(`Invalid value for ${key}: ${value}. Must be one of: ${validation.values.join(', ')}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Attribute validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Special attributes with specific formatting/validation rules
 */
export const ATTRIBUTE_VALIDATIONS = {
  'custom:tenantId': { length: 36 }, // UUID format
  'custom:businessid': { length: 36 }, // UUID format
  'custom:datefounded': { length: 10 }, // YYYY-MM-DD
  'custom:updated_at': {}, // ISO date
  'custom:created_at': {}, // ISO date
  'custom:onboardingCompletedAt': {} // ISO date
};

/**
 * Default attribute values for new users
 * Used when creating new accounts
 */
export function getDefaultAttributes() {
  return {
    'custom:onboarding': ONBOARDING_STATES.NOT_STARTED,
    'custom:userrole': USER_ROLES.OWNER,
    'custom:acctstatus': ACCOUNT_STATUSES.PENDING,
    'custom:subplan': SUBSCRIPTION_PLANS.FREE,
    'custom:subscriptioninterval': SUBSCRIPTION_INTERVALS.MONTHLY,
    'custom:setupdone': 'false',
    'custom:payverified': 'false',
    'custom:created_at': new Date().toISOString(),
    'custom:updated_at': new Date().toISOString()
  };
}