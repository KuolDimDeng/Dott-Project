/**
 * Version0011_fix_signin_form_submission_production.js
 * 
 * Fixes sign-in form submission to prevent GET requests and ensure proper authentication
 * This addresses the "Unable to connect to authentication service" error
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: Version0008 (network fix), Version0009 (debug)
 */

(function() {
  'use strict';
  
  console.log('Executing Sign-In Form Submission Fix v0011');
  console.log('Description: Fix form submission method and authentication flow');
  console.log('Target: Sign-in forms on /auth/signin');
  
  // Prevent multiple initialization
  if (window.__SIGNIN_FORM_FIX_APPLIED) {
    console.log('[SignInFormFix] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[SignInFormFix] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to fix form submission
  function fixFormSubmission() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      // Check if this is likely a sign-in form
      const emailInput = form.querySelector('input[type="email"], input[name="username"], input[name="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      
      if (emailInput && passwordInput) {
        log('info', `Found sign-in form ${index}`);
        
        // Remove any action attribute that might cause GET submission
        if (form.action) {
          log('warn', `Removing form action: ${form.action}`);
          form.removeAttribute('action');
        }
        
        // Ensure method is POST (even though we'll prevent default)
        form.method = 'post';
        
        // Add a data attribute to mark it as fixed
        form.dataset.signinFixed = 'true';
        
        // Add additional submit handler as backup
        if (!form.dataset.backupHandlerAdded) {
          form.dataset.backupHandlerAdded = 'true';
          
          form.addEventListener('submit', function(e) {
            log('info', 'Backup submit handler triggered');
            
            // Always prevent default to stop GET submission
            e.preventDefault();
            e.stopPropagation();
            
            // Check if the main handler is working
            const isSubmitting = form.querySelector('button[type="submit"]')?.disabled;
            
            if (!isSubmitting) {
              log('warn', 'Main submit handler may not be working, triggering manual submit');
              
              // Try to trigger the React submit handler
              const submitButton = form.querySelector('button[type="submit"]');
              if (submitButton && !submitButton.disabled) {
                // Dispatch a synthetic submit event that React can catch
                const submitEvent = new Event('submit', {
                  bubbles: true,
                  cancelable: true
                });
                
                // Mark it as synthetic so we can detect it
                submitEvent.isSynthetic = true;
                
                form.dispatchEvent(submitEvent);
              }
            }
            
            return false;
          }, true); // Use capture phase to run before React handlers
        }
      }
    });
  }
  
  // Function to ensure Amplify is properly configured
  function ensureAmplifyConfig() {
    if (typeof window !== 'undefined') {
      // Check if reconfiguration is needed
      if (window.reconfigureAmplify) {
        log('info', 'Ensuring Amplify configuration');
        const configured = window.reconfigureAmplify();
        log('info', `Amplify configuration result: ${configured}`);
      }
      
      // Ensure auth preparation function exists
      if (!window.ensureAmplifyAuth) {
        window.ensureAmplifyAuth = function() {
          if (window.reconfigureAmplify) {
            console.log('[SignInFormFix] Ensuring Amplify auth configuration');
            return window.reconfigureAmplify();
          }
          return false;
        };
      }
    }
  }
  
  // Function to monitor authentication errors
  function monitorAuthErrors() {
    // Intercept fetch to catch auth service errors
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const [url, options] = args;
      
      try {
        const response = await originalFetch.apply(this, args);
        
        // Check for auth-related URLs
        if (typeof url === 'string' && url.includes('cognito')) {
          if (!response.ok) {
            log('error', 'Cognito request failed', {
              url,
              status: response.status,
              statusText: response.statusText
            });
            
            // Try to reconfigure Amplify if we get auth errors
            if (response.status === 400 || response.status === 401) {
              ensureAmplifyConfig();
            }
          }
        }
        
        return response;
      } catch (error) {
        // Log network errors for auth requests
        if (typeof url === 'string' && url.includes('cognito')) {
          log('error', 'Network error for Cognito request', {
            url,
            error: error.message
          });
          
          // Try to reconfigure Amplify on network errors
          ensureAmplifyConfig();
        }
        
        throw error;
      }
    };
  }
  
  // Function to add visual feedback for form state
  function addVisualFeedback() {
    const style = document.createElement('style');
    style.textContent = `
      /* Visual feedback for sign-in form states */
      form[data-signin-fixed="true"] {
        position: relative;
      }
      
      form[data-signin-fixed="true"]::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px solid transparent;
        border-radius: 8px;
        pointer-events: none;
        transition: border-color 0.3s ease;
      }
      
      form[data-signin-fixed="true"].submitting::before {
        border-color: #3b82f6;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initialize all fixes
  function initialize() {
    try {
      log('info', 'Initializing sign-in form fixes');
      
      // Ensure Amplify is configured
      ensureAmplifyConfig();
      
      // Fix existing forms
      fixFormSubmission();
      
      // Monitor for new forms (React might re-render)
      const observer = new MutationObserver(() => {
        fixFormSubmission();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Monitor authentication errors
      monitorAuthErrors();
      
      // Add visual feedback
      addVisualFeedback();
      
      // Re-check forms periodically
      setInterval(() => {
        fixFormSubmission();
      }, 2000);
      
      // Mark as applied
      window.__SIGNIN_FORM_FIX_APPLIED = true;
      
      log('info', 'Sign-in form fixes applied successfully');
      
      // Add helper function for debugging
      window.__DEBUG_SIGNIN_FORM = function() {
        const forms = document.querySelectorAll('form[data-signin-fixed="true"]');
        return {
          fixedForms: forms.length,
          amplifyConfigured: !!window.reconfigureAmplify,
          authEnsureFunction: !!window.ensureAmplifyAuth,
          forms: Array.from(forms).map(form => ({
            action: form.action || 'none',
            method: form.method,
            hasBackupHandler: form.dataset.backupHandlerAdded === 'true',
            inputs: form.querySelectorAll('input').length
          }))
        };
      };
      
      log('info', 'Debug with: window.__DEBUG_SIGNIN_FORM()');
      
    } catch (error) {
      log('error', 'Error initializing form fixes', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 