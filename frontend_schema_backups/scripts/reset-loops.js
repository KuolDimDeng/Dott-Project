/**
 * Enhanced script to reset all redirect loop state
 * Also clears other application state that might be causing issues
 * Uses AWS AppCache and Cognito instead of cookies and localStorage
 * 
 * To use in browser: Copy resetAllLoopState function and run in console
 * In Node.js: node scripts/reset-loops.js
 */

// This script would run in a browser context to clear all loop-related state
function resetAllLoopState() {
  console.log('🧹 Clearing all redirect loop and application state...');

  // Clear AppCache instead of localStorage
  console.log('📋 Clearing AppCache keys...');
  const keysToRemove = [
    // Redirect loop keys
    'redirect_loop_count',
    'signin_redirect_counter',
    'noRedirectToSignin',
    'preventSigninRedirects',
    'preventAllRedirects',
    'lastRedirectPath',
    'loopDetected',
    'signin_attempts',
    'client_redirect_count',
    'business_auth_errors',
    'business_info_auth_errors',
    
    // Authentication keys
    'idToken',
    'accessToken',
    'refreshToken',
    'authUser',
    
    // Business info keys
    'businessName',
    'businessType',
    'onboardingStep',
    'pendingBusinessInfo',
    'businessInfoTimestamp'
  ];

  let clearedCount = 0;
  // Use modern async IIFE pattern to handle async AppCache operations
  (async () => {
    try {
      // First, try to load the appCacheUtils module dynamically
      const appCacheModule = await import('/utils/appCacheUtils.js').catch(() => null);
      
      if (appCacheModule) {
        const { removeFromAppCache, clearAppCache } = appCacheModule;
        
        // Try clearing individual keys first
        if (typeof removeFromAppCache === 'function') {
          for (const key of keysToRemove) {
            try {
              await removeFromAppCache(key);
              clearedCount++;
            } catch (err) {
              console.error(`Failed to remove AppCache key ${key}:`, err);
            }
          }
          console.log(`✅ Removed ${clearedCount} AppCache keys`);
        }
        
        // Then try clearing all AppCache
        if (typeof clearAppCache === 'function') {
          console.log('🗑️ Clearing all AppCache...');
          await clearAppCache();
          console.log('✅ All AppCache cleared');
        }
      } else {
        // Fallback to localStorage if appCacheUtils is not available
        console.log('⚠️ AppCache module not available, falling back to localStorage');
        localStorage.clear();
        console.log('✅ localStorage cleared as fallback');
      }
    } catch (err) {
      console.error('❌ Failed to clear AppCache:', err);
      // Fallback to localStorage
      try {
        localStorage.clear();
        console.log('✅ localStorage cleared as fallback after error');
      } catch (fallbackErr) {
        console.error('❌ Failed to clear localStorage fallback:', fallbackErr);
      }
    }
  })();

  // Clear sessionStorage keys related to redirect loops
  console.log('📋 Clearing sessionStorage keys...');
  const sessionStorageKeysToRemove = [
    'signinRedirectTime',
    'lastRedirectPath',
    'loopDetected',
    'preventAuthRedirect',
    'lastAuthError'
  ];

  clearedCount = 0;
  sessionStorageKeysToRemove.forEach(key => {
    try {
      sessionStorage.removeItem(key);
      clearedCount++;
    } catch (err) {
      console.error(`Failed to remove sessionStorage key ${key}:`, err);
    }
  });
  console.log(`✅ Removed ${clearedCount} sessionStorage keys`);

  // Full sessionStorage clear - backup approach
  try {
    console.log('🗑️ Clearing all sessionStorage...');
    sessionStorage.clear();
    console.log('✅ All sessionStorage cleared');
  } catch (err) {
    console.error('❌ Failed to clear all sessionStorage:', err);
  }

  // Reset global window flags
  if (typeof window !== 'undefined') {
    console.log('🚩 Resetting global flags...');
    window.__REDIRECT_LOOP_DETECTED = false;
    window.__HARD_CIRCUIT_BREAKER = false;
    window.__LAST_REDIRECT_ERROR = null;
    console.log('✅ Global flags reset');
  }

  console.log('✨ Redirect loop state cleared!');
  console.log('➡️ Please navigate to: http://localhost:3000/auth/signin?noloop=true');
  
  return '✅ State reset complete - navigate to /auth/signin?noloop=true';
}

// Function to be pasted in browser console
console.log(`
===============================================
🔄 RESET ALL REDIRECT LOOP STATE 🔄
===============================================

To reset redirect loops:

1. Open browser developer tools (F12 or Cmd+Opt+I)
2. Go to the Console tab
3. Copy and paste this function:

async function resetAllLoopState() {
  console.log('🧹 Clearing all state...');
  
  try {
    // Clear AWS AppCache (if available)
    try {
      const { clearAppCache } = await import('/utils/appCacheUtils.js');
      await clearAppCache();
      console.log('✅ AWS AppCache cleared');
    } catch (err) {
      console.log('⚠️ Could not load AppCache module, falling back to localStorage');
      localStorage.clear();
      console.log('✅ localStorage cleared as fallback');
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Reset global flags
    window.__REDIRECT_LOOP_DETECTED = false;
    window.__HARD_CIRCUIT_BREAKER = false;
    
    console.log('✨ All state cleared!');
    return '✅ Reset complete - navigate to /auth/signin?noloop=true';
  } catch (err) {
    console.error('❌ Error during reset:', err);
    return '❌ Reset failed';
  }
}

4. Then call the function by typing:
   resetAllLoopState()
   
5. Navigate to: http://localhost:3000/auth/signin?noloop=true

===============================================
`);

// If Node.js environment
if (typeof window === 'undefined') {
  console.log('This script provides instructions for resetting redirect loops in the browser.');
  console.log('Please run your development server with:');
  console.log('  ./reset-and-run.sh');
  console.log('Then open the browser and follow the instructions in the console.');
} 