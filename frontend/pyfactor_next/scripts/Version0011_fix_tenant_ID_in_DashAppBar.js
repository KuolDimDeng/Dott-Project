/**
 * Version0011_fix_tenant_ID_in_DashAppBar.js
 * 
 * This script creates a simplified fix for the DashAppBar component that focuses specifically
 * on retrieving user initials and business name using the correct Cognito attribute name: 
 * 'custom:tenant_ID' (with uppercase ID).
 * 
 * Version: 1.0.0
 * Date: 2025-04-30
 */

(function() {
  // Configuration
  const config = {
    version: '1.0.0',
    logPrefix: '[DashAppBarFix]',
    debug: true,
    tenantIdAttribute: 'custom:tenant_ID',  // The correct attribute name
    selectors: {
      dashAppBar: 'header',
      userAvatar: '.w-8.h-8.rounded-full', 
      userInitials: '[data-testid="user-initials"]',
      businessNameElem: '.text-white .font-semibold',
      appBarTitleElem: '.text-lg.font-semibold'
    },
    retry: {
      maxAttempts: 5,
      interval: 1000
    }
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
   */
  function getCurrentTenantId() {
    try {
      // First try from APP_CACHE using the EXACT correct attribute name
      if (window.__APP_CACHE?.user?.attributes?.[config.tenantIdAttribute]) {
        const tenantId = window.__APP_CACHE.user.attributes[config.tenantIdAttribute];
        logger.debug(`Found tenant ID from APP_CACHE.user.attributes['${config.tenantIdAttribute}']: ${tenantId}`);
        return tenantId;
      }
      
      // Try from URL path
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const pathMatch = window.location.pathname.match(uuidRegex);
      
      if (pathMatch && pathMatch[0]) {
        logger.debug(`Found tenant ID in URL: ${pathMatch[0]}`);
        return pathMatch[0];
      }
      
      // Try from window.__APP_CACHE tenant info
      if (window.__APP_CACHE?.tenant?.id) {
        logger.debug(`Found tenant ID in APP_CACHE.tenant.id: ${window.__APP_CACHE.tenant.id}`);
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
   * Fetches user attributes from Cognito with proper error handling
   */
  async function getCognitoUserAttributes() {
    logger.debug('Fetching Cognito user attributes');
    
    try {
      // Try Amplify v6 API with dynamic import first
      try {
        logger.debug('Attempting dynamic import of aws-amplify/auth');
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        if (typeof fetchUserAttributes === 'function') {
          logger.debug('Using dynamically imported fetchUserAttributes');
          return await fetchUserAttributes();
        }
      } catch (importError) {
        logger.debug('Dynamic import failed, trying alternatives');
      }
      
      // Try global Amplify object
      if (window.Amplify && typeof window.Amplify.Auth?.fetchUserAttributes === 'function') {
        logger.debug('Using Amplify.Auth.fetchUserAttributes');
        return await window.Amplify.Auth.fetchUserAttributes();
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
   * Generates user initials from name or email
   */
  function generateUserInitials(attributes) {
    try {
      if (!attributes) return '';
      
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

      // First and last name
      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      }
      
      // Just first name
      if (firstName) {
        return firstName.charAt(0).toUpperCase();
      }
      
      // Just last name
      if (lastName) {
        return lastName.charAt(0).toUpperCase();
      }
      
      // From email
      if (email && email.includes('@')) {
        const emailName = email.split('@')[0];
        // Try email format first.last@domain.com
        if (emailName.includes('.')) {
          const parts = emailName.split('.');
          if (parts.length >= 2) {
            return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
          }
        }
        
        // Single character from email
        return email.charAt(0).toUpperCase();
      }
      
      return 'U'; // Fallback
    } catch (error) {
      logger.error('Error generating initials:', error);
      return 'U';
    }
  }

  /**
   * Gets the business name from attributes
   */
  function getBusinessName(attributes) {
    if (!attributes) return null;
    
    // Check all possible attribute names for business name
    return attributes['custom:businessname'] || 
           attributes['custom:business_name'] ||
           attributes['custom:tenant_name'] ||
           attributes.businessName ||
           attributes.business_name ||
           null;
  }

  /**
   * Updates the user initials in the DOM
   */
  function updateUserInitials(initials) {
    try {
      // Find the initials element
      let element = document.querySelector(config.selectors.userInitials);
      
      // Fallback to avatar container
      if (!element) {
        element = document.querySelector(config.selectors.userAvatar);
      }
      
      if (element) {
        // Direct update if it's a simple div
        if (element.tagName === 'DIV') {
          element.textContent = initials;
          logger.debug(`Updated user initials: ${initials}`);
          return true;
        }
        
        // Try to find a child text element
        const children = element.querySelectorAll('*');
        for (const child of children) {
          if (child.children.length === 0 && (!child.textContent || child.textContent.length <= 3)) {
            child.textContent = initials;
            logger.debug(`Updated user initials in child element: ${initials}`);
            return true;
          }
        }
        
        // Last resort - add a data attribute
        element.setAttribute('data-initials', initials);
        element.style.display = 'flex';
        element.style.justifyContent = 'center';
        element.style.alignItems = 'center';
        element.textContent = initials;
        
        logger.debug(`Applied user initials as attribute and text: ${initials}`);
        return true;
      }
      
      logger.warn('Could not find user initials element');
      return false;
    } catch (error) {
      logger.error('Error updating user initials:', error);
      return false;
    }
  }

  /**
   * Updates the business name in the DOM
   */
  function updateBusinessName(businessName) {
    try {
      // Find business name element
      let element = document.querySelector(config.selectors.businessNameElem);
      
      // Fallback to title element
      if (!element) {
        element = document.querySelector(config.selectors.appBarTitleElem);
      }
      
      if (element) {
        element.textContent = businessName;
        logger.debug(`Updated business name: ${businessName}`);
        return true;
      }
      
      // Try to find any empty text element in header
      const header = document.querySelector(config.selectors.dashAppBar);
      if (header) {
        const allElements = header.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6');
        for (const el of allElements) {
          if (el.children.length === 0 && (!el.textContent || el.textContent.trim() === '')) {
            el.textContent = businessName;
            logger.debug(`Updated business name in header element: ${businessName}`);
            return true;
          }
        }
      }
      
      logger.warn('Could not find business name element');
      return false;
    } catch (error) {
      logger.error('Error updating business name:', error);
      return false;
    }
  }

  /**
   * Update APP_CACHE with the data
   */
  function updateAppCache(data) {
    if (typeof window === 'undefined' || !window.__APP_CACHE) return;
    
    // Initialize APP_CACHE structure if needed
    if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
    if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
    
    // Record fix version
    window.__APP_CACHE.dashAppBarFix = {
      version: config.version,
      lastUpdated: Date.now(),
      fixApplied: true
    };
    
    // Store user initials
    if (data.initials) {
      window.__APP_CACHE.user.initials = data.initials;
      
      // Store in tenant-specific structure
      if (data.tenantId) {
        if (!window.__APP_CACHE.tenant[data.tenantId]) {
          window.__APP_CACHE.tenant[data.tenantId] = {};
        }
        window.__APP_CACHE.tenant[data.tenantId].userInitials = data.initials;
      }
    }
    
    // Store business name
    if (data.businessName) {
      window.__APP_CACHE.tenant.businessName = data.businessName;
      
      // Store in tenant-specific structure
      if (data.tenantId) {
        if (!window.__APP_CACHE.tenant[data.tenantId]) {
          window.__APP_CACHE.tenant[data.tenantId] = {};
        }
        window.__APP_CACHE.tenant[data.tenantId].businessName = data.businessName;
      }
    }
    
    // Store user attributes
    if (data.attributes) {
      window.__APP_CACHE.user.attributes = data.attributes;
      
      // Explicitly extract and store tenant ID with correct casing
      if (data.attributes[config.tenantIdAttribute]) {
        window.__APP_CACHE.tenant.id = data.attributes[config.tenantIdAttribute];
      }
    }
    
    logger.debug('Updated APP_CACHE');
  }

  /**
   * Main function to apply the fix
   */
  async function applyFix() {
    try {
      // Get tenant ID
      state.tenantId = getCurrentTenantId();
      logger.info(`Applying fix for tenant: ${state.tenantId || 'unknown'}`);
      
      // Get user attributes
      const attributes = await getCognitoUserAttributes();
      
      if (!attributes) {
        logger.warn('No attributes available, scheduling retry');
        scheduleRetry();
        return;
      }
      
      state.userAttributes = attributes;
      
      // Generate user initials
      state.initials = generateUserInitials(attributes);
      logger.debug(`Generated user initials: ${state.initials}`);
      
      // Get business name
      state.businessName = getBusinessName(attributes);
      logger.debug(`Found business name: ${state.businessName || 'unknown'}`);
      
      // Update DOM
      const initialsUpdated = updateUserInitials(state.initials);
      const businessNameUpdated = updateBusinessName(state.businessName);
      
      // Update APP_CACHE
      updateAppCache({
        tenantId: state.tenantId,
        initials: state.initials,
        businessName: state.businessName,
        attributes: attributes
      });
      
      // Check success
      state.fixApplied = initialsUpdated && businessNameUpdated;
      
      if (state.fixApplied) {
        logger.info('Fix applied successfully');
      } else {
        logger.warn('Fix applied partially');
        scheduleRetry();
      }
    } catch (error) {
      logger.error('Error applying fix:', error);
      scheduleRetry();
    }
  }

  /**
   * Schedule a retry attempt
   */
  function scheduleRetry() {
    if (state.retryCount >= config.retry.maxAttempts) {
      logger.warn(`Max retry attempts (${config.retry.maxAttempts}) reached`);
      return;
    }
    
    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
    }
    
    state.retryCount++;
    
    const delay = config.retry.interval * state.retryCount;
    logger.debug(`Scheduling retry ${state.retryCount}/${config.retry.maxAttempts} in ${delay}ms`);
    
    state.retryTimeout = setTimeout(applyFix, delay);
  }

  /**
   * Initialize the fix
   */
  function initialize() {
    logger.info(`DashAppBar tenant_ID fix v${config.version} initializing`);
    
    if (state.fixApplied) {
      logger.debug('Fix already applied, skipping');
      return;
    }
    
    // Apply the fix
    applyFix();
    
    // Create observer to detect DOM changes
    if (!state.observer && typeof MutationObserver !== 'undefined') {
      state.observer = new MutationObserver(() => {
        if (state.initials && state.businessName) {
          updateUserInitials(state.initials);
          updateBusinessName(state.businessName);
        }
      });
      
      // Start observing the header elements
      const header = document.querySelector(config.selectors.dashAppBar);
      if (header) {
        state.observer.observe(header, { 
          childList: true, 
          subtree: true,
          characterData: true,
          attributes: true
        });
        logger.debug('Mutation observer set up');
      }
    }
    
    // Set global flag
    window.__DASHAPPBAR_TENANT_ID_FIX_APPLIED = true;
  }

  // Run the fix when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initialize, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})(); 