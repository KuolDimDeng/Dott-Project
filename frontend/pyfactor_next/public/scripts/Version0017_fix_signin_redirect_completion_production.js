/**
 * Version0017_fix_signin_redirect_completion_production.js
 * 
 * Ensures the redirect actually completes after successful authentication
 * Fixes cases where authentication succeeds but redirect doesn't happen
 * 
 * Version: 1.0
 * Date: 2025-01-27
 * Dependencies: Successful authentication
 */

(function() {
  'use strict';
  
  console.log('Executing Redirect Completion Fix v0017');
  console.log('Description: Ensure redirect completes after successful authentication');
  console.log('Target: Post-authentication redirect flow');
  
  // Prevent multiple initialization
  if (window.__REDIRECT_COMPLETION_FIX_APPLIED) {
    console.log('[RedirectFix] Already applied');
    return;
  }
  
  const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[RedirectFix] ${timestamp} ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  };
  
  // Function to check if we should be redirected
  function checkForPendingRedirect() {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    // Check if we're on sign-in page but should be redirected
    if (currentPath === '/auth/signin') {
      // Check for auth success indicators
      const authSuccess = localStorage.getItem('auth_had_session');
      const lastAuthTime = localStorage.getItem('auth_last_time');
      const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id');
      
      if (authSuccess && lastAuthTime) {
        const authTime = new Date(lastAuthTime);
        const now = new Date();
        const timeDiff = now - authTime;
        
        // If auth was recent (within last 30 seconds), we should redirect
        if (timeDiff < 30000) {
          log('info', 'Recent authentication detected, checking for redirect', {
            authTime: lastAuthTime,
            tenantId: tenantId,
            timeDiff: timeDiff
          });
          
          return {
            shouldRedirect: true,
            tenantId: tenantId,
            authTime: authTime
          };
        }
      }
    }
    
    return { shouldRedirect: false };
  }
  
  // Function to perform the redirect
  function performRedirect(tenantId) {
    let redirectUrl = '/dashboard';
    
    if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
      redirectUrl = `/tenant/${tenantId}/dashboard`;
    }
    
    // Add auth flag to URL
    redirectUrl += '?fromAuth=true&redirected=true';
    
    log('info', 'Performing redirect', { redirectUrl, tenantId });
    
    // Try multiple redirect methods
    try {
      // Method 1: window.location.href
      window.location.href = redirectUrl;
      
      // Method 2: window.location.replace (as backup)
      setTimeout(() => {
        if (window.location.pathname === '/auth/signin') {
          log('warn', 'Primary redirect failed, using replace method');
          window.location.replace(redirectUrl);
        }
      }, 1000);
      
      // Method 3: Force reload with new URL (as last resort)
      setTimeout(() => {
        if (window.location.pathname === '/auth/signin') {
          log('warn', 'All redirect methods failed, forcing navigation');
          window.open(redirectUrl, '_self');
        }
      }, 3000);
      
    } catch (error) {
      log('error', 'Error during redirect', error);
    }
  }
  
  // Function to monitor for successful authentication
  function monitorAuthSuccess() {
    // Watch for auth success indicators
    const checkInterval = setInterval(() => {
      const redirectCheck = checkForPendingRedirect();
      
      if (redirectCheck.shouldRedirect) {
        log('info', 'Authentication success detected, initiating redirect');
        clearInterval(checkInterval);
        performRedirect(redirectCheck.tenantId);
      }
    }, 1000);
    
    // Stop checking after 2 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      log('info', 'Stopped monitoring for auth success');
    }, 120000);
  }
  
  // Function to intercept and enhance existing auth methods
  function enhanceAuthMethods() {
    // Enhance the existing amplifySignIn method
    if (window.amplifySignIn) {
      const originalAmplifySignIn = window.amplifySignIn;
      
      window.amplifySignIn = async function(...args) {
        log('info', 'Enhanced amplifySignIn called');
        
        try {
          const result = await originalAmplifySignIn.apply(this, args);
          
          log('info', 'Authentication result received', {
            isSignedIn: result?.isSignedIn,
            hasSession: !!result?.signInUserSession
          });
          
          // If authentication was successful, ensure redirect happens
          if (result && (result.isSignedIn || result.signInUserSession)) {
            log('info', 'Authentication successful, ensuring redirect');
            
            // Store success indicators
            localStorage.setItem('auth_had_session', 'true');
            localStorage.setItem('auth_last_time', new Date().toISOString());
            
            // Try to get tenant ID from result or fetch it
            let tenantId = null;
            
            try {
              if (window.fetchUserAttributes) {
                const attributes = await window.fetchUserAttributes();
                tenantId = attributes?.['custom:tenant_ID'];
                
                if (tenantId) {
                  localStorage.setItem('tenantId', tenantId);
                  localStorage.setItem('tenant_id', tenantId);
                }
              }
            } catch (attrError) {
              log('warn', 'Could not fetch user attributes', attrError);
              tenantId = 'test-tenant'; // fallback
            }
            
            // Perform redirect after a short delay
            setTimeout(() => {
              performRedirect(tenantId);
            }, 500);
          }
          
          return result;
          
        } catch (error) {
          log('error', 'Enhanced amplifySignIn error', error);
          throw error;
        }
      };
      
      log('info', 'Enhanced amplifySignIn method');
    }
  }
  
  // Function to check for stuck authentication state
  function checkStuckState() {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/auth/signin') {
      // Check if we have recent auth indicators but are still on sign-in page
      const authSuccess = localStorage.getItem('auth_had_session');
      const lastAuthTime = localStorage.getItem('auth_last_time');
      
      if (authSuccess && lastAuthTime) {
        const authTime = new Date(lastAuthTime);
        const now = new Date();
        const timeDiff = now - authTime;
        
        // If auth was very recent (within last 10 seconds), force redirect
        if (timeDiff < 10000) {
          log('warn', 'Detected stuck authentication state, forcing redirect');
          const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id') || 'test-tenant';
          performRedirect(tenantId);
        }
      }
    }
  }
  
  // Function to add redirect button as emergency fallback
  function addEmergencyRedirectButton() {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/auth/signin') {
      // Check if we have auth indicators
      const authSuccess = localStorage.getItem('auth_had_session');
      const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id');
      
      if (authSuccess && tenantId) {
        // Add emergency redirect button
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            const form = document.querySelector('form');
            if (form && !document.querySelector('.emergency-redirect-button')) {
              const button = document.createElement('button');
              button.className = 'emergency-redirect-button';
              button.type = 'button';
              button.textContent = 'Continue to Dashboard';
              button.style.cssText = `
                background-color: #10b981;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                margin-top: 16px;
                width: 100%;
              `;
              
              button.addEventListener('click', () => {
                log('info', 'Emergency redirect button clicked');
                performRedirect(tenantId);
              });
              
              form.appendChild(button);
              
              log('info', 'Added emergency redirect button');
            }
          }
        }, 5000);
      }
    }
  }
  
  // Initialize the redirect completion fix
  function initialize() {
    try {
      log('info', 'Initializing redirect completion fix');
      
      // Check for immediate redirect needs
      const redirectCheck = checkForPendingRedirect();
      if (redirectCheck.shouldRedirect) {
        log('info', 'Immediate redirect needed');
        performRedirect(redirectCheck.tenantId);
        return;
      }
      
      // Check for stuck state
      checkStuckState();
      
      // Enhance existing auth methods
      enhanceAuthMethods();
      
      // Monitor for auth success
      monitorAuthSuccess();
      
      // Add emergency redirect button
      addEmergencyRedirectButton();
      
      // Mark as applied
      window.__REDIRECT_COMPLETION_FIX_APPLIED = true;
      
      log('info', 'Redirect completion fix setup complete');
      
      // Add debug function
      window.__DEBUG_REDIRECT_FIX = function() {
        const authSuccess = localStorage.getItem('auth_had_session');
        const lastAuthTime = localStorage.getItem('auth_last_time');
        const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id');
        
        return {
          currentPath: window.location.pathname,
          authSuccess: authSuccess,
          lastAuthTime: lastAuthTime,
          tenantId: tenantId,
          shouldRedirect: checkForPendingRedirect().shouldRedirect,
          hasEmergencyButton: !!document.querySelector('.emergency-redirect-button')
        };
      };
      
    } catch (error) {
      log('error', 'Error initializing redirect completion fix', error);
    }
  }
  
  // Initialize immediately and also when DOM is ready
  initialize();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  }
  
})(); 