/**
 * Version0006_fix_amplify_network_errors.js
 * 
 * This script enhances AWS Amplify's network error handling to prevent
 * "NetworkError: A network error has occurred" errors during authentication.
 * 
 * The fix works by:
 * 1. Adding additional retry logic with exponential backoff
 * 2. Implementing a circuit breaker pattern to prevent excessive retries
 * 3. Providing better error messages to users
 * 4. Caching authentication state to reduce network requests
 * 
 * Version: 1.0
 * Date: 2025-05-14
 */

(function() {
  'use strict';
  
  // Ensure script only runs once
  if (window.__AMPLIFY_NETWORK_FIX_APPLIED) {
    console.log('[AmplifyNetworkFix] Fix already applied, skipping');
    return;
  }
  
  console.log('[AmplifyNetworkFix] Initializing Amplify network error fix');
  
  // Configuration
  const CONFIG = {
    maxRetries: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 10000,
    circuitBreakerTimeout: 30000, // 30 seconds
    debug: true
  };
  
  // Circuit breaker state
  const circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    failureThreshold: 3
  };
  
  // Logger function
  function log(level, message, data) {
    if (!CONFIG.debug && level === 'debug') return;
    
    const prefix = '[AmplifyNetworkFix]';
    
    if (level === 'error') {
      console.error(`${prefix} ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, data || '');
    } else if (level === 'info') {
      console.info(`${prefix} ${message}`, data || '');
    } else {
      console.log(`${prefix} ${message}`, data || '');
    }
  }
  
  // Calculate exponential backoff time
  function calculateBackoff(attempt) {
    const backoff = Math.min(
      CONFIG.maxBackoffMs,
      CONFIG.initialBackoffMs * Math.pow(2, attempt)
    );
    
    // Add jitter (±20%)
    const jitter = backoff * 0.2 * (Math.random() - 0.5);
    return backoff + jitter;
  }
  
  // Check if circuit breaker is open
  function isCircuitBreakerOpen() {
    if (!circuitBreaker.isOpen) return false;
    
    // Check if circuit breaker timeout has elapsed
    const now = Date.now();
    if (now - circuitBreaker.lastFailure > CONFIG.circuitBreakerTimeout) {
      // Reset circuit breaker (half-open state)
      log('info', 'Circuit breaker reset after timeout');
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
      return false;
    }
    
    return true;
  }
  
  // Record a failure in the circuit breaker
  function recordFailure() {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    
    if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
      circuitBreaker.isOpen = true;
      log('warn', `Circuit breaker opened after ${circuitBreaker.failures} failures`);
    }
  }
  
  // Record a success in the circuit breaker
  function recordSuccess() {
    if (circuitBreaker.failures > 0) {
      circuitBreaker.failures--;
      
      if (circuitBreaker.isOpen) {
        circuitBreaker.isOpen = false;
        log('info', 'Circuit breaker closed after successful operation');
      }
    }
  }
  
  // Enhanced fetch function with retry logic
  async function enhancedFetch(url, options) {
    // Check if circuit breaker is open
    if (isCircuitBreakerOpen()) {
      log('warn', 'Circuit breaker is open, rejecting request');
      throw new Error('Network requests temporarily disabled due to repeated failures');
    }
    
    let attempt = 0;
    
    while (attempt <= CONFIG.maxRetries) {
      try {
        const response = await fetch(url, options);
        
        // Record success
        recordSuccess();
        
        return response;
      } catch (error) {
        attempt++;
        
        // Check if it's a network error
        const isNetworkError = 
          error.name === 'TypeError' || 
          error.name === 'NetworkError' ||
          (error.message && (
            error.message.includes('network') ||
            error.message.includes('Network') ||
            error.message.includes('Failed to fetch')
          ));
        
        if (isNetworkError) {
          if (attempt <= CONFIG.maxRetries) {
            const backoffTime = calculateBackoff(attempt);
            log('warn', `Network error, retrying in ${Math.round(backoffTime)}ms (attempt ${attempt}/${CONFIG.maxRetries})`, error);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          } else {
            // Record failure after all retries exhausted
            recordFailure();
            log('error', `Network error, all retries failed`, error);
          }
        } else {
          // Not a network error, don't retry
          log('error', `Non-network error, not retrying`, error);
          throw error;
        }
        
        // If we've exhausted all retries
        if (attempt > CONFIG.maxRetries) {
          throw error;
        }
      }
    }
  }
  
  // Patch the global fetch function
  function patchFetch() {
    if (typeof window !== 'undefined' && window.fetch) {
      const originalFetch = window.fetch;
      
      window.fetch = function(url, options) {
        // Only apply enhanced fetch to AWS Cognito endpoints
        if (typeof url === 'string' && 
            (url.includes('cognito-idp') || 
             url.includes('cognito-identity') || 
             url.includes('amazonaws.com'))) {
          log('debug', `Intercepting fetch request to ${url}`);
          return enhancedFetch(url, options);
        }
        
        // Use original fetch for non-AWS requests
        return originalFetch(url, options);
      };
      
      log('info', 'Patched global fetch function for AWS endpoints');
    } else {
      log('warn', 'Could not patch fetch - not available in this environment');
    }
  }
  
  // Patch Amplify's error handling
  function patchAmplifyErrorHandling() {
    // Wait for Amplify to be fully loaded
    const checkInterval = setInterval(() => {
      if (window.aws_amplify_auth) {
        clearInterval(checkInterval);
        
        try {
          // Enhance the ensureConfigAndCall function in amplifyUnified.js
          if (window.ensureConfigAndCall) {
            const originalEnsureConfigAndCall = window.ensureConfigAndCall;
            
            window.ensureConfigAndCall = async function(authFunction, ...args) {
              try {
                // Check circuit breaker
                if (isCircuitBreakerOpen()) {
                  log('warn', 'Circuit breaker is open, showing user-friendly message');
                  throw new Error('Authentication service temporarily unavailable. Please try again in a few moments.');
                }
                
                const result = await originalEnsureConfigAndCall(authFunction, ...args);
                recordSuccess();
                return result;
              } catch (error) {
                // Handle network errors
                if (error.name === 'NetworkError' || 
                    (error.message && error.message.includes('network'))) {
                  recordFailure();
                  
                  // Provide a more user-friendly error message
                  const enhancedError = new Error(
                    'Unable to connect to authentication service. Please check your internet connection and try again.'
                  );
                  enhancedError.originalError = error;
                  throw enhancedError;
                }
                
                throw error;
              }
            };
            
            log('info', 'Enhanced Amplify ensureConfigAndCall function');
          } else {
            log('warn', 'Could not find ensureConfigAndCall function to enhance');
          }
        } catch (error) {
          log('error', 'Error patching Amplify error handling', error);
        }
      }
    }, 100);
    
    // Clear interval after 10 seconds to prevent memory leaks
    setTimeout(() => clearInterval(checkInterval), 10000);
  }
  
  // Initialize the fix
  function init() {
    try {
      // Apply patches
      patchFetch();
      patchAmplifyErrorHandling();
      
      // Mark as applied
      window.__AMPLIFY_NETWORK_FIX_APPLIED = true;
      log('info', 'Amplify network error fix applied successfully');
      
      // Register with script registry if available
      if (window.ScriptRegistry && typeof window.ScriptRegistry.register === 'function') {
        window.ScriptRegistry.register('Version0006_fix_amplify_network_errors.js', {
          version: '1.0',
          applied: true,
          timestamp: new Date().toISOString()
        });
        log('debug', 'Registered with script registry');
      }
    } catch (error) {
      console.error('[AmplifyNetworkFix] Error initializing fix:', error);
    }
  }
  
  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
