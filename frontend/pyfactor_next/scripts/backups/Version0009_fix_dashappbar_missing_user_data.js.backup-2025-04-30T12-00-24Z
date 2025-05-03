/**
 * Version0009_fix_dashappbar_missing_user_data.js
 * 
 * This script fixes issues with the missing business name and user initials
 * in the DashAppBar component by:
 * 
 * 1. Properly fetching and caching Cognito user attributes
 * 2. Implementing a reliable way to generate user initials
 * 3. Setting business name and user initials in the DOM and APP_CACHE
 * 4. Adding an observer to update elements after auth state changes
 * 
 * Version: 1.0.0
 * Date: 2025-04-30
 */

(function() {
  // Configuration
  const config = {
    // Version info
    version: '1.0.0',
    logPrefix: '[DashAppBarFix]',
    debug: true,

    // DOM selectors
    selectors: {
      dashAppBar: 'header',
      userAvatar: '.w-8.h-8.rounded-full', // User avatar container 
      userInitials: '[data-testid="user-initials"]', // User initials element if it exists
      businessNameElem: '.text-white .font-semibold', // Business name element
      appBarTitleElem: '.text-lg.font-semibold', // App bar title element (fallback)
    },

    // Retry behavior
    retry: {
      maxAttempts: 5,
      interval: 1000,
      timeout: 10000,
    },

    // Attributes to fetch from Cognito
    requiredAttributes: [
      'email',
      'given_name',
      'family_name',
      'custom:businessid',
      'custom:businessname',
      'custom:tenant_ID',
      'custom:tenant_name',
    ]
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

  // State tracking
  let state = {
    retryCount: 0,
    fixApplied: false,
    observer: null,
    retryTimeout: null,
    tenantId: null,
    userAttributes: null,
    initials: null,
    businessName: null,
  };

  /**
   * Gets the current tenant ID from the URL or APP_CACHE
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
      
      // Try from window.__APP_CACHE
      if (window.__APP_CACHE?.tenant?.id) {
        logger.debug(`Found tenant ID in APP_CACHE.tenant.id: ${window.__APP_CACHE.tenant.id}`);
        return window.__APP_CACHE.tenant.id;
      }
      
      // Try from Amplify auth session
      if (window.currentAuthenticatedUser) {
        return window.currentAuthenticatedUser()
          .then(user => {
            if (user?.attributes?.['custom:tenant_ID'] || user?.attributes?.['custom:businessid']) {
              const tenantId = user.attributes['custom:tenant_ID'] || user.attributes['custom:businessid'];
              logger.debug(`Found tenant ID in auth session: ${tenantId}`);
              return tenantId;
            }
            return null;
          })
          .catch(() => null);
      }
      
      logger.warn('Could not determine tenant ID');
      return null;
    } catch (error) {
      logger.error('Error getting tenant ID', error);
      return null;
    }
  }

  /**
   * Generates user initials from name or email
   * @param {Object} attributes - User attributes from Cognito
   * @returns {string} User initials (usually 2 characters)
   */
  function generateUserInitials(attributes) {
    try {
      if (!attributes) return '';
      
      // Log attributes for debugging
      logger.debug('Generating initials from attributes:', {
        givenName: attributes.given_name,
        familyName: attributes.family_name,
        email: attributes.email
      });
      
      const firstName = attributes.given_name || 
                       attributes['custom:firstname'] || 
                       attributes.first_name || 
                       attributes.firstName || 
                       '';
                       
      const lastName = attributes.family_name || 
                      attributes['custom:lastname'] || 
                      attributes.last_name || 
                      attributes.lastName || 
                      '';
      
      const email = attributes.email || '';

      // Try to generate from first and last name
      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      }
      
      // Try with only first name
      if (firstName) {
        // Try to get second initial from email if possible
        if (email && email.includes('@')) {
          const emailName = email.split('@')[0];
          if (emailName.includes('.')) {
            const parts = emailName.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              return `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            }
          }
        }
        return firstName.charAt(0).toUpperCase();
      }
      
      // Try with only last name
      if (lastName) {
        return lastName.charAt(0).toUpperCase();
      }
      
      // Try with email if available
      if (email) {
        if (email.includes('@')) {
          const emailName = email.split('@')[0];
          
          // Try to extract from email format like first.last@domain.com
          if (emailName.includes('.')) {
            const parts = emailName.split('.');
            if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
              return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            }
          }
          
          // For emails without dots, use first char and another character
          if (emailName.length > 1) {
            const midPoint = Math.floor(emailName.length / 2);
            return `${emailName.charAt(0).toUpperCase()}${emailName.charAt(midPoint).toUpperCase()}`;
          }
          
          // Single character email prefix
          return email.charAt(0).toUpperCase();
        }
      }
      
      // Fallback to "U" for unknown user
      return 'U';
    } catch (error) {
      logger.error('Error generating user initials:', error);
      return 'U';
    }
  }

  /**
   * Gets the business name from Cognito attributes
   * @param {Object} attributes - User attributes from Cognito
   * @returns {string|null} Business name or null if not found
   */
  function getBusinessName(attributes) {
    if (!attributes) return null;
    
    // Try different possible attribute names
    return attributes['custom:businessname'] ||
           attributes['custom:tenant_name'] ||
           attributes['custom:business_name'] ||
           attributes.businessName ||
           attributes.business_name ||
           null;
  }

  /**
   * Updates the user initials in the DOM
   * @param {string} initials - User initials to display
   * @returns {boolean} True if initials were updated successfully
   */
  function updateUserInitials(initials) {
    try {
      // Try to find specific user initials element
      let initialsElement = document.querySelector(config.selectors.userInitials);
      
      // If not found, try the avatar container
      if (!initialsElement) {
        initialsElement = document.querySelector(config.selectors.userAvatar);
      }
      
      if (initialsElement) {
        // Check if the element is a div with text content (most likely case)
        if (initialsElement.tagName === 'DIV') {
          // Update text content
          initialsElement.textContent = initials;
          logger.debug(`Updated user initials: ${initials}`);
          return true;
        }
        
        // Check if the element has children that might be the actual text element
        const childElements = initialsElement.querySelectorAll('*');
        if (childElements.length > 0) {
          for (const child of childElements) {
            // Look for a child with just text and no further children
            if (child.children.length === 0 && child.textContent.trim().length <= 3) {
              child.textContent = initials;
              logger.debug(`Updated user initials in child element: ${initials}`);
              return true;
            }
          }
        }
        
        // If we couldn't find a suitable child, try setting a data attribute
        initialsElement.setAttribute('data-initials', initials);
        
        // Add a custom style attribute to make text visible
        initialsElement.setAttribute('style', 
          `${initialsElement.getAttribute('style') || ''}; 
           content: "${initials}"; display: flex; justify-content: center; align-items: center;`
        );
        
        logger.debug(`Set data-initials attribute: ${initials}`);
        return true;
      }
      
      logger.warn('Could not find user initials element in DOM');
      return false;
    } catch (error) {
      logger.error('Error updating user initials:', error);
      return false;
    }
  }

  /**
   * Updates the business name in the DOM
   * @param {string} businessName - Business name to display
   * @returns {boolean} True if business name was updated successfully
   */
  function updateBusinessName(businessName) {
    try {
      // Find the business name element
      let businessNameElement = document.querySelector(config.selectors.businessNameElem);
      
      // If not found, try the app bar title element
      if (!businessNameElement) {
        businessNameElement = document.querySelector(config.selectors.appBarTitleElem);
      }
      
      if (businessNameElement) {
        // Update the business name
        businessNameElement.textContent = businessName;
        logger.debug(`Updated business name: ${businessName}`);
        return true;
      }
      
      // If still not found, try to find any element within the header that might contain the business name
      const header = document.querySelector(config.selectors.dashAppBar);
      if (header) {
        const headerElements = header.querySelectorAll(':scope > div');
        
        for (const element of headerElements) {
          const children = element.querySelectorAll('div, span');
          for (const child of children) {
            if (child.children.length === 0 && child.textContent.trim() === '') {
              child.textContent = businessName;
              logger.debug(`Updated business name in header child: ${businessName}`);
              return true;
            }
          }
        }
      }
      
      logger.warn('Could not find business name element in DOM');
      return false;
    } catch (error) {
      logger.error('Error updating business name:', error);
      return false;
    }
  }

  /**
   * Update APP_CACHE with user and business information
   * @param {Object} data - The data to store in APP_CACHE
   */
  function updateAppCache(data) {
    if (typeof window === 'undefined') return;
    
    // Ensure APP_CACHE exists
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = { auth: {}, user: {}, tenant: {}, dashAppBarFix: {} };
    }
    
    // Add DashAppBarFix namespace if it doesn't exist
    if (!window.__APP_CACHE.dashAppBarFix) {
      window.__APP_CACHE.dashAppBarFix = {};
    }
    
    // Store fix state
    window.__APP_CACHE.dashAppBarFix = {
      ...window.__APP_CACHE.dashAppBarFix,
      version: config.version,
      lastUpdated: Date.now(),
      fixApplied: true,
    };
    
    // Update user data in APP_CACHE
    if (data.userInitials) {
      // Store in user namespace
      if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
      window.__APP_CACHE.user.initials = data.userInitials;
      
      // Also store in tenant-specific data
      if (data.tenantId) {
        if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
        if (!window.__APP_CACHE.tenant[data.tenantId]) {
          window.__APP_CACHE.tenant[data.tenantId] = {};
        }
        window.__APP_CACHE.tenant[data.tenantId].userInitials = data.userInitials;
      }
      
      logger.debug('Updated APP_CACHE with user initials:', data.userInitials);
    }
    
    // Update business name in APP_CACHE
    if (data.businessName) {
      // Store in tenant namespace
      if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
      window.__APP_CACHE.tenant.businessName = data.businessName;
      
      // Also store in tenant-specific data
      if (data.tenantId) {
        if (!window.__APP_CACHE.tenant[data.tenantId]) {
          window.__APP_CACHE.tenant[data.tenantId] = {};
        }
        window.__APP_CACHE.tenant[data.tenantId].businessName = data.businessName;
      }
      
      logger.debug('Updated APP_CACHE with business name:', data.businessName);
    }
    
    // Store full attributes if available
    if (data.attributes) {
      // Store in user namespace
      if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
      window.__APP_CACHE.user.attributes = data.attributes;
      
      logger.debug('Updated APP_CACHE with user attributes');
    }
  }

  /**
   * Fetches user attributes from Cognito
   * @returns {Promise<Object|null>} User attributes or null if unsuccessful
   */
  async function getCognitoUserAttributes() {
    logger.debug('Fetching Cognito user attributes');
    
    try {
      // Check if fetchUserAttributes is available directly on window
      if (typeof window.fetchUserAttributes === 'function') {
        logger.debug('Using window.fetchUserAttributes');
        return await window.fetchUserAttributes();
      }
      
      // Check Amplify v6 API
      if (window.Amplify && typeof window.Amplify.Auth?.fetchUserAttributes === 'function') {
        logger.debug('Using Amplify.Auth.fetchUserAttributes');
        return await window.Amplify.Auth.fetchUserAttributes();
      }
      
      // Try dynamic import for Amplify v6
      try {
        logger.debug('Attempting dynamic import of aws-amplify/auth');
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        if (typeof fetchUserAttributes === 'function') {
          logger.debug('Using dynamically imported fetchUserAttributes');
          return await fetchUserAttributes();
        }
      } catch (importError) {
        logger.debug('Dynamic import failed, trying alternatives', importError);
      }
      
      // Check Amplify v5 API
      if (window.AWS && typeof window.AWS.Auth?.currentAuthenticatedUser === 'function') {
        logger.debug('Using AWS.Auth.currentAuthenticatedUser (v5)');
        const user = await window.AWS.Auth.currentAuthenticatedUser();
        return user.attributes;
      }
      
      // Check if there's a global currentAuthenticatedUser function
      if (typeof window.currentAuthenticatedUser === 'function') {
        logger.debug('Using window.currentAuthenticatedUser');
        const user = await window.currentAuthenticatedUser();
        return user.attributes;
      }
      
      // Check if attributes are already in APP_CACHE
      if (window.__APP_CACHE?.user?.attributes) {
        logger.debug('Using attributes from APP_CACHE');
        return window.__APP_CACHE.user.attributes;
      }
      
      logger.warn('Could not find a method to fetch user attributes');
      return null;
    } catch (error) {
      logger.error('Error fetching Cognito user attributes:', error);
      return null;
    }
  }

  /**
   * Sets up a mutation observer to detect changes to the DOM
   * that might indicate the DashAppBar has been re-rendered
   */
  function setupObserver() {
    // Remove any existing observer
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    
    // Create a new observer
    state.observer = new MutationObserver((mutations) => {
      // Check if we need to update the UI
      let shouldUpdate = false;
      
      // Loop through mutations
      for (const mutation of mutations) {
        // Check for changes to the user avatar or business name elements
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          // Check if any of the selectors match
          shouldUpdate = 
            mutation.target.matches?.(config.selectors.dashAppBar) ||
            mutation.target.matches?.(config.selectors.userAvatar) ||
            mutation.target.matches?.(config.selectors.userInitials) ||
            mutation.target.matches?.(config.selectors.businessNameElem) ||
            mutation.target.matches?.(config.selectors.appBarTitleElem);
          
          // Also check if any added nodes match these selectors
          if (!shouldUpdate && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                shouldUpdate = 
                  node.matches?.(config.selectors.dashAppBar) ||
                  node.matches?.(config.selectors.userAvatar) ||
                  node.matches?.(config.selectors.userInitials) ||
                  node.matches?.(config.selectors.businessNameElem) ||
                  node.matches?.(config.selectors.appBarTitleElem);
                
                if (shouldUpdate) break;
              }
            }
          }
          
          if (shouldUpdate) break;
        }
      }
      
      // If we need to update the UI, check if we have the data already
      if (shouldUpdate && state.initials && state.businessName) {
        logger.debug('DOM changed, updating UI with cached data');
        updateUserInitials(state.initials);
        updateBusinessName(state.businessName);
      } else if (shouldUpdate) {
        // If we don't have the data, try to fetch it again
        logger.debug('DOM changed, but missing data - triggering reapply');
        applyFix();
      }
    });
    
    // Start observing the body with all possible changes
    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    
    logger.debug('Mutation observer set up');
  }

  /**
   * Main function to apply the fix
   * Fetches attributes, generates initials, and updates UI
   */
  async function applyFix() {
    try {
      // Get tenantId first
      state.tenantId = await getCurrentTenantId();
      logger.info(`Applying fix for tenant: ${state.tenantId || 'unknown'}`);
      
      // Fetch user attributes from Cognito
      const attributes = await getCognitoUserAttributes();
      
      if (!attributes) {
        logger.warn('No attributes available, scheduling retry');
        scheduleRetry();
        return;
      }
      
      // Store attributes
      state.userAttributes = attributes;
      
      // Generate user initials
      state.initials = generateUserInitials(attributes);
      logger.debug(`Generated user initials: ${state.initials}`);
      
      // Get business name
      state.businessName = getBusinessName(attributes);
      logger.debug(`Found business name: ${state.businessName}`);
      
      // Update DOM
      const userInitialsUpdated = updateUserInitials(state.initials);
      const businessNameUpdated = updateBusinessName(state.businessName);
      
      // Update APP_CACHE
      updateAppCache({
        tenantId: state.tenantId,
        userInitials: state.initials,
        businessName: state.businessName,
        attributes: attributes
      });
      
      // Set up observer to handle future DOM changes
      setupObserver();
      
      // Mark fix as applied
      state.fixApplied = userInitialsUpdated && businessNameUpdated;
      
      if (state.fixApplied) {
        logger.info('Fix applied successfully', {
          initials: state.initials,
          businessName: state.businessName
        });
      } else {
        logger.warn('Fix applied partially', {
          initialsUpdated: userInitialsUpdated,
          businessNameUpdated: businessNameUpdated
        });
        
        // If not fully applied, schedule another attempt
        if (state.retryCount < config.retry.maxAttempts) {
          scheduleRetry();
        }
      }
    } catch (error) {
      logger.error('Error applying fix:', error);
      scheduleRetry();
    }
  }

  /**
   * Schedules a retry of the fix
   */
  function scheduleRetry() {
    // Only schedule if not at max retries
    if (state.retryCount >= config.retry.maxAttempts) {
      logger.warn(`Max retry attempts (${config.retry.maxAttempts}) reached`);
      return;
    }
    
    // Clear any existing timeout
    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
    }
    
    // Increment retry count
    state.retryCount++;
    
    // Schedule retry
    const delay = config.retry.interval * state.retryCount;
    logger.debug(`Scheduling retry ${state.retryCount}/${config.retry.maxAttempts} in ${delay}ms`);
    
    state.retryTimeout = setTimeout(() => {
      applyFix();
    }, delay);
  }

  /**
   * Initialize the fix when the DOM is ready
   */
  function initialize() {
    logger.info(`User Initials and Business Name Fix v${config.version} initializing`);
    
    // Check if we've already applied the fix
    if (state.fixApplied) {
      logger.debug('Fix already applied, skipping');
      return;
    }
    
    // Apply the fix
    applyFix();
    
    // Set global flag so other scripts know this fix is applied
    window.__DASHAPPBAR_USER_DATA_FIX_APPLIED = true;
  }

  // Run the fix when the DOM is loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initialize, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})(); 