/**
 * Version0012_fix_signin_direct_auth_production.js
 * 
 * Direct authentication fix that intercepts form submission and calls auth directly
 * This bypasses React form handler issues and ensures authentication works
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: Version0008 (network fix), Amplify
 */

(function() {
  'use strict';
  
  console.log('Executing Direct Authentication Fix v0012');
  console.log('Description: Intercept sign-in and call authentication directly');
  console.log('Target: Sign-in forms with direct Amplify integration');
  
  // Prevent multiple initialization
  if (window.__DIRECT_AUTH_FIX_APPLIED) {
    console.log('[DirectAuthFix] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[DirectAuthFix] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to perform direct authentication
  async function performDirectAuth(username, password) {
    try {
      log('info', 'Starting direct authentication', { username });
      
      // Show loading state
      const submitButton = document.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
      }
      
      // Import Amplify auth functions
      const { signIn } = await import('aws-amplify/auth');
      
      // Ensure Amplify is configured
      if (window.reconfigureAmplify) {
        window.reconfigureAmplify();
      }
      
      // Perform authentication
      const result = await signIn({
        username: username,
        password: password,
        options: {
          authFlowType: 'USER_SRP_AUTH'
        }
      });
      
      log('info', 'Authentication result', {
        isSignedIn: result.isSignedIn,
        nextStep: result.nextStep
      });
      
      if (result.isSignedIn) {
        // Success! Store auth state
        localStorage.setItem('auth_had_session', 'true');
        localStorage.setItem('auth_last_time', new Date().toISOString());
        
        // Get user attributes
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        const attributes = await fetchUserAttributes();
        
        log('info', 'User attributes fetched', {
          hasAttributes: !!attributes,
          tenantId: attributes['custom:tenant_ID']
        });
        
        // Determine redirect URL
        let redirectUrl = '/dashboard';
        
        if (attributes && attributes['custom:tenant_ID']) {
          const tenantId = attributes['custom:tenant_ID'];
          redirectUrl = `/tenant/${tenantId}/dashboard`;
          
          // Store tenant ID
          localStorage.setItem('tenant_id', tenantId);
          localStorage.setItem('tenantId', tenantId);
        }
        
        // Add auth flag to URL
        redirectUrl += '?fromAuth=true';
        
        log('info', 'Redirecting to', redirectUrl);
        
        // Perform redirect
        window.location.href = redirectUrl;
        
      } else if (result.nextStep) {
        // Handle next steps
        const { signInStep } = result.nextStep;
        
        if (signInStep === 'CONFIRM_SIGN_UP') {
          log('info', 'User needs to confirm signup');
          window.location.href = `/auth/verify-email?email=${encodeURIComponent(username)}`;
        } else {
          log('warn', 'Unexpected sign-in step', signInStep);
          showError('Unexpected authentication step. Please try again.');
        }
      }
      
    } catch (error) {
      log('error', 'Authentication failed', {
        code: error.code,
        message: error.message
      });
      
      // Restore button state
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText || 'Sign In';
      }
      
      // Show error to user
      if (error.code === 'UserNotFoundException') {
        showError('No account found with this email');
      } else if (error.code === 'NotAuthorizedException') {
        showError('Incorrect password');
      } else if (error.message && error.message.includes('Network')) {
        showError('Network error. Please check your connection and try again.');
      } else {
        showError(error.message || 'Authentication failed. Please try again.');
      }
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
      `;
      
      // Insert before form
      const form = document.querySelector('form');
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  
  // Function to intercept form submission
  function interceptFormSubmission() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      // Check if this is a sign-in form
      const emailInput = form.querySelector('input[type="email"], input[name="username"], input[name="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      
      if (emailInput && passwordInput && !form.dataset.directAuthIntercepted) {
        log('info', `Setting up direct auth for form ${index}`);
        
        form.dataset.directAuthIntercepted = 'true';
        
        // Add submit handler
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          log('info', 'Form submission intercepted for direct auth');
          
          const username = emailInput.value;
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
        if (submitButton && !submitButton.dataset.directAuthIntercepted) {
          submitButton.dataset.directAuthIntercepted = 'true';
          
          submitButton.addEventListener('click', async function(e) {
            if (!form.checkValidity()) {
              return; // Let browser validation handle it
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            log('info', 'Submit button clicked, triggering direct auth');
            
            const username = emailInput.value;
            const password = passwordInput.value;
            
            if (username && password) {
              await performDirectAuth(username, password);
            }
          }, true);
        }
      }
    });
  }
  
  // Initialize the fix
  function initialize() {
    try {
      log('info', 'Initializing direct authentication fix');
      
      // Intercept existing forms
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
      setInterval(interceptFormSubmission, 2000);
      
      // Mark as applied
      window.__DIRECT_AUTH_FIX_APPLIED = true;
      
      log('info', 'Direct authentication fix applied successfully');
      
      // Add debug function
      window.__DEBUG_DIRECT_AUTH = function() {
        const forms = document.querySelectorAll('form[data-direct-auth-intercepted="true"]');
        return {
          interceptedForms: forms.length,
          amplifyAvailable: typeof window.Amplify !== 'undefined',
          forms: Array.from(forms).map(form => ({
            hasEmailInput: !!form.querySelector('input[type="email"]'),
            hasPasswordInput: !!form.querySelector('input[type="password"]'),
            hasSubmitButton: !!form.querySelector('button[type="submit"]')
          }))
        };
      };
      
    } catch (error) {
      log('error', 'Error initializing direct auth fix', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(); 