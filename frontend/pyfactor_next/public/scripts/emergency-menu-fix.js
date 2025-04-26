/**
 * Emergency Menu Fix Script
 * 
 * This script directly addresses the issue where tenant owners cannot see
 * the main list menu in the dashboard. It patches the hasMenuAccess function
 * and updates tenant ownership status in local storage.
 * 
 * Specific fix for tenant ID: f25a8e7f-2b43-5798-ae3d-51d803089261
 * Owner ID: 84e86428-5071-70f3-4776-1e7ca659bc57
 */

(function() {
  // Create a logger to track execution
  const logger = {
    log: function(message) {
      console.log(`[EmergencyMenuFix] ${message}`);
    },
    error: function(message, error) {
      console.error(`[EmergencyMenuFix] ${message}`, error);
    }
  };

  logger.log('Script loaded');

  // Constants
  const TARGET_TENANT_ID = 'f25a8e7f-2b43-5798-ae3d-51d803089261';
  const TARGET_OWNER_ID = '84e86428-5071-70f3-4776-1e7ca659bc57';
  
  // Cache helpers
  function getFromCache(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      logger.error('Error getting from cache', e);
      return null;
    }
  }

  function setInCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      logger.error('Error setting in cache', e);
    }
  }

  // Function to apply the emergency fix
  function applyEmergencyFix() {
    logger.log('Applying emergency fix...');
    
    // Get current user and tenant information from local storage
    const currentTenant = getFromCache('currentTenant');
    const currentUser = getFromCache('currentUser');
    
    if (!currentTenant || !currentUser) {
      logger.log('User or tenant information not available yet');
      return false;
    }
    
    logger.log(`Current tenant ID: ${currentTenant.id}`);
    logger.log(`Current user ID: ${currentUser.id}`);
    
    // Only apply fix for the specific tenant
    if (currentTenant.id === TARGET_TENANT_ID) {
      logger.log('Target tenant found, applying fix');
      
      // 1. Update business role in currentUser if this is the owner
      if (currentUser.id === TARGET_OWNER_ID) {
        logger.log('Owner match found, updating business role');
        
        // Ensure businessRole is set to 'owner'
        if (!currentUser.businessRole || currentUser.businessRole !== 'owner') {
          currentUser.businessRole = 'owner';
          setInCache('currentUser', currentUser);
          logger.log('Updated user business role to owner');
        }
        
        // Ensure menu privileges include all items
        const userMenuPrivileges = getFromCache('userMenuPrivileges') || {};
        const updatedPrivileges = {
          ...userMenuPrivileges,
          hasAccess: true,
          // Add any specific menu items that should be accessible
          menuItems: {
            dashboard: true,
            settings: true,
            reports: true,
            users: true,
            billing: true,
            // Add other menu items as needed
          }
        };
        
        setInCache('userMenuPrivileges', updatedPrivileges);
        logger.log('Updated user menu privileges');
        
        // Dispatch an event to notify components of the change
        const event = new CustomEvent('appCacheUpdated', { 
          detail: { key: 'userMenuPrivileges' } 
        });
        window.dispatchEvent(event);
        
        return true;
      }
    }
    
    return false;
  }

  // Patch the hasMenuAccess function that might be used by the application
  function patchHasMenuAccess() {
    logger.log('Attempting to patch hasMenuAccess function');
    
    // Wait for app to be ready
    const checkForApp = setInterval(() => {
      if (window.pyfactorApp) {
        clearInterval(checkForApp);
        logger.log('App found, patching hasMenuAccess');
        
        // Store the original function if it exists
        const originalHasMenuAccess = window.pyfactorApp.hasMenuAccess;
        
        // Replace with our patched version
        window.pyfactorApp.hasMenuAccess = function(menuKey) {
          const currentTenant = getFromCache('currentTenant');
          const currentUser = getFromCache('currentUser');
          
          // For our specific tenant and owner, always return true
          if (currentTenant && currentTenant.id === TARGET_TENANT_ID && 
              currentUser && currentUser.id === TARGET_OWNER_ID) {
            logger.log(`Granting access to menu: ${menuKey}`);
            return true;
          }
          
          // Fall back to original behavior
          return originalHasMenuAccess ? originalHasMenuAccess(menuKey) : true;
        };
        
        logger.log('Successfully patched hasMenuAccess function');
      }
    }, 500);
    
    // Safety timeout after 30 seconds
    setTimeout(() => clearInterval(checkForApp), 30000);
  }

  // Function to check auth status and apply fix
  function checkAndApplyFix() {
    const isLoggedIn = !!getFromCache('isLoggedIn');
    
    if (isLoggedIn) {
      logger.log('User is logged in, checking conditions for fix');
      const result = applyEmergencyFix();
      if (result) {
        logger.log('Emergency fix successfully applied');
      }
    } else {
      logger.log('User not logged in yet');
    }
  }

  // Set up event listeners
  window.addEventListener('storage', function(e) {
    if (['currentUser', 'currentTenant', 'isLoggedIn'].includes(e.key)) {
      logger.log(`Storage changed for ${e.key}, rechecking fix`);
      checkAndApplyFix();
    }
  });
  
  // Listen for authentication state changes
  window.addEventListener('authStateChange', function() {
    logger.log('Auth state changed, rechecking fix');
    checkAndApplyFix();
  });
  
  // Listen for app cache updates
  window.addEventListener('appCacheUpdated', function(e) {
    logger.log(`App cache updated: ${e.detail.key}`);
    if (['currentUser', 'currentTenant'].includes(e.detail.key)) {
      checkAndApplyFix();
    }
  });

  // Check if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    logger.log('DOM already loaded, applying fix immediately');
    checkAndApplyFix();
    patchHasMenuAccess();
  } else {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
      logger.log('DOM loaded, applying fix');
      checkAndApplyFix();
      patchHasMenuAccess();
    });
  }
  
  // Also apply immediately in case we're loaded after DOM ready
  checkAndApplyFix();
  patchHasMenuAccess();
  
  logger.log('Emergency menu fix initialization complete');
})(); 