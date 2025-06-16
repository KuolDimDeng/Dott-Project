/**
 * Comprehensive Authentication Error Handler
 * Handles all edge cases for Auth0 + session management
 */

import { logger } from './logger';

// Error code mappings
const ERROR_CODES = {
  // Sign up errors
  USER_EXISTS: 'auth0_email_exists',
  WEAK_PASSWORD: 'weak_password',
  INVALID_EMAIL: 'invalid_email',
  DISPOSABLE_EMAIL: 'disposable_email',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  
  // Sign in errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  ACCOUNT_BLOCKED: 'account_blocked',
  ACCOUNT_LOCKED: 'account_locked',
  MFA_REQUIRED: 'mfa_required',
  PASSWORD_EXPIRED: 'password_expired',
  
  // Session errors
  SESSION_EXPIRED: 'session_expired',
  CONCURRENT_SESSION: 'concurrent_session',
  SESSION_INVALID: 'session_invalid',
  COOKIES_DISABLED: 'cookies_disabled',
  
  // Network errors
  NETWORK_ERROR: 'network_error',
  AUTH0_UNAVAILABLE: 'auth0_unavailable',
  TIMEOUT: 'timeout',
  CORS_ERROR: 'cors_error',
  
  // OAuth errors
  OAUTH_CANCELLED: 'oauth_cancelled',
  OAUTH_DENIED: 'oauth_denied',
  OAUTH_ACCOUNT_CONFLICT: 'oauth_account_conflict',
  
  // Onboarding errors
  PAYMENT_DECLINED: 'payment_declined',
  PAYMENT_INSUFFICIENT_FUNDS: 'payment_insufficient_funds',
  PAYMENT_3DS_REQUIRED: 'payment_3ds_required',
  BUSINESS_NAME_DUPLICATE: 'business_name_duplicate',
  TAX_ID_INVALID: 'tax_id_invalid',
  TENANT_CREATION_FAILED: 'tenant_creation_failed',
  
  // Auth0 specific
  CALLBACK_URL_MISMATCH: 'callback_url_mismatch',
  STATE_MISMATCH: 'state_mismatch',
  PKCE_FAILED: 'pkce_failed',
  RATE_LIMITED: 'rate_limited',
};

// Error messages and actions
const ERROR_DETAILS = {
  [ERROR_CODES.USER_EXISTS]: {
    message: 'This email is already registered. Try signing in instead.',
    action: 'redirect_signin',
    severity: 'info'
  },
  [ERROR_CODES.WEAK_PASSWORD]: {
    message: 'Password is too weak. Use 8+ characters with numbers and symbols.',
    action: 'retry',
    severity: 'warning'
  },
  [ERROR_CODES.INVALID_EMAIL]: {
    message: 'Please enter a valid email address.',
    action: 'retry',
    severity: 'warning'
  },
  [ERROR_CODES.DISPOSABLE_EMAIL]: {
    message: 'Disposable email addresses are not allowed. Please use a permanent email.',
    action: 'retry',
    severity: 'warning'
  },
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: {
    message: 'Too many attempts. Please try again in 15 minutes.',
    action: 'wait',
    severity: 'error',
    waitTime: 900000 // 15 minutes
  },
  [ERROR_CODES.INVALID_CREDENTIALS]: {
    message: 'Invalid email or password. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: {
    message: 'Please verify your email before signing in. Check your inbox for the verification email.',
    action: 'resend_verification',
    severity: 'warning'
  },
  [ERROR_CODES.ACCOUNT_BLOCKED]: {
    message: 'Your account has been blocked. Please contact support.',
    action: 'contact_support',
    severity: 'error'
  },
  [ERROR_CODES.ACCOUNT_LOCKED]: {
    message: 'Account temporarily locked due to multiple failed attempts. Reset your password to continue.',
    action: 'reset_password',
    severity: 'error'
  },
  [ERROR_CODES.MFA_REQUIRED]: {
    message: 'Multi-factor authentication is required.',
    action: 'setup_mfa',
    severity: 'info'
  },
  [ERROR_CODES.SESSION_EXPIRED]: {
    message: 'Your session has expired. Please sign in again.',
    action: 'redirect_signin',
    severity: 'info'
  },
  [ERROR_CODES.CONCURRENT_SESSION]: {
    message: 'You are already logged in another tab or device.',
    action: 'use_existing',
    severity: 'info'
  },
  [ERROR_CODES.COOKIES_DISABLED]: {
    message: 'Cookies are required for authentication. Please enable cookies in your browser settings.',
    action: 'enable_cookies',
    severity: 'error'
  },
  [ERROR_CODES.NETWORK_ERROR]: {
    message: 'Connection error. Please check your internet and try again.',
    action: 'retry',
    severity: 'error'
  },
  [ERROR_CODES.AUTH0_UNAVAILABLE]: {
    message: 'Authentication service unavailable. Please try again later.',
    action: 'retry_later',
    severity: 'error'
  },
  [ERROR_CODES.TIMEOUT]: {
    message: 'Request timed out. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  [ERROR_CODES.CORS_ERROR]: {
    message: 'Security error. This might be due to browser extensions or network settings.',
    action: 'check_browser',
    severity: 'error'
  },
  [ERROR_CODES.OAUTH_CANCELLED]: {
    message: 'Sign in cancelled. Please try again.',
    action: 'retry',
    severity: 'info'
  },
  [ERROR_CODES.OAUTH_DENIED]: {
    message: 'Permission denied. Please grant the required permissions to continue.',
    action: 'retry',
    severity: 'warning'
  },
  [ERROR_CODES.OAUTH_ACCOUNT_CONFLICT]: {
    message: 'An account with this email already exists. Please sign in with your password instead.',
    action: 'use_password',
    severity: 'warning'
  },
  [ERROR_CODES.PAYMENT_DECLINED]: {
    message: 'Payment declined. Please check your card details and try again.',
    action: 'retry_payment',
    severity: 'error'
  },
  [ERROR_CODES.PAYMENT_INSUFFICIENT_FUNDS]: {
    message: 'Insufficient funds. Please use a different payment method.',
    action: 'retry_payment',
    severity: 'error'
  },
  [ERROR_CODES.PAYMENT_3DS_REQUIRED]: {
    message: 'Additional verification required by your bank.',
    action: 'complete_3ds',
    severity: 'info'
  },
  [ERROR_CODES.BUSINESS_NAME_DUPLICATE]: {
    message: 'A business with this name already exists. Please choose a different name.',
    action: 'retry',
    severity: 'warning'
  },
  [ERROR_CODES.TENANT_CREATION_FAILED]: {
    message: 'Failed to set up your workspace. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  [ERROR_CODES.RATE_LIMITED]: {
    message: 'Too many requests. Please wait a moment and try again.',
    action: 'wait',
    severity: 'warning',
    waitTime: 60000 // 1 minute
  }
};

