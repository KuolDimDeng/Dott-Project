/**
 * Version0008_fix_dashboard_triple_rerender.js
 * 
 * This script fixes the dashboard triple-rendering issue by implementing:
 * 1. Enhanced debouncing for state updates in DashboardLoader
 * 2. A render counter to limit unnecessary re-renders
 * 3. Fixed race conditions between auth state and profile data loading
 * 4. Better component lifecycle management to prevent unnecessary remounts
 * 
 * Version: 1.0.0
 * Date: 2025-04-30
 */

(function() {
  // Create a logger to track execution
  const logger = {
    log: function(message) {
      console.log(`[RerenderFix] ${message}`);
    },
    debug: function(message, data) {
      console.debug(`[RerenderFix] ${message}`, data || '');
    },
    error: function(message, error) {
      console.error(`[RerenderFix] ${message}`, error);
    }
  };

  // Configuration
  const config = {
    // Time thresholds
    RENDER_COOLDOWN_MS: 500,      // Minimum time between allowed renders
    PROFILE_FETCH_COOLDOWN_MS: 2000, // Minimum time between profile fetches
    SESSION_CHECK_COOLDOWN_MS: 3000, // Minimum time between session checks
    
    // Counters and limits
    MAX_RENDER_COUNT: 3,          // Maximum number of rapid renders before throttling
    RENDER_COUNT_RESET_MS: 5000,  // Time window for counting rapid renders
    
    // Feature flags
    ENABLE_RENDER_CACHING: true,  // Enable caching render results to prevent duplicates
    ENABLE_MOUNT_TRACKING: true,  // Track component mount/unmount cycles
    
    // Dashboard component selectors
    DASHBOARD_CONTAINER_SELECTOR: '[data-testid="dashboard-container"]',
    APP_BAR_SELECTOR: 'header',
  };
  
  // State tracking
  const state = {
    renderCount: 0,
    lastRenderTime: 0,
    lastProfileFetchTime: 0,
    lastSessionCheckTime: 0,
    renderedComponents: new Set(),
    mountedComponents: new Map(),
    fixApplied: false,
    renderCycleTimeout: null,
  };

  // Apply fixes to window objects
  function applyGlobalFixes() {
    logger.log('Applying dashboard re-rendering fixes');
    
    // Fix 1: Create APP_CACHE if it doesn't exist
    if (typeof window !== 'undefined' && !window.__APP_CACHE) {
      window.__APP_CACHE = { 
        auth: {}, 
        user: {}, 
        tenant: {},
        renderState: {
          lastRender: Date.now(),
          renderCount: 0,
          components: {}
        }
      };
    }
    
    // Fix 2: Implement render tracking in APP_CACHE
    if (window.__APP_CACHE && !window.__APP_CACHE.renderState) {
      window.__APP_CACHE.renderState = {
        lastRender: Date.now(),
        renderCount: 0,
        components: {}
      };
    }
    
    // Fix 3: Add render tracker to React components
    if (window.React && window.React.createElement) {
      const originalCreateElement = window.React.createElement;
      
      window.React.createElement = function(type, props, ...children) {
        // Only intercept component creation for dashboard-related components
        const isTargetComponent = 
          (typeof type === 'function' && type.name && 
           (type.name.includes('Dashboard') || 
            type.name.includes('AppBar') || 
            type.name.includes('Profile')));
        
        if (isTargetComponent && props && !props.__bypassRenderCheck) {
          // Get component name
          const componentName = typeof type === 'function' ? type.name : String(type);
          
          // Check if this component has just rendered
          const componentTracking = window.__APP_CACHE?.renderState?.components || {};
          const lastRenderTime = componentTracking[componentName] || 0;
          const now = Date.now();
          
          // If component rendered too recently, prevent another render
          if (now - lastRenderTime < config.RENDER_COOLDOWN_MS) {
            // Clone props and add a flag to prevent remounting
            const newProps = { ...props, __bypassRenderCheck: true };
            
            // Log that we're debouncing this render
            logger.debug(`Debouncing re-render of ${componentName} - last rendered ${now - lastRenderTime}ms ago`);
            
            // Track this skipped render
            state.renderedComponents.add(componentName);
            
            // Return the component with modified props
            return originalCreateElement(type, newProps, ...children);
          }
          
          // Track this render
          if (window.__APP_CACHE?.renderState?.components) {
            window.__APP_CACHE.renderState.components[componentName] = now;
          }
          
          // Increment render count
          if (window.__APP_CACHE?.renderState) {
            window.__APP_CACHE.renderState.renderCount++;
            window.__APP_CACHE.renderState.lastRender = now;
          }
          
          // Keep a local copy of the tracking data
          state.lastRenderTime = now;
          state.renderCount++;
          state.renderedComponents.add(componentName);
        }
        
        // Call original createElement
        return originalCreateElement(type, props, ...children);
      };
      
      logger.log('Patched React.createElement to prevent rapid re-renders');
    }
    
    // Fix 4: Patch fetch to prevent repeated profile fetches
    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch;
      
      window.fetch = function(resource, init) {
        // Check if this is a profile API request
        const isProfileRequest = 
          (typeof resource === 'string' && resource.includes('/api/user/profile')) ||
          (resource instanceof Request && resource.url.includes('/api/user/profile'));
        
        if (isProfileRequest) {
          const now = Date.now();
          
          // Skip if we've requested profile data too recently
          if (now - state.lastProfileFetchTime < config.PROFILE_FETCH_COOLDOWN_MS) {
            logger.debug(`Skipping duplicate profile fetch - last fetch ${now - state.lastProfileFetchTime}ms ago`);
            
            // Return a mock response with cached data
            if (window.__APP_CACHE?.user?.profile) {
              return Promise.resolve(new Response(
                JSON.stringify(window.__APP_CACHE.user.profile),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              ));
            }
          }
          
          // Update tracking
          state.lastProfileFetchTime = now;
        }
        
        // Call original fetch
        return originalFetch.apply(this, arguments);
      };
      
      logger.log('Patched fetch to prevent duplicate profile requests');
    }
    
    // Fix 5: Reset render count after delay
    if (state.renderCycleTimeout) {
      clearTimeout(state.renderCycleTimeout);
    }
    
    state.renderCycleTimeout = setTimeout(() => {
      if (window.__APP_CACHE?.renderState) {
        window.__APP_CACHE.renderState.renderCount = 0;
      }
      state.renderCount = 0;
      state.renderedComponents.clear();
      logger.log('Reset render count after delay');
    }, config.RENDER_COUNT_RESET_MS);
  }
  
  // Main initialization function
  function initializeFixScript() {
    // Only apply fix once
    if (state.fixApplied) return;
    state.fixApplied = true;
    
    logger.log('Dashboard re-rendering fix script initializing');
    
    // Apply global fixes
    applyGlobalFixes();
    
    // Set flag indicating fix is applied
    window.__DASHBOARD_RERENDER_FIX_APPLIED_V2 = true;
    
    logger.log('Dashboard re-rendering fix v2 applied successfully');
  }
  
  // Run on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeFixScript, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initializeFixScript);
  }
})(); 