/**
 * Enhanced script to reset all redirect loop state
 * Also clears other application state that might be causing issues
 * 
 * To use in browser: Copy resetAllLoopState function and run in console
 * In Node.js: node scripts/reset-loops.js
 */

// This script would run in a browser context to clear all loop-related state
function resetAllLoopState() {
  console.log('🧹 Clearing all redirect loop and application state...');

  // Clear localStorage keys related to redirect loops
  console.log('📋 Clearing localStorage keys...');
  const localStorageKeysToRemove = [
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
    'amplify-signin-with-hostedUI',
    'CognitoIdentityServiceProvider',
    'aws.cognito.identity-id',
    
    // Business info keys
    'businessName',
    'businessType',
    'onboardingStep',
    'pendingBusinessInfo',
    'businessInfoTimestamp'
  ];

  let clearedCount = 0;
  localStorageKeysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      clearedCount++;
    } catch (err) {
      console.error(`Failed to remove localStorage key ${key}:`, err);
    }
  });
  console.log(`✅ Removed ${clearedCount} localStorage keys`);

  // Full localStorage clear - backup approach
  try {
    console.log('🗑️ Clearing all localStorage...');
    localStorage.clear();
    console.log('✅ All localStorage cleared');
  } catch (err) {
    console.error('❌ Failed to clear all localStorage:', err);
  }

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

  // Remove cookies that might be causing loops
  console.log('🍪 Clearing cookies...');
  const cookiesToReset = [
    'onboardedStatus',
    'onboardingStep',
    'authToken',
    'idToken',
    'refreshToken',
    'hasSession',
    'selectedPlan',
    'redirect_counter',
    'circuitBreakerActive',
    'businessName',
    'businessType',
    'pendingBusinessInfo'
  ];

  clearedCount = 0;
  cookiesToReset.forEach(cookieName => {
    try {
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax`;
      clearedCount++;
    } catch (err) {
      console.error(`Failed to reset cookie ${cookieName}:`, err);
    }
  });
  console.log(`✅ Removed ${clearedCount} cookies`);

  // Reset global window flags
  if (typeof window !== 'undefined') {
    console.log('🚩 Resetting global flags...');
    window.__REDIRECT_LOOP_DETECTED = false;
    window.__HARD_CIRCUIT_BREAKER = false;
    window.__LAST_REDIRECT_ERROR = null;
    console.log('✅ Global flags reset');
  }

  console.log('✨ Redirect loop state cleared!');
  console.log('➡️ Please navigate to: https://localhost:3000/auth/signin?noloop=true');
  
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

function resetAllLoopState() {
  console.log('🧹 Clearing all state...');
  
  try {
    // Clear localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = \`\${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax\`;
    });
    console.log('✅ cookies cleared');
    
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
   
5. Navigate to: https://localhost:3000/auth/signin?noloop=true

===============================================
`);

// If Node.js environment
if (typeof window === 'undefined') {
  console.log('This script provides instructions for resetting redirect loops in the browser.');
  console.log('Please run your development server with:');
  console.log('  ./reset-and-run.sh');
  console.log('Then open the browser and follow the instructions in the console.');
} 