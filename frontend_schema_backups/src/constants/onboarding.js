/**
 * Constants for onboarding process
 * This file provides standardized naming for onboarding attributes
 * to ensure consistency across the application
 */

// Cognito attribute names
export const COGNITO_ATTRIBUTES = {
  ONBOARDING_STATUS: 'custom:onboarding',
  SETUP_COMPLETED: 'custom:setupdone',
  BUSINESS_ID: 'custom:businessid',
  BUSINESS_NAME: 'custom:businessname',
  BUSINESS_TYPE: 'custom:businesstype',
  SUBSCRIPTION_PLAN: 'custom:subscriptionplan',
  ACCOUNT_STATUS: 'custom:acctstatus',
};

// Cookie names - consistent with Cognito attribute naming
export const COOKIE_NAMES = {
  ONBOARDING_STATUS: 'onboardingStatus',
  SETUP_COMPLETED: 'setupCompleted',
  BUSINESS_NAME: 'businessName',
  BUSINESS_TYPE: 'businessType',
  ONBOARDING_STEP: 'onboardingStep',
  FREE_PLAN_SELECTED: 'freePlanSelected',
  TENANT_ID: 'tenantId',
};

// LocalStorage keys - consistent with cookie naming
export const STORAGE_KEYS = {
  ONBOARDING_STATUS: 'onboardingStatus',
  SETUP_COMPLETED: 'setupCompleted',
  BUSINESS_INFO: 'businessInfo',
  TENANT_ID: 'tenantId',
};

// Onboarding status values - standardized across the application
export const ONBOARDING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  BUSINESS_INFO: 'business_info',
  BUSINESS_INFO_COMPLETED: 'business_info_completed',
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_COMPLETED: 'subscription_completed',
  PAYMENT: 'payment',
  PAYMENT_COMPLETED: 'payment_completed',
  SETUP: 'setup',
  SETUP_COMPLETED: 'setup_completed',
  COMPLETE: 'complete',
};

// Onboarding step values for URLs/routing
export const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete',
  DASHBOARD: 'dashboard',
};

// Simplified onboarding states for UI
export const ONBOARDING_STATES = {
  NOT_STARTED: 'not_started',
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION: 'subscription', 
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete',
};

export default {
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES,
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS,
  ONBOARDING_STATES,
}; 