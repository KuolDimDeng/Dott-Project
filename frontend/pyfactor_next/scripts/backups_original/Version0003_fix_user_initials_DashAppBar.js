/**
 * User Initials Fix for DashAppBar Component (v1.1.0)
 * 
 * This script fixes the issue with user initials not displaying correctly
 * in the DashAppBar avatar component. It retrieves user attributes from Cognito,
 * properly generates the initials, and updates the UI accordingly.
 * 
 * Enhanced in v1.1.0 with better debugging, verification, and error reporting.
 */

(function() {
  // Configuration
  const config = {
    version: '1.1.0',
    debug: true,
    logPrefix: '[UserInitialsFix]',
    debugPanel: false,
    selectors: {
      dashAppBar: '[data-testid="dash-app-bar"]',
      userAvatar: '.MuiAvatar-root',
      userInitials: '.MuiAvatar-root > .MuiTypography-root',
      fallbackIcon: 'svg.MuiSvgIcon-root'
    },
    retryOptions: {
      maxRetries: 5,
      retryInterval: 1000,
      observerTimeout: 200
    },
    appCachePrefix: 'pyfactor-user-'
  };
  
  // Create debug logger
  const logger = {
    debug: function(message, data) {
      if (config.debug) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.debug(`${config.logPrefix} [${timestamp}] ${message}`, data || '');
      }
    },
    info: function(message, data) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.info(`${config.logPrefix} [${timestamp}] ${message}`, data || '');
    },
    warn: function(message, data) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.warn(`${config.logPrefix} [${timestamp}] ${message}`, data || '');
    },
    error: function(message, error) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.error(`${config.logPrefix} [${timestamp}] ${message}`, error || '');
    },
    groupStart: function(title) {
      if (config.debug) {
        console.group(`${config.logPrefix} ${title}`);
      }
    },
    groupEnd: function() {
      if (config.debug) {
        console.groupEnd();
      }
    }
  };
  
  // Variables to track state
  let retryCount = 0;
  let observer = null;
  let fixApplied = false;
  let tenantId = null;
  let userData = null;
  
  /**
   * Gets the current tenant ID from the URL or localStorage
   * @returns {string|null} The tenant ID or null if not found
   */
  function getCurrentTenantId() {
    try {
      // First try from URL path
      const pathMatch = window.location.pathname.match(/\/([^/]+)\/dashboard/);
      if (pathMatch && pathMatch[1]) {
        logger.debug(`Found tenant ID in URL: ${pathMatch[1]}`);
        return pathMatch[1];
      }
      
      // Then try from localStorage
      const storedTenant = localStorage.getItem('currentTenant');
      if (storedTenant) {
        try {
          const parsed = JSON.parse(storedTenant);
          if (parsed && parsed.id) {
            logger.debug(`Found tenant ID in localStorage: ${parsed.id}`);
            return parsed.id;
          }
        } catch (e) {
          logger.warn('Failed to parse currentTenant from localStorage', e);
        }
      }
      
      // Last resort - check global window object
      if (window.TENANT_ID) {
        logger.debug(`Found tenant ID in window.TENANT_ID: ${window.TENANT_ID}`);
        return window.TENANT_ID;
      }
      
      logger.warn('Could not determine tenant ID');
      return null;
    } catch (error) {
      logger.error('Error getting tenant ID', error);
      return null;
    }
  }
  
  /**
   * Safely accesses user attributes from Cognito user
   * @param {Object} user - Cognito user object
   * @param {string} path - Attribute path to access (dot notation)
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} The attribute value or default value
   */
  function safeGetAttribute(user, path, defaultValue = null) {
    try {
      if (!user) return defaultValue;
      
      // Handle different user object structures
      const attributes = 
        user.attributes || 
        (user.signInUserSession?.idToken?.payload) || 
        (user.challengeParam?.userAttributes) ||
        {};
      
      const parts = path.split('.');
      let current = attributes;
      
      for (const part of parts) {
        if (current === null || current === undefined) {
          return defaultValue;
        }
        current = current[part];
      }
      
      return current !== undefined ? current : defaultValue;
    } catch (error) {
      logger.warn(`Error accessing user attribute: ${path}`, error);
      return defaultValue;
    }
  }
  
  /**
   * Gets user information from Amplify or window.USER object
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async function getUserInfo() {
    logger.debug('Getting user information');
    
    try {
      // Try to access Amplify Auth if available
      if (window.AWS && window.AWS.Auth) {
        logger.debug('Using AWS.Auth to get current user');
        try {
          const user = await window.AWS.Auth.currentAuthenticatedUser();
          logger.debug('Got user from AWS.Auth', user);
          return user;
        } catch (e) {
          logger.warn('Error getting user from AWS.Auth', e);
        }
      }
      
      // Try to access Amplify object directly
      if (window.Amplify && window.Amplify.Auth) {
        logger.debug('Using Amplify.Auth to get current user');
        try {
          const user = await window.Amplify.Auth.currentAuthenticatedUser();
          logger.debug('Got user from Amplify.Auth', user);
          return user;
        } catch (e) {
          logger.warn('Error getting user from Amplify.Auth', e);
        }
      }
      
      // Try window.USER if available
      if (window.USER) {
        logger.debug('Using window.USER object');
        return window.USER;
      }
      
      // Try localStorage
      try {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          logger.debug('Found userData in localStorage');
          return JSON.parse(userDataStr);
        }
      } catch (e) {
        logger.warn('Error parsing userData from localStorage', e);
      }
      
      // Try sessionStorage
      try {
        const userDataStr = sessionStorage.getItem('userData');
        if (userDataStr) {
          logger.debug('Found userData in sessionStorage');
          return JSON.parse(userDataStr);
        }
      } catch (e) {
        logger.warn('Error parsing userData from sessionStorage', e);
      }
      
      logger.warn('Could not find user information');
      return null;
    } catch (error) {
      logger.error('Error in getUserInfo', error);
      return null;
    }
  }
  
  /**
   * Generates user initials from name or email
   * @param {Object} user - User object
   * @returns {string} User initials
   */
  function generateInitials(user) {
    logger.debug('Generating user initials');
    
    try {
      // First try to get from given_name and family_name
      const firstName = safeGetAttribute(user, 'given_name') || 
                        safeGetAttribute(user, 'name') ||
                        safeGetAttribute(user, 'firstName');
                        
      const lastName = safeGetAttribute(user, 'family_name') || 
                       safeGetAttribute(user, 'surname') || 
                       safeGetAttribute(user, 'lastName');
      
      if (firstName && lastName) {
        const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
        logger.debug(`Generated initials from first/last name: ${initials}`);
        return initials;
      }
      
      // Then try from full name
      const name = safeGetAttribute(user, 'name') || safeGetAttribute(user, 'fullName');
      if (name) {
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
          const initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
          logger.debug(`Generated initials from full name: ${initials}`);
          return initials;
        } else if (parts.length === 1) {
          const initial = parts[0][0].toUpperCase();
          logger.debug(`Generated initial from single name: ${initial}`);
          return initial;
        }
      }
      
      // Finally try from email
      const email = safeGetAttribute(user, 'email');
      if (email) {
        const username = email.split('@')[0];
        if (username.includes('.')) {
          // If email has format first.last@domain
          const nameParts = username.split('.');
          const initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
          logger.debug(`Generated initials from email with dot: ${initials}`);
          return initials;
        } else {
          // Just use first character of email
          const initial = username[0].toUpperCase();
          logger.debug(`Generated initial from email: ${initial}`);
          return initial;
        }
      }
      
      // If all else fails, return "U"
      logger.warn('Could not generate initials from user data');
      return 'U';
    } catch (error) {
      logger.error('Error generating initials', error);
      return 'U';
    }
  }
  
  /**
   * Saves user initials to AppCache with tenant-specific key
   * @param {string} initials - User initials
   */
  function saveInitialsToCache(initials) {
    try {
      const cacheKey = `${config.appCachePrefix}${tenantId ? tenantId + '-' : ''}initials`;
      logger.debug(`Saving initials to AppCache with key: ${cacheKey}`);
      
      if (window.AppCache && typeof window.AppCache.setItem === 'function') {
        window.AppCache.setItem(cacheKey, initials);
        logger.debug('Saved initials to AppCache');
      } else {
        // Fallback to localStorage
        localStorage.setItem(cacheKey, initials);
        logger.debug('Saved initials to localStorage (AppCache not available)');
      }
      
      // Also save to sessionStorage for redundancy
      sessionStorage.setItem(cacheKey, initials);
    } catch (error) {
      logger.error('Error saving initials to cache', error);
    }
  }
  
  /**
   * Gets user initials from AppCache
   * @returns {string|null} User initials or null if not found
   */
  function getInitialsFromCache() {
    try {
      const cacheKey = `${config.appCachePrefix}${tenantId ? tenantId + '-' : ''}initials`;
      logger.debug(`Getting initials from AppCache with key: ${cacheKey}`);
      
      let initials = null;
      
      // Try AppCache first
      if (window.AppCache && typeof window.AppCache.getItem === 'function') {
        initials = window.AppCache.getItem(cacheKey);
        if (initials) {
          logger.debug(`Got initials from AppCache: ${initials}`);
          return initials;
        }
      }
      
      // Try localStorage
      initials = localStorage.getItem(cacheKey);
      if (initials) {
        logger.debug(`Got initials from localStorage: ${initials}`);
        return initials;
      }
      
      // Try sessionStorage
      initials = sessionStorage.getItem(cacheKey);
      if (initials) {
        logger.debug(`Got initials from sessionStorage: ${initials}`);
        return initials;
      }
      
      logger.debug('No initials found in cache');
      return null;
    } catch (error) {
      logger.error('Error getting initials from cache', error);
      return null;
    }
  }
  
  /**
   * Updates the UI with user initials
   * @param {string} initials - User initials
   * @returns {boolean} Success status
   */
  function updateUI(initials) {
    try {
      logger.debug(`Updating UI with initials: ${initials}`);
      
      // Find the DashAppBar component
      const dashAppBar = document.querySelector(config.selectors.dashAppBar);
      if (!dashAppBar) {
        logger.warn('DashAppBar not found in DOM');
        return false;
      }
      
      // Find the avatar element
      const avatarEl = dashAppBar.querySelector(config.selectors.userAvatar);
      if (!avatarEl) {
        logger.warn('User avatar not found in DashAppBar');
        return false;
      }
      
      // Check if there's already a text element for initials
      let initialsEl = avatarEl.querySelector(config.selectors.userInitials);
      
      // If text element exists, update it
      if (initialsEl) {
        logger.debug('Found existing initials element, updating text');
        initialsEl.textContent = initials;
      } else {
        // If no text element, need to remove icon and add text
        const fallbackIcon = avatarEl.querySelector(config.selectors.fallbackIcon);
        
        if (fallbackIcon) {
          logger.debug('Found fallback icon, replacing with initials');
          // Remove the fallback icon
          fallbackIcon.remove();
          
          // Create text element for initials
          initialsEl = document.createElement('p');
          initialsEl.className = 'MuiTypography-root MuiTypography-body1';
          initialsEl.style.margin = '0';
          initialsEl.style.fontSize = '1rem';
          initialsEl.style.lineHeight = '1.5';
          initialsEl.style.letterSpacing = '0.00938em';
          initialsEl.style.fontWeight = '500';
          initialsEl.textContent = initials;
          
          // Add to avatar
          avatarEl.appendChild(initialsEl);
        } else {
          logger.warn('No fallback icon found to replace');
          return false;
        }
      }
      
      // Update avatar background color if it's using the default
      if (avatarEl.style.backgroundColor === 'rgb(188, 188, 188)') {
        avatarEl.style.backgroundColor = '#1976d2';
      }
      
      logger.info(`Successfully updated UI with initials: ${initials}`);
      return true;
    } catch (error) {
      logger.error('Error updating UI', error);
      return false;
    }
  }
  
  /**
   * Sets up a MutationObserver to detect changes to the DashAppBar
   */
  function setupObserver() {
    try {
      // Clear any existing observer
      if (observer) {
        observer.disconnect();
      }
      
      logger.debug('Setting up MutationObserver');
      
      // Create new observer
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' || mutation.type === 'subtree') {
            // If an avatar with fallback icon is added, update it with initials
            const dashAppBar = document.querySelector(config.selectors.dashAppBar);
            if (dashAppBar) {
              const avatarEl = dashAppBar.querySelector(config.selectors.userAvatar);
              if (avatarEl) {
                const fallbackIcon = avatarEl.querySelector(config.selectors.fallbackIcon);
                if (fallbackIcon) {
                  // Wait for any React updates to complete
                  setTimeout(() => {
                    logger.debug('Observer detected avatar with fallback icon');
                    applyFix();
                  }, config.retryOptions.observerTimeout);
                  break;
                }
              }
            }
          }
        }
      });
      
      // Start observing the body
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      logger.debug('MutationObserver setup complete');
    } catch (error) {
      logger.error('Error setting up observer', error);
    }
  }
  
  /**
   * Creates a debug panel to show status information
   */
  function createDebugPanel() {
    if (!config.debugPanel) return;
    
    try {
      logger.debug('Creating debug panel');
      
      // Remove existing panel if any
      const existingPanel = document.getElementById('user-initials-fix-debug');
      if (existingPanel) {
        existingPanel.remove();
      }
      
      // Create panel
      const panel = document.createElement('div');
      panel.id = 'user-initials-fix-debug';
      panel.style.position = 'fixed';
      panel.style.bottom = '10px';
      panel.style.right = '10px';
      panel.style.zIndex = '10000';
      panel.style.background = 'rgba(0, 0, 0, 0.8)';
      panel.style.color = 'white';
      panel.style.padding = '10px';
      panel.style.borderRadius = '5px';
      panel.style.fontSize = '12px';
      panel.style.fontFamily = 'monospace';
      panel.style.maxWidth = '300px';
      panel.style.maxHeight = '200px';
      panel.style.overflow = 'auto';
      
      // Add content
      panel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">User Initials Fix v${config.version}</div>
        <div>Status: ${fixApplied ? 'Applied ✅' : 'Pending ⏳'}</div>
        <div>Tenant ID: ${tenantId || 'Unknown'}</div>
        <div>User: ${userData ? (safeGetAttribute(userData, 'email') || 'Found') : 'Not found'}</div>
        <div>Initials: ${getInitialsFromCache() || 'Not set'}</div>
        <div>Retries: ${retryCount}/${config.retryOptions.maxRetries}</div>
        <div style="margin-top: 5px; font-size: 10px;">Click to dismiss</div>
      `;
      
      // Add click to dismiss
      panel.addEventListener('click', () => {
        panel.remove();
      });
      
      // Add to DOM
      document.body.appendChild(panel);
      
      logger.debug('Debug panel created');
    } catch (error) {
      logger.error('Error creating debug panel', error);
    }
  }
  
  /**
   * Verifies the fix was properly applied
   */
  function verifyFix() {
    try {
      logger.groupStart('Verification');
      
      // 1. Check initials in cache
      const cachedInitials = getInitialsFromCache();
      logger.debug(`Cached initials: ${cachedInitials || 'Not found'}`);
      
      // 2. Check avatar in DOM
      const dashAppBar = document.querySelector(config.selectors.dashAppBar);
      const avatarEl = dashAppBar ? dashAppBar.querySelector(config.selectors.userAvatar) : null;
      const initialsEl = avatarEl ? avatarEl.querySelector(config.selectors.userInitials) : null;
      const displayedInitials = initialsEl ? initialsEl.textContent : null;
      
      logger.debug(`Displayed initials: ${displayedInitials || 'Not found'}`);
      
      // 3. Check if they match
      const success = cachedInitials && 
                      displayedInitials && 
                      cachedInitials === displayedInitials;
      
      if (success) {
        logger.info('✅ Verification successful - fix properly applied');
      } else {
        logger.warn('⚠️ Verification failed - fix may not be working correctly');
        if (cachedInitials && !displayedInitials) {
          logger.warn('Initials found in cache but not displayed in UI');
        } else if (!cachedInitials && displayedInitials) {
          logger.warn('Initials displayed in UI but not found in cache');
        } else if (cachedInitials !== displayedInitials) {
          logger.warn(`Mismatch between cached (${cachedInitials}) and displayed (${displayedInitials}) initials`);
        }
      }
      
      logger.groupEnd();
      return success;
    } catch (error) {
      logger.error('Error verifying fix', error);
      logger.groupEnd();
      return false;
    }
  }
  
  /**
   * Main function to apply the fix
   */
  async function applyFix() {
    try {
      if (fixApplied) {
        logger.debug('Fix already applied, skipping');
        return;
      }
      
      logger.info(`Applying User Initials Fix v${config.version}`);
      
      // Check if we're on a page where the fix should be applied
      const dashAppBar = document.querySelector(config.selectors.dashAppBar);
      if (!dashAppBar) {
        logger.debug('DashAppBar not found, skipping fix');
        
        // Set up observer to wait for DashAppBar to appear
        setupObserver();
        
        // Retry if within retry limit
        if (retryCount < config.retryOptions.maxRetries) {
          retryCount++;
          logger.debug(`Will retry in ${config.retryOptions.retryInterval}ms (attempt ${retryCount}/${config.retryOptions.maxRetries})`);
          setTimeout(applyFix, config.retryOptions.retryInterval);
        } else {
          logger.warn(`Max retries (${config.retryOptions.maxRetries}) reached, giving up`);
        }
        
        return;
      }
      
      // Get tenant ID
      tenantId = getCurrentTenantId();
      
      // Check if we already have initials in cache
      const cachedInitials = getInitialsFromCache();
      if (cachedInitials) {
        logger.debug(`Using cached initials: ${cachedInitials}`);
        const uiUpdated = updateUI(cachedInitials);
        
        if (uiUpdated) {
          fixApplied = true;
          setupObserver();
          verifyFix();
          createDebugPanel();
          logger.info('Fix applied successfully using cached initials');
          return;
        }
      }
      
      // Get user info
      userData = await getUserInfo();
      if (!userData) {
        logger.warn('Could not get user data, will retry');
        
        // Retry if within retry limit
        if (retryCount < config.retryOptions.maxRetries) {
          retryCount++;
          logger.debug(`Will retry in ${config.retryOptions.retryInterval}ms (attempt ${retryCount}/${config.retryOptions.maxRetries})`);
          setTimeout(applyFix, config.retryOptions.retryInterval);
        } else {
          logger.error(`Max retries (${config.retryOptions.maxRetries}) reached, giving up`);
        }
        
        return;
      }
      
      // Generate user initials
      const initials = generateInitials(userData);
      
      // Save to cache
      saveInitialsToCache(initials);
      
      // Update UI
      const uiUpdated = updateUI(initials);
      
      if (uiUpdated) {
        fixApplied = true;
        setupObserver();
        verifyFix();
        createDebugPanel();
        logger.info('Fix applied successfully with newly generated initials');
      } else {
        logger.warn('Failed to update UI, will retry');
        
        // Retry if within retry limit
        if (retryCount < config.retryOptions.maxRetries) {
          retryCount++;
          logger.debug(`Will retry in ${config.retryOptions.retryInterval}ms (attempt ${retryCount}/${config.retryOptions.maxRetries})`);
          setTimeout(applyFix, config.retryOptions.retryInterval);
        } else {
          logger.error(`Max retries (${config.retryOptions.maxRetries}) reached, giving up`);
        }
      }
    } catch (error) {
      logger.error('Error applying fix', error);
      
      // Retry if within retry limit
      if (retryCount < config.retryOptions.maxRetries) {
        retryCount++;
        logger.debug(`Will retry in ${config.retryOptions.retryInterval}ms (attempt ${retryCount}/${config.retryOptions.maxRetries})`);
        setTimeout(applyFix, config.retryOptions.retryInterval);
      } else {
        logger.error(`Max retries (${config.retryOptions.maxRetries}) reached, giving up`);
      }
    }
  }
  
  // Start the fix
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }
})(); 