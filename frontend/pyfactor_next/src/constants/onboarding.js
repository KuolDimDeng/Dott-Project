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
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  BUSINESS_INFO: 'BUSINESS_INFO',
  BUSINESS_INFO_COMPLETED: 'BUSINESS_INFO_COMPLETED',
  SUBSCRIPTION: 'SUBSCRIPTION',
  SUBSCRIPTION_COMPLETED: 'SUBSCRIPTION_COMPLETED',
  PAYMENT: 'PAYMENT',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  SETUP: 'SETUP',
  SETUP_COMPLETED: 'SETUP_COMPLETED',
  COMPLETE: 'COMPLETE',
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
  NOT_STARTED: 'NOT_STARTED',
  BUSINESS_INFO: 'BUSINESS_INFO',
  SUBSCRIPTION: 'SUBSCRIPTION', 
  PAYMENT: 'PAYMENT',
  SETUP: 'SETUP',
  COMPLETE: 'COMPLETE',
};

export default {
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES,
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS,
  ONBOARDING_STATES,
}; 