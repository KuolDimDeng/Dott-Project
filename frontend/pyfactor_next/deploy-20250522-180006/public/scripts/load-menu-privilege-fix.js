/**
 * Menu Privilege Fix Loader
 * This script loads the menu privilege fixes dynamically and applies them.
 * It also applies the emergency menu visibility fix if available.
 */
(function() {
  const logger = {
    log: function(message) {
      console.log(`[MenuPrivilegeFixLoader] ${message}`);
    },
    error: function(message, error) {
      console.error(`[MenuPrivilegeFixLoader] ${message}`, error);
    }
  };

  logger.log('Initializing menu privilege fix loader');
  
  // Track if fix has been applied to prevent excessive calls
  let fixApplied = false;
  let lastFixTime = 0;
  const DEBOUNCE_DELAY = 2000; // 2 seconds minimum between fix applications

  // Function to load a script dynamically
  function loadScript(url, callback) {
    logger.log(`Loading script from: ${url}`);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;
    
    script.onload = function() {
      logger.log(`Script loaded successfully: ${url}`);
      if (callback) callback();
    };
    
    script.onerror = function(e) {
      logger.error(`Failed to load script: ${url}`, e);
    };
    
    document.head.appendChild(script);
  }

  // Function to apply menu privilege fix with debounce
  function applyMenuPrivilegeFix() {
    const currentTime = Date.now();
    
    // Debounce fix application to prevent excessive calls
    if (currentTime - lastFixTime < DEBOUNCE_DELAY) {
      logger.log('Skipping fix application (debounced)');
      return;
    }
    
    lastFixTime = currentTime;
    logger.log('Applying menu privilege fix');
    
    // Check if the fix script has been loaded
    if (window.applyMenuPrivilegeFixes) {
      logger.log('Using loaded fix script');
      window.applyMenuPrivilegeFixes();
      fixApplied = true;
    } else {
      logger.log('Fix script not loaded, applying hardcoded fix');
      applyHardcodedFix();
      fixApplied = true;
    }

    // Also apply emergency menu fix if available
    if (window.fixMenuNow) {
      logger.log('Applying emergency menu fix');
      window.fixMenuNow();
    }
  }

  // Hardcoded fix for specific tenant
  function applyHardcodedFix() {
    logger.log('Applying hardcoded fix');
    
    try {
      // Get the current tenant ID
      const appCache = JSON.parse(localStorage.getItem('app-cache') || '{}');
      const tenantId = appCache.tenant?.id;
      
      logger.log(`Current tenant ID: ${tenantId}`);
      
      // Check if this is the specific tenant we need to fix
      const targetTenantId = 'f25a8e7f-2b43-5798-ae3d-51d803089261';
      
      if (tenantId === targetTenantId) {
        logger.log('Target tenant found, applying fix');
        
        // Update the app cache to mark the user as business owner
        if (appCache.user) {
          appCache.user.isBusinessOwner = true;
          localStorage.setItem('app-cache', JSON.stringify(appCache));
          logger.log('Updated app cache to mark user as business owner');
          
          // Dispatch event to notify components
          window.dispatchEvent(new CustomEvent('app-cache-updated'));
          logger.log('Dispatched app-cache-updated event');
        } else {
          logger.error('User data not found in app cache');
        }
      }
    } catch (error) {
      logger.error('Error applying hardcoded fix', error);
    }
  }

  // Apply the fix once at startup
  applyHardcodedFix();
  
  // Load the fix script
  loadScript('/scripts/Version0001_fix_menu_privilege_owner_detection.js', function() {
    logger.log('Fix script loaded, applying fixes');
    if (!fixApplied) {
      applyMenuPrivilegeFix();
    }
  });

  // Also load the emergency menu fix if not already loaded
  if (!window.fixMenuNow) {
    loadScript('/scripts/emergency-menu-fix.js', function() {
      logger.log('Emergency menu fix loaded, applying fix');
      if (window.fixMenuNow) {
        window.fixMenuNow();
      }
    });
  }

  // Set up event listener for authentication changes
  window.addEventListener('user-authenticated', function() {
    logger.log('Authentication state changed, reapplying fix');
    applyMenuPrivilegeFix();
  });

  // Handle DOM ready state
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    logger.log('DOM already ready, applying fix');
    if (!fixApplied) {
      applyMenuPrivilegeFix();
    }
  } else {
    logger.log('Setting up DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', function() {
      logger.log('DOM loaded, applying fix');
      if (!fixApplied) {
        applyMenuPrivilegeFix();
      }
    });
  }

  // Re-apply fix on navigation (debounced)
  if (typeof window !== 'undefined' && window.history) {
    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      originalPushState.apply(this, arguments);
      logger.log('Navigation detected, reapplying fix after delay');
      setTimeout(applyMenuPrivilegeFix, 500);  // Apply after navigation completes
    };
  }
  
  // Expose apply function globally with debouncing
  window.reapplyMenuPrivilegeFix = function() {
    if (!fixApplied || (Date.now() - lastFixTime > DEBOUNCE_DELAY)) {
      applyMenuPrivilegeFix();
    } else {
      logger.log('Skipping manual reapply (fix already applied or debounced)');
    }
  };
  
  logger.log('Fix loader initialization complete');
})(); 