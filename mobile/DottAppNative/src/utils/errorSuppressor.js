/**
 * Global Error Suppressor
 * Silences ALL errors from displaying on the phone while keeping them in Xcode console logs
 * This ensures errors only appear in Xcode console, not as user-facing alerts
 */

import { Alert, LogBox, YellowBox } from 'react-native';
import ErrorConfig from '../config/errorConfig';

// Store original methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalAlert = Alert.alert;

/**
 * Initialize error suppression
 * Call this at the very start of your app (in index.js or App.js)
 */
export const initializeErrorSuppression = () => {
  // Check if we should suppress based on config
  const suppressErrors = ErrorConfig.suppressAllErrors && (!__DEV__ || ErrorConfig.suppressInDev);

  if (suppressErrors) {
    // Override console.error to prevent it from triggering UI alerts
    console.error = (...args) => {
      if (ErrorConfig.logSuppressedErrors) {
        // Clean up the args to prevent circular references
        const cleanArgs = args.map(arg => {
          if (arg && typeof arg === 'object') {
            try {
              // Try to stringify objects
              return JSON.stringify(arg, null, 2).substring(0, ErrorConfig.maxLogLength);
            } catch {
              // If circular reference, just show type
              return `[Object ${arg.constructor?.name || 'Object'}]`;
            }
          }
          return arg;
        });
        originalConsoleLog(`${ErrorConfig.logPrefix} ERROR:`, ...cleanArgs);
      }
    };

    // Override console.warn to prevent yellow boxes
    console.warn = (...args) => {
      if (ErrorConfig.logSuppressedErrors) {
        originalConsoleLog(`${ErrorConfig.logPrefix} WARN:`, ...args);
      }
    };

    // Suppress LogBox completely (the new yellow/red box)
    LogBox.ignoreAllLogs(true);

    // Also suppress the old YellowBox if it exists
    if (YellowBox) {
      YellowBox.ignoreWarnings(['.*']);
    }

    // Override Alert.alert to suppress ALL error alerts
    Alert.alert = (title, message, buttons, options) => {
      const titleStr = String(title || '').toLowerCase();
      const messageStr = String(message || '').toLowerCase();

      // Check if this should be suppressed based on config
      const shouldSuppress =
        ErrorConfig.suppressedAlertTitles.some(t => titleStr.includes(t.toLowerCase())) ||
        ErrorConfig.errorKeywords.some(keyword =>
          titleStr.includes(keyword) || messageStr.includes(keyword)
        ) ||
        ErrorConfig.errorMessagePatterns.some(pattern =>
          messageStr.includes(pattern.toLowerCase())
        );

      if (shouldSuppress) {
        // Log to Xcode console only
        if (ErrorConfig.logSuppressedErrors) {
          originalConsoleLog(`${ErrorConfig.logPrefix} ALERT:`, {
            title: title || 'No Title',
            message: message || 'No Message',
            timestamp: new Date().toISOString()
          });
        }
        return;
      }

      // Allow non-error alerts (like success messages, user confirmations, etc.)
      originalAlert(title, message, buttons, options);
    };

    // Suppress unhandled promise rejections
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.disable();

    // Override global error handler to catch ALL unhandled errors
    if (global.ErrorUtils) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        if (ErrorConfig.logSuppressedErrors) {
          // Create a clean error object for logging
          const errorInfo = {
            message: error?.message || 'Unknown error',
            isFatal: isFatal,
            timestamp: new Date().toISOString()
          };

          if (ErrorConfig.includeStackTrace && error?.stack) {
            errorInfo.stack = error.stack.substring(0, ErrorConfig.maxLogLength);
          }

          originalConsoleLog(
            `${ErrorConfig.logPrefix} ${isFatal ? 'FATAL' : 'GLOBAL'} ERROR:`,
            errorInfo
          );
        }

        // Never show UI for errors - just log them
        // Don't call any handlers that might show error screens
      });
    }

    // Also catch network request errors
    const originalFetch = global.fetch;
    if (originalFetch) {
      global.fetch = (...args) => {
        return originalFetch(...args).catch(error => {
          if (ErrorConfig.logSuppressedErrors && ErrorConfig.suppressNetworkErrors) {
            originalConsoleLog(`${ErrorConfig.logPrefix} NETWORK ERROR:`, {
              url: args[0],
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
          // Re-throw to maintain normal flow but error won't show UI
          throw error;
        });
      };
    }

    // Suppress XMLHttpRequest errors
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', function() {
        if (ErrorConfig.logSuppressedErrors && ErrorConfig.suppressNetworkErrors) {
          originalConsoleLog(`${ErrorConfig.logPrefix} XHR ERROR:`, {
            url: this.responseURL,
            status: this.status,
            timestamp: new Date().toISOString()
          });
        }
      });
      return originalXHRSend.apply(this, args);
    };

    originalConsoleLog('✅ Error suppression initialized - ALL errors will only appear in Xcode console');
  }
};

/**
 * Restore original error handling (useful for debugging)
 */
export const restoreErrorHandling = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  Alert.alert = originalAlert;
  LogBox.ignoreAllLogs(false);
  console.log('🔄 Error handling restored to default');
};

/**
 * Safe error logger that only logs to console
 */
export const logError = (source, error, extra = {}) => {
  // This will always log to Xcode console but never show UI
  originalConsoleError(`[${source}]`, {
    message: error?.message || error,
    stack: error?.stack,
    ...extra
  });
};

/**
 * Safe warning logger
 */
export const logWarning = (source, message, extra = {}) => {
  originalConsoleWarn(`[${source}]`, message, extra);
};

/**
 * Check if error suppression is active
 */
export const isSuppressionActive = () => {
  return console.error !== originalConsoleError;
};

export default {
  initializeErrorSuppression,
  restoreErrorHandling,
  logError,
  logWarning,
  isSuppressionActive
};