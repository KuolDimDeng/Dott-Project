/**
 * User Initials and Business Name Fix for DashAppBar Component (v1.0.0)
 * 
 * This script fixes the issues with:
 * 1. Business name not displaying in the DashAppBar
 * 2. User initials not displaying correctly in the user icon
 * 
 * The script improves Cognito attribute retrieval, fixes the user initials generation function,
 * and ensures proper data flow between the UserProfileContext and the DashAppBar component.
 * 
 * @version 1.0.0
 * @date 2025-05-14
 */

(function() {
  // Configuration
  const config = {
    version: '1.0.0',
    debug: true,
    logPrefix: '[UserInitialsBusinessNameFix]',
    selectors: {
      dashAppBar: 'header',
      userAvatar: '.w-8.h-8.rounded-full',
      userInitials: '.w-8.h-8.rounded-full',
      businessNameElem: '.text-white .font-semibold',
    },
    retryOptions: {
      maxRetries: 5,
      retryInterval: 1000,
      observerTimeout: 200
    },
    appCacheKey: '__APP_CACHE'
  };
  
  // Create logger
  const logger = {
    debug: function(message, data) {
      if (config.debug) {
        console.debug(`${config.logPrefix} ${message}`, data !== undefined ? data : '');
      }
    },
    info: function(message, data) {
      console.info(`${config.logPrefix} ${message}`, data !== undefined ? data : '');
    },
    warn: function(message, data) {
      console.warn(`${config.logPrefix} ${message}`, data !== undefined ? data : '');
    },
    error: function(message, error) {
      console.error(`${config.logPrefix} ${message}`, error || '');
    }
  };
  
  // Variables to track state
  let retryCount = 0;
  let observer = null;
  let fixApplied = false;
  let tenantId = null;
  
  /**
   * Gets the current tenant ID from the URL or localStorage
   * @returns {string|null} The tenant ID or null if not found
   */
  function getCurrentTenantId() {
    try {
      // First try from URL path
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const pathMatch = window.location.pathname.match(uuidRegex);
      
      if (pathMatch && pathMatch[0]) {
        logger.debug(`Found tenant ID in URL: ${pathMatch[0]}`);
        return pathMatch[0];
      }
      
      // Try from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantId = urlParams.get('tenantId');
      
      if (urlTenantId && uuidRegex.test(urlTenantId)) {
        logger.debug(`Found tenant ID in URL params: ${urlTenantId}`);
        return urlTenantId;
      }
      
      // Check global window.__APP_CACHE for tenant ID
      if (window.__APP_CACHE && window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.id) {
        logger.debug(`Found tenant ID in APP_CACHE: ${window.__APP_CACHE.tenant.id}`);
        return window.__APP_CACHE.tenant.id;
      }
      
      logger.warn('Could not determine tenant ID');
      return null;
    } catch (error) {
      logger.error('Error getting tenant ID', error);
      return null;
    }
  }
  
  /**
   * Retrieves user attributes from Cognito
   * @returns {Promise<Object|null>} User attributes or null if not available
   */
  async function getCognitoUserAttributes() {
    logger.debug('Getting Cognito user attributes');
    
    try {
      // Check if AWS Amplify is available
      if (typeof window.fetchUserAttributes === 'function') {
        // v6 API
        logger.debug('Using fetchUserAttributes from window');
        return await window.fetchUserAttributes();
      } else if (window.Amplify && typeof window.Amplify.Auth?.fetchUserAttributes === 'function') {
        // v6 API from Amplify object
        logger.debug('Using Amplify.Auth.fetchUserAttributes');
        return await window.Amplify.Auth.fetchUserAttributes();
      } else if (window.AWS && typeof window.AWS.Auth?.currentAuthenticatedUser === 'function') {
        // Legacy v5 API
        logger.debug('Using AWS.Auth.currentAuthenticatedUser');
        const user = await window.AWS.Auth.currentAuthenticatedUser();
        return user.attributes;
      } else {
        // Try dynamic import
        try {
          logger.debug('Trying dynamic import of aws-amplify/auth');
          const { fetchUserAttributes } = await import('aws-amplify/auth');
          if (typeof fetchUserAttributes === 'function') {
            logger.debug('Using dynamically imported fetchUserAttributes');
            return await fetchUserAttributes();
          }
        } catch (importError) {
          logger.warn('Dynamic import failed', importError);
        }
      }
      
      // No Amplify auth methods available
      logger.warn('Could not find AWS Amplify auth methods');
      return null;
    } catch (error) {
      logger.warn('Error getting Cognito user attributes', error);
      return null;
    }
  }
  
  /**
   * Generates user initials from name components or email
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @param {string} email - Email address (fallback)
   * @returns {string} User initials
   */
  function generateInitialsFromNames(firstName, lastName, email) {
    logger.debug('Generating initials from:', { firstName, lastName, email });
    
    try {
      // Handle case with both first and last name
      if (firstName && typeof firstName === "string" && 
          lastName && typeof lastName === "string") {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      }
      
      // Handle case with only first name
      if (firstName && typeof firstName === "string") {
        // Try to extract a second initial from email
        if (email && typeof email === "string" && email.includes('@')) {
          const emailName = email.split('@')[0];
          if (emailName.includes('.')) {
            const emailParts = emailName.split('.');
            if (emailParts.length >= 2 && emailParts[1].length > 0) {
              return `${firstName.charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
            }
          }
        }
        return firstName.charAt(0).toUpperCase();
      }
      
      // Handle case with only last name
      if (lastName && typeof lastName === "string") {
        return lastName.charAt(0).toUpperCase();
      }
      
      // Handle case with only email
      if (email && typeof email === "string") {
        // Try to extract initials from email format (first.last@domain.com)
        const emailName = email.split('@')[0];
        if (emailName.includes('.')) {
          const emailParts = emailName.split('.');
          if (emailParts.length >= 2 && emailParts[0].length > 0 && emailParts[1].length > 0) {
            return `${emailParts[0].charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
          }
        } else if (emailName.length > 1) {
          // For emails without dots, extract first and midpoint character
          const midPoint = Math.floor(emailName.length / 2);
          const firstPart = emailName.substring(0, midPoint);
          const lastPart = emailName.substring(midPoint);
          return `${firstPart.charAt(0).toUpperCase()}${lastPart.charAt(0).toUpperCase()}`;
        }
        return email.charAt(0).toUpperCase();
      }
      
      // No valid inputs
      return '';
    } catch (error) {
      logger.warn('Error generating initials', error);
      return 'U'; // Fallback to 'U' for User
    }
  }
  
  /**
   * Updates the App Cache with user and business information
   * @param {Object} data - The data to store in app cache
   */
  function updateAppCache(data) {
    if (typeof window !== 'undefined') {
      // Ensure APP_CACHE exists
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = { auth: {}, user: {}, tenant: {} };
      }
      
      // Update user data
      if (data.userInitials) {
        window.__APP_CACHE.user = window.__APP_CACHE.user || {};
        window.__APP_CACHE.user.initials = data.userInitials;
        
        // Also store in tenant-specific cache if tenant ID is available
        if (tenantId) {
          if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
          window.__APP_CACHE.tenant[`${tenantId}_initials`] = data.userInitials;
        }
      }
      
      // Update business name
      if (data.businessName) {
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.businessName = data.businessName;
        
        // Also store in tenant-specific structure
        if (tenantId) {
          if (!window.__APP_CACHE.tenant[tenantId]) {
            window.__APP_CACHE.tenant[tenantId] = {};
          }
          window.__APP_CACHE.tenant[tenantId].businessName = data.businessName;
        }
      }
      
      logger.debug('Updated APP_CACHE:', {
        userInitials: data.userInitials,
        businessName: data.businessName,
        tenantId: tenantId
      });
    }
  }
  
  /**
   * Updates the UI with the user initials and business name
   * @param {string} initials - User initials
   * @param {string} businessName - Business name
   * @returns {boolean} Whether the update was successful
   */
  function updateUI(initials, businessName) {
    try {
      // Update user initials in avatar
      if (initials) {
        const avatarElements = document.querySelectorAll(config.selectors.userAvatar);
        if (avatarElements.length > 0) {
          logger.debug(`Found ${avatarElements.length} avatar elements`);
          
          avatarElements.forEach(avatar => {
            // Only update if it contains "?" or is empty
            const currentText = avatar.textContent.trim();
            if (currentText === '?' || currentText === '' || currentText === 'U') {
              avatar.textContent = initials;
              logger.debug(`Updated avatar text to: ${initials}`);
            }
          });
        } else {
          logger.warn('No avatar elements found');
        }
      }
      
      // Update business name
      if (businessName) {
        const businessNameElements = document.querySelectorAll(config.selectors.businessNameElem);
        if (businessNameElements.length > 0) {
          logger.debug(`Found ${businessNameElements.length} business name elements`);
          
          businessNameElements.forEach(element => {
            // Only update if empty
            if (!element.textContent.trim()) {
              element.textContent = businessName;
              logger.debug(`Updated business name to: ${businessName}`);
            }
          });
        } else {
          logger.warn('No business name elements found');
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating UI', error);
      return false;
    }
  }
  
  /**
   * Sets up a mutation observer to detect UI changes
   */
  function setupObserver() {
    // Cancel any existing observer
    if (observer) {
      observer.disconnect();
    }
    
    // Create a new observer
    observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if relevant elements were added
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if it's a dashboard header or avatar
              if (node.matches(config.selectors.dashAppBar) || 
                  node.querySelector(config.selectors.userAvatar)) {
                logger.debug('Observed relevant DOM changes, re-applying fix');
                applyFix();
              }
            }
          }
        }
      });
    });
    
    // Start observing the document body
    observer.observe(document.body, { childList: true, subtree: true });
    logger.debug('Mutation observer set up');
  }
  
  /**
   * Verifies if the fix was successfully applied
   * @returns {boolean} Whether verification passed
   */
  function verifyFix() {
    try {
      // Check if user initials are displaying correctly
      const avatarElements = document.querySelectorAll(config.selectors.userAvatar);
      if (avatarElements.length === 0) {
        logger.warn('No avatar elements found during verification');
        return false;
      }
      
      // Check if any avatar still shows placeholder
      const avatarsWithPlaceholder = Array.from(avatarElements).filter(avatar => {
        const text = avatar.textContent.trim();
        return text === '?' || text === '' || text === 'U';
      });
      
      if (avatarsWithPlaceholder.length > 0) {
        logger.warn(`Found ${avatarsWithPlaceholder.length} avatars still showing placeholder`);
        return false;
      }
      
      // Check if business name is displayed
      const businessNameElements = document.querySelectorAll(config.selectors.businessNameElem);
      if (businessNameElements.length === 0) {
        logger.warn('No business name elements found during verification');
        return false;
      }
      
      // Check if any business name element is empty
      const emptyBusinessNames = Array.from(businessNameElements).filter(element => {
        return !element.textContent.trim();
      });
      
      if (emptyBusinessNames.length > 0) {
        logger.warn(`Found ${emptyBusinessNames.length} empty business name elements`);
        return false;
      }
      
      logger.info('Fix verification passed');
      return true;
    } catch (error) {
      logger.error('Error verifying fix', error);
      return false;
    }
  }
  
  /**
   * The main function to apply the fix
   */
  async function applyFix() {
    // Avoid multiple applications
    if (fixApplied) {
      logger.debug('Fix already applied, skipping');
      return;
    }
    
    // Get tenant ID
    tenantId = getCurrentTenantId();
    logger.info('Applying fix for tenant:', tenantId || 'Unknown');
    
    try {
      // Get user attributes from Cognito
      const userAttributes = await getCognitoUserAttributes();
      
      if (userAttributes) {
        logger.debug('Successfully retrieved user attributes:', Object.keys(userAttributes));
        
        // Extract name components
        const firstName = 
          userAttributes['given_name'] || 
          userAttributes['custom:firstname'] || 
          userAttributes['firstName'] || 
          userAttributes['first_name'] || 
          '';
          
        const lastName = 
          userAttributes['family_name'] || 
          userAttributes['custom:lastname'] || 
          userAttributes['lastName'] || 
          userAttributes['last_name'] || 
          '';
          
        const email = userAttributes['email'] || '';
        
        // Extract business name
        const businessName = 
          userAttributes['custom:businessname'] || 
          userAttributes['custom:tenant_name'] || 
          userAttributes['custom:business_name'] || 
          userAttributes['businessName'] || 
          '';
        
        // Generate user initials
        const userInitials = generateInitialsFromNames(firstName, lastName, email);
        
        if (userInitials || businessName) {
          logger.info('Generated user data:', { userInitials, businessName });
          
          // Update app cache
          updateAppCache({ userInitials, businessName });
          
          // Update UI
          const updated = updateUI(userInitials, businessName);
          
          if (updated) {
            logger.info('UI updated successfully');
            fixApplied = true;
            
            // Verify fix
            if (verifyFix()) {
              logger.info('Fix successfully applied');
              return;
            }
          }
        }
      } else {
        logger.warn('No user attributes available from Cognito');
        
        // Try to get data from window.__APP_CACHE
        if (window.__APP_CACHE) {
          const cachedInitials = window.__APP_CACHE.user?.initials;
          const cachedBusinessName = window.__APP_CACHE.tenant?.businessName;
          
          if (cachedInitials || cachedBusinessName) {
            logger.info('Using cached data:', { cachedInitials, cachedBusinessName });
            updateUI(cachedInitials, cachedBusinessName);
            fixApplied = true;
            return;
          }
        }
      }
      
      // If we reached this point, fix was not fully applied
      if (++retryCount < config.retryOptions.maxRetries) {
        logger.info(`Retry attempt ${retryCount}/${config.retryOptions.maxRetries} scheduled`);
        setTimeout(applyFix, config.retryOptions.retryInterval);
      } else {
        logger.warn('Max retry attempts reached, could not fully apply fix');
      }
    } catch (error) {
      logger.error('Error applying fix', error);
      
      if (++retryCount < config.retryOptions.maxRetries) {
        logger.info(`Retry attempt ${retryCount}/${config.retryOptions.maxRetries} scheduled after error`);
        setTimeout(applyFix, config.retryOptions.retryInterval);
      }
    }
  }
  
  // Initialize the fix
  logger.info(`User Initials and Business Name Fix v${config.version} initializing`);
  
  // Set up observer to reapply fix if DOM changes
  setupObserver();
  
  // Apply the fix
  setTimeout(applyFix, 0);
})(); 