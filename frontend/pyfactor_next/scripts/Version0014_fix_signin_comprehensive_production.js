/**
 * Version0014_fix_signin_comprehensive_production.js
 * 
 * Comprehensive sign-in fix that resolves all variable scope issues
 * and uses the correct Amplify authentication methods available in the app
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: Existing Amplify configuration
 */

(function() {
  'use strict';
  
  console.log('Executing Comprehensive Sign-In Fix v0014');
  console.log('Description: Complete authentication fix with proper variable scoping');
  console.log('Target: All sign-in forms with comprehensive error handling');
  
  // Prevent multiple initialization
  if (window.__COMPREHENSIVE_AUTH_FIX_APPLIED) {
    console.log('[ComprehensiveAuth] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[ComprehensiveAuth] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to find available Amplify authentication method
  function findAmplifyAuthMethod() {
    // Check for various Amplify authentication methods
    if (window.amplifySignIn && typeof window.amplifySignIn === 'function') {
      return { method: 'amplifySignIn', func: window.amplifySignIn };
    }
    
    if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.signIn) {
      return { method: 'Amplify.Auth.signIn', func: window.Amplify.Auth.signIn };
    }
    
    // Check for Auth from aws-amplify if it's available globally
    if (window.Auth && window.Auth.signIn) {
      return { method: 'Auth.signIn', func: window.Auth.signIn };
    }
    
    // Check if there's a global signIn function
    if (window.signIn && typeof window.signIn === 'function') {
      return { method: 'signIn', func: window.signIn };
    }
    
    return null;
  }
  
  // Function to perform direct authentication
  async function performDirectAuth(username, password, submitButton) {
    const originalText = submitButton ? (submitButton.textContent || 'Sign In') : 'Sign In';
    
    try {
      log('info', 'Starting comprehensive authentication', { username });
      
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
      
      // Find available authentication method
      const authMethod = findAmplifyAuthMethod();
      
      if (!authMethod) {
        throw new Error('No Amplify authentication method available. Please refresh the page.');
      }
      
      log('info', `Using authentication method: ${authMethod.method}`);
      
      // Perform authentication based on the method found
      let authResult;
      
      if (authMethod.method === 'amplifySignIn') {
        authResult = await authMethod.func({
          username: username,
          password: password,
          options: {
            authFlowType: 'USER_SRP_AUTH'
          }
        });
      } else if (authMethod.method === 'Amplify.Auth.signIn') {
        authResult = await authMethod.func(username, password);
      } else {
        // Generic call for other methods
        authResult = await authMethod.func(username, password);
      }
      
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
      
      // Try multiple methods to get user attributes
      if (window.fetchUserAttributes) {
        log('info', 'Fetching user attributes with fetchUserAttributes');
        attributes = await window.fetchUserAttributes();
      } else if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.currentUserInfo) {
        log('info', 'Fetching user attributes with currentUserInfo');
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
    } else if (error.message && error.message.includes('specifier')) {
      showError('Configuration error. Please refresh the page and try again.');
    } else if (error.message && error.message.includes('No Amplify')) {
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
      
      if (emailInput && passwordInput && !form.dataset.comprehensiveAuthIntercepted) {
        log('info', `Setting up comprehensive auth for form ${index}`);
        
        form.dataset.comprehensiveAuthIntercepted = 'true';
        
        // Add form submit handler
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          log('info', 'Form submission intercepted for comprehensive auth');
          
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
          await performDirectAuth(username, password, submitButton);
        }, true);
        
        // Add button click handler as backup
        if (submitButton && !submitButton.dataset.comprehensiveAuthIntercepted) {
          submitButton.dataset.comprehensiveAuthIntercepted = 'true';
          
          submitButton.addEventListener('click', async function(e) {
            // Check form validity first
            if (!form.checkValidity()) {
              return; // Let browser validation handle it
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            log('info', 'Submit button clicked, triggering comprehensive auth');
            
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
            await performDirectAuth(username, password, submitButton);
          }, true);
        }
      }
    });
  }
  
  // Initialize the comprehensive fix
  function initialize() {
    try {
      log('info', 'Initializing comprehensive authentication fix');
      
      // Check for Amplify availability
      const checkAmplify = () => {
        const authMethod = findAmplifyAuthMethod();
        if (authMethod || window.reconfigureAmplify) {
          log('info', `Authentication method available: ${authMethod ? authMethod.method : 'reconfigureAmplify only'}`);
          return true;
        }
        return false;
      };
      
      // Set up form interception
      const setupInterception = () => {
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
      };
      
      // Try immediately
      if (checkAmplify()) {
        setupInterception();
      } else {
        // Wait for Amplify to load
        log('info', 'Waiting for Amplify authentication methods to become available');
        
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds
        
        const waitForAmplify = setInterval(() => {
          attempts++;
          if (checkAmplify() || attempts >= maxAttempts) {
            clearInterval(waitForAmplify);
            
            if (attempts >= maxAttempts) {
              log('warn', 'Amplify not detected after waiting, setting up interception anyway');
            }
            
            setupInterception();
          }
        }, 500);
      }
      
      // Mark as applied
      window.__COMPREHENSIVE_AUTH_FIX_APPLIED = true;
      
      log('info', 'Comprehensive authentication fix setup complete');
      
      // Add debug function
      window.__DEBUG_COMPREHENSIVE_AUTH = function() {
        const forms = document.querySelectorAll('form[data-comprehensive-auth-intercepted="true"]');
        const authMethod = findAmplifyAuthMethod();
        
        return {
          interceptedForms: forms.length,
          availableAuthMethod: authMethod ? authMethod.method : 'none',
          reconfigureAvailable: !!window.reconfigureAmplify,
          amplifyAvailable: !!(window.Amplify && window.Amplify.Auth),
          forms: Array.from(forms).map(form => ({
            hasEmailInput: !!form.querySelector('input[type="email"]'),
            hasPasswordInput: !!form.querySelector('input[type="password"]'),
            hasSubmitButton: !!form.querySelector('button[type="submit"]')
          }))
        };
      };
      
    } catch (error) {
      log('error', 'Error initializing comprehensive auth fix', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 