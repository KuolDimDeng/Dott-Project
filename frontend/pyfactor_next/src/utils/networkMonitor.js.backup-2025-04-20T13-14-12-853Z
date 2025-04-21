/**
 * Network Monitor Utility
 * 
 * Monitors network connectivity and provides mechanisms to handle API failures
 */

import { recordApiFailure, executeEmergencyRecovery } from './tenantFallback';
import { logger } from './logger';

// Track API calls and their status
let apiCallsMonitored = 0;
let apiCallsFailed = 0;
const recentFailures = [];
const MAX_TRACKED_FAILURES = 10;

// Network status
let isOnline = typeof navigator !== 'undefined' && navigator.onLine;
let networkQuality = 'unknown';
let criticalEndpointsAvailable = true;

// Cognito-specific status
let cognitoFailures = 0;
const MAX_COGNITO_FAILURES = 3;
let cognitoTimeouts = [];
const MAX_COGNITO_TIMEOUT = 8000; // 8 seconds max timeout

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Circuit breaker for Cognito API calls
const cognitoCircuitBreaker = {
  state: CIRCUIT_STATES.CLOSED,
  failureCount: 0,
  lastFailure: 0,
  successCount: 0,
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2
};

// Circuit breaker functions
export const getCognitoCircuitState = () => cognitoCircuitBreaker.state;

export const resetCognitoCircuit = (forceState = CIRCUIT_STATES.CLOSED) => {
  cognitoCircuitBreaker.state = forceState;
  cognitoCircuitBreaker.failureCount = 0;
  cognitoCircuitBreaker.successCount = 0;
  cognitoCircuitBreaker.lastFailure = 0;
  logger.info(`[CircuitBreaker] Cognito circuit has been manually reset to ${forceState} state`);
  return forceState;
};

export const shouldAttemptCognitoRequest = () => {
  const now = Date.now();
  
  switch (cognitoCircuitBreaker.state) {
    case CIRCUIT_STATES.CLOSED:
      // Circuit is closed, requests allowed
      return true;
    
    case CIRCUIT_STATES.OPEN:
      // Check if timeout has elapsed to transition to HALF_OPEN
      if (now - cognitoCircuitBreaker.lastFailure > cognitoCircuitBreaker.resetTimeout) {
        cognitoCircuitBreaker.state = CIRCUIT_STATES.HALF_OPEN;
        cognitoCircuitBreaker.successCount = 0;
        logger.info('[CircuitBreaker] Cognito circuit transitioned from OPEN to HALF_OPEN');
        return true;
      }
      // Circuit is open, don't allow requests
      return false;
    
    case CIRCUIT_STATES.HALF_OPEN:
      // Allow limited requests in HALF_OPEN state
      return true;
    
    default:
      return true;
  }
};

export const trackCognitoSuccess = () => {
  if (cognitoCircuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
    cognitoCircuitBreaker.successCount++;
    
    if (cognitoCircuitBreaker.successCount >= cognitoCircuitBreaker.successThreshold) {
      cognitoCircuitBreaker.state = CIRCUIT_STATES.CLOSED;
      cognitoCircuitBreaker.failureCount = 0;
      cognitoCircuitBreaker.successCount = 0;
      logger.info('[CircuitBreaker] Cognito circuit transitioned from HALF_OPEN to CLOSED');
    }
  }
};

// Track active health checks to prevent duplicates
let activeHealthChecks = 0;
const MAX_CONCURRENT_HEALTH_CHECKS = 2;
// Add cooldown tracking
let lastHealthCheckTime = 0;
const HEALTH_CHECK_COOLDOWN = 10000; // 10 seconds between checks

// Flag to prevent multiple emergency recoveries
let recoveryInProgress = false;

// Track mounted state for network checks
let isComponentMounted = true;

// Add this near the top of the file with other constants
const EXTERNAL_SCRIPT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

// Define fallback health endpoints
const HEALTH_ENDPOINTS = {
  primary: '/api/health',
  fallbacks: [
    '/api/ping',
    '/api/status',
    '/health',
    '/ping'
  ]
};

/**
 * Reset Cognito counters
 */
export const resetCognitoFailures = () => {
  cognitoFailures = 0;
  cognitoTimeouts = [];
};

