/**
 * Version0015_fix_signin_expose_auth_production.js
 * 
 * Exposes the amplifySignIn function globally and provides comprehensive authentication
 * This ensures all authentication scripts can access the proper sign-in method
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: amplifyUnified configuration
 */

(function() {
  'use strict';
  
  console.log('Executing Authentication Exposure Fix v0015');
  console.log('Description: Expose amplifySignIn globally for authentication scripts');
  console.log('Target: Global window object and authentication flow');
  
  // Prevent multiple initialization
  if (window.__AUTH_EXPOSURE_FIX_APPLIED) {
    console.log('[AuthExposure] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[AuthExposure] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to expose authentication methods globally
  async function exposeAuthMethods() {
    try {
      log('info', 'Attempting to expose authentication methods globally');
      
      // Try to import the amplifyUnified module
      let amplifyModule = null;
      
      // Method 1: Try dynamic import
      try {
        amplifyModule = await import('/src/config/amplifyUnified.js');
        log('info', 'Successfully imported amplifyUnified module via dynamic import');
      } catch (importError) {
        log('warn', 'Dynamic import failed, trying alternative methods', importError.message);
        
        // Method 2: Check if it's already available in window
        if (window.amplifySignIn) {
          log('info', 'amplifySignIn already available globally');
          return true;
        }
        
        // Method 3: Try to access from existing modules
        if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props) {
          log('info', 'Checking Next.js data for auth methods');
        }
      }
      
      // If we got the module, expose its methods
      if (amplifyModule) {
        const { signIn, fetchUserAttributes, fetchAuthSession } = amplifyModule;
        
        if (signIn && typeof signIn === 'function') {
          // Expose signIn as amplifySignIn
          window.amplifySignIn = signIn;
          log('info', 'Exposed signIn as window.amplifySignIn');
        }
        
        if (fetchUserAttributes && typeof fetchUserAttributes === 'function') {
          window.fetchUserAttributes = fetchUserAttributes;
          log('info', 'Exposed fetchUserAttributes globally');
        }
        
        if (fetchAuthSession && typeof fetchAuthSession === 'function') {
          window.fetchAuthSession = fetchAuthSession;
          log('info', 'Exposed fetchAuthSession globally');
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      log('error', 'Error exposing authentication methods', error);
      return false;
    }
  }
  
  // Function to create a fallback authentication method
  function createFallbackAuth() {
    log('info', 'Creating fallback authentication method');
    
    window.amplifySignIn = async function(credentials) {
      log('info', 'Fallback amplifySignIn called', { username: credentials.username });
      
      // Ensure Amplify is configured
      if (window.reconfigureAmplify) {
        window.reconfigureAmplify();
      }
      
      // Wait for configuration
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try to use existing Amplify Auth
      if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.signIn) {
        log('info', 'Using Amplify.Auth.signIn as fallback');
        return await window.Amplify.Auth.signIn(credentials.username, credentials.password);
      }
      
      throw new Error('No authentication method available');
    };
    
    log('info', 'Fallback authentication method created');
  }
  
  // Function to perform comprehensive authentication
  async function performComprehensiveAuth(username, password, submitButton) {
    const originalText = submitButton ? (submitButton.textContent || 'Sign In') : 'Sign In';
    
    try {
      log('info', 'Starting comprehensive authentication with exposed methods', { username });
      
      // Show loading state
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
      }
      
      // Ensure Amplify is configured
      if (window.reconfigureAmplify) {
        log('info', 'Reconfiguring Amplify before authentication');
        window.reconfigureAmplify();
      }
      
      // Wait for configuration
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Use the exposed amplifySignIn method
      if (!window.amplifySignIn) {
        throw new Error('Authentication method not available. Please refresh the page.');
      }
      
      log('info', 'Using exposed amplifySignIn method');
      
      const authResult = await window.amplifySignIn({
        username: username,
        password: password,
        options: {
          authFlowType: 'USER_SRP_AUTH'
        }
      });
      
      log('info', 'Authentication result', {
        isSignedIn: authResult?.isSignedIn,
        nextStep: authResult?.nextStep,
        hasResult: !!authResult
      });
      
      // Handle successful authentication
      if (authResult && (authResult.isSignedIn || authResult.signInUserSession)) {
        await handleSuccessfulAuth(username, submitButton);
      } else if (authResult && authResult.nextStep) {
        await handleAuthNextStep(authResult.nextStep, username, submitButton, originalText);
      } else {
        throw new Error('Authentication completed but result is unclear');
      }
      
    } catch (error) {
      log('error', 'Authentication failed', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      
      handleAuthError(error, submitButton, originalText);
    }
  }
  
  // Handle successful authentication
  async function handleSuccessfulAuth(username, submitButton) {
    try {
      // Store auth state
      localStorage.setItem('auth_had_session', 'true');
      localStorage.setItem('auth_last_time', new Date().toISOString());
      
      // Get user attributes
      let attributes = null;
      
      // Try the exposed fetchUserAttributes first
      if (window.fetchUserAttributes) {
        log('info', 'Fetching user attributes with exposed method');
        attributes = await window.fetchUserAttributes();
      } else if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.currentUserInfo) {
        log('info', 'Fetching user attributes with Amplify.Auth.currentUserInfo');
        attributes = await window.Amplify.Auth.currentUserInfo();
      } else if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.currentAuthenticatedUser) {
        log('info', 'Fetching user attributes with currentAuthenticatedUser');
        const user = await window.Amplify.Auth.currentAuthenticatedUser();
        attributes = user.attributes;
      }
      
      log('info', 'User attributes fetched', {
        hasAttributes: !!attributes,
        tenantId: attributes ? attributes['custom:tenant_ID'] : null
      });
      
      // Determine redirect URL
      let redirectUrl = '/dashboard';
      
      if (attributes && attributes['custom:tenant_ID']) {
        const tenantId = attributes['custom:tenant_ID'];
        redirectUrl = `/tenant/${tenantId}/dashboard`;
        
        // Store tenant ID in multiple places
        localStorage.setItem('tenant_id', tenantId);
        localStorage.setItem('tenantId', tenantId);
        
        // Store in AppCache
        if (window.__APP_CACHE) {
          window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
          window.__APP_CACHE.tenant.id = tenantId;
          window.__APP_CACHE.tenantId = tenantId;
        }
      }
      
      // Add auth flag to URL
      redirectUrl += '?fromAuth=true';
      
      log('info', 'Redirecting to', redirectUrl);
      
      // Show success message
      if (submitButton) {
        submitButton.textContent = 'Success! Redirecting...';
      }
      
      // Perform redirect
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
      
    } catch (error) {
      log('error', 'Error handling successful auth', error);
      throw error;
    }
  }
  
  // Handle authentication next steps
  async function handleAuthNextStep(nextStep, username, submitButton, originalText) {
    const { signInStep } = nextStep;
    
    if (signInStep === 'CONFIRM_SIGN_UP') {
      log('info', 'User needs to confirm signup');
      window.location.href = `/auth/verify-email?email=${encodeURIComponent(username)}`;
    } else {
      log('warn', 'Unexpected sign-in step', signInStep);
      showError('Unexpected authentication step. Please try again.');
      restoreButton(submitButton, originalText);
    }
  }
  
  // Handle authentication errors
  function handleAuthError(error, submitButton, originalText) {
    // Restore button state
    restoreButton(submitButton, originalText);
    
    // Show appropriate error message
    if (error.code === 'UserNotFoundException') {
      showError('No account found with this email');
    } else if (error.code === 'NotAuthorizedException') {
      showError('Incorrect password');
    } else if (error.message && error.message.includes('Network')) {
      showError('Network error. Please check your connection and try again.');
    } else if (error.message && error.message.includes('not available')) {
      showError('Authentication service not ready. Please refresh the page and try again.');
    } else {
      showError(error.message || 'Authentication failed. Please try again.');
    }
  }
  
  // Helper function to restore button state
  function restoreButton(submitButton, originalText) {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
  
  // Function to show error messages
  function showError(message) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.auth-error-message');
    existingErrors.forEach(error => error.remove());
    
    // Create new error container
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error-message';
    errorDiv.style.cssText = `
      background-color: #fee;
      border: 1px solid #fcc;
      color: #c00;
      padding: 12px;
      margin: 10px 0;
      border-radius: 4px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1000;
      position: relative;
    `;
    
    errorDiv.textContent = message;
    
    // Insert before form
    const form = document.querySelector('form');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(errorDiv, form);
    } else {
      // Fallback: insert at top of body
      document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 15000);
  }
  
  // Function to intercept form submission
  function interceptFormSubmission() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      // Check if this is a sign-in form
      const emailInput = form.querySelector('input[type="email"], input[name="username"], input[name="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      const submitButton = form.querySelector('button[type="submit"]');
      
      if (emailInput && passwordInput && !form.dataset.authExposureIntercepted) {
        log('info', `Setting up auth exposure for form ${index}`);
        
        form.dataset.authExposureIntercepted = 'true';
        
        // Add form submit handler
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          log('info', 'Form submission intercepted for auth exposure');
          
          const username = emailInput.value.trim();
          const password = passwordInput.value;
          
          if (!username || !password) {
            showError('Please enter both email and password');
            return;
          }
          
          // Hide any existing errors
          const existingErrors = document.querySelectorAll('.auth-error-message');
          existingErrors.forEach(error => error.remove());
          
          // Perform authentication
          await performComprehensiveAuth(username, password, submitButton);
        }, true);
        
        // Add button click handler as backup
        if (submitButton && !submitButton.dataset.authExposureIntercepted) {
          submitButton.dataset.authExposureIntercepted = 'true';
          
          submitButton.addEventListener('click', async function(e) {
            // Check form validity first
            if (!form.checkValidity()) {
              return; // Let browser validation handle it
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            log('info', 'Submit button clicked, triggering auth exposure');
            
            const username = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!username || !password) {
              showError('Please enter both email and password');
              return;
            }
            
            // Hide any existing errors
            const existingErrors = document.querySelectorAll('.auth-error-message');
            existingErrors.forEach(error => error.remove());
            
            // Perform authentication
            await performComprehensiveAuth(username, password, submitButton);
          }, true);
        }
      }
    });
  }
  
  // Initialize the authentication exposure fix
  async function initialize() {
    try {
      log('info', 'Initializing authentication exposure fix');
      
      // First, try to expose authentication methods
      const exposed = await exposeAuthMethods();
      
      if (!exposed) {
        log('warn', 'Could not expose auth methods, creating fallback');
        createFallbackAuth();
      }
      
      // Wait a moment for everything to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set up form interception
      interceptFormSubmission();
      
      // Monitor for new forms
      const observer = new MutationObserver(() => {
        interceptFormSubmission();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Re-check periodically
      setInterval(interceptFormSubmission, 5000);
      
      // Mark as applied
      window.__AUTH_EXPOSURE_FIX_APPLIED = true;
      
      log('info', 'Authentication exposure fix setup complete');
      
      // Add debug function
      window.__DEBUG_AUTH_EXPOSURE = function() {
        const forms = document.querySelectorAll('form[data-auth-exposure-intercepted="true"]');
        
        return {
          interceptedForms: forms.length,
          amplifySignInAvailable: !!window.amplifySignIn,
          fetchUserAttributesAvailable: !!window.fetchUserAttributes,
          fetchAuthSessionAvailable: !!window.fetchAuthSession,
          reconfigureAmplifyAvailable: !!window.reconfigureAmplify,
          amplifyAvailable: !!(window.Amplify && window.Amplify.Auth),
          forms: Array.from(forms).map(form => ({
            hasEmailInput: !!form.querySelector('input[type="email"]'),
            hasPasswordInput: !!form.querySelector('input[type="password"]'),
            hasSubmitButton: !!form.querySelector('button[type="submit"]')
          }))
        };
      };
      
    } catch (error) {
      log('error', 'Error initializing auth exposure fix', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 