/**
 * Browser Environment Polyfill
 * Provides minimal polyfills for browser environment compatibility
 */

(function() {
  console.log('[BrowserEnvPolyfill] Initializing polyfill');
  
  // Create a global error handler to prevent crashes
  window.addEventListener('error', function(event) {
    console.warn('[BrowserEnvPolyfill] Caught unhandled error:', event.error);
    event.preventDefault();
    return true;
  });
  
  // Prevent excessive reloads
  let reloadCount = parseInt(sessionStorage.getItem('reloadCount') || '0');
  if (reloadCount > 3) {
    console.warn('[BrowserEnvPolyfill] Preventing excessive reloads');
    window.onbeforeunload = function() {
      return "The page is trying to reload too many times. Stay on this page?";
    };
  } else {
    sessionStorage.setItem('reloadCount', (reloadCount + 1).toString());
  }
  
  console.log('[BrowserEnvPolyfill] Polyfill initialized successfully');
})();
