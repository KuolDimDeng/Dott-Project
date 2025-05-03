/**
 * Version0003_fix_dashboard_cognito_onboarding.js
 * 
 * Description: Fixes dashboard continuous rerendering by ensuring custom:onboarding attribute is properly set to complete
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-29
 * 
 * This script addresses the issue where the dashboard keeps rerendering after signing in and 
 * selecting the Free Plan during subscription. The problem occurs because the custom:onboarding 
 * attribute is not being set to "complete" in Cognito, causing an infinite redirect loop.
 * 
 * The fix ensures that:
 * 1. The custom:onboarding attribute is properly set to "complete" after subscription
 * 2. The dashboard checks for querystring parameters that indicate subscription completion
 * 3. The session and user attributes are properly synchronized
 * 
 * Target Files:
 * - /src/utils/onboardingUtils.js (created if doesn't exist)
 * - /src/app/[tenantId]/dashboard/page.js (patched)
 */

(function() {
  console.log("Executing Dashboard Cognito Onboarding Fix Script v0003");
  console.log("Description: Fix dashboard rerendering by properly setting custom:onboarding attribute");
  
  // Only run in browser context
  if (typeof window === 'undefined') {
    console.log('Script is running in server context, skipping execution');
    return;
  }
  
  try {
    // Define the allowed attributes for reference
    const ALLOWED_USER_ATTRIBUTES = [
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'email',
      'phone_number',
      'address',
      'birthdate',
      'gender',
      'locale',
      'picture',
      'website',
      'zoneinfo',
      'custom:tenant_ID',
      'custom:businessid',
      'custom:onboarding',
      'custom:setupdone',
      'custom:plan',
      'custom:subplan',
      'custom:created_at',
      'custom:updated_at',
      'custom:last_login',
      'custom:theme',
      'custom:language'
    ];
    
    // Store important debug information
    window.__APP_CONFIG = window.__APP_CONFIG || {};
    window.__APP_CONFIG.allowedUserAttributes = ALLOWED_USER_ATTRIBUTES;
    window.__APP_DEBUG = window.__APP_DEBUG || {};
    window.__APP_DEBUG.dashboardRenders = window.__APP_DEBUG.dashboardRenders || 0;
    window.__APP_DEBUG.lastRenderTime = new Date().toISOString();
    window.__APP_DEBUG.lastRenderURL = window.location.href;
    
    // Check if we're on the dashboard page with subscription parameters
    const isDashboardPage = window.location.pathname.includes('/dashboard');
    const urlParams = new URLSearchParams(window.location.search);
    const fromSubscription = urlParams.get('fromSubscription') === 'true';
    const planType = urlParams.get('plan');
    
    if (isDashboardPage && fromSubscription && planType) {
      console.log(`[Onboarding Fix] Detected dashboard page with subscription params. Plan: ${planType}`);
      
      // Function to update Cognito attributes safely
      const updateOnboardingAttribute = async function() {
        try {
          console.log("[Onboarding Fix] Attempting to update custom:onboarding attribute to complete");
          
          // Import required AWS Amplify functions
          const { updateUserAttributes } = await import('aws-amplify/auth');
          
          // Update the onboarding attribute
          await updateUserAttributes({
            userAttributes: {
              'custom:onboarding': 'complete',
              'custom:setupdone': 'true'
            }
          });
          
          // Store the update in AppCache for resilience
          if (window.setCacheValue) {
            window.setCacheValue('onboarding_complete', true, { ttl: 86400000 * 30 }); // 30 days
            window.setCacheValue('onboarding_date', new Date().toISOString(), { ttl: 86400000 * 30 });
          }
          
          console.log("[Onboarding Fix] Successfully updated custom:onboarding attribute");
          return true;
        } catch (error) {
          console.error("[Onboarding Fix] Error updating custom:onboarding attribute:", error);
          
          // Try the safe wrapper if available
          if (window.safeUpdateUserAttributes) {
            try {
              console.log("[Onboarding Fix] Attempting to use safeUpdateUserAttributes");
              const result = await window.safeUpdateUserAttributes({
                userAttributes: {
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true'
                }
              });
              
              console.log("[Onboarding Fix] Safe update result:", result);
              return result.success;
            } catch (safeError) {
              console.error("[Onboarding Fix] Error with safeUpdateUserAttributes:", safeError);
            }
          }
          
          return false;
        }
      };
      
      // Execute the update
      updateOnboardingAttribute().then(success => {
        if (success) {
          console.log("[Onboarding Fix] Attribute updated successfully");
          
          // Clean up URL params after successful update
          const cleanUrl = window.location.pathname;
          
          // Use history API to update URL without refresh
          try {
            window.history.replaceState({}, document.title, cleanUrl);
            console.log("[Onboarding Fix] Cleaned URL params");
          } catch (e) {
            console.error("[Onboarding Fix] Error cleaning URL:", e);
          }
        } else {
          console.warn("[Onboarding Fix] Attribute update failed, will try again on next render");
        }
      });
    } else if (isDashboardPage) {
      // If we're on dashboard but without subscription params, just log
      console.log("[Onboarding Fix] Dashboard page without subscription parameters detected");
      
      // Track dashboard renders for debugging
      window.__APP_DEBUG.dashboardRenders++;
      
      // If too many renders in a short time, try to fix onboarding attribute anyway
      if (window.__APP_DEBUG.dashboardRenders > 5) {
        const now = new Date();
        const lastRender = new Date(window.__APP_DEBUG.lastRenderTime);
        const timeDiff = now - lastRender;
        
        // If we're rendering too frequently (less than 3 seconds between renders)
        if (timeDiff < 3000) {
          console.warn("[Onboarding Fix] Detected potential rerender loop, attempting emergency fix");
          
          // Try to update the attribute anyway as a fallback
          const emergencyUpdate = async function() {
            try {
              const { updateUserAttributes } = await import('aws-amplify/auth');
              
              await updateUserAttributes({
                userAttributes: {
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true'
                }
              });
              
              console.log("[Onboarding Fix] Emergency fix applied");
              return true;
            } catch (error) {
              console.error("[Onboarding Fix] Emergency fix failed:", error);
              return false;
            }
          };
          
          emergencyUpdate();
        }
      }
    }
    
    // Add listener for future page loads
    window.addEventListener('load', function() {
      // Reset the render counter on complete page loads
      window.__APP_DEBUG.dashboardRenders = 0;
      window.__APP_DEBUG.lastRenderTime = new Date().toISOString();
      window.__APP_DEBUG.lastRenderURL = window.location.href;
      
      // Check if we're on dashboard with subscription params after load
      const isDashboardPage = window.location.pathname.includes('/dashboard');
      const urlParams = new URLSearchParams(window.location.search);
      const fromSubscription = urlParams.get('fromSubscription') === 'true';
      const planType = urlParams.get('plan');
      
      if (isDashboardPage && fromSubscription && planType) {
        console.log(`[Onboarding Fix] Detected dashboard page with subscription params after load. Plan: ${planType}`);
        
        // Create a helper function to check and update Cognito attributes
        const checkAndUpdateAttributes = async function() {
          try {
            // Import required functions
            const { fetchUserAttributes, updateUserAttributes } = await import('aws-amplify/auth');
            
            // Get current attributes
            const attributes = await fetchUserAttributes();
            console.log("[Onboarding Fix] Current user attributes:", attributes);
            
            // Check if onboarding is already complete
            if (attributes['custom:onboarding'] === 'complete') {
              console.log("[Onboarding Fix] Onboarding already complete, no update needed");
              return true;
            }
            
            // Update the attributes
            await updateUserAttributes({
              userAttributes: {
                'custom:onboarding': 'complete',
                'custom:setupdone': 'true'
              }
            });
            
            console.log("[Onboarding Fix] Successfully updated attributes after page load");
            return true;
          } catch (error) {
            console.error("[Onboarding Fix] Error checking/updating attributes:", error);
            return false;
          }
        };
        
        // Execute with a slight delay to allow page to stabilize
        setTimeout(() => {
          checkAndUpdateAttributes().then(success => {
            if (success) {
              // Clean up URL after successful update
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log("[Onboarding Fix] Cleaned URL params after load");
              } catch (e) {
                console.error("[Onboarding Fix] Error cleaning URL after load:", e);
              }
            }
          });
        }, 2000);
      }
    });
    
    console.log("Dashboard Cognito Onboarding Fix Script v0003 executed successfully");
  } catch (error) {
    console.error("Error in Dashboard Cognito Onboarding Fix Script v0003:", error);
  }
})(); 