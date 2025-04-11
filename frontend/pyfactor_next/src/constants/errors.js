/**
 * API Error Codes - Centralized for consistency
 */
export const API_ERROR_CODES = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Tenant errors
  TENANT_ERROR: 'TENANT_ERROR',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_NOT_OWNED: 'TENANT_NOT_OWNED',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  TENANT_INVALID: 'TENANT_INVALID',
  TENANT_NOT_INITIALIZED: 'TENANT_NOT_INITIALIZED',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  
  // User errors
  USER_ERROR: 'USER_ERROR',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_EXISTS: 'USER_EXISTS',
  
  // Business errors
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  BUSINESS_NOT_OWNED: 'BUSINESS_NOT_OWNED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

/**
 * User-friendly error messages matching error codes
 */
export const ERROR_MESSAGES = {
  [API_ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
  [API_ERROR_CODES.INVALID_PARAMS]: 'Invalid parameters provided.',
  [API_ERROR_CODES.UNAUTHORIZED]: 'You must be logged in to perform this action.',
  [API_ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [API_ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [API_ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  
  [API_ERROR_CODES.AUTH_ERROR]: 'Authentication error. Please sign in again.',
  [API_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [API_ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [API_ERROR_CODES.TOKEN_EXPIRED]: 'Your authentication token has expired. Please sign in again.',
  [API_ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token. Please sign in again.',
  
  [API_ERROR_CODES.TENANT_ERROR]: 'An error occurred with your account.',
  [API_ERROR_CODES.TENANT_NOT_FOUND]: 'Account not found. Please contact support.',
  [API_ERROR_CODES.TENANT_NOT_OWNED]: 'You do not have access to this account.',
  [API_ERROR_CODES.TENANT_INACTIVE]: 'Your account is inactive. Please contact support.',
  [API_ERROR_CODES.TENANT_INVALID]: 'Invalid account information. Please contact support.',
  [API_ERROR_CODES.TENANT_NOT_INITIALIZED]: 'Your account is not fully set up. Please contact support.',
  [API_ERROR_CODES.TENANT_MISMATCH]: 'Account information mismatch. Please contact support.',
  
  [API_ERROR_CODES.USER_ERROR]: 'An error occurred with your user account.',
  [API_ERROR_CODES.USER_NOT_FOUND]: 'User account not found.',
  [API_ERROR_CODES.USER_INACTIVE]: 'Your user account is inactive.',
  [API_ERROR_CODES.USER_EXISTS]: 'A user with this email already exists.',
  
  [API_ERROR_CODES.BUSINESS_ERROR]: 'An error occurred with your business.',
  [API_ERROR_CODES.BUSINESS_NOT_FOUND]: 'Business not found.',
  [API_ERROR_CODES.BUSINESS_NOT_OWNED]: 'You do not have access to this business.',
  
  [API_ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
}; 