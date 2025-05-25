/**
 * Dott API Endpoints Configuration
 * Updated for Direct Django Backend
 * Generated: 2025-05-25 12:32:00 UTC
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export const API_ENDPOINTS = {
  // Direct Django Backend Base
  BASE_URL: API_BASE_URL,
  
  // Authentication (Direct to Django)
  AUTH: {
    CHECK_ATTRIBUTES: `${API_BASE_URL}/api/auth/check-attributes`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
  },
  
  // Payroll APIs (Direct to Django)
  PAYROLL: {
    REPORTS: `${API_BASE_URL}/api/payroll/reports`,
    RUN: `${API_BASE_URL}/api/payroll/run`,
    EXPORT_REPORT: `${API_BASE_URL}/api/payroll/export-report`,
    SETTINGS: `${API_BASE_URL}/api/payroll/settings`,
  },
  
  // Business APIs (Direct to Django)
  BUSINESS: {
    PROFILE: `${API_BASE_URL}/api/business/profile`,
    SETTINGS: `${API_BASE_URL}/api/business/settings`,
    EMPLOYEES: `${API_BASE_URL}/api/business/employees`,
    DEPARTMENTS: `${API_BASE_URL}/api/business/departments`,
  },
  
  // Onboarding APIs (Direct to Django)
  ONBOARDING: {
    BUSINESS_INFO: `${API_BASE_URL}/api/onboarding/business-info`,
    SUBSCRIPTION: `${API_BASE_URL}/api/onboarding/subscription`,
    SETUP: `${API_BASE_URL}/api/onboarding/setup`,
    COMPLETE: `${API_BASE_URL}/api/onboarding/complete`,
  },
  
  // Health Check
  HEALTH: `${API_BASE_URL}/health/`,
};

// Legacy endpoints for reference (no longer used)
export const LEGACY_ENDPOINTS = {
  API_GATEWAY: 'https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production',
  DJANGO_DIRECT: 'https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com',
  DJANGO_CUSTOM: 'https://api.dottapps.com'
};

export default API_ENDPOINTS; 