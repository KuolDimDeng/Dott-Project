/**
 * Enhanced TDZ (Temporal Dead Zone) Protection
 * This module provides runtime protection against TDZ errors
 */

export function initializeTDZProtection() {
  if (typeof window === 'undefined') return;

  // Store original functions
  const originalError = window.Error;
  const originalEval = window.eval;
  const originalFunction = window.Function;

  // Enhanced error handler
  window.Error = function TDZProtectedError(message, ...args) {
    if (message && typeof message === 'string') {
      // Check for TDZ error patterns
      const tdzPatterns = [
        /can't access lexical declaration/i,
        /Cannot access .* before initialization/i,
        /ReferenceError:.*is not defined/i,
        /Cannot read prop.* of undefined/i
      ];

      const isTDZError = tdzPatterns.some(pattern => pattern.test(message));

      if (isTDZError) {
        console.error('🚨 [TDZ Protection] Temporal Dead Zone error detected!');
        console.error('🚨 [TDZ Protection] Original message:', message);
        
        // Extract variable name
        const varMatch = message.match(/['"`]([^'"`]+)['"`]/);
        if (varMatch) {
          console.error('🚨 [TDZ Protection] Variable:', varMatch[1]);
        }

        // Log stack trace
        const stack = new originalError().stack;
        console.error('🚨 [TDZ Protection] Stack trace:', stack);

        // In production, attempt recovery
        if (process.env.NODE_ENV === 'production') {
          // Create a non-TDZ error message
          message = 'An initialization error occurred. Please refresh the page.';
          
          // Track the error for analytics
          if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('tdz_error', {
              original_message: message,
              variable_name: varMatch?.[1],
              url: window.location.href,
              user_agent: navigator.userAgent
            });
          }
        }
      }
    }

    return originalError.call(this, message, ...args);
  };

  // Preserve prototype chain
  window.Error.prototype = originalError.prototype;

  // Wrap eval to catch TDZ errors
  window.eval = function tdzSafeEval(code) {
    try {
      return originalEval.call(this, code);
    } catch (error) {
      if (error.message?.includes("can't access lexical declaration")) {
        console.error('🚨 [TDZ Protection] Error in eval:', error.message);
        throw new Error('Code evaluation error. Please refresh the page.');
      }
      throw error;
    }
  };

  // Wrap Function constructor
  window.Function = function tdzSafeFunction(...args) {
    try {
      return originalFunction.apply(this, args);
    } catch (error) {
      if (error.message?.includes("can't access lexical declaration")) {
        console.error('🚨 [TDZ Protection] Error in Function constructor:', error.message);
        throw new Error('Dynamic function creation error. Please refresh the page.');
      }
      throw error;
    }
  };

  // Add global error event listener
  window.addEventListener('error', (event) => {
    if (event.message?.includes("can't access lexical declaration")) {
      console.error('🚨 [TDZ Protection] Global error caught:', event.message);
      console.error('🚨 [TDZ Protection] File:', event.filename);
      console.error('🚨 [TDZ Protection] Line:', event.lineno);
      console.error('🚨 [TDZ Protection] Column:', event.colno);
      
      // Prevent default error handling in production
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
        
        // Show user-friendly error
        if (typeof window.showNotification === 'function') {
          window.showNotification('error', 'A loading error occurred. Please refresh the page.');
        }
      }
    }
  });

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes("can't access lexical declaration")) {
      console.error('🚨 [TDZ Protection] Unhandled promise rejection:', event.reason);
      
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
      }
    }
  });

  console.log('✅ [TDZ Protection] Enhanced protection initialized');
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTDZProtection);
  } else {
    initializeTDZProtection();
  }
}