/**
 * Track Cognito API failure
 * @param {Error} error - The error that occurred
 * @returns {Object} Failure status
 */
export const trackCognitoFailure = (error) => {
  cognitoFailures++;
  
  // Record timestamp
  const now = Date.now();
  cognitoTimeouts.push(now);
  
  // Only keep track of failures within the last minute
  cognitoTimeouts = cognitoTimeouts.filter(ts => now - ts < 60000);
  
  // Log the error if it seems like a pattern of failures
  if (cognitoFailures >= MAX_COGNITO_FAILURES) {
    logger.warn(`[NetworkMonitor] Multiple Cognito failures detected (${cognitoFailures}):`, error);
    
    // Dispatch to network monitoring
    dispatchNetworkEvent({
      type: 'cognito-degradation',
      failures: cognitoFailures,
      source: 'cognito',
      error: error?.message || String(error)
    });
  }
  
  // Update circuit breaker
  cognitoCircuitBreaker.lastFailure = now;
  
  if (cognitoCircuitBreaker.state === CIRCUIT_STATES.CLOSED) {
    cognitoCircuitBreaker.failureCount++;
    
    if (cognitoCircuitBreaker.failureCount >= cognitoCircuitBreaker.failureThreshold) {
      cognitoCircuitBreaker.state = CIRCUIT_STATES.OPEN;
      logger.warn('[CircuitBreaker] Cognito circuit transitioned from CLOSED to OPEN');
    }
  } else if (cognitoCircuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
    cognitoCircuitBreaker.state = CIRCUIT_STATES.OPEN;
    logger.warn('[CircuitBreaker] Cognito circuit transitioned from HALF_OPEN to OPEN');
  }
  
  return {
    cognito: {
      failures: cognitoFailures,
      isReliable: cognitoFailures < MAX_COGNITO_FAILURES
    }
  };
};

