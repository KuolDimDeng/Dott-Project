/**
 * Version0008_fix_network_errors_comprehensive.js
 * 
 * Comprehensive fix for network errors during sign-in including:
 * 1. Consolidating multiple fetch wrappers that conflict with each other
 * 2. Fixing Next.js 15 RSC payload fetch errors
 * 3. Improving authentication session handling
 * 4. Implementing unified network error recovery
 * 5. Using CognitoAttributes utility for proper attribute access
 * 
 * This script replaces and consolidates:
 * - Version0006_fix_amplify_network_errors.js
 * - Version0007_fix_amplify_signin_network_errors.js  
 * - Multiple fetch wrappers in layout.js and other scripts
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: CognitoAttributes utility
 */

(function() {
  'use strict';
  
  // Prevent multiple script execution
  if (window.__NETWORK_FIX_COMPREHENSIVE_APPLIED) {
    console.log('[NetworkFixComprehensive] Fix already applied, skipping');
    return;
  }
  
  console.log('[NetworkFixComprehensive] Initializing comprehensive network error fix');
  
  // Configuration
  const CONFIG = {
    // Network settings
    maxRetries: 3,
    baseRetryDelay: 1000,
    maxRetryDelay: 5000,
    requestTimeout: 30000,
    
    // Circuit breaker settings
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      halfOpenMaxCalls: 3
    },
    
    // RSC settings
    rsc: {
      enabled: true,
      maxRetries: 2,
      fallbackTimeout: 2000
    },
    
    // Auth settings
    auth: {
      maxRetries: 3,
      retryDelay: 2000,
      sessionRefreshThreshold: 300000 // 5 minutes
    },
    
    debug: true
  };
  
  // State management
  const state = {
    originalFetch: null,
    circuitBreaker: {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      halfOpenCalls: 0
    },
    networkMetrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    },
    activeRequests: new Map(),
    authSession: {
      lastRefresh: 0,
      isRefreshing: false
    }
  };
  
  // Logger with levels
  function log(level, message, data) {
    if (!CONFIG.debug && level === 'debug') return;
    
    const prefix = '[NetworkFixComprehensive]';
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${timestamp} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${timestamp} ${message}`, data || '');
        break;
      case 'info':
        console.info(`${prefix} ${timestamp} ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} ${timestamp} ${message}`, data || '');
    }
  }
  
  // Error categorization
  function categorizeError(error) {
    if (!error) return 'unknown';
    
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    // Network connectivity
    if (name.includes('networkerror') || message.includes('network error')) {
      return 'network_connectivity';
    }
    
    // RSC payload errors
    if (message.includes('rsc payload') || message.includes('failed to fetch rsc')) {
      return 'rsc_payload';
    }
    
    // Authentication errors
    if (error.status === 401 || message.includes('unauthorized') || message.includes('user needs to be authenticated')) {
      return 'authentication';
    }
    
    // CORS errors
    if (message.includes('cors') || message.includes('cross-origin')) {
      return 'cors';
    }
    
    // Timeout errors
    if (message.includes('timeout') || name.includes('timeout')) {
      return 'timeout';
    }
    
    // DNS errors
    if (message.includes('dns') || message.includes('enotfound')) {
      return 'dns';
    }
    
    return 'unknown';
  }
  
  // Circuit breaker implementation
  function isCircuitBreakerOpen() {
    const now = Date.now();
    
    // Check if we should move from OPEN to HALF_OPEN
    if (state.circuitBreaker.state === 'OPEN') {
      if (now - state.circuitBreaker.lastFailure > CONFIG.circuitBreaker.recoveryTimeout) {
        state.circuitBreaker.state = 'HALF_OPEN';
        state.circuitBreaker.halfOpenCalls = 0;
        log('info', 'Circuit breaker moved to HALF_OPEN state');
      }
    }
    
    return state.circuitBreaker.state === 'OPEN';
  }
  
  function recordSuccess() {
    state.networkMetrics.successfulRequests++;
    
    if (state.circuitBreaker.state === 'HALF_OPEN') {
      state.circuitBreaker.halfOpenCalls++;
      
      if (state.circuitBreaker.halfOpenCalls >= CONFIG.circuitBreaker.halfOpenMaxCalls) {
        state.circuitBreaker.state = 'CLOSED';
        state.circuitBreaker.failures = 0;
        log('info', 'Circuit breaker closed after successful recovery');
      }
    } else if (state.circuitBreaker.state === 'CLOSED') {
      // Reset failure count on success
      state.circuitBreaker.failures = 0;
    }
  }
  
  function recordFailure(error) {
    state.networkMetrics.failedRequests++;
    state.circuitBreaker.failures++;
    state.circuitBreaker.lastFailure = Date.now();
    
    if (state.circuitBreaker.failures >= CONFIG.circuitBreaker.failureThreshold) {
      state.circuitBreaker.state = 'OPEN';
      log('warn', `Circuit breaker opened after ${state.circuitBreaker.failures} failures`);
    }
  }
  
  // Enhanced retry logic with exponential backoff and jitter
  async function retryWithBackoff(operation, options = {}) {
    const maxRetries = options.maxRetries || CONFIG.maxRetries;
    const isAuthRequest = options.isAuthRequest || false;
    const isRscRequest = options.isRscRequest || false;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        if (isCircuitBreakerOpen() && attempt === 0) {
          throw new Error('Circuit breaker is open');
        }
        
        const result = await operation();
        recordSuccess();
        
        if (attempt > 0) {
          log('info', `Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        const errorCategory = categorizeError(error);
        
        log('warn', `Operation failed on attempt ${attempt + 1}: ${errorCategory}`, {
          error: error.message,
          category: errorCategory
        });
        
        // Record failure for circuit breaker
        if (attempt === maxRetries) {
          recordFailure(error);
        }
        
        // Don't retry certain types of errors
        if (errorCategory === 'cors' || 
            errorCategory === 'authentication' ||
            (isRscRequest && errorCategory === 'rsc_payload' && attempt >= CONFIG.rsc.maxRetries)) {
          break;
        }
        
        // Calculate delay for next attempt
        if (attempt < maxRetries) {
          const baseDelay = isAuthRequest ? CONFIG.auth.retryDelay : CONFIG.baseRetryDelay;
          const delay = Math.min(
            baseDelay * Math.pow(2, attempt),
            CONFIG.maxRetryDelay
          );
          
          // Add jitter (±25%)
          const jitter = delay * 0.25 * (Math.random() * 2 - 1);
          const finalDelay = Math.max(100, delay + jitter);
          
          log('debug', `Waiting ${Math.round(finalDelay)}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
      }
    }
    
    // Create enhanced error with troubleshooting info
    const errorCategory = categorizeError(lastError);
    let enhancedMessage = lastError.message;
    
    switch (errorCategory) {
      case 'network_connectivity':
        enhancedMessage = 'Network connection issue. Please check your internet connection and try again.';
        break;
      case 'rsc_payload':
        enhancedMessage = 'Page navigation issue. Please refresh the page and try again.';
        break;
      case 'authentication':
        enhancedMessage = 'Authentication session expired. Please sign in again.';
        break;
      case 'timeout':
        enhancedMessage = 'Request timed out. Please check your connection and try again.';
        break;
    }
    
    const enhancedError = new Error(enhancedMessage);
    enhancedError.originalError = lastError;
    enhancedError.category = errorCategory;
    enhancedError.attempts = maxRetries + 1;
    
    throw enhancedError;
  }
  
  // RSC payload error handler
  function handleRscError(url, error) {
    log('warn', `RSC payload error for ${url}`, error);
    
    // For RSC errors, return a fallback response that tells Next.js to use browser navigation
    return {
      ok: false,
      status: 500,
      statusText: 'RSC Payload Error',
      headers: new Headers(),
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: () => ({ ...this })
    };
  }
  
  // Authentication session refresh
  async function refreshAuthSession() {
    if (state.authSession.isRefreshing) {
      return false;
    }
    
    state.authSession.isRefreshing = true;
    
    try {
      // Use Amplify to refresh the session
      const { fetchAuthSession } = await import('/src/config/amplifyUnified.js');
      const session = await fetchAuthSession({ forceRefresh: true });
      
      if (session && session.tokens) {
        state.authSession.lastRefresh = Date.now();
        log('info', 'Authentication session refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      log('error', 'Failed to refresh auth session', error);
      return false;
    } finally {
      state.authSession.isRefreshing = false;
    }
  }
  
  // Enhanced fetch wrapper that consolidates all previous wrappers
  async function enhancedFetch(url, options = {}) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // Store active request
    state.activeRequests.set(requestId, { url, startTime });
    
    try {
      state.networkMetrics.totalRequests++;
      
      // Detect request type
      const isAWSRequest = typeof url === 'string' && url.includes('amazonaws.com');
      const isAuthRequest = isAWSRequest && (
        url.includes('cognito-idp') || 
        options.body?.includes?.('InitiateAuth') ||
        options.body?.includes?.('RespondToAuthChallenge')
      );
      const isRscRequest = typeof url === 'string' && (
        url.includes('_next/static') || 
        options.headers?.['RSC'] === '1' ||
        options.headers?.['Next-Router-Prefetch']
      );
      
      log('debug', `Making request: ${url}`, {
        isAWSRequest,
        isAuthRequest,
        isRscRequest,
        requestId
      });
      
      // Handle authentication refresh if needed
      if (isAuthRequest) {
        const timeSinceLastRefresh = Date.now() - state.authSession.lastRefresh;
        if (timeSinceLastRefresh > CONFIG.auth.sessionRefreshThreshold) {
          log('debug', 'Refreshing auth session before request');
          await refreshAuthSession();
        }
      }
      
      // Ensure HTTPS for AWS requests
      if (isAWSRequest && typeof url === 'string') {
        url = url.replace('http://', 'https://');
      }
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
      
      const enhancedOptions = {
        ...options,
        signal: controller.signal
      };
      
      // Add auth headers if available and needed
      if (isAWSRequest && typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
        enhancedOptions.headers = {
          ...enhancedOptions.headers,
          'Authorization': `Bearer ${window.__APP_CACHE.auth.token}`
        };
      }
      
      // Make the request with retry logic
      const response = await retryWithBackoff(
        () => state.originalFetch(url, enhancedOptions),
        {
          maxRetries: isRscRequest ? CONFIG.rsc.maxRetries : CONFIG.maxRetries,
          isAuthRequest,
          isRscRequest
        }
      );
      
      clearTimeout(timeoutId);
      
      // Handle authentication errors
      if (response.status === 401 && isAWSRequest) {
        log('warn', 'Authentication error, attempting session refresh');
        const refreshed = await refreshAuthSession();
        
        if (refreshed) {
          // Retry request with new session
          return state.originalFetch(url, enhancedOptions);
        }
      }
      
      // Handle RSC errors specifically
      if (isRscRequest && !response.ok) {
        return handleRscError(url, response);
      }
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      state.networkMetrics.avgResponseTime = 
        (state.networkMetrics.avgResponseTime + responseTime) / 2;
      
      log('debug', `Request completed: ${url}`, {
        status: response.status,
        responseTime,
        requestId
      });
      
      return response;
      
    } catch (error) {
      const errorCategory = categorizeError(error);
      
      log('error', `Request failed: ${url}`, {
        error: error.message,
        category: errorCategory,
        requestId
      });
      
      // Handle specific error types
      if (errorCategory === 'rsc_payload') {
        return handleRscError(url, error);
      }
      
      if (errorCategory === 'authentication') {
        // Clear auth cache on auth errors
        if (typeof window !== 'undefined' && window.__APP_CACHE?.auth) {
          window.__APP_CACHE.auth = {};
        }
      }
      
      throw error;
    } finally {
      // Clean up active request
      state.activeRequests.delete(requestId);
    }
  }
  
  // Apply the comprehensive fetch wrapper
  function applyFetchWrapper() {
    if (typeof window === 'undefined' || !window.fetch) {
      log('warn', 'Window or fetch not available');
      return false;
    }
    
    // Store original fetch if not already stored
    if (!state.originalFetch) {
      state.originalFetch = window.fetch.bind(window);
      log('info', 'Original fetch function stored');
    }
    
    // Replace fetch with enhanced version
    window.fetch = enhancedFetch;
    
    log('info', 'Enhanced fetch wrapper applied');
    return true;
  }
  
  // Fix Cognito attribute access using CognitoAttributes utility
  async function fixCognitoAttributeAccess() {
    if (typeof window === 'undefined') return;
    
    // Load CognitoAttributes utility dynamically
    if (!window.CognitoAttributes) {
      try {
        const { default: CognitoAttributes } = await import('/src/utils/CognitoAttributes.js');
        window.CognitoAttributes = CognitoAttributes;
        log('info', 'CognitoAttributes utility loaded and made globally available');
      } catch (error) {
        log('warn', 'Could not load CognitoAttributes utility, creating fallback', error);
        
        // Create fallback CognitoAttributes utility
        window.CognitoAttributes = {
          TENANT_ID: 'custom:tenant_ID',
          getValue: function(attributes, attributeName, defaultValue = null) {
            if (!attributes) return defaultValue;
            return attributes[attributeName] !== undefined ? attributes[attributeName] : defaultValue;
          },
          getTenantId: function(attributes) {
            return this.getValue(attributes, this.TENANT_ID) || 
                   this.getValue(attributes, 'custom:tenant_id') ||
                   this.getValue(attributes, 'custom:business_id') ||
                   this.getValue(attributes, 'custom:businessid');
          }
        };
        log('info', 'Fallback CognitoAttributes utility created');
      }
    }
    
    // Create helper function for safe attribute access
    window.getSafeCognitoAttribute = function(attributes, attributeName, defaultValue = null) {
      if (!attributes || !window.CognitoAttributes) {
        return defaultValue;
      }
      
      return window.CognitoAttributes.getValue(attributes, attributeName, defaultValue);
    };
    
    // Create helper for tenant ID specifically  
    window.getSafeTenantId = function(attributes) {
      if (!attributes || !window.CognitoAttributes) {
        return null;
      }
      
      return window.CognitoAttributes.getTenantId(attributes);
    };
    
    log('info', 'Safe Cognito attribute access functions created');
  }
  
  // Network monitoring and diagnostics
  function setupNetworkMonitoring() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        log('info', 'Network connection restored');
        // Reset circuit breaker on network restoration
        state.circuitBreaker.state = 'CLOSED';
        state.circuitBreaker.failures = 0;
      });
      
      window.addEventListener('offline', () => {
        log('warn', 'Network connection lost');
      });
    }
    
    // Expose network metrics
    window.__NETWORK_METRICS = function() {
      return {
        ...state.networkMetrics,
        circuitBreaker: state.circuitBreaker,
        activeRequests: state.activeRequests.size
      };
    };
    
    // Expose manual circuit breaker reset
    window.__RESET_NETWORK_CIRCUIT_BREAKER = function() {
      state.circuitBreaker.state = 'CLOSED';
      state.circuitBreaker.failures = 0;
      state.circuitBreaker.halfOpenCalls = 0;
      log('info', 'Circuit breaker manually reset');
      return true;
    };
  }
  
  // Initialize the comprehensive fix
  async function initialize() {
    try {
      log('info', 'Initializing comprehensive network error fix');
      
      // Apply fetch wrapper
      if (!applyFetchWrapper()) {
        log('error', 'Failed to apply fetch wrapper');
        return false;
      }
      
      // Fix Cognito attribute access
      await fixCognitoAttributeAccess();
      
      // Setup network monitoring
      setupNetworkMonitoring();
      
      // Mark as applied
      window.__NETWORK_FIX_COMPREHENSIVE_APPLIED = true;
      
      log('info', 'Comprehensive network error fix initialized successfully');
      
      // Register with script registry if available
      if (typeof window !== 'undefined' && window.registerScript) {
        window.registerScript('Version0008_fix_network_errors_comprehensive.js', {
          version: '1.0',
          description: 'Comprehensive network error fix consolidating all fetch wrappers',
          status: 'active'
        });
      }
      
      return true;
    } catch (error) {
      log('error', 'Failed to initialize comprehensive network fix', error);
      return false;
    }
  }
  
  // Start initialization
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  } else {
    // For Node.js environments, just export the functions
    module.exports = {
      initialize,
      enhancedFetch,
      categorizeError
    };
  }
})(); 