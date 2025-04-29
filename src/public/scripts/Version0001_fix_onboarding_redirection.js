/**
 * Fix Onboarding Redirection Issue - Version 0001
 * 
 * This script fixes an issue where users are not properly redirected to the
 * onboarding/business-info page after signing up and signing in.
 * 
 * The issue occurs because:
 * 1. The session refresh is failing in the OnboardingLayout component
 * 2. The APP_CACHE is not properly storing authentication tokens
 * 3. The route is treated as public but auth check is failing
 */

(function() {
  console.log('[Onboarding Fix] Starting fix for onboarding redirection issue...');
  
  // Fix 1: Ensure global APP_CACHE is properly initialized
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
  window.__APP_CACHE.auth.provider = 'cognito'; // Ensure provider is set
  
  // Fix 2: Enhance token storage for onboarding access
  const enhanceTokenStorage = () => {
    // Store original setItem to use for our enhancements
    const originalSetItem = sessionStorage.setItem;
    
    // Override sessionStorage.setItem to capture auth tokens
    sessionStorage.setItem = function(key, value) {
      // Call original implementation
      originalSetItem.apply(this, arguments);
      
      // Handle specific auth-related keys for our APP_CACHE
      if (key === 'idToken' || key === 'token') {
        window.__APP_CACHE.auth.idToken = value;
        window.__APP_CACHE.auth.token = value;
        console.log(`[Onboarding Fix] Captured ${key} in APP_CACHE`);
      }
      
      if (key === 'accessToken') {
        window.__APP_CACHE.auth.accessToken = value;
        console.log('[Onboarding Fix] Captured accessToken in APP_CACHE');
      }
      
      if (key === 'userId') {
        window.__APP_CACHE.auth.userId = value;
        console.log('[Onboarding Fix] Captured userId in APP_CACHE');
      }
      
      if (key === 'hasSession') {
        window.__APP_CACHE.auth.hasSession = value === 'true';
        console.log('[Onboarding Fix] Captured hasSession in APP_CACHE');
      }
      
      if (key === 'tokenExpiry') {
        window.__APP_CACHE.auth.tokenExpiry = value;
        console.log('[Onboarding Fix] Captured tokenExpiry in APP_CACHE');
      }
      
      if (key === 'onboarding_status') {
        if (!window.__APP_CACHE.onboarding) {
          window.__APP_CACHE.onboarding = {};
        }
        window.__APP_CACHE.onboarding.status = value;
        console.log('[Onboarding Fix] Captured onboarding_status in APP_CACHE');
      }
    };
    
    console.log('[Onboarding Fix] Enhanced token storage mechanism');
  };
  
  // Fix 3: Patch the authentication check in OnboardingLayout
  const patchOnboardingLayout = () => {
    // Wait for layout component to load
    const checkForLayout = setInterval(() => {
      const layoutElement = document.querySelector('[data-component="onboarding-layout"]');
      if (layoutElement) {
        clearInterval(checkForLayout);
        
        // Set a data attribute to prevent infinite refresh attempts
        layoutElement.setAttribute('data-refresh-fixed', 'true');
        
        // Set fake auth tokens in APP_CACHE if not present but we have them in sessionStorage
        if (!window.__APP_CACHE.auth.idToken) {
          const idToken = sessionStorage.getItem('idToken');
          if (idToken) {
            window.__APP_CACHE.auth.idToken = idToken;
            window.__APP_CACHE.auth.token = idToken;
            window.__APP_CACHE.auth.hasSession = true;
            console.log('[Onboarding Fix] Restored idToken from sessionStorage to APP_CACHE');
          }
        }
        
        console.log('[Onboarding Fix] Onboarding layout patched');
      }
    }, 500);
    
    // Only run for maximum 10 seconds
    setTimeout(() => clearInterval(checkForLayout), 10000);
  };
  
  // Fix 4: Monitor and correct route protection
  const enhanceRouteProtection = () => {
    // Add special handling for onboarding URLs when checking if route is public
    const originalIsPublicRoute = window.isPublicRoute || function() { return false; };
    
    window.isPublicRoute = function(pathname) {
      // Always treat onboarding routes as public for authentication purposes
      if (pathname && pathname.startsWith('/onboarding')) {
        console.log(`[Onboarding Fix] Treating ${pathname} as public for auth purposes`);
        return true;
      }
      
      // Otherwise use the original implementation
      return originalIsPublicRoute(pathname);
    };
    
    // Patch the auth tokens refresh mechanism
    const originalRefreshUserSession = window.refreshUserSession;
    if (originalRefreshUserSession) {
      window.refreshUserSession = async function() {
        try {
          const result = await originalRefreshUserSession();
          return result;
        } catch (error) {
          console.warn('[Onboarding Fix] Session refresh failed, applying fallback:', error);
          
          // If we have tokens in sessionStorage but not in APP_CACHE, restore them
          const idToken = sessionStorage.getItem('idToken');
          const accessToken = sessionStorage.getItem('accessToken');
          
          if (idToken && !window.__APP_CACHE.auth.idToken) {
            window.__APP_CACHE.auth.idToken = idToken;
            window.__APP_CACHE.auth.token = idToken;
            window.__APP_CACHE.auth.hasSession = true;
            
            if (accessToken) {
              window.__APP_CACHE.auth.accessToken = accessToken;
            }
            
            console.log('[Onboarding Fix] Applied token fallback from sessionStorage');
            return { tokens: { idToken, accessToken } };
          }
          
          throw error;
        }
      };
    }
    
    console.log('[Onboarding Fix] Enhanced route protection');
  };
  
  // Execute fixes
  enhanceTokenStorage();
  patchOnboardingLayout();
  enhanceRouteProtection();
  
  // Apply onboarding route fix - mark onboarding routes as public
  if (window.authUtils && window.authUtils.isRoutePublic) {
    const originalIsRoutePublic = window.authUtils.isRoutePublic;
    
    window.authUtils.isRoutePublic = function(route) {
      // Explicitly treat onboarding routes as public
      if (route && route.startsWith('/onboarding')) {
        console.log(`[authUtils] Route ${route} is treated as public for redirection purposes`);
        return true;
      }
      
      return originalIsRoutePublic(route);
    };
    
    console.log('[Onboarding Fix] Patched authUtils.isRoutePublic');
  }
  
  // Fix automatic redirection after sign-in
  const patchSignInRedirection = () => {
    // The onboarding status will be stored in cookie and APP_CACHE after sign-in
    // If these values are not set properly, we need to check Cognito attributes
    const checkForRedirect = () => {
      // First check if we're already on an onboarding page
      if (window.location.pathname.includes('/onboarding')) {
        return;
      }
      
      // Check if the user has just signed in and needs onboarding
      const hasJustSignedIn = sessionStorage.getItem('just_signed_in') === 'true';
      const onboardingStatus = window.__APP_CACHE?.onboarding?.status || sessionStorage.getItem('onboarding_status');
      const setupDone = window.__APP_CACHE?.onboarding?.completed === true || sessionStorage.getItem('setup_done') === 'true';
      
      if (hasJustSignedIn && !setupDone && (!onboardingStatus || onboardingStatus !== 'complete')) {
        console.log('[Onboarding Fix] Detected new sign-in needing onboarding, redirecting to business-info');
        window.location.href = '/onboarding/business-info?from=signin-fix';
      }
    };
    
    // Run the check after a short delay to allow other scripts to initialize
    setTimeout(checkForRedirect, 1000);
  };
  
  // Execute sign-in redirection fix
  patchSignInRedirection();
  
  console.log('[Onboarding Fix] Fix script completed');
})(); 