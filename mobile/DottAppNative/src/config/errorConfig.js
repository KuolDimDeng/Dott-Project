/**
 * Error Configuration
 * Centralized configuration for error handling behavior
 */

export const ErrorConfig = {
  // Master switch to suppress all errors from UI
  suppressAllErrors: true,

  // Suppress specific types of errors
  suppressNetworkErrors: true,
  suppressWebSocketErrors: true,
  suppressAuthErrors: true,
  suppressValidationErrors: true,

  // Keywords to identify error alerts that should be suppressed
  errorKeywords: [
    'error',
    'failed',
    'failure',
    'exception',
    'network',
    'connection',
    'timeout',
    'unauthorized',
    'forbidden',
    'invalid',
    'unable',
    'couldn\'t',
    'can\'t',
    'cannot',
    'problem',
    'issue',
    'wrong',
    'bad',
    'incorrect',
    'rejected',
    'denied',
    'websocket',
    'socket',
    'stripe',
    'payment'
  ],

  // Alert titles that should always be suppressed
  suppressedAlertTitles: [
    'Error',
    'Network Error',
    'Connection Error',
    'Authentication Error',
    'Validation Error',
    'Payment Failed',
    'WebSocket Error',
    'Session Expired',
    'Request Failed',
    'API Error',
    'Server Error',
    'Oops',
    'Something went wrong',
    'Warning',
    'Alert'
  ],

  // Messages that indicate errors (partial matches)
  errorMessagePatterns: [
    'please try again',
    'something went wrong',
    'unable to',
    'failed to',
    'could not',
    'network error',
    'connection lost',
    'request failed',
    'invalid response',
    'not found',
    '404',
    '401',
    '403',
    '500',
    'timeout',
    'timed out',
    'no internet',
    'offline',
    'disconnected'
  ],

  // Console methods to override
  consoleMethods: ['error', 'warn', 'assert'],

  // Whether to suppress in development mode
  suppressInDev: true, // Set to false if you want errors in dev mode

  // Whether to log suppressed errors to console
  logSuppressedErrors: true,

  // Custom log prefix for suppressed errors
  logPrefix: '🔇 [Suppressed]',

  // Enable stack trace in console logs
  includeStackTrace: true,

  // Maximum error log length (to prevent huge logs)
  maxLogLength: 500,
};

export default ErrorConfig;