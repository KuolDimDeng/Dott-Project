/**
 * Version0003_fix_user_initials_DashAppBar.js
 * 
 * This script fixes an issue with user initials not displaying correctly in the DashAppBar component.
 * The script detects when the DashAppBar is loaded, retrieves user information, generates appropriate
 * initials, and updates the UI, replacing the default user icon with the user's initials.
 * 
 * Version: 0.0.4
 * Created: 2023-10-05
 * Last Updated: 2023-10-15
 * Author: PyFactor Team
 * 
 * CHANGELOG:
 * v0.0.4 - Updated tenant ID retrieval to use AppCache and Cognito attributes directly
 * v0.0.3 - Added tenant-specific caching and improved fallback mechanisms
 * v0.0.2 - Added debug panel and improved error handling
 * v0.0.1 - Initial implementation
 */

(function() {
  // Configuration
  const config = {
    version: '0.0.4',
    // Cache prefix for storing user initials
    appCachePrefix: 'pf-',
    // DOM selectors
    selectors: {
      dashAppBar: '.DashAppBar',
      userAvatar: '.MuiAvatar-root',
      fallbackIcon: 'svg[data-testid="PersonIcon"]',
      userInitials: 'p'
    },
    // API endpoints
    apiEndpoints: {
      userInfo: '/api/v0/users/me',
      tenantInfo: '/api/v0/tenant'
    },
    // Debug options
    debug: true,
    debugPanel: true,
    logTimestamps: true,
    // Retry options
    retryOptions: {
      maxRetries: 5,
      retryInterval: 1000,
      observerTimeout: 500
    }
  };
  
  // State variables
  let retryCount = 0;
  let fixApplied = false;
  let userData = null;
  let tenantId = null;
  let observer = null;
  
  // Debug logger
  const logger = {
    _getTimestamp: function() {
      if (!config.logTimestamps) return '';
      const now = new Date();
      return `[${now.toISOString()}] `;
    },
    
    debug: function(message, data) {
      if (!config.debug) return;
      if (data) {
        console.debug(`${this._getTimestamp()}[User Initials Fix] ${message}`, data);
      } else {
        console.debug(`${this._getTimestamp()}[User Initials Fix] ${message}`);
      }
    },
    
    info: function(message, data) {
      if (data) {
        console.info(`${this._getTimestamp()}[User Initials Fix] ${message}`, data);
      } else {
        console.info(`${this._getTimestamp()}[User Initials Fix] ${message}`);
      }
    },
    
    warn: function(message, data) {
      if (data) {
        console.warn(`${this._getTimestamp()}[User Initials Fix] ${message}`, data);
      } else {
        console.warn(`${this._getTimestamp()}[User Initials Fix] ${message}`);
      }
    },
    
    error: function(message, error) {
      if (error) {
        console.error(`${this._getTimestamp()}[User Initials Fix] ${message}`, error);
      } else {
        console.error(`${this._getTimestamp()}[User Initials Fix] ${message}`);
      }
    },
    
    groupStart: function(label) {
      if (!config.debug) return;
      console.group(`${this._getTimestamp()}[User Initials Fix] ${label}`);
    },
    
    groupEnd: function() {
      if (!config.debug) return;
      console.groupEnd();
    }
  };
  
  /**
   * Gets the current tenant ID from AppCache or Cognito attributes
   * @returns {string|null} Tenant ID or null if not found
   */
  function getCurrentTenantId() {
    try {
      logger.debug('Getting tenant ID');
      
      // 1. Try to get from AWS AppCache
      if (window.AWS && window.AWS.AppCache) {
        const tenantId = window.AWS.AppCache.get('tenantId');
        if (tenantId) {
          logger.debug(`Found tenant ID in AWS AppCache: ${tenantId}`);
          return tenantId;
        }
      }
      
      // 2. Check global AppCache if available (custom implementation)
      if (window.AppCache) {
        // Try both formats of tenant ID in AppCache
        const appCacheTenantId = window.AppCache.getItem && (
          window.AppCache.getItem('tenantId') || 
          window.AppCache.getItem('tenant_id') ||
          window.AppCache.getItem('currentTenant')
        );
        
        if (appCacheTenantId) {
          // Handle if it's an object with ID property
          const id = typeof appCacheTenantId === 'object' ? 
            appCacheTenantId.id : appCacheTenantId;
            
          if (id) {
            logger.debug(`Found tenant ID in AppCache: ${id}`);
            return id;
          }
        }
      }
      
      // 3. Try from window.__APP_CACHE
      if (window.__APP_CACHE) {
        // Try tenant.current from APP_CACHE
        if (window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.current) {
          const id = typeof window.__APP_CACHE.tenant.current === 'object' ?
            window.__APP_CACHE.tenant.current.id : window.__APP_CACHE.tenant.current;
            
          if (id) {
            logger.debug(`Found tenant ID in __APP_CACHE.tenant.current: ${id}`);
            return id;
          }
        }
      }
      
      // 4. Try from Cognito session
      if (window.AWS && window.AWS.Auth) {
        try {
          // Get current session synchronously if possible
          if (typeof window.AWS.Auth.currentSession === 'function') {
            try {
              const session = window.AWS.Auth.currentSession();
              if (session && typeof session.getIdToken === 'function') {
                const idToken = session.getIdToken();
                if (idToken && typeof idToken.decodePayload === 'function') {
                  const payload = idToken.decodePayload();
                  // Look for tenant ID in various attribute formats
                  const tenantId = payload['custom:tenantId'] || 
                                  payload['custom:tenant_id'] || 
                                  payload['tenantId'] ||
                                  payload['tenant_id'];
                                  
                  if (tenantId) {
                    logger.debug(`Found tenant ID in Cognito token payload: ${tenantId}`);
                    return tenantId;
                  }
                }
              }
            } catch (sessionError) {
              logger.debug('Could not get current session synchronously', sessionError);
            }
          }
          
          // Fallback: try to get from cached user data
          if (typeof window.AWS.Auth.currentUserInfo === 'function') {
            const userInfo = window.AWS.Auth.currentUserInfo();
            if (userInfo && userInfo.attributes) {
              const tenantId = userInfo.attributes['custom:tenantId'] || 
                              userInfo.attributes['custom:tenant_id'] || 
                              userInfo.attributes['tenantId'] ||
                              userInfo.attributes['tenant_id'];
                              
              if (tenantId) {
                logger.debug(`Found tenant ID in Cognito user attributes: ${tenantId}`);
                return tenantId;
              }
            }
          }
        } catch (authError) {
          logger.warn('Error accessing Cognito session', authError);
        }
      }
      
      // 5. Try to get from Amplify Auth directly
      if (window.Amplify && window.Amplify.Auth) {
        try {
          // Similar checks as above but with Amplify.Auth
          if (typeof window.Amplify.Auth.currentSession === 'function') {
            try {
              const session = window.Amplify.Auth.currentSession();
              if (session && typeof session.getIdToken === 'function') {
                const idToken = session.getIdToken();
                if (idToken && typeof idToken.decodePayload === 'function') {
                  const payload = idToken.decodePayload();
                  const tenantId = payload['custom:tenantId'] || 
                                  payload['custom:tenant_id'] || 
                                  payload['tenantId'] ||
                                  payload['tenant_id'];
                                  
                  if (tenantId) {
                    logger.debug(`Found tenant ID in Amplify token payload: ${tenantId}`);
                    return tenantId;
                  }
                }
              }
            } catch (sessionError) {
              logger.debug('Could not get current session from Amplify synchronously', sessionError);
            }
          }
        } catch (amplifyError) {
          logger.warn('Error accessing Amplify Auth', amplifyError);
        }
      }
      
      // 6. Last resort - try from URL path (not using localStorage as requested)
      const urlMatch = window.location.pathname.match(/\/([^/]+)\/dashboard/);
      if (urlMatch && urlMatch[1]) {
        logger.debug(`Found tenant ID in URL: ${urlMatch[1]}`);
        return urlMatch[1];
      }
      
      logger.warn('Could not determine tenant ID - user initials will not be tenant-specific');
      return null;
    } catch (error) {
      logger.error('Error getting tenant ID', error);
      return null;
    }
  }
  
  /**
   * Safely gets a nested attribute from an object using a dot-notation path
   * @param {Object} user - User object
   * @param {string} path - Dot-notation path to attribute 
   * @param {*} defaultValue - Default value if attribute not found
   * @returns {*} Attribute value or default
   */
  function safeGetAttribute(user, path, defaultValue = null) {
    try {
      if (!user) return defaultValue;
      
      const keys = path.split('.');
      let value = user;
      
      for (const key of keys) {
        if (value === null || value === undefined || typeof value !== 'object') {
          return defaultValue;
        }
        value = value[key];
      }
      
      if (value === null || value === undefined) {
        return defaultValue;
      }
      
      return value;
    } catch (error) {
      logger.error(`Error getting attribute ${path}`, error);
      return defaultValue;
    }
  }
  
  /**
   * Gets user information from Cognito or AppCache
   * @returns {Promise<Object|null>} User data or null if failed
   */
  async function getUserInfo() {
    try {
      logger.debug('Getting user information');
      
      // 1. Try AWS Cognito directly
      if (window.AWS && window.AWS.Auth) {
        try {
          logger.debug('Attempting to get user from AWS Auth');
          
          // Try currentUserInfo - most reliable method
          if (typeof window.AWS.Auth.currentUserInfo === 'function') {
            const userInfo = await window.AWS.Auth.currentUserInfo();
            if (userInfo) {
              logger.debug('Successfully retrieved user from AWS.Auth.currentUserInfo()');
              return userInfo;
            }
          }
          
          // Try currentAuthenticatedUser - fallback
          if (typeof window.AWS.Auth.currentAuthenticatedUser === 'function') {
            const user = await window.AWS.Auth.currentAuthenticatedUser();
            if (user) {
              logger.debug('Successfully retrieved user from AWS.Auth.currentAuthenticatedUser()');
              return user;
            }
          }
        } catch (authError) {
          logger.warn('Error getting user from AWS Auth', authError);
        }
      }
      
      // 2. Try Amplify Auth as fallback
      if (window.Amplify && window.Amplify.Auth) {
        try {
          logger.debug('Attempting to get user from Amplify Auth');
          
          // Try currentUserInfo
          if (typeof window.Amplify.Auth.currentUserInfo === 'function') {
            const userInfo = await window.Amplify.Auth.currentUserInfo();
            if (userInfo) {
              logger.debug('Successfully retrieved user from Amplify.Auth.currentUserInfo()');
              return userInfo;
            }
          }
          
          // Try currentAuthenticatedUser
          if (typeof window.Amplify.Auth.currentAuthenticatedUser === 'function') {
            const user = await window.Amplify.Auth.currentAuthenticatedUser();
            if (user) {
              logger.debug('Successfully retrieved user from Amplify.Auth.currentAuthenticatedUser()');
              return user;
            }
          }
        } catch (amplifyError) {
          logger.warn('Error getting user from Amplify Auth', amplifyError);
        }
      }
      
      // 3. Try AWS AppCache
      if (window.AWS && window.AWS.AppCache) {
        const userData = window.AWS.AppCache.get('userData') || window.AWS.AppCache.get('user');
        if (userData) {
          logger.debug('Found user data in AWS AppCache');
          return userData;
        }
      }
      
      // 4. Try from window.__APP_CACHE (custom implementation)
      if (window.__APP_CACHE) {
        // Check both common locations
        if (window.__APP_CACHE.user) {
          const userData = window.__APP_CACHE.user.data || window.__APP_CACHE.user.current;
          if (userData) {
            logger.debug('Found user data in __APP_CACHE.user');
            return userData;
          }
        }
        
        // Check tenant-specific user data
        if (tenantId && window.__APP_CACHE.tenant && window.__APP_CACHE.tenant[tenantId]) {
          const userData = window.__APP_CACHE.tenant[tenantId].user;
          if (userData) {
            logger.debug(`Found user data in __APP_CACHE.tenant[${tenantId}].user`);
            return userData;
          }
        }
      }
      
      // 5. Try from standard AppCache
      if (window.AppCache && typeof window.AppCache.getItem === 'function') {
        const userInfoStr = window.AppCache.getItem('userInfo');
        if (userInfoStr) {
          logger.debug('Found user data in AppCache');
          return typeof userInfoStr === 'string' ? JSON.parse(userInfoStr) : userInfoStr;
        }
      }
      
      // 6. Last resort - try API call if we have an endpoint defined
      logger.debug('Attempting to get user information from API');
      const response = await fetch(config.apiEndpoints.userInfo, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const userData = await response.json();
      logger.debug('Successfully retrieved user data from API');
      return userData;
    } catch (error) {
      logger.error('Error fetching user information', error);
      return null;
    }
  }
  
  /**
   * Generates initials from user data
   * @param {Object} user - User data
   * @returns {string} User initials (1-2 characters)
   */
  function generateInitials(user) {
    try {
      logger.debug('Generating initials from user data');
      
      // Try from displayName (First Last)
      const displayName = safeGetAttribute(user, 'displayName');
      if (displayName) {
        const nameParts = displayName.split(' ').filter(p => p.trim().length > 0);
        if (nameParts.length >= 2) {
          const initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
          logger.debug(`Generated initials from displayName: ${initials}`);
          return initials;
        } else if (nameParts.length === 1) {
          const initial = nameParts[0][0].toUpperCase();
          logger.debug(`Generated initial from single name: ${initial}`);
          return initial;
        }
      }
      
      // Try from first and last name
      const firstName = safeGetAttribute(user, 'firstName') || safeGetAttribute(user, 'name.first');
      const lastName = safeGetAttribute(user, 'lastName') || safeGetAttribute(user, 'name.last');
      
      if (firstName && lastName) {
        const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
        logger.debug(`Generated initials from first/last name: ${initials}`);
        return initials;
      } else if (firstName) {
        const initial = firstName[0].toUpperCase();
        logger.debug(`Generated initial from first name: ${initial}`);
        return initial;
      } else if (lastName) {
        const initial = lastName[0].toUpperCase();
        logger.debug(`Generated initial from last name: ${initial}`);
        return initial;
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
      
      // Try AWS AppCache first
      if (window.AWS && window.AWS.AppCache) {
        window.AWS.AppCache.set(cacheKey, initials);
        logger.debug('Saved initials to AWS AppCache');
        return;
      }
      
      // Try window.__APP_CACHE
      if (window.__APP_CACHE) {
        // Ensure the tenant structure exists
        if (!window.__APP_CACHE.tenant) {
          window.__APP_CACHE.tenant = {};
        }
        
        // Save in tenant-specific location
        if (tenantId) {
          if (!window.__APP_CACHE.tenant[tenantId]) {
            window.__APP_CACHE.tenant[tenantId] = {};
          }
          window.__APP_CACHE.tenant[tenantId].userInitials = initials;
          logger.debug(`Saved initials to __APP_CACHE.tenant[${tenantId}].userInitials`);
        }
        
        // Also save in user section
        if (!window.__APP_CACHE.user) {
          window.__APP_CACHE.user = {};
        }
        window.__APP_CACHE.user[`${tenantId ? tenantId + '_' : ''}initials`] = initials;
        logger.debug(`Saved initials to __APP_CACHE.user['${tenantId ? tenantId + '_' : ''}initials']`);
        return;
      }
      
      // Try standard AppCache
      if (window.AppCache && typeof window.AppCache.setItem === 'function') {
        window.AppCache.setItem(cacheKey, initials);
        logger.debug('Saved initials to AppCache');
        return;
      }
      
      // No AppCache available
      logger.warn('No AppCache mechanism available, initials will not be persisted');
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
      
      // Try AWS AppCache first
      if (window.AWS && window.AWS.AppCache) {
        initials = window.AWS.AppCache.get(cacheKey);
        if (initials) {
          logger.debug(`Got initials from AWS AppCache: ${initials}`);
          return initials;
        }
      }
      
      // Try window.__APP_CACHE
      if (window.__APP_CACHE) {
        // Try tenant-specific location first
        if (tenantId && 
            window.__APP_CACHE.tenant && 
            window.__APP_CACHE.tenant[tenantId] && 
            window.__APP_CACHE.tenant[tenantId].userInitials) {
          initials = window.__APP_CACHE.tenant[tenantId].userInitials;
          logger.debug(`Got initials from __APP_CACHE.tenant[${tenantId}].userInitials: ${initials}`);
          return initials;
        }
        
        // Try user section
        if (window.__APP_CACHE.user) {
          initials = window.__APP_CACHE.user[`${tenantId ? tenantId + '_' : ''}initials`];
          if (initials) {
            logger.debug(`Got initials from __APP_CACHE.user['${tenantId ? tenantId + '_' : ''}initials']: ${initials}`);
            return initials;
          }
        }
      }
      
      // Try standard AppCache
      if (window.AppCache && typeof window.AppCache.getItem === 'function') {
        initials = window.AppCache.getItem(cacheKey);
        if (initials) {
          logger.debug(`Got initials from AppCache: ${initials}`);
          return initials;
        }
      }
      
      logger.debug('No initials found in any AppCache mechanism');
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
      
      // Get tenant ID - important: handle the case where it might be null
      tenantId = getCurrentTenantId();
      
      if (!tenantId) {
        logger.warn('No tenant ID found - continuing with non-tenant-specific initials');
        // We'll still proceed without tenant ID, just won't have tenant-specific caching
      } else {
        logger.debug(`Operating with tenant ID: ${tenantId}`);
      }
      
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
        } else {
          logger.warn('Failed to update UI with cached initials, will try to generate new ones');
        }
      }
      
      // Get user info - try multiple times with exponential backoff
      let userData = null;
      let retryUserInfoCount = 0;
      const maxUserInfoRetries = 3;
      
      while (!userData && retryUserInfoCount < maxUserInfoRetries) {
        userData = await getUserInfo();
        
        if (!userData) {
          retryUserInfoCount++;
          if (retryUserInfoCount < maxUserInfoRetries) {
            const delay = Math.pow(2, retryUserInfoCount) * 500; // Exponential backoff: 500ms, 1000ms, 2000ms
            logger.warn(`Could not get user data, retry ${retryUserInfoCount}/${maxUserInfoRetries} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!userData) {
        logger.warn('Could not get user data after multiple attempts');
        
        // Try one more time later
        if (retryCount < config.retryOptions.maxRetries) {
          retryCount++;
          logger.debug(`Will retry the entire fix in ${config.retryOptions.retryInterval}ms (attempt ${retryCount}/${config.retryOptions.maxRetries})`);
          setTimeout(applyFix, config.retryOptions.retryInterval);
        } else {
          logger.error(`Max retries (${config.retryOptions.maxRetries}) reached, giving up`);
          // Try with default "U" as fallback
          updateUI('U');
        }
        
        return;
      }
      
      // Generate user initials
      const initials = generateInitials(userData);
      logger.debug(`Generated initials: ${initials}`);
      
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
        
        // Last desperate attempt - try with "U" as fallback
        try {
          updateUI('U');
          logger.warn('Applied fallback "U" initials after all retries failed');
        } catch (e) {
          logger.error('Even fallback initials failed', e);
        }
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