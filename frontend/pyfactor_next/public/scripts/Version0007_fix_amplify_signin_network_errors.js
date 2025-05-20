/**
 * Version0007_fix_amplify_signin_network_errors.js
 * 
 * Enhanced fix for AWS Amplify sign-in network errors that builds on Version0006.
 * This script specifically targets authentication failures during sign-in with
 * "NetworkError: A network error has occurred" errors.
 * 
 * The fix works by:
 * 1. Adding special handling for SRP (Secure Remote Password) authentication requests
 * 2. Implementing operation-specific circuit breakers (sign-in vs. other operations)
 * 3. Ensuring proper casing for Cognito attributes per CognitoAttributesReference.md
 * 4. Improving error feedback and recovery for authentication operations
 * 5. Adding cross-tab coordination for circuit breaker state
 * 
 * Version: 1.0
 * Date: 2025-05-14
 */

(function() {
  'use strict';
  
  // Ensure script only runs once
  if (window.__AMPLIFY_SIGNIN_FIX_APPLIED) {
    console.log('[AmplifySignInFix] Fix already applied, skipping');
    return;
  }
  
  console.log('[AmplifySignInFix] Initializing Amplify sign-in network error fix');
  
  // Configuration
  const CONFIG = {
    // Sign-in specific settings
    signIn: {
      maxRetries: 5,
      initialBackoffMs: 800,
      maxBackoffMs: 8000,
      circuitBreakerTimeout: 20000, // 20 seconds for sign-in
      jitterFactor: 0.3 // 30% jitter
    },
    
    // Global settings
    debug: true,
    srpEndpointDetectionPatterns: [
      'InitiateAuth',
      'RespondToAuthChallenge',
      'SignIn',
      'InitiateSrp'
    ],
    
    // Storage keys
    storageKeys: {
      circuitBreakerState: 'amplify_circuit_breaker_state',
      lastSignInAttempt: 'amplify_last_signin_attempt',
      circuitBreakerSignIn: 'amplify_circuit_breaker_signin'
    }
  };
  
  // State management
  const state = {
    originalFetch: null,
    originalAmplifySignIn: null,
    authLibAvailable: false,
    signInFixApplied: false,
    sessionStorageAvailable: false
  };
  
  // Check for session storage availability
  try {
    const testKey = '_amplify_storage_test';
    sessionStorage.setItem(testKey, '1');
    sessionStorage.removeItem(testKey);
    state.sessionStorageAvailable = true;
  } catch (e) {
    state.sessionStorageAvailable = false;
    console.log('[AmplifySignInFix] Session storage not available');
  }
  
  // Logger function
  function log(level, message, data) {
    if (!CONFIG.debug && level === 'debug') return;
    
    const prefix = '[AmplifySignInFix]';
    
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
  
  // Determine if a request is an SRP authentication request
  function isSrpAuthRequest(url, options) {
    if (!url || typeof url !== 'string') return false;
    
    // Check URL patterns
    const isAwsCognitoUrl = url.includes('cognito-idp') || 
                          url.includes('cognito-identity') || 
                          url.includes('amazonaws.com');
    
    if (!isAwsCognitoUrl) return false;
    
    // Check for SRP-specific patterns in request body
    if (options && options.body) {
      let bodyContent = '';
      
      try {
        // Try to get request body content
        if (typeof options.body === 'string') {
          bodyContent = options.body;
        } else if (options.body instanceof FormData) {
          // Can't easily inspect FormData, assume it's not SRP
          return false;
        } else if (options.body instanceof Blob) {
          // Can't easily inspect Blob synchronously, assume it's not SRP
          return false;
        } else if (typeof options.body.toString === 'function') {
          bodyContent = options.body.toString();
        }
        
        // Check for SRP patterns in the body
        if (bodyContent) {
          // Check for SRP specific content
          return CONFIG.srpEndpointDetectionPatterns.some(pattern => 
            bodyContent.includes(pattern)
          );
        }
      } catch (e) {
        // If we can't inspect the body, err on the side of caution
        log('debug', 'Error inspecting request body, assuming not SRP', e);
        return false;
      }
    }
    
    // Default to standard AWS detection
    return false;
  }
  
  // Get circuit breaker state
  function getCircuitBreakerState(key) {
    if (!state.sessionStorageAvailable) return null;
    
    try {
      const storedState = sessionStorage.getItem(key);
      
      if (storedState) {
        return JSON.parse(storedState);
      }
    } catch (e) {
      log('debug', `Error getting circuit breaker state for ${key}`, e);
    }
    
    return null;
  }
  
  // Save circuit breaker state
  function saveCircuitBreakerState(key, circuitState) {
    if (!state.sessionStorageAvailable) return;
    
    try {
      sessionStorage.setItem(key, JSON.stringify(circuitState));
    } catch (e) {
      log('debug', `Error saving circuit breaker state for ${key}`, e);
    }
  }
  
  // Get sign-in specific circuit breaker
  function getSignInCircuitBreaker() {
    // First, try to get from session storage for cross-tab coordination
    const storedState = getCircuitBreakerState(CONFIG.storageKeys.circuitBreakerSignIn);
    
    if (storedState) {
      return storedState;
    }
    
    // Default state
    const defaultState = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      failureThreshold: 3,
      lastReset: Date.now()
    };
    
    // Save default state
    saveCircuitBreakerState(CONFIG.storageKeys.circuitBreakerSignIn, defaultState);
    
    return defaultState;
  }
  
  // Save sign-in circuit breaker state
  function saveSignInCircuitBreaker(breakerState) {
    saveCircuitBreakerState(CONFIG.storageKeys.circuitBreakerSignIn, breakerState);
  }
  
  // Check if sign-in circuit breaker is open
  function isSignInCircuitBreakerOpen() {
    const circuitBreaker = getSignInCircuitBreaker();
    
    if (!circuitBreaker.isOpen) return false;
    
    // Check if circuit breaker timeout has elapsed
    const now = Date.now();
    if (now - circuitBreaker.lastFailure > CONFIG.signIn.circuitBreakerTimeout) {
      // Reset circuit breaker (half-open state)
      log('info', 'Sign-in circuit breaker reset after timeout');
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
      circuitBreaker.lastReset = now;
      saveSignInCircuitBreaker(circuitBreaker);
      return false;
    }
    
    return true;
  }
  
  // Record a failure in the sign-in circuit breaker
  function recordSignInFailure(error) {
    const circuitBreaker = getSignInCircuitBreaker();
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    
    // Categorize the error for diagnostics
    const errorCategory = categorizeError(error);
    circuitBreaker.lastErrorCategory = errorCategory;
    
    if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
      circuitBreaker.isOpen = true;
      log('warn', `Sign-in circuit breaker opened after ${circuitBreaker.failures} failures. Category: ${errorCategory}`);
    }
    
    saveSignInCircuitBreaker(circuitBreaker);
  }
  
  // Record a success in the sign-in circuit breaker
  function recordSignInSuccess() {
    const circuitBreaker = getSignInCircuitBreaker();
    
    if (circuitBreaker.failures > 0) {
      circuitBreaker.failures = 0;
      
      if (circuitBreaker.isOpen) {
        circuitBreaker.isOpen = false;
        log('info', 'Sign-in circuit breaker closed after successful operation');
      }
      
      saveSignInCircuitBreaker(circuitBreaker);
    }
  }
  
  // Reset the sign-in circuit breaker
  function resetSignInCircuitBreaker() {
    const defaultState = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      failureThreshold: 3,
      lastReset: Date.now()
    };
    
    saveSignInCircuitBreaker(defaultState);
    log('info', 'Sign-in circuit breaker manually reset');
  }
  
  // Calculate backoff time with jitter for SRP requests
  function calculateSrpBackoff(attempt) {
    const baseBackoff = Math.min(
      CONFIG.signIn.maxBackoffMs,
      CONFIG.signIn.initialBackoffMs * Math.pow(2, attempt)
    );
    
    // Add jitter (±CONFIG.signIn.jitterFactor)
    const jitter = baseBackoff * CONFIG.signIn.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(100, baseBackoff + jitter); // Ensure minimum 100ms
  }
  
  // Categorize error for better diagnostics
  function categorizeError(error) {
    if (!error) return 'unknown';
    
    // Network errors
    if (error.name === 'TypeError' || 
        error.name === 'NetworkError' ||
        (error.message && (
          error.message.includes('network') ||
          error.message.includes('Network') ||
          error.message.includes('Failed to fetch')
        ))) {
      return 'network';
    }
    
    // Timeout errors
    if (error.name === 'TimeoutError' || 
        error.message?.includes('timeout') ||
        error.message?.includes('Timeout')) {
      return 'timeout';
    }
    
    // CORS errors
    if (error.message?.includes('CORS') || 
        error.message?.includes('cross-origin')) {
      return 'cors';
    }
    
    // Auth errors
    if (error.name?.includes('Auth') || 
        error.message?.includes('auth') ||
        error.message?.includes('Auth') ||
        error.message?.includes('token') ||
        error.message?.includes('credentials')) {
      return 'auth';
    }
    
    // SRP specific errors
    if (error.message?.includes('SRP') || 
        error.message?.includes('password') ||
        error.message?.includes('challenge')) {
      return 'srp';
    }
    
    return 'other';
  }
  
  // Enhanced fetch function with specialized SRP handling
  async function enhancedFetch(url, options, isSrpRequest = false) {
    // Apply specific circuit breaker for SRP requests
    if (isSrpRequest && isSignInCircuitBreakerOpen()) {
      const circuitBreaker = getSignInCircuitBreaker();
      const timeSinceFailure = Date.now() - circuitBreaker.lastFailure;
      
      log('warn', `Sign-in circuit breaker is open (${Math.round(timeSinceFailure / 1000)}s since last failure), rejecting request`);
      throw new Error('Sign-in temporarily disabled due to repeated failures. Please try again in a few moments.');
    }
    
    // Use appropriate retry settings based on request type
    const config = isSrpRequest ? CONFIG.signIn : CONFIG;
    let attempt = 0;
    
    while (attempt <= config.maxRetries) {
      try {
        log('debug', `Attempting fetch ${isSrpRequest ? '(SRP)' : ''}, attempt ${attempt + 1}/${config.maxRetries + 1}`);
        
        const response = await state.originalFetch(url, options);
        
        // Record success for appropriate circuit breaker
        if (isSrpRequest) {
          recordSignInSuccess();
        }
        
        return response;
      } catch (error) {
        attempt++;
        const errorCategory = categorizeError(error);
        
        // Use appropriate logging based on request type
        if (isSrpRequest) {
          log('warn', `SRP request error (${errorCategory}), attempt ${attempt}/${config.maxRetries + 1}: ${error.message}`);
        } else {
          log('warn', `Fetch error (${errorCategory}), attempt ${attempt}/${config.maxRetries + 1}: ${error.message}`);
        }
        
        // If we've exhausted all retries, record failure and throw
        if (attempt > config.maxRetries) {
          if (isSrpRequest) {
            recordSignInFailure(error);
          }
          
          // For SRP requests, enhance the error message to be more user-friendly
          if (isSrpRequest) {
            const enhancedError = new Error(
              'Unable to sign in due to a network issue. Please check your internet connection and try again in a few moments.'
            );
            enhancedError.originalError = error;
            enhancedError.category = errorCategory;
            throw enhancedError;
          }
          
          throw error;
        }
        
        // Wait before retrying with appropriate backoff
        const backoffTime = isSrpRequest
          ? calculateSrpBackoff(attempt)
          : Math.min(1000 * Math.pow(2, attempt - 1), config.maxBackoffMs);
        
        log('debug', `Waiting ${Math.round(backoffTime)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  // Patch the global fetch function with SRP-aware handling
  function patchFetch() {
    if (typeof window !== 'undefined' && window.fetch) {
      // Store the original fetch
      state.originalFetch = window.fetch;
      
      // Replace with enhanced version
      window.fetch = function(url, options) {
        // Determine if this is an SRP authentication request
        const isSrpRequest = isSrpAuthRequest(url, options);
        
        if (typeof url === 'string' && (
            url.includes('cognito-idp') || 
            url.includes('cognito-identity') || 
            url.includes('amazonaws.com'))) {
          
          // Use specific logging for SRP requests
          if (isSrpRequest) {
            log('debug', 'Intercepting SRP authentication request');
          } else {
            log('debug', 'Intercepting AWS request');
          }
          
          return enhancedFetch(url, options, isSrpRequest);
        }
        
        // Use original fetch for non-AWS requests
        return state.originalFetch(url, options);
      };
      
      log('info', 'Patched global fetch function with SRP-aware handler');
    } else {
      log('warn', 'Could not patch fetch - not available in this environment');
    }
  }
  
  // Ensure correct casing for Cognito attributes
  function correctCognitoAttributeCasing(attributes) {
    if (!attributes || typeof attributes !== 'object') return attributes;
    
    const correctedAttributes = { ...attributes };
    
    // Check for tenant ID with wrong casing and fix it
    if ('custom:tenant_id' in correctedAttributes && !('custom:tenant_ID' in correctedAttributes)) {
      log('debug', 'Fixing tenant_id casing to tenant_ID');
      correctedAttributes['custom:tenant_ID'] = correctedAttributes['custom:tenant_id'];
    }
    
    // Other attribute corrections could be added here
    
    return correctedAttributes;
  }
  
  // Patch Amplify's signIn method directly for better error handling
  function patchAmplifySignIn() {
    // Wait for Amplify Auth to be fully loaded
    const checkForAuth = setInterval(() => {
      let authModule = null;
      
      // Try to find the Auth module in different possible locations
      if (window.aws_amplify_auth) {
        state.authLibAvailable = true;
        authModule = window.aws_amplify_auth;
      } else if (window.Amplify && window.Amplify.Auth) {
        state.authLibAvailable = true;
        authModule = window.Amplify.Auth;
      } else if (window.Auth) {
        state.authLibAvailable = true;
        authModule = window.Auth;
      }
      
      if (state.authLibAvailable) {
        clearInterval(checkForAuth);
        log('debug', 'Amplify Auth module found, attempting to patch signIn');
        
        try {
          // Find the signIn function
          let signInFunction = null;
          
          if (authModule.signIn) {
            signInFunction = authModule.signIn;
          } else if (window.signIn) {
            signInFunction = window.signIn;
          } else if (window.aws_amplify_auth && window.aws_amplify_auth.signIn) {
            signInFunction = window.aws_amplify_auth.signIn;
          }
          
          if (signInFunction && typeof signInFunction === 'function') {
            // Save the original function
            state.originalAmplifySignIn = signInFunction;
            
            // Create a new wrapper function
            const enhancedSignIn = async function(...args) {
              // Check circuit breaker before attempt
              if (isSignInCircuitBreakerOpen()) {
                const circuitBreaker = getSignInCircuitBreaker();
                const timeSinceFailure = Date.now() - circuitBreaker.lastFailure;
                const remainingTime = Math.max(0, CONFIG.signIn.circuitBreakerTimeout - timeSinceFailure);
                
                log('warn', `Sign-in circuit breaker is open, please wait ${Math.round(remainingTime / 1000)}s`);
                
                throw new Error(
                  `Sign-in temporarily unavailable due to network issues. Please try again in ${Math.round(remainingTime / 1000)} seconds.`
                );
              }
              
              // Track the sign-in attempt time
              if (state.sessionStorageAvailable) {
                try {
                  sessionStorage.setItem(CONFIG.storageKeys.lastSignInAttempt, Date.now().toString());
                } catch (e) {
                  // Ignore storage errors
                }
              }
              
              // Apply enhanced retry logic
              let attempt = 0;
              let lastError = null;
              
              while (attempt <= CONFIG.signIn.maxRetries) {
                try {
                  const result = await state.originalAmplifySignIn(...args);
                  
                  // Record success
                  recordSignInSuccess();
                  
                  return result;
                } catch (error) {
                  attempt++;
                  lastError = error;
                  
                  // Categorize the error
                  const errorCategory = categorizeError(error);
                  log('warn', `Sign-in error (${errorCategory}), attempt ${attempt}/${CONFIG.signIn.maxRetries + 1}: ${error.message}`);
                  
                  // If we've exhausted all retries, record failure and throw
                  if (attempt > CONFIG.signIn.maxRetries) {
                    recordSignInFailure(error);
                    
                    // Enhance the error with user-friendly message
                    const enhancedError = new Error(
                      'Unable to sign in due to a network issue. Please check your internet connection and try again in a few moments.'
                    );
                    enhancedError.originalError = error;
                    enhancedError.category = errorCategory;
                    throw enhancedError;
                  }
                  
                  // Wait before retrying with backoff
                  const backoffTime = calculateSrpBackoff(attempt);
                  log('debug', `Waiting ${Math.round(backoffTime)}ms before retry`);
                  await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
              }
              
              // We should never reach here, but just in case
              throw lastError || new Error('Sign-in failed after multiple attempts');
            };
            
            // Replace the original function
            if (authModule.signIn) {
              authModule.signIn = enhancedSignIn;
            }
            if (window.signIn) {
              window.signIn = enhancedSignIn;
            }
            if (window.aws_amplify_auth && window.aws_amplify_auth.signIn) {
              window.aws_amplify_auth.signIn = enhancedSignIn;
            }
            
            // Patch ensureConfigAndCall if available
            if (window.ensureConfigAndCall && typeof window.ensureConfigAndCall === 'function') {
              const originalEnsureConfigAndCall = window.ensureConfigAndCall;
              
              window.ensureConfigAndCall = async function(authFunction, ...args) {
                try {
                  // Special handling for signIn function
                  if (authFunction === signInFunction || authFunction === enhancedSignIn) {
                    // Check circuit breaker
                    if (isSignInCircuitBreakerOpen()) {
                      const circuitBreaker = getSignInCircuitBreaker();
                      const timeSinceFailure = Date.now() - circuitBreaker.lastFailure;
                      const remainingTime = Math.max(0, CONFIG.signIn.circuitBreakerTimeout - timeSinceFailure);
                      
                      log('warn', `Sign-in circuit breaker is open, please wait ${Math.round(remainingTime / 1000)}s`);
                      
                      throw new Error(
                        `Sign-in temporarily unavailable due to network issues. Please try again in ${Math.round(remainingTime / 1000)} seconds.`
                      );
                    }
                    
                    // For signIn, use our patched version directly
                    return enhancedSignIn(...args);
                  }
                  
                  // For other auth functions, use the original ensureConfigAndCall
                  return originalEnsureConfigAndCall(authFunction, ...args);
                } catch (error) {
                  // Enhance network error messages
                  if (error.name === 'NetworkError' || 
                      (error.message && error.message.includes('network'))) {
                    
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
            }
            
            state.signInFixApplied = true;
            log('info', 'Successfully patched Amplify signIn function');
          } else {
            log('warn', 'Could not find Amplify signIn function to patch');
          }
        } catch (error) {
          log('error', 'Error patching Amplify signIn function', error);
        }
      }
    }, 100);
    
    // Clear the interval after 10 seconds to prevent memory leaks
    setTimeout(() => clearInterval(checkForAuth), 10000);
  }
  
  // Create or patch the CognitoAttributes utility
  function enhanceCognitoAttributes() {
    try {
      // Create a CognitoAttributes utility if it doesn't exist
      if (!window.CognitoAttributes) {
        window.CognitoAttributes = {
          // Standard attributes
          SUB: 'sub',
          EMAIL: 'email',
          GIVEN_NAME: 'given_name',
          FAMILY_NAME: 'family_name',
          
          // Custom attributes with correct casing
          TENANT_ID: 'custom:tenant_ID', // Note correct casing with uppercase ID
          BUSINESS_ID: 'custom:businessid',
          BUSINESS_NAME: 'custom:businessname',
          USER_ROLE: 'custom:userrole',
          
          // Getter with validation
          getValue: function(attributes, attributeName) {
            if (!attributes) return null;
            return attributes[attributeName] || null;
          },
          
          // Safe getters for common attributes
          getTenantId: function(attributes) {
            return this.getValue(attributes, this.TENANT_ID);
          },
          
          getBusinessId: function(attributes) {
            return this.getValue(attributes, this.BUSINESS_ID);
          },
          
          getBusinessName: function(attributes) {
            return this.getValue(attributes, this.BUSINESS_NAME);
          },
          
          getUserRole: function(attributes) {
            return this.getValue(attributes, this.USER_ROLE);
          },
          
          // Additional utility methods
          formatUserInitials: function(attributes) {
            const firstName = this.getValue(attributes, this.GIVEN_NAME) || '';
            const lastName = this.getValue(attributes, this.FAMILY_NAME) || '';
            
            if (firstName && lastName) {
              return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
            } else if (firstName) {
              return firstName.charAt(0).toUpperCase();
            } else if (lastName) {
              return lastName.charAt(0).toUpperCase();
            }
            
            const email = this.getValue(attributes, this.EMAIL) || '';
            return email.charAt(0).toUpperCase() || 'U';
          }
        };
        
        log('info', 'Created CognitoAttributes utility');
      } else {
        // Ensure the existing utility has the correct TENANT_ID casing
        if (window.CognitoAttributes.TENANT_ID !== 'custom:tenant_ID') {
          log('warn', 'Fixing incorrect TENANT_ID casing in CognitoAttributes');
          window.CognitoAttributes.TENANT_ID = 'custom:tenant_ID';
        }
      }
    } catch (error) {
      log('error', 'Error enhancing CognitoAttributes', error);
    }
  }
  
  // Expose circuit breaker reset function globally
  function exposeCircuitBreakerReset() {
    window.__resetAmplifySignInCircuitBreaker = function() {
      resetSignInCircuitBreaker();
      return true;
    };
    
    // Also register with any existing circuit breaker reset function
    if (window.__resetCircuitBreakers) {
      const originalReset = window.__resetCircuitBreakers;
      window.__resetCircuitBreakers = function() {
        const origResult = originalReset();
        resetSignInCircuitBreaker();
        return origResult;
      };
    } else {
      window.__resetCircuitBreakers = function() {
        resetSignInCircuitBreaker();
        return true;
      };
    }
    
    log('debug', 'Exposed circuit breaker reset functions');
  }
  
  // Initialize the fix
  function init() {
    try {
      // Apply patches
      patchFetch();
      patchAmplifySignIn();
      enhanceCognitoAttributes();
      exposeCircuitBreakerReset();
      
      // Mark as applied
      window.__AMPLIFY_SIGNIN_FIX_APPLIED = true;
      log('info', 'Amplify sign-in network error fix applied successfully');
      
      // Register with script registry if available
      if (window.ScriptRegistry && typeof window.ScriptRegistry.register === 'function') {
        window.ScriptRegistry.register('Version0007_fix_amplify_signin_network_errors.js', {
          version: '1.0',
          applied: true,
          timestamp: new Date().toISOString(),
          dependencies: ['Version0006_fix_amplify_network_errors.js']
        });
        log('debug', 'Registered with script registry');
      }
    } catch (error) {
      console.error('[AmplifySignInFix] Error initializing fix:', error);
    }
  }
  
  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