// Initialize network event listeners
export const initNetworkMonitoring = () => {
  if (typeof window === 'undefined') return;
  
  // Set component as mounted
  isComponentMounted = true;
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial check - only if we're online
  if (navigator.onLine) {
    // Use setTimeout to avoid immediate errors during component mounting
    setTimeout(() => checkNetworkQuality(), 100);
  } else {
    isOnline = false;
    networkQuality = 'offline';
  }
  
  logger.info("[NetworkMonitor] Monitoring initialized, current status:", 
    isOnline ? 'online' : 'offline');
    
  return () => {
    // Mark as unmounted to prevent future operations
    isComponentMounted = false;
    
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    // Clean up any pending operations
    if (typeof window.__NETWORK_ABORT_CONTROLLERS !== 'undefined') {
      try {
        const controllers = window.__NETWORK_ABORT_CONTROLLERS || [];
        controllers.forEach(controller => {
          try {
            controller.abort();
          } catch (e) {
            // Ignore abort errors
          }
        });
        window.__NETWORK_ABORT_CONTROLLERS = [];
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };
};

// Handle online event
const handleOnline = () => {
  isOnline = true;
  logger.info("[NetworkMonitor] Connection restored");
  
  // Use setTimeout to avoid immediate checks
  setTimeout(() => {
    if (isComponentMounted) {
      checkNetworkQuality();
    }
  }, 500);
};

// Handle offline event
const handleOffline = () => {
  isOnline = false;
  networkQuality = 'offline';
  logger.info("[NetworkMonitor] Connection lost");
  
  // Notify application
  dispatchNetworkEvent({
    type: 'offline',
    quality: 'offline',
  });
};

// Track abort controllers for cleanup
const registerAbortController = (controller) => {
  if (typeof window === 'undefined' || !controller) return controller;
  
  try {
    window.__NETWORK_ABORT_CONTROLLERS = window.__NETWORK_ABORT_CONTROLLERS || [];
    
    // Check if the controller is already registered
    const alreadyRegistered = window.__NETWORK_ABORT_CONTROLLERS.some(
      c => c === controller
    );
    
    if (!alreadyRegistered) {
      window.__NETWORK_ABORT_CONTROLLERS.push(controller);
      
      // Only add event listener if signal exists and listener can be added
      if (controller.signal && typeof controller.signal.addEventListener === 'function') {
        // Clean up the reference after abortion or completion
        controller.signal.addEventListener('abort', () => {
          try {
            const index = window.__NETWORK_ABORT_CONTROLLERS.indexOf(controller);
            if (index !== -1) {
              window.__NETWORK_ABORT_CONTROLLERS.splice(index, 1);
            }
          } catch (e) {
            // Ignore cleanup errors
            logger.debug("[NetworkMonitor] Error cleaning up abort controller:", e.message);
          }
        });
      }
    }
  } catch (e) {
    // Ignore registration errors
    logger.debug("[NetworkMonitor] Error registering abort controller:", e.message);
  }
  
  return controller;
};

// Add optimized health check throttling function
export const shouldRunHealthCheck = () => {
  const now = Date.now();
  // Check if we're still in cooldown period
  if (now - lastHealthCheckTime < HEALTH_CHECK_COOLDOWN) {
    logger.debug(`[NetworkMonitor] Health check in cooldown (${Math.round((now - lastHealthCheckTime) / 1000)}s elapsed of ${HEALTH_CHECK_COOLDOWN / 1000}s cooldown)`);
    return false;
  }
  
  // Check if we already have max concurrent checks running
  if (activeHealthChecks >= MAX_CONCURRENT_HEALTH_CHECKS) {
    logger.debug(`[NetworkMonitor] Max concurrent health checks already running (${activeHealthChecks}/${MAX_CONCURRENT_HEALTH_CHECKS})`);
    return false;
  }
  
  return true;
};

// Check network quality with a simple ping
const checkNetworkQuality = async () => {
  // Skip if component unmounted or offline
  if (!isComponentMounted || !isOnline) {
    networkQuality = isOnline ? 'unknown' : 'offline';
    return;
  }
  
  // Apply cooldown/throttling to prevent excessive checks
  if (!shouldRunHealthCheck()) {
    return networkQuality;
  }
  
  // Update last check time and increment active checks
  lastHealthCheckTime = Date.now();
  activeHealthChecks++;
  
  // Track attempt count for fallback logic
  let endpointAttempt = 0;
  const maxAttempts = HEALTH_ENDPOINTS.fallbacks.length + 1;
  
  // Get current endpoint to try
  const getCurrentEndpoint = () => {
    if (endpointAttempt === 0) return HEALTH_ENDPOINTS.primary;
    return HEALTH_ENDPOINTS.fallbacks[endpointAttempt - 1] || HEALTH_ENDPOINTS.primary;
  };
  
  try {
    const controller = new AbortController();
    registerAbortController(controller);
    
    // Set a reasonable timeout
    const timeoutMs = 2000;
    
    // Use variable to track whether timeout was triggered
    let isTimedOut = false;
    
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      try {
        // More cautious checks to prevent AbortError
        if (controller && 
            typeof controller === 'object' && 
            controller.signal && 
            typeof controller.signal === 'object' && 
            !controller.signal.aborted && 
            typeof controller.abort === 'function') {
          controller.abort();
        }
      } catch (error) {
        // Ignore errors from aborting
        logger.debug("[NetworkMonitor] Error while aborting controller:", error.message);
      }
    }, timeoutMs);
    
    try {
      // Skip if component was unmounted during timeout setup
      if (!isComponentMounted) {
        clearTimeout(timeoutId);
        activeHealthChecks--;
        return;
      }
      
      const startTime = Date.now();
      const endpoint = getCurrentEndpoint();
      
      logger.debug(`[NetworkMonitor] Checking network quality using endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, { 
        method: 'HEAD',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      // Skip further processing if component unmounted during fetch
      if (!isComponentMounted) {
        activeHealthChecks--;
        return;
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // If we get a 404, the endpoint doesn't exist, but network is working
      if (response.status === 404) {
        // Try a fallback endpoint
        endpointAttempt++;
        
        if (endpointAttempt < maxAttempts) {
          // Try again with the next endpoint
          logger.debug(`[NetworkMonitor] Endpoint ${endpoint} returned 404, trying fallback #${endpointAttempt}`);
          clearTimeout(timeoutId);
          activeHealthChecks--;
          return checkNetworkQuality();
        } else {
          // We've tried all endpoints, assume network is OK but services aren't available
          logger.warn('[NetworkMonitor] All health endpoints returned 404, assuming network OK but services unavailable');
          networkQuality = 'good'; // Network itself is working if we got 404s
        }
      } else if (response.ok) {
        // Categorize network quality
        if (responseTime < 100) {
          networkQuality = 'excellent';
        } else if (responseTime < 300) {
          networkQuality = 'good';
        } else if (responseTime < 600) {
          networkQuality = 'fair';
        } else {
          networkQuality = 'poor';
        }
        
        logger.info(`[NetworkMonitor] Network quality: ${networkQuality} (${responseTime}ms)`);
      } else {
        networkQuality = 'degraded';
        logger.warn("[NetworkMonitor] Health check failed with status:", response.status);
      }
    } catch (error) {
      // Clear timeout if we caught an error
      clearTimeout(timeoutId);
      
      // Skip further processing if component unmounted during error
      if (!isComponentMounted) {
        activeHealthChecks--;
        return;
      }
      
      // Don't log or update for aborted requests or if already timed out
      if (error.name === 'AbortError' || isTimedOut) {
        networkQuality = 'poor'; // Assume poor if timed out
      } else {
        networkQuality = 'degraded';
        logger.warn("[NetworkMonitor] Health check failed:", error.message || error);
      }
    }
  } catch (outerError) {
    // Handle any errors in the timeout setup
    logger.warn("[NetworkMonitor] Error in health check setup:", outerError);
    networkQuality = 'degraded';
  } finally {
    // Always decrement active health checks
    activeHealthChecks--;
  }
  
  // Skip if component unmounted during processing
  if (!isComponentMounted) return;
  
  // Dispatch event
  dispatchNetworkEvent({
    type: 'quality-change',
    quality: networkQuality,
  });
  
  return networkQuality;
};

