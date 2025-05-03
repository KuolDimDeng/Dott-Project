/**
 * Cognito Attributes Permissions Fix Script - Version 0002
 * This script fixes issues with "A client attempted to write unauthorized attribute" errors
 * by ensuring only allowed attributes are updated.
 *
 * Problem: When updating user attributes in Cognito, the app is trying to write to attributes
 * that the user doesn't have permission to update, resulting in 400 errors.
 *
 * Fix: Apply this script to filter attributes before sending to Cognito and implement
 * proper error handling for attribute updates.
 */

'use strict';

(function() {
  // Script version and metadata
  const VERSION = '0002';
  const DESCRIPTION = 'Fix Cognito attributes permissions errors';
  const TARGET_FILES = ['src/utils/amplifyResiliency.js', 'src/utils/safeAttributes.js'];
  
  // Log execution
  console.log(`Executing Cognito Attributes Fix Script v${VERSION}`);
  console.log(`Description: ${DESCRIPTION}`);
  console.log(`Target files: ${TARGET_FILES.join(', ')}`);
  
  // Only run in browser context
  if (typeof window === 'undefined') {
    console.log('Script is running in server context, skipping execution');
    return;
  }
  
  try {
    // ===============================================
    // Fix 1: Define allowed attributes that users can update
    // ===============================================
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
    
    // Store the allowed attributes list in window for global access
    window.__APP_CONFIG = window.__APP_CONFIG || {};
    window.__APP_CONFIG.allowedUserAttributes = ALLOWED_USER_ATTRIBUTES;
    
    // Add a warning about tenant ID attribute casing
    console.warn('[AttributesFix] IMPORTANT: Use only custom:tenant_ID (uppercase ID) and not custom:tenant_id (lowercase id). The lowercase version is not allowed for updates.');
    
    // ===============================================
    // Fix 2: Create a wrapper for updateUserAttributes that filters attributes
    // ===============================================
    const originalUpdateUserAttributes = window.updateUserAttributes;
    
    // Safe wrapper that filters out unauthorized attributes
    window.safeUpdateUserAttributes = async function(params) {
      try {
        // If the original function doesn't exist, log an error and return
        if (typeof window.updateUserAttributes !== 'function') {
          console.error('[AttributesFix] updateUserAttributes function not available');
          return { success: false, error: 'updateUserAttributes function not available' };
        }
        
        // Clone the params to avoid modifying the original
        const safeParams = JSON.parse(JSON.stringify(params));
        
        // If there are user attributes to update, filter them
        if (safeParams.userAttributes) {
          const filteredAttributes = {};
          
          // Only include allowed attributes
          Object.keys(safeParams.userAttributes).forEach(key => {
            if (ALLOWED_USER_ATTRIBUTES.includes(key)) {
              filteredAttributes[key] = safeParams.userAttributes[key];
            } else if (key === 'custom:tenant_id') {
              // Special case: convert lowercase tenant_id to uppercase tenant_ID
              console.warn(`[AttributesFix] Converting custom:tenant_id to custom:tenant_ID for consistency`);
              filteredAttributes['custom:tenant_ID'] = safeParams.userAttributes[key];
            } else {
              console.warn(`[AttributesFix] Filtering out unauthorized attribute: ${key}`);
            }
          });
          
          // Replace with filtered attributes
          safeParams.userAttributes = filteredAttributes;
        }
        
        // If there are no attributes left, don't make the API call
        if (Object.keys(safeParams.userAttributes || {}).length === 0) {
          console.log('[AttributesFix] No allowed attributes to update, skipping API call');
          return { success: true, skipped: true };
        }
        
        // Call the original function with filtered attributes
        const result = await window.updateUserAttributes(safeParams);
        return { success: true, result };
      } catch (error) {
        console.error('[AttributesFix] Error in safeUpdateUserAttributes:', error);
        return { success: false, error };
      }
    };
    
    // ===============================================
    // Fix 3: Patch the resilientUpdateUserAttributes function if it exists
    // ===============================================
    if (typeof window.resilientUpdateUserAttributes === 'function') {
      const originalResillientUpdate = window.resilientUpdateUserAttributes;
      
      window.resilientUpdateUserAttributes = async function(params) {
        try {
          // Apply the same attribute filtering
          const safeParams = JSON.parse(JSON.stringify(params));
          
          if (safeParams.userAttributes) {
            const filteredAttributes = {};
            
            // Only include allowed attributes
            Object.keys(safeParams.userAttributes).forEach(key => {
              if (ALLOWED_USER_ATTRIBUTES.includes(key)) {
                filteredAttributes[key] = safeParams.userAttributes[key];
              } else if (key === 'custom:tenant_id') {
                // Special case: convert lowercase tenant_id to uppercase tenant_ID
                console.warn(`[AttributesFix] Converting custom:tenant_id to custom:tenant_ID for consistency (resilient)`);
                filteredAttributes['custom:tenant_ID'] = safeParams.userAttributes[key];
              } else {
                console.warn(`[AttributesFix] Filtering out unauthorized attribute (resilient): ${key}`);
              }
            });
            
            // Replace with filtered attributes
            safeParams.userAttributes = filteredAttributes;
          }
          
          // If there are no attributes left, don't make the API call
          if (Object.keys(safeParams.userAttributes || {}).length === 0) {
            console.log('[AttributesFix] No allowed attributes for resilient update, skipping API call');
            return { success: true, skipped: true };
          }
          
          // Call the original function with filtered attributes
          return await originalResillientUpdate(safeParams);
        } catch (error) {
          console.error('[AttributesFix] Error in resilient update:', error);
          // Let the original function handle the retry logic
          return await originalResillientUpdate(params);
        }
      };
    }
    
    // ===============================================
    // Fix 4: Create a circuit breaker for attribute updates
    // ===============================================
    let failureCount = 0;
    const MAX_FAILURES = 5;
    const CIRCUIT_RESET_TIME = 30000; // 30 seconds
    let circuitOpen = false;
    let circuitResetTimer;
    
    // Circuit breaker wrapper for attribute updates
    window.attributesCircuitBreaker = async function(updateFn, params) {
      // If circuit is open, don't attempt the operation
      if (circuitOpen) {
        console.warn('[AttributesFix] Circuit breaker is open, skipping attribute update');
        return { success: false, circuitOpen: true };
      }
      
      try {
        const result = await updateFn(params);
        
        // Reset failure count on success
        failureCount = 0;
        return result;
      } catch (error) {
        failureCount++;
        console.error(`[AttributesFix] Attribute update failed, failure count: ${failureCount}`);
        
        // Open circuit if too many failures
        if (failureCount >= MAX_FAILURES) {
          circuitOpen = true;
          console.warn(`[AttributesFix] Circuit breaker opened after ${failureCount} failures`);
          
          // Reset circuit after delay
          circuitResetTimer = setTimeout(() => {
            circuitOpen = false;
            failureCount = 0;
            console.log('[AttributesFix] Circuit breaker reset');
          }, CIRCUIT_RESET_TIME);
        }
        
        throw error;
      }
    };
    
    // Add reset function for circuit breaker
    window.resetAttributesCircuitBreaker = function() {
      circuitOpen = false;
      failureCount = 0;
      if (circuitResetTimer) {
        clearTimeout(circuitResetTimer);
      }
      console.log('[AttributesFix] Circuit breaker manually reset');
      return true;
    };
    
    // ===============================================
    // Fix 5: Add the circuit breaker to the global reset function
    // ===============================================
    const originalResetCircuitBreakers = window.__resetCircuitBreakers;
    
    window.__resetCircuitBreakers = function() {
      let result = true;
      
      // Call original function if it exists
      if (typeof originalResetCircuitBreakers === 'function') {
        result = originalResetCircuitBreakers();
      }
      
      // Reset our circuit breaker
      window.resetAttributesCircuitBreaker();
      
      return result;
    };
    
    console.log(`Cognito attributes fix script v${VERSION} executed successfully`);
  } catch (error) {
    console.error(`Error in Cognito attributes fix script v${VERSION}:`, error);
  }
})(); 