/**
 * Version0009_fix_signin_redirect_debug.js
 * 
 * Debug script to help identify why sign-in redirect isn't working
 * after successful authentication. This script adds enhanced logging
 * and monitoring to the sign-in process.
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: None
 */

(function() {
  'use strict';
  
  // Prevent multiple initialization
  if (window.__SIGNIN_REDIRECT_DEBUG_APPLIED) {
    console.log('[SignInRedirectDebug] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[SignInRedirectDebug] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  log('info', 'Initializing sign-in redirect debug system');
  
  // Monitor form submissions
  function monitorFormSubmissions() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      if (form.dataset.debugAdded) return;
      form.dataset.debugAdded = 'true';
      
      log('info', `Monitoring form ${index}`);
      
      form.addEventListener('submit', function(e) {
        log('info', 'Form submission detected', {
          formIndex: index,
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input')).map(input => ({
            name: input.name,
            type: input.type,
            hasValue: !!input.value
          }))
        });
      });
    });
  }
  
  // Monitor router navigation
  function monitorRouterPush() {
    // Try to find Next.js router
    if (typeof window !== 'undefined') {
      // Monitor window location changes
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function(...args) {
        log('info', 'Navigation detected (pushState)', {
          url: args[2],
          state: args[0]
        });
        return originalPushState.apply(this, args);
      };
      
      window.history.replaceState = function(...args) {
        log('info', 'Navigation detected (replaceState)', {
          url: args[2],
          state: args[0]
        });
        return originalReplaceState.apply(this, args);
      };
    }
  }
  
  // Monitor authentication state changes
  function monitorAuthState() {
    // Monitor localStorage changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      if (key.includes('auth') || key.includes('tenant') || key.includes('token')) {
        log('info', 'Auth-related localStorage update', {
          key,
          hasValue: !!value,
          valueLength: value ? value.length : 0
        });
      }
      return originalSetItem.apply(this, arguments);
    };
    
    // Monitor AppCache changes
    if (window.__APP_CACHE) {
      const originalCache = window.__APP_CACHE;
      
      // Create a proxy to monitor changes
      window.__APP_CACHE = new Proxy(originalCache, {
        set(target, property, value) {
          if (property.toString().includes('auth') || property.toString().includes('tenant')) {
            log('info', 'AppCache auth-related update', {
              property: property.toString(),
              hasValue: !!value,
              type: typeof value
            });
          }
          target[property] = value;
          return true;
        }
      });
    }
  }
  
  // Monitor Amplify sign-in calls
  function monitorAmplifySignIn() {
    // Try to intercept Amplify signIn calls
    if (window.amplifySignIn) {
      const originalSignIn = window.amplifySignIn;
      
      window.amplifySignIn = async function(...args) {
        log('info', 'Amplify signIn called', {
          hasCredentials: !!(args[0] && args[0].username),
          options: args[0] ? Object.keys(args[0]) : []
        });
        
        try {
          const result = await originalSignIn.apply(this, args);
          log('info', 'Amplify signIn result', {
            isSignedIn: result.isSignedIn,
            hasNextStep: !!result.nextStep,
            nextStepType: result.nextStep ? result.nextStep.signInStep : 'none'
          });
          return result;
        } catch (error) {
          log('error', 'Amplify signIn error', {
            code: error.code,
            message: error.message,
            name: error.name
          });
          throw error;
        }
      };
    }
  }
  
  // Monitor console errors
  function monitorConsoleErrors() {
    const originalError = console.error;
    console.error = function(...args) {
      // Check if this is a sign-in related error
      const errorMessage = args.join(' ');
      if (errorMessage.includes('SignInForm') || 
          errorMessage.includes('auth') || 
          errorMessage.includes('redirect') ||
          errorMessage.includes('router')) {
        log('error', 'Sign-in related error detected', {
          error: errorMessage,
          stack: new Error().stack
        });
      }
      return originalError.apply(this, args);
    };
  }
  
  // Check current authentication state
  function checkCurrentAuthState() {
    log('info', 'Current authentication state', {
      pathname: window.location.pathname,
      search: window.location.search,
      appCacheExists: !!window.__APP_CACHE,
      authSession: localStorage.getItem('auth_had_session'),
      lastAuthTime: localStorage.getItem('auth_last_time'),
      tenantId: localStorage.getItem('tenantId') || localStorage.getItem('tenant_id'),
      hasAmplifySignIn: typeof window.amplifySignIn === 'function'
    });
  }
  
  // Add debug helper function
  window.__DEBUG_SIGNIN_REDIRECT = function() {
    return {
      currentLocation: window.location.href,
      authSessionFlag: localStorage.getItem('auth_had_session'),
      tenantId: localStorage.getItem('tenantId') || localStorage.getItem('tenant_id'),
      appCache: window.__APP_CACHE,
      hasAmplifySignIn: typeof window.amplifySignIn === 'function',
      formElements: document.querySelectorAll('form').length,
      signinLogs: console.memory // This will show recent console activity
    };
  };
  
  // Initialize all monitoring
  function initialize() {
    try {
      log('info', 'Setting up debug monitoring');
      
      checkCurrentAuthState();
      monitorFormSubmissions();
      monitorRouterPush();
      monitorAuthState();
      monitorAmplifySignIn();
      monitorConsoleErrors();
      
      // Re-monitor forms periodically in case they're dynamically created
      setInterval(monitorFormSubmissions, 2000);
      
      // Mark as applied
      window.__SIGNIN_REDIRECT_DEBUG_APPLIED = true;
      
      log('info', 'Sign-in redirect debug system initialized successfully');
      log('info', 'Run window.__DEBUG_SIGNIN_REDIRECT() to get current state');
      
    } catch (error) {
      log('error', 'Error initializing debug system', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 