/**
 * Parse error and determine error code
 */
function parseErrorCode(error) {
  if (!error) return ERROR_CODES.NETWORK_ERROR;
  
  const errorStr = error.toString().toLowerCase();
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  // Auth0 specific errors
  if (code === 'access_denied' || message.includes('access_denied')) {
    return ERROR_CODES.OAUTH_DENIED;
  }
  
  if (error.status === 429 || code === '429' || message.includes('rate limit')) {
    return ERROR_CODES.RATE_LIMITED;
  }
  
  if (message.includes('already exists') || message.includes('already registered')) {
    return ERROR_CODES.USER_EXISTS;
  }
  
  if (message.includes('invalid_grant') || message.includes('invalid credentials')) {
    return ERROR_CODES.INVALID_CREDENTIALS;
  }
  
  if (message.includes('email') && message.includes('verif')) {
    return ERROR_CODES.EMAIL_NOT_VERIFIED;
  }
  
  if (message.includes('blocked') || message.includes('suspended')) {
    return ERROR_CODES.ACCOUNT_BLOCKED;
  }
  
  if (message.includes('locked') || message.includes('too many attempts')) {
    return ERROR_CODES.ACCOUNT_LOCKED;
  }
  
  if (message.includes('session') && message.includes('expired')) {
    return ERROR_CODES.SESSION_EXPIRED;
  }
  
  if (message.includes('network') || code === 'network_error') {
    return ERROR_CODES.NETWORK_ERROR;
  }
  
  if (message.includes('timeout')) {
    return ERROR_CODES.TIMEOUT;
  }
  
  if (message.includes('cors')) {
    return ERROR_CODES.CORS_ERROR;
  }
  
  if (message.includes('payment') || message.includes('card')) {
    if (message.includes('declined')) return ERROR_CODES.PAYMENT_DECLINED;
    if (message.includes('insufficient')) return ERROR_CODES.PAYMENT_INSUFFICIENT_FUNDS;
  }
  
  return ERROR_CODES.NETWORK_ERROR;
}

/**
 * Main error handler function
 */
export function handleAuthError(error, context = {}) {
  logger.error('[AuthErrorHandler] Processing error:', { error, context });
  
  const errorCode = parseErrorCode(error);
  const errorDetail = ERROR_DETAILS[errorCode] || {
    message: 'An unexpected error occurred. Please try again.',
    action: 'retry',
    severity: 'error'
  };
  
  // Add context-specific information
  if (context.isOnboarding && errorDetail.action === 'redirect_signin') {
    errorDetail.action = 'restart_onboarding';
  }
  
  // Log the error for monitoring
  logger.error('[AuthErrorHandler] Error details:', {
    code: errorCode,
    message: errorDetail.message,
    action: errorDetail.action,
    severity: errorDetail.severity,
    originalError: error.message || error.toString(),
    stack: error.stack
  });
  
  return {
    code: errorCode,
    ...errorDetail,
    originalError: error,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if cookies are enabled
 */
export function checkCookiesEnabled() {
  try {
    document.cookie = 'test=1';
    const cookieEnabled = document.cookie.indexOf('test') !== -1;
    document.cookie = 'test=1; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    return cookieEnabled;
  } catch (e) {
    return false;
  }
}

/**
 * Check if third-party cookies are blocked
 */
export async function checkThirdPartyCookies() {
  try {
    const response = await fetch('/api/auth/check-cookies', {
      credentials: 'include'
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const parsedError = handleAuthError(error);
      
      // Don't retry certain errors
      if (['wait', 'contact_support', 'enable_cookies'].includes(parsedError.action)) {
        throw error;
      }
      
      if (i === maxRetries - 1) throw error;
      
      const delay = initialDelay * Math.pow(2, i);
      logger.info(`[AuthErrorHandler] Retrying after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Format error for user display
 */
export function formatErrorForDisplay(error) {
  const handled = handleAuthError(error);
  
  return {
    title: handled.severity === 'error' ? 'Error' : 'Notice',
    message: handled.message,
    type: handled.severity,
    actionRequired: handled.action !== 'none',
    action: handled.action
  };
}

export default handleAuthError;