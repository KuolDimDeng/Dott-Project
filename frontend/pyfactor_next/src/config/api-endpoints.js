/**
 * Dott API Endpoints Configuration
 * Updated for API Gateway integration
 * Generated: 2025-05-22 23:40:23 UTC
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production';

export const API_ENDPOINTS = {
  // API Gateway Base
  BASE_URL: API_BASE_URL,
  
  // Authentication (via API Gateway)
  AUTH: {
    CHECK_ATTRIBUTES: `${API_BASE_URL}/auth/check-attributes`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
  },
  
  // Payroll APIs (via API Gateway to Next.js)
  PAYROLL: {
    REPORTS: `${API_BASE_URL}/payroll/reports`,
    RUN: `${API_BASE_URL}/payroll/run`,
    EXPORT_REPORT: `${API_BASE_URL}/payroll/export-report`,
    SETTINGS: `${API_BASE_URL}/payroll/settings`,
  },
  
  // Business APIs (via API Gateway to Django)
  BUSINESS: {
    PROFILE: `${API_BASE_URL}/business/profile`,
    SETTINGS: `${API_BASE_URL}/business/settings`,
    EMPLOYEES: `${API_BASE_URL}/business/employees`,
    DEPARTMENTS: `${API_BASE_URL}/business/departments`,
  },
  
  // Onboarding APIs (via API Gateway to Django)
  ONBOARDING: {
    BUSINESS_INFO: `${API_BASE_URL}/onboarding/business-info`,
    SUBSCRIPTION: `${API_BASE_URL}/onboarding/subscription`,
    SETUP: `${API_BASE_URL}/onboarding/setup`,
    COMPLETE: `${API_BASE_URL}/onboarding/complete`,
  }
};

// Legacy endpoints for fallback (direct to services)
export const LEGACY_ENDPOINTS = {
  DJANGO_BASE: 'https://api.dottapps.com',
  NEXTJS_BASE: 'https://frontend.dottapps.com'
};

export default API_ENDPOINTS; 