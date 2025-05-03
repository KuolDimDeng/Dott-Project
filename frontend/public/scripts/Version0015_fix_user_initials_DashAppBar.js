/**
 * Version0015_fix_user_initials_DashAppBar.js
 * 
 * Script to fix user initials display in DashAppBar
 * Version: 1.0.1
 * Date: 2025-05-05
 * 
 * This script enhances the handling of user initials in the DashAppBar component
 * by patching the CognitoAttributes.getUserInitials method to properly handle
 * attributes with varying name formats and improve the fallback logic.
 */

(function() {
  'use strict';
  
  // Configuration
  const config = {
    debug: true,
    logPrefix: '[UserInitialsFix]',
    selectors: {
      userAvatarSmall: '.w-8.h-8.rounded-full.bg-primary-main',
      userAvatarLarge: '.w-10.h-10.rounded-full.bg-primary-main',
      dashAppBar: 'header'
    },
    attributeKeys: {
      givenName: ['given_name', 'first_name', 'firstName', 'custom:firstname', 'name'],
      familyName: ['family_name', 'last_name', 'lastName', 'custom:lastname'],
      email: ['email', 'username']
    }
  };
  
  // Logger
  const logger = {
    log: function(message, data) {
      if (config.debug) {
        console.log(config.logPrefix, message, data || '');
      }
    },
    error: function(message, error) {
      console.error(config.logPrefix, message, error || '');
    },
    info: function(message, data) {
      console.info(config.logPrefix, message, data || '');
    },
    debug: function(message, data) {
      if (config.debug) {
        console.debug(config.logPrefix, message, data || '');
      }
    }
  };
  
  /**
   * Main entry point for the script
   */
  function init() {
    logger.info('Initializing user initials fix');
    
    try {
      // Check if CognitoAttributes utility exists
      if (typeof CognitoAttributes === 'undefined' && typeof window.__APP_CACHE === 'undefined') {
        logger.error('Required dependencies not available - waiting for app to load');
        setTimeout(init, 500);
        return;
      }
      
      // Patch the CognitoAttributes.getUserInitials method
      patchCognitoAttributes();
      
      // Update existing UI if needed
      updateUI();
      
      // Set up observer to handle dynamic updates
      setupMutationObserver();
      
      logger.info('User initials fix initialized successfully');
    } catch (error) {
      logger.error('Error initializing user initials fix', error);
    }
  }
  
  /**
   * Patches the CognitoAttributes.getUserInitials method to improve handling
   */
  function patchCognitoAttributes() {
    try {
      // Check if we can find CognitoAttributes in the global scope
      let CognitoAttributesUtil = window.CognitoAttributes || 
        window.__APP_IMPORTS?.CognitoAttributes || 
        window.__APP_CACHE?.utils?.CognitoAttributes;
      
      if (!CognitoAttributesUtil) {
        // Try to locate it through import if not found in global scope
        import('/src/utils/CognitoAttributes.js')
          .then(module => {
            logger.debug('Imported CognitoAttributes module');
            patchUtilityModule(module.default || module);
          })
          .catch(err => {
            logger.error('Failed to import CognitoAttributes module', err);
            // Apply fallback patching to getUserInitials function globally
            applyGlobalPatch();
          });
      } else {
        // If found in global scope, apply the patch
        patchUtilityModule(CognitoAttributesUtil);
      }
    } catch (error) {
      logger.error('Error patching CognitoAttributes', error);
      // Apply fallback patching
      applyGlobalPatch();
    }
  }
  
  /**
   * Patches the specified CognitoAttributes module
   * @param {Object} module - The CognitoAttributes module to patch
   */
  function patchUtilityModule(module) {
    if (!module) return;
    
    try {
      logger.debug('Patching CognitoAttributes.getUserInitials');
      
      // Store the original function for fallback
      const originalGetUserInitials = module.getUserInitials;
      
      // Replace with enhanced version
      module.getUserInitials = function(attributes) {
        if (!attributes) return 'U';
        
        // Log the attributes for debugging
        if (config.debug) {
          logger.debug('Generating initials from attributes:', {
            given_name: attributes.given_name,
            family_name: attributes.family_name,
            email: attributes.email
          });
        }
        
        // Use an improved version that handles all attribute variations
        return enhancedGetUserInitials(attributes, module);
      };
      
      logger.info('Successfully patched CognitoAttributes.getUserInitials');
    } catch (error) {
      logger.error('Error applying patch to module', error);
    }
  }
  
  /**
   * Applies a global patch when module can't be imported directly
   */
  function applyGlobalPatch() {
    logger.debug('Applying global patch for getUserInitials');
    
    // Expose the enhanced function globally for the component to use
    window.__PATCHED_GET_USER_INITIALS = enhancedGetUserInitials;
    
    // Execute DOM observer to inject our patched function
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          updateAvatarElements();
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Immediately try to update any existing elements
    updateAvatarElements();
  }
  
  /**
   * Cleans a string value by trimming whitespace and handling null/undefined
   * @param {String} value - The value to clean
   * @returns {String} Cleaned value
   */
  function cleanValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') {
      try {
        value = String(value);
      } catch (e) {
        return '';
      }
    }
    return value.trim();
  }
  
  /**
   * Enhanced implementation of getUserInitials with better fallback support
   * @param {Object} attributes - User attributes from Cognito
   * @param {Object} module - Optional CognitoAttributes module for using its helpers
   * @returns {String} User initials
   */
  function enhancedGetUserInitials(attributes, module) {
    if (!attributes) return 'U';
    
    try {
      // Helper to get value with fallbacks
      const getValue = function(attributeKeys, defaultValue = '') {
        if (module && typeof module.getValue === 'function') {
          // Use module's getValue if available
          if (typeof attributeKeys === 'string') {
            return cleanValue(module.getValue(attributes, attributeKeys, defaultValue));
          }
          
          // If it's an array of keys, try each one
          for (const key of attributeKeys) {
            const value = module.getValue(attributes, key, null);
            if (value) return cleanValue(value);
          }
          return defaultValue;
        }
        
        // Direct access fallback
        if (typeof attributeKeys === 'string') {
          return cleanValue(attributes[attributeKeys] || defaultValue);
        }
        
        // Try each key in the array
        for (const key of attributeKeys) {
          if (attributes[key]) return cleanValue(attributes[key]);
        }
        
        return defaultValue;
      };
      
      // Get values with proper fallbacks
      const firstName = getValue(config.attributeKeys.givenName, '');
      const lastName = getValue(config.attributeKeys.familyName, '');
      const email = getValue(config.attributeKeys.email, '');
      
      // Log the extracted values for debugging
      if (config.debug) {
        logger.debug('Extracted attribute values:', {
          firstName,
          lastName,
          email,
          firstNameLength: firstName.length,
          lastNameLength: lastName.length
        });
      }
      
      // Generate initials with both first and last name
      if (firstName && lastName) {
        const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        logger.debug('Generated initials from first and last name:', initials);
        return initials;
      }
      
      // Generate with just first name
      if (firstName) {
        // Try to extract second initial from email if available
        if (email && email.includes('@')) {
          const emailPart = email.split('@')[0];
          if (emailPart.includes('.')) {
            const parts = emailPart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              const initials = `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              logger.debug('Generated initials from first name + email part:', initials);
              return initials;
            }
          }
        }
        const initial = firstName.charAt(0).toUpperCase();
        logger.debug('Generated initial from first name only:', initial);
        return initial;
      }
      
      // Generate with just last name
      if (lastName) {
        const initial = lastName.charAt(0).toUpperCase();
        logger.debug('Generated initial from last name only:', initial);
        return initial;
      }
      
      // Try to extract from email
      if (email) {
        if (email.includes('@')) {
          const emailName = email.split('@')[0];
          
          // For email format first.last@domain.com
          if (emailName.includes('.')) {
            const parts = emailName.split('.');
            if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
              const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              logger.debug('Generated initials from email with dot:', initials);
              return initials;
            }
          }
          
          // For camelCase email like johnDoe@domain.com
          const camelCaseMatch = emailName.match(/([a-z]+)([A-Z][a-z]+)/);
          if (camelCaseMatch && camelCaseMatch.length >= 3) {
            const initials = `${camelCaseMatch[1].charAt(0).toUpperCase()}${camelCaseMatch[2].charAt(0).toUpperCase()}`;
            logger.debug('Generated initials from camelCase email:', initials);
            return initials;
          }
          
          // For single word emails, use first and middle letter
          if (emailName.length > 1) {
            const midPoint = Math.floor(emailName.length / 2);
            const initials = `${emailName.charAt(0).toUpperCase()}${emailName.charAt(midPoint).toUpperCase()}`;
            logger.debug('Generated initials from email middle point:', initials);
            return initials;
          }
          
          // For single character email names
          const initial = email.charAt(0).toUpperCase();
          logger.debug('Generated initial from email first char:', initial);
          return initial;
        }
      }
      
      // Absolute fallback
      logger.debug('No valid attributes found, using fallback: U');
      return 'U';
    } catch (error) {
      logger.error('Error in enhancedGetUserInitials', error);
      return 'U';
    }
  }
  
  /**
   * Updates existing UI elements with user initials
   */
  function updateUI() {
    try {
      // Only run if we have access to user attributes
      const userAttributes = window.__APP_CACHE?.auth?.userAttributes || 
                            window.__APP_CACHE?.user?.attributes || 
                            {};
      
      if (Object.keys(userAttributes).length === 0) {
        logger.debug('No user attributes available for updateUI');
        
        // Try to fetch from window.sessionStorage
        try {
          const storedAttrs = sessionStorage.getItem('user_attributes');
          if (storedAttrs) {
            const parsedAttrs = JSON.parse(storedAttrs);
            if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
              logger.debug('Retrieved attributes from sessionStorage', parsedAttrs);
              const initials = enhancedGetUserInitials(parsedAttrs);
              updateAvatarElements(initials);
              
              // Store in app cache for future use
              if (typeof window !== 'undefined') {
                if (!window.__APP_CACHE) window.__APP_CACHE = {};
                if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
                window.__APP_CACHE.user.initials = initials;
              }
              
              logger.info('Updated user initials from sessionStorage:', initials);
              return;
            }
          }
        } catch (e) {
          logger.error('Error accessing sessionStorage', e);
        }
        
        return;
      }
      
      // Generate initials using our enhanced function
      const initials = enhancedGetUserInitials(userAttributes);
      
      // Update DOM elements
      updateAvatarElements(initials);
      
      // Store in app cache for future use
      if (typeof window !== 'undefined') {
        if (!window.__APP_CACHE) window.__APP_CACHE = {};
        if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
        window.__APP_CACHE.user.initials = initials;
      }
      
      logger.info('Updated user initials in UI:', initials);
    } catch (error) {
      logger.error('Error updating UI', error);
    }
  }
  
  /**
   * Updates avatar elements in the DOM with the given initials
   * @param {String} initials - User initials to display
   */
  function updateAvatarElements(initials) {
    try {
      // Get user attributes if initials not provided
      if (!initials) {
        const userAttributes = window.__APP_CACHE?.auth?.userAttributes || 
                              window.__APP_CACHE?.user?.attributes || 
                              {};
        
        initials = userAttributes ? enhancedGetUserInitials(userAttributes) : 'U';
      }
      
      // Find and update small avatar in header
      document.querySelectorAll(config.selectors.userAvatarSmall).forEach(element => {
        if (element.textContent.trim() === '' || element.textContent.trim() === 'U') {
          element.textContent = initials;
          logger.debug('Updated small avatar element with initials:', initials);
        }
      });
      
      // Find and update large avatar in menu
      document.querySelectorAll(config.selectors.userAvatarLarge).forEach(element => {
        if (element.textContent.trim() === '' || element.textContent.trim() === 'U') {
          element.textContent = initials;
          logger.debug('Updated large avatar element with initials:', initials);
        }
      });
    } catch (error) {
      logger.error('Error updating avatar elements', error);
    }
  }
  
  /**
   * Sets up a mutation observer to handle dynamic UI updates
   */
  function setupMutationObserver() {
    try {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            const avatarAdded = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                return (
                  node.matches && 
                  (node.matches(config.selectors.userAvatarSmall) || 
                   node.matches(config.selectors.userAvatarLarge) ||
                   node.querySelector(config.selectors.userAvatarSmall) ||
                   node.querySelector(config.selectors.userAvatarLarge))
                );
              }
              return false;
            });
            
            if (avatarAdded) {
              logger.debug('Avatar element added to DOM, updating');
              updateUI();
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      logger.debug('Mutation observer set up');
    } catch (error) {
      logger.error('Error setting up mutation observer', error);
    }
  }
  
  // Initialize the script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 