// Track an API call
export const trackApiCall = (endpointPath, success, error = null) => {
  apiCallsMonitored++;
  
  if (!success) {
    apiCallsFailed++;
    
    // Record this failure
    const failure = {
      timestamp: Date.now(),
      endpoint: endpointPath,
      error: error ? (error.message || String(error)) : 'Unknown error'
    };
    
    recentFailures.push(failure);
    
    // Trim failures list if needed
    if (recentFailures.length > MAX_TRACKED_FAILURES) {
      recentFailures.shift();
    }
    
    // Record for recovery tracking
    recordApiFailure(endpointPath, error);
    
    // Check failure rate
    const failureRate = apiCallsFailed / apiCallsMonitored;
    
    if (failureRate > 0.5 && apiCallsMonitored >= 3) {
      // Serious API connectivity issues
      logger.error(`[NetworkMonitor] High API failure rate detected: ${Math.round(failureRate * 100)}%`);
      
      dispatchNetworkEvent({
        type: 'api-degradation',
        failureRate,
        recentFailures: [...recentFailures]
      });
      
      // Force a network quality check
      checkNetworkQuality();
    }
  }
  
  // Reset counters periodically to prevent skew over time
  if (apiCallsMonitored > 100) {
    // Keep proportions but reset counters
    apiCallsMonitored = Math.floor(apiCallsMonitored / 2);
    apiCallsFailed = Math.floor(apiCallsFailed / 2);
  }
  
  return { 
    success, 
    monitored: apiCallsMonitored, 
    failed: apiCallsFailed,
    failureRate: apiCallsFailed / apiCallsMonitored
  };
};

// Dispatch network event to subscribers
const dispatchNetworkEvent = (detail) => {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent('network-status', { 
    detail: {
      ...detail,
      timestamp: Date.now(),
      isOnline,
      quality: networkQuality,
      criticalEndpointsAvailable
    }
  });
  
  window.dispatchEvent(event);
};

/**
 * Check if Cognito is currently experiencing issues based on tracked failures
 * @returns {boolean} - True if Cognito appears unreliable
 */
export const isCognitoUnreliable = () => {
  return cognitoFailures >= MAX_COGNITO_FAILURES;
};

/**
 * Get the recommended timeout for Cognito operations
 * Based on recent performance and dynamic adjustment
 * @returns {number} Timeout in milliseconds
 */
export const getCognitoTimeout = () => {
  // If we have no failures, use default timeout
  if (cognitoFailures === 0) {
    return 5000; // 5 seconds default
  }
  
  // Calculate timeout based on failures (more failures = longer timeout)
  const baseTimeout = 5000;
  const additionalTime = Math.min(cognitoFailures * 1000, 7000); // Max +7 seconds
  
  return Math.min(baseTimeout + additionalTime, MAX_COGNITO_TIMEOUT);
};

// Fetch wrapper with network monitoring
export const monitoredFetch = async (url, options = {}) => {
  const startTime = Date.now();
  let success = false;
  let error = null;
  
  try {
    // Create a controller for the request
    const controller = new AbortController();
    registerAbortController(controller);
    
    const timeoutMs = options.timeout || 10000; // Default 10s timeout
    let isTimedOut = false;
    
    // Use a separate timer to handle timeout manually
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      try {
        if (controller && !controller.signal.aborted) {
          controller.abort();
        }
      } catch (abortError) {
        // Ignore errors from aborting
      }
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    // Clear timeout since request completed
    clearTimeout(timeoutId);
    
    success = response.ok;
    if (!success) {
      error = new Error(`HTTP error ${response.status}`);
      error.status = response.status;
    }
    
    // Track this API call
    trackApiCall(url, success, error);
    
    return response;
  } catch (e) {
    error = e;
    success = false;
    
    // Handle aborted requests separately
    if (error.name === 'AbortError') {
      // Don't throw errors for aborted requests during unmount
      if (!isComponentMounted) {
        return new Response('', { status: 200 });
      }
      
      const timeoutError = new Error(`Request to ${url} timed out`);
      timeoutError.name = 'TimeoutError';
      timeoutError.originalError = error;
      
      // Track as a timeout specifically
      trackApiCall(url, false, timeoutError);
      throw timeoutError;
    }
    
    // Track this API call
    trackApiCall(url, false, e);
    throw e;
  } finally {
    const duration = Date.now() - startTime;
    
    // If it took unusually long, log it
    if (duration > 2000) {
      logger.warn(`[NetworkMonitor] Slow API call to ${url}: ${duration}ms`);
    }
  }
};

// Health check for initial loading and recovery
export const checkApiHealth = async () => {
  // Skip if we already have active health checks to prevent duplicates
  if (activeHealthChecks >= MAX_CONCURRENT_HEALTH_CHECKS || !isComponentMounted) {
    logger.info("[NetworkMonitor] Skipping health check, already in progress or component unmounted");
    return criticalEndpointsAvailable;
  }
  
  // Skip emergency recovery on auth pages
  if (typeof window !== 'undefined' && 
      (window.location.pathname.includes('/auth/') || 
       window.location.pathname.includes('/sign-in') || 
       window.location.pathname.includes('/sign-up') ||
       window.location.pathname === '/' ||
       window.location.pathname === '/login')) {
    logger.info("[NetworkMonitor] Skipping emergency recovery on auth/public page");
    return true;
  }
  
  activeHealthChecks++;
  
  try {
    // Define endpoints to check with fallbacks
    const endpoints = [
      // Use fallback endpoints to avoid 404s
      { url: HEALTH_ENDPOINTS.primary, fallbacks: HEALTH_ENDPOINTS.fallbacks, critical: true },
      { url: '/api/user/profile', fallbacks: ['/api/user/me', '/api/profile'], critical: false },
      { url: '/api/auth/session', fallbacks: ['/api/auth/status', '/api/auth/check'], critical: true }
    ];
    
    // Create a controller for the request
    const controller = new AbortController();
    registerAbortController(controller);
    
    let timeoutId;
    
    try {
      timeoutId = setTimeout(() => {
        try {
          if (controller && !controller.signal.aborted) {
            controller.abort();
          }
        } catch (error) {
          // Ignore errors from aborting
        }
      }, 3000); // 3 second timeout
      
      // Skip if component unmounted during setup
      if (!isComponentMounted) {
        clearTimeout(timeoutId);
        activeHealthChecks--;
        return criticalEndpointsAvailable;
      }
      
      const results = await Promise.allSettled(
        endpoints.map(async (endpoint) => {
          // Skip if component unmounted during request
          if (!isComponentMounted) return { 
            endpoint: endpoint.url, 
            ok: true,  // Assume ok to prevent false triggers on unmount
            critical: endpoint.critical 
          };
          
          try {
            // Try primary endpoint first
            let response = await fetch(endpoint.url, {
              method: 'HEAD',
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
              signal: controller.signal
            });
            
            // If we get a 404, try fallbacks
            if (response.status === 404 && endpoint.fallbacks && endpoint.fallbacks.length > 0) {
              logger.debug(`[NetworkMonitor] Endpoint ${endpoint.url} returned 404, trying fallbacks`);
              
              // Try each fallback endpoint
              for (const fallback of endpoint.fallbacks) {
                if (!isComponentMounted) break;
                
                try {
                  response = await fetch(fallback, {
                    method: 'HEAD',
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' },
                    signal: controller.signal
                  });
                  
                  // If we get a non-404 response, use it
                  if (response.status !== 404) {
                    logger.debug(`[NetworkMonitor] Fallback endpoint ${fallback} returned status ${response.status}`);
                    break;
                  }
                } catch (fallbackError) {
                  // Continue to next fallback
                  logger.debug(`[NetworkMonitor] Fallback endpoint ${fallback} error:`, fallbackError.message);
                }
              }
              
              // If all fallbacks failed with 404, consider it a successful health check 
              // (network is working but endpoints aren't available)
              if (response.status === 404) {
                logger.debug(`[NetworkMonitor] All fallbacks for ${endpoint.url} returned 404, assuming network OK`);
                return {
                  endpoint: endpoint.url,
                  status: 200, // Pretend it's OK for health check purposes
                  ok: true,    // Network is working even though endpoint doesn't exist
                  critical: endpoint.critical
                };
              }
            }
            
            return {
              endpoint: endpoint.url,
              status: response.status,
              ok: response.ok,
              critical: endpoint.critical
            };
          } catch (error) {
            // Skip errors during unmount
            if (!isComponentMounted) {
              return { 
                endpoint: endpoint.url, 
                ok: true,  // Assume ok to prevent false triggers on unmount
                critical: endpoint.critical 
              };
            }
            
            return {
              endpoint: endpoint.url,
              error: error.name === 'AbortError' ? 'timeout' : error.message,
              ok: false,
              critical: endpoint.critical
            };
          }
        })
      );
      
      // Clear timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Skip further processing if component unmounted
      if (!isComponentMounted) {
        activeHealthChecks--;
        return criticalEndpointsAvailable;
      }
      
      // Check critical endpoints
      const unavailableCritical = results
        .filter((result, index) => endpoints[index].critical && 
               (result.status === 'rejected' || 
                (result.status === 'fulfilled' && !result.value.ok)))
        .map((result, index) => result.status === 'fulfilled' ? result.value : { 
          endpoint: endpoints[index].url, 
          error: 'Request failed', 
          critical: endpoints[index].critical 
        });
      
      if (unavailableCritical.length > 0) {
        logger.error('[NetworkMonitor] Critical API endpoints unavailable:', unavailableCritical);
        criticalEndpointsAvailable = false;
        
        // If critical endpoints are down, suggest a recovery
        if (unavailableCritical.length === endpoints.filter(e => e.critical).length && 
            !recoveryInProgress && isComponentMounted) {
          logger.error('[NetworkMonitor] All critical endpoints unavailable, triggering emergency recovery');
          
          // Set flag to prevent multiple recoveries
          recoveryInProgress = true;
          setTimeout(() => { recoveryInProgress = false; }, 10000); // Reset after 10s
          
          executeEmergencyRecovery();
          activeHealthChecks--;
          return false;
        }
      } else {
        criticalEndpointsAvailable = true;
      }
    } catch (error) {
      // Handle errors from the Promise.allSettled
      if (timeoutId) clearTimeout(timeoutId);
      logger.error('[NetworkMonitor] Error in API health check:', error);
      
      // Don't consider this a critical failure
      criticalEndpointsAvailable = true;
    }
  } finally {
    activeHealthChecks--;
  }
  
  return criticalEndpointsAvailable;
};

// Get current network status
export const getNetworkStatus = () => {
  return {
    isOnline,
    quality: networkQuality,
    criticalEndpointsAvailable,
    recentFailures: [...recentFailures],
    failureRate: apiCallsMonitored > 0 ? apiCallsFailed / apiCallsMonitored : 0,
    cognitoReliable: cognitoFailures < MAX_COGNITO_FAILURES,
    cognitoFailures,
    timestamp: Date.now()
  };
};

// Listen to network events
export const listenToNetworkEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event) => {
    callback(event.detail);
  };
  
  window.addEventListener('network-status', handler);
  return () => window.removeEventListener('network-status', handler);
};

/**
 * Retry loading an external script with exponential backoff
 * Useful for third-party scripts like Stripe that may fail to load
 * @param {string} src - Script source URL
 * @param {Object} options - Retry options
 * @returns {Promise} - Resolves when script loads successfully
 */
export const retryLoadScript = (src, options = {}) => {
  const config = {
    ...EXTERNAL_SCRIPT_RETRY_CONFIG,
    ...options
  };
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      // Add cache-busting parameter for retries
      if (attempts > 0) {
        const cacheBuster = `_cb=${Date.now()}`;
        script.src = script.src.includes('?') 
          ? `${script.src}&${cacheBuster}` 
          : `${script.src}?${cacheBuster}`;
      }
      
      script.onload = () => {
        logger.info(`[NetworkMonitor] External script loaded successfully: ${src}`);
        resolve(script);
      };
      
      script.onerror = (error) => {
        document.body.removeChild(script);
        
        if (attempts < config.maxRetries) {
          attempts++;
          const delay = Math.min(
            config.baseDelay * Math.pow(2, attempts - 1),
            config.maxDelay
          );
          
          logger.warn(`[NetworkMonitor] Script load failed, retrying (${attempts}/${config.maxRetries}) after ${delay}ms: ${src}`);
          
          setTimeout(loadScript, delay);
        } else {
          logger.error(`[NetworkMonitor] Failed to load script after ${config.maxRetries} attempts: ${src}`);
          reject(new Error(`Failed to load script: ${src}`));
        }
      };
      
      document.body.appendChild(script);
    };
    
    loadScript();
  });
};

// Function to patch window.fetch for better resilience
export const patchFetch = () => {
  if (typeof window === 'undefined' || window.__FETCH_PATCHED) return;
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(resource, options = {}) {
    // Skip patching for non-string resources or data: URIs
    if (typeof resource !== 'string' || resource.startsWith('data:')) {
      return originalFetch.apply(window, arguments);
    }
    
    // Handle Stripe and other external scripts
    if (resource.includes('stripe.com') || 
        resource.includes('js.stripe.com') || 
        resource.includes('cdn.')) {
      
      try {
        // Use monitored fetch with extended timeout for external resources
        return await monitoredFetch(resource, {
          ...options,
          timeout: 10000,
          retries: 3
        });
      } catch (error) {
        // If external resource fetch fails, log for telemetry but don't break the app
        logger.warn(`[NetworkMonitor] External resource fetch failed: ${resource}`, error);
        
        // For Stripe specifically, trigger the recovery mechanisms
        if (resource.includes('stripe.com')) {
          logger.info('[NetworkMonitor] Stripe resource failed, triggering recovery');
          
          // If this was a script, try using script tag approach instead
          if (resource.endsWith('.js')) {
            try {
              await retryLoadScript(resource);
              // Return an empty 200 response to prevent errors
              return new Response('', { status: 200 });
            } catch (scriptError) {
              // Continue to error handling below
            }
          }
        }
        
        // Return an empty but successful response for non-critical resources
        if (!resource.includes('/api/') && !resource.includes('cognito')) {
          return new Response('', { status: 200 });
        }
        
        // Re-throw error for critical API resources
        throw error;
      }
    }
    
    // Use standard monitored fetch for all other resources
    return monitoredFetch(resource, options);
  };
  
  window.__FETCH_PATCHED = true;
  logger.info('[NetworkMonitor] Fetch API patched for enhanced resilience');
};

// Add a function to initialize all network patches
export const initNetworkResilience = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Patch fetch API
    patchFetch();
    
    // Initialize network monitoring
    initNetworkMonitoring();
    
    logger.info('[NetworkMonitor] Network resilience mechanisms initialized');
  } catch (error) {
    logger.error('[NetworkMonitor] Error initializing network resilience:', error);
  }
}; 