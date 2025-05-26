/**
 * Version0013_fix_signin_amplify_import_production.js
 * 
 * Fixed direct authentication that uses existing Amplify configuration
 * Resolves module import issues and variable scope problems
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: Version0008 (network fix), existing Amplify config
 */

(function() {
  'use strict';
  
  console.log('Executing Fixed Direct Authentication v0013');
  console.log('Description: Direct auth using existing Amplify configuration');
  console.log('Target: Sign-in forms with fixed module imports');
  
  // Prevent multiple initialization
  if (window.__FIXED_DIRECT_AUTH_APPLIED) {
    console.log('[FixedDirectAuth] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[FixedDirectAuth] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to perform direct authentication using existing Amplify
  async function performDirectAuth(username, password) {
    let originalText = 'Sign In'; // Default value
    
    try {
      log('info', 'Starting direct authentication', { username });
      
      // Show loading state
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        originalText = submitButton.textContent || 'Sign In';
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
      }
      
      // Ensure Amplify is configured
      if (window.reconfigureAmplify) {
        log('info', 'Reconfiguring Amplify before authentication');
        window.reconfigureAmplify();
      }
      
      // Wait a moment for configuration to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the existing signInWithConfig function from amplifyUnified
      let authResult;
      
      if (window.amplifySignIn) {
        log('info', 'Using window.amplifySignIn function');
        authResult = await window.amplifySignIn({
          username: username,
          password: password,
          options: {
            authFlowType: 'USER_SRP_AUTH'
          }
        });
      } else {
        // Try to use the global Amplify object if available
        if (typeof window.Amplify !== 'undefined' && window.Amplify.Auth) {
          log('info', 'Using window.Amplify.Auth.signIn');
          authResult = await window.Amplify.Auth.signIn(username, password);
        } else {
          throw new Error('No Amplify authentication method available');
        }
      }
      
      log('info', 'Authentication result', {
        isSignedIn: authResult.isSignedIn,
        nextStep: authResult.nextStep
      });
      
      if (authResult.isSignedIn) {
        // Success! Store auth state
        localStorage.setItem('auth_had_session', 'true');
        localStorage.setItem('auth_last_time', new Date().toISOString());
        
        // Get user attributes using existing functions
        let attributes = null;
        
        if (window.fetchUserAttributes) {
          log('info', 'Fetching user attributes');
          attributes = await window.fetchUserAttributes();
        } else if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth.currentUserInfo) {
          attributes = await window.Amplify.Auth.currentUserInfo();
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
          
          // Store tenant ID
          localStorage.setItem('tenant_id', tenantId);
          localStorage.setItem('tenantId', tenantId);
          
          // Also store in AppCache
          if (window.__APP_CACHE) {
            window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
            window.__APP_CACHE.tenant.id = tenantId;
            window.__APP_CACHE.tenantId = tenantId;
          }
        }
        
        // Add auth flag to URL
        redirectUrl += '?fromAuth=true';
        
        log('info', 'Redirecting to', redirectUrl);
        
        // Show success message briefly
        if (submitButton) {
          submitButton.textContent = 'Success! Redirecting...';
        }
        
        // Perform redirect after a short delay
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
        
      } else if (authResult.nextStep) {
        // Handle next steps
        const { signInStep } = authResult.nextStep;
        
        if (signInStep === 'CONFIRM_SIGN_UP') {
          log('info', 'User needs to confirm signup');
          window.location.href = `/auth/verify-email?email=${encodeURIComponent(username)}`;
        } else {
          log('warn', 'Unexpected sign-in step', signInStep);
          showError('Unexpected authentication step. Please try again.');
          restoreButton(submitButton, originalText);
        }
      } else {
        log('warn', 'Authentication completed but user not signed in');
        showError('Authentication failed. Please try again.');
        restoreButton(submitButton, originalText);
      }
      
    } catch (error) {
      log('error', 'Authentication failed', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      
      // Restore button state
      restoreButton(submitButton, originalText);
      
      // Show error to user
      if (error.code === 'UserNotFoundException') {
        showError('No account found with this email');
      } else if (error.code === 'NotAuthorizedException') {
        showError('Incorrect password');
      } else if (error.message && error.message.includes('Network')) {
        showError('Network error. Please check your connection and try again.');
      } else if (error.message && error.message.includes('specifier')) {
        showError('Configuration error. Please refresh the page and try again.');
      } else {
        showError(error.message || 'Authentication failed. Please try again.');
      }
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
    // Try to find existing error container
    let errorDiv = document.querySelector('.auth-error-message');
    
    if (!errorDiv) {
      // Create error container
      errorDiv = document.createElement('div');
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
      `;
      
      // Insert before form
      const form = document.querySelector('form');
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.style.display !== 'none') {
        errorDiv.style.display = 'none';
      }
    }, 10000);
  }
  
  // Function to intercept form submission
  function interceptFormSubmission() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      // Check if this is a sign-in form
      const emailInput = form.querySelector('input[type="email"], input[name="username"], input[name="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      
      if (emailInput && passwordInput && !form.dataset.fixedDirectAuthIntercepted) {
        log('info', `Setting up fixed direct auth for form ${index}`);
        
        form.dataset.fixedDirectAuthIntercepted = 'true';
        
        // Add submit handler
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          log('info', 'Form submission intercepted for fixed direct auth');
          
          const username = emailInput.value.trim();
          const password = passwordInput.value;
          
          if (!username || !password) {
            showError('Please enter both email and password');
            return;
          }
          
          // Hide any existing errors
          const errorDiv = document.querySelector('.auth-error-message');
          if (errorDiv) {
            errorDiv.style.display = 'none';
          }
          
          // Perform direct authentication
          await performDirectAuth(username, password);
        }, true); // Use capture phase
        
        // Also intercept button clicks as backup
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.dataset.fixedDirectAuthIntercepted) {
          submitButton.dataset.fixedDirectAuthIntercepted = 'true';
          
          submitButton.addEventListener('click', async function(e) {
            if (!form.checkValidity()) {
              return; // Let browser validation handle it
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            log('info', 'Submit button clicked, triggering fixed direct auth');
            
            const username = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (username && password) {
              // Hide any existing errors
              const errorDiv = document.querySelector('.auth-error-message');
              if (errorDiv) {
                errorDiv.style.display = 'none';
              }
              
              await performDirectAuth(username, password);
            } else {
              showError('Please enter both email and password');
            }
          }, true);
        }
      }
    });
  }
  
  // Initialize the fix
  function initialize() {
    try {
      log('info', 'Initializing fixed direct authentication');
      
      // Wait for Amplify to be configured
      const checkAmplify = () => {
        if (window.reconfigureAmplify || window.amplifySignIn || (window.Amplify && window.Amplify.Auth)) {
          log('info', 'Amplify detected, setting up form interception');
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
          setInterval(interceptFormSubmission, 3000);
          
          return true;
        }
        return false;
      };
      
      // Try immediately
      if (!checkAmplify()) {
        // Wait for Amplify to load
        let attempts = 0;
        const maxAttempts = 20;
        
        const waitForAmplify = setInterval(() => {
          attempts++;
          if (checkAmplify() || attempts >= maxAttempts) {
            clearInterval(waitForAmplify);
            if (attempts >= maxAttempts) {
              log('warn', 'Amplify not detected after waiting, proceeding anyway');
              interceptFormSubmission();
            }
          }
        }, 500);
      }
      
      // Mark as applied
      window.__FIXED_DIRECT_AUTH_APPLIED = true;
      
      log('info', 'Fixed direct authentication setup complete');
      
      // Add debug function
      window.__DEBUG_FIXED_DIRECT_AUTH = function() {
        const forms = document.querySelectorAll('form[data-fixed-direct-auth-intercepted="true"]');
        return {
          interceptedForms: forms.length,
          amplifySignInAvailable: !!window.amplifySignIn,
          amplifyAvailable: !!(window.Amplify && window.Amplify.Auth),
          reconfigureAvailable: !!window.reconfigureAmplify,
          forms: Array.from(forms).map(form => ({
            hasEmailInput: !!form.querySelector('input[type="email"]'),
            hasPasswordInput: !!form.querySelector('input[type="password"]'),
            hasSubmitButton: !!form.querySelector('button[type="submit"]')
          }))
        };
      };
      
    } catch (error) {
      log('error', 'Error initializing fixed direct auth', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 