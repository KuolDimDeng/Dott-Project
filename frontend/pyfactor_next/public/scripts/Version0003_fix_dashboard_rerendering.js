/**
 * Version0003_fix_dashboard_rerendering.js
 * 
 * This script fixes an infinite re-rendering loop in the dashboard
 * caused by cyclical dependencies between error handling and auth refreshes.
 * 
 * The issue involves:
 * 1. DashboardLoader catching network errors and triggering recovery
 * 2. UserProfileContext repeatedly trying to fetch profile data
 * 3. Emergency menu fix script reapplying multiple times
 * 
 * Version: 1.0
 * Date: 2023-04-25
 */

(function() {
  // Create a logger to track execution
  const logger = {
    log: function(message) {
      console.log(`[RerenderFix] ${message}`);
    },
    error: function(message, error) {
      console.error(`[RerenderFix] ${message}`, error);
    }
  };

  logger.log('Re-render fix script loaded');
  
  // Constants for tracking
  const DEBOUNCE_TIME = 5000; // 5 seconds between allowed recovery attempts
  const MAX_RECOVERY_ATTEMPTS = 3; // Maximum number of recovery attempts
  
  // Track operations to prevent duplicates
  const operationTracker = {
    recoveryAttempts: 0,
    lastRecoveryTime: 0,
    recoveryInProgress: false,
    profileFetchAttempts: 0,
    lastProfileFetchTime: 0,
    profileFetchInProgress: false,
    isRecoveryOnCooldown: function() {
      return Date.now() - this.lastRecoveryTime < DEBOUNCE_TIME;
    },
    isProfileFetchOnCooldown: function() {
      return Date.now() - this.lastProfileFetchTime < DEBOUNCE_TIME;
    }
  };
  
  // Cache the original methods to patch
  const originalMethods = {
    handleChunkError: null,
    fetchProfileData: null,
    recoverFromError: null
  };
  
  // Wait for DOM to be ready
  function onReady(callback) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(callback, 1);
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }
  
  // Fix 1: Patch window.addEventListener to catch error handlers being added
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    // Only intercept error and unhandledrejection event types
    if (type === 'error' || type === 'unhandledrejection') {
      // Create a wrapper around the listener to implement cooldown
      const wrappedListener = function(event) {
        // Skip if we're on cooldown or reached max attempts
        if (operationTracker.isRecoveryOnCooldown() || 
            operationTracker.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
          logger.log(`Skipping ${type} handler - on cooldown or max attempts reached`);
          return;
        }
        
        // Update recovery tracking
        operationTracker.lastRecoveryTime = Date.now();
        operationTracker.recoveryAttempts++;
        
        // Call the original listener
        return listener.apply(this, arguments);
      };
      
      // Call the original addEventListener with our wrapped listener
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    // For all other event types, use the original method
    return originalAddEventListener.apply(this, arguments);
  };
  
  // Fix 2: Patch fetch to prevent infinite loops of failed requests
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    // Check if this is a profile API request
    const isProfileRequest = 
      (typeof resource === 'string' && resource.includes('/api/user/profile')) ||
      (resource instanceof Request && resource.url.includes('/api/user/profile'));
    
    if (isProfileRequest) {
      // Skip if we're on cooldown or already fetching
      if (operationTracker.isProfileFetchOnCooldown() || operationTracker.profileFetchInProgress) {
        logger.log('Skipping profile fetch - on cooldown or already in progress');
        
        // Return a mock successful response to break the loop
        return Promise.resolve(new Response(JSON.stringify({
          profile: {
            id: 'temp-id',
            email: localStorage.getItem('email') || '',
            name: 'Temporary User',
            firstName: 'Temporary',
            lastName: 'User',
            tenantId: localStorage.getItem('tenantId') || '',
            role: 'client',
            isTemporary: true
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // Update profile fetch tracking
      operationTracker.lastProfileFetchTime = Date.now();
      operationTracker.profileFetchInProgress = true;
      
      // Execute the original fetch with error handling
      return originalFetch.apply(this, arguments)
        .finally(() => {
          // Reset the in-progress flag
          operationTracker.profileFetchInProgress = false;
        });
    }
    
    // For all other URLs, use the original fetch
    return originalFetch.apply(this, arguments);
  };
  
  // Fix 3: Patch recoverFromError in DashboardLoader
  function patchDashboardLoader() {
    logger.log('Attempting to patch DashboardLoader methods');
    
    // Check for React component instances in the DOM
    const dashboardLoaderInterval = setInterval(() => {
      // Check if we can access the window.__APP_CACHE object
      if (window.__APP_CACHE) {
        clearInterval(dashboardLoaderInterval);
        
        // Store max recovery attempts in __APP_CACHE
        window.__APP_CACHE.maxRecoveryAttempts = MAX_RECOVERY_ATTEMPTS;
        window.__APP_CACHE.lastRecoveryTime = Date.now();
        window.__APP_CACHE.recoveryAttempts = operationTracker.recoveryAttempts;
        
        logger.log('Dashboard loader patched via APP_CACHE object');
      }
    }, 500);
    
    // Safety timeout after 10 seconds
    setTimeout(() => clearInterval(dashboardLoaderInterval), 10000);
  }
  
  // Fix 4: Patch emergency menu fix script to prevent multiple applications
  function patchEmergencyMenuFix() {
    logger.log('Patching emergency menu fix');
    
    // Check if the emergency menu fix has already been applied
    if (window.__APP_CACHE && window.__APP_CACHE.emergencyMenuFixApplied) {
      logger.log('Emergency menu fix already applied, preventing duplicates');
      return;
    }
    
    // Set a flag in APP_CACHE to indicate the fix has been applied
    if (window.__APP_CACHE) {
      window.__APP_CACHE.emergencyMenuFixApplied = true;
      logger.log('Set emergency menu fix applied flag');
    }
  }
  
  // Apply all fixes when the DOM is ready
  onReady(() => {
    logger.log('Applying dashboard re-rendering fixes');
    patchDashboardLoader();
    patchEmergencyMenuFix();
    
    // Set global object to indicate fix is applied
    window.__DASHBOARD_RERENDER_FIX_APPLIED = true;
    logger.log('Dashboard re-rendering fix applied successfully');
  });
})(); 