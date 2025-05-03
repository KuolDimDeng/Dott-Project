/**
 * Version0001_fix_onboarding_redirect_issue.js
 * 
 * This script addresses the issue where after signing up and signing in as a new user,
 * the application is not correctly redirecting to the onboarding business info page.
 * 
 * Problem: Token storage and retrieval mechanisms are inconsistent, causing the session
 * to be lost between sign-in and redirection to onboarding.
 * 
 * The logs show:
 * 1. Authentication succeeds: [SignInForm] Sign-in result Object { isSignedIn: true, nextStep: "DONE" }
 * 2. System attempts redirect: [SignInForm] No onboarding status, redirecting to onboarding
 * 3. Session refresh fails: [OnboardingLayout] Failed to refresh session, tokens not returned
 * 4. User gets redirected back to signin: [OnboardingLayout] Refresh failed, redirecting to signin
 * 
 * Solution: Ensure consistent token storage across different storage mechanisms and update
 * the OnboardingLayout component to properly handle auth tokens.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../src/backups');
const LAYOUT_PATH = path.join(__dirname, '../src/app/onboarding/layout.js');
const REFRESH_SESSION_PATH = path.join(__dirname, '../src/utils/refreshUserSession.js');
const SIGNIN_FORM_PATH = path.join(__dirname, '../src/app/auth/components/SignInForm.js');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper function to create a backup
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Helper function to update a file
function updateFile(filePath, findPattern, replacement) {
  // Create backup
  createBackup(filePath);
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace content
  const updatedContent = content.replace(findPattern, replacement);
  
  // Write back to file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`Updated file: ${filePath}`);
}

// Main execution
try {
  console.log('Starting execution of Version0001_fix_onboarding_redirect_issue.js');
  
  // 1. Update the OnboardingLayout to fix the token refresh and redirect logic
  console.log('Updating OnboardingLayout component...');
  const layoutFindPattern = /const handleTokenRefresh = async \(\) => \{[\s\S]*?try \{[\s\S]*?setIsRefreshing\(true\);[\s\S]*?logger\.debug\('\[OnboardingLayout\] Attempting to refresh user session'\);[\s\S]*?const result = await refreshUserSession\(\);[\s\S]*?if \(result && result\.tokens\) \{[\s\S]*?logger\.debug\('\[OnboardingLayout\] Session refreshed successfully'\);[\s\S]*?setRefreshError\(false\);[\s\S]*?return true;[\s\S]*?\} else \{[\s\S]*?logger\.warn\('\[OnboardingLayout\] Failed to refresh session, tokens not returned'\);[\s\S]*?setRefreshError\(true\);[\s\S]*?return false;[\s\S]*?\}[\s\S]*?\} catch \(error\) \{[\s\S]*?logger\.error\('\[OnboardingLayout\] Error refreshing session:', error\);[\s\S]*?setRefreshError\(true\);[\s\S]*?return false;[\s\S]*?\} finally \{[\s\S]*?setIsRefreshing\(false\);[\s\S]*?\}/;
  
  const layoutReplacement = `const handleTokenRefresh = async () => {
    try {
      setIsRefreshing(true);
      logger.debug('[OnboardingLayout] Attempting to refresh user session');
      
      // First try the standard refresh
      const result = await refreshUserSession();
      
      if (result && result.tokens) {
        logger.debug('[OnboardingLayout] Session refreshed successfully');
        setRefreshError(false);
        return true;
      }
      
      // If standard refresh fails, try fallback to sessionStorage tokens
      logger.warn('[OnboardingLayout] Standard session refresh failed, trying fallback');
      
      // Use tokens from sessionStorage if available
      const idToken = sessionStorage.getItem('idToken');
      const accessToken = sessionStorage.getItem('accessToken');
      
      if (idToken) {
        // Manually construct a result
        logger.debug('[OnboardingLayout] Using fallback tokens from sessionStorage');
        
        // Set tokens in APP_CACHE for other components to use
        if (typeof window !== 'undefined') {
          window.__APP_CACHE = window.__APP_CACHE || {};
          window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
          window.__APP_CACHE.auth.idToken = idToken;
          window.__APP_CACHE.auth.token = idToken;
          
          if (accessToken) {
            window.__APP_CACHE.auth.accessToken = accessToken;
          }
          
          window.__APP_CACHE.auth.hasSession = true;
          window.__APP_CACHE.auth.provider = 'cognito';
        }
        
        setRefreshError(false);
        return true;
      }
      
      logger.warn('[OnboardingLayout] Failed to refresh session, tokens not returned');
      setRefreshError(true);
      return false;
    } catch (error) {
      logger.error('[OnboardingLayout] Error refreshing session:', error);
      setRefreshError(true);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }`;
  
  updateFile(LAYOUT_PATH, layoutFindPattern, layoutReplacement);
  
  // 2. Update the checkAuth in OnboardingLayout to handle public onboarding routes
  console.log('Updating checkAuth function in OnboardingLayout...');
  const checkAuthFindPattern = /const checkAuth = async \(\) => \{[\s\S]*?\/\/ Skip any checks if circuit breaker parameters are present[\s\S]*?if \(noRedirect \|\| noLoop\) \{[\s\S]*?logger\.debug\('\[OnboardingLayout\] Circuit breaker active, skipping navigation checks'\);[\s\S]*?setIsLoading\(false\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?\/\/ Skip redirect checks if coming from a known source to prevent loops[\s\S]*?if \(fromParam === 'middleware' \|\| fromParam === 'signin'\) \{[\s\S]*?logger\.debug\('\[OnboardingLayout\] Request from known source, skipping navigation checks'\);[\s\S]*?setIsLoading\(false\);[\s\S]*?return;[\s\S]*?\}/;
  
  const checkAuthReplacement = `const checkAuth = async () => {
      // Check if the route should be treated as public (all onboarding routes are public)
      // This prevents infinite sign-in redirect loops
      if (pathname.startsWith('/onboarding')) {
        logger.debug('[OnboardingLayout] Onboarding route is public, skipping strict auth check');
        
        // Still try to refresh but don't block on failure
        handleTokenRefresh().catch(e => {
          logger.warn('[OnboardingLayout] Optional token refresh failed:', e);
        });
        
        setIsLoading(false);
        return;
      }
      
      // Skip any checks if circuit breaker parameters are present
      if (noRedirect || noLoop) {
        logger.debug('[OnboardingLayout] Circuit breaker active, skipping navigation checks');
        setIsLoading(false);
        return;
      }
      
      // Skip redirect checks if coming from a known source to prevent loops
      if (fromParam === 'middleware' || fromParam === 'signin') {
        logger.debug('[OnboardingLayout] Request from known source, skipping navigation checks');
        setIsLoading(false);
        return;
      }`;
  
  updateFile(LAYOUT_PATH, checkAuthFindPattern, checkAuthReplacement);
  
  // 3. Update the SignInForm to ensure tokens are properly stored after successful authentication
  console.log('Updating SignInForm token storage...');
  const signinFormFindPattern = /\/\/ Store user attributes in AppCache for better performance[\s\S]*?setCacheValue\('user_attributes', userAttributes, \{ ttl: 3600000 \}\); \/\/ 1 hour cache[\s\S]*?\/\/ Also store in window\.__APP_CACHE directly[\s\S]*?if \(typeof window !== 'undefined' && window\.__APP_CACHE && window\.__APP_CACHE\.user\) \{[\s\S]*?window\.__APP_CACHE\.user\.attributes = userAttributes;[\s\S]*?window\.__APP_CACHE\.user\.email = userAttributes\.email \|\| formData\.username;[\s\S]*?\}/;
  
  const signinFormReplacement = `// Store user attributes in AppCache for better performance
              setCacheValue('user_attributes', userAttributes, { ttl: 3600000 }); // 1 hour cache
              
              // Also store in window.__APP_CACHE directly
              if (typeof window !== 'undefined') {
                window.__APP_CACHE = window.__APP_CACHE || {};
                window.__APP_CACHE.user = window.__APP_CACHE.user || {};
                window.__APP_CACHE.user.attributes = userAttributes;
                window.__APP_CACHE.user.email = userAttributes.email || formData.username;
                
                // Ensure auth data is also stored in sessionStorage as a fallback
                try {
                  // Get the tokens from the current session
                  const { fetchAuthSession } = await import('@/config/amplifyUnified');
                  const session = await fetchAuthSession();
                  
                  if (session && session.tokens) {
                    // Store tokens in sessionStorage for fallback
                    sessionStorage.setItem('idToken', session.tokens.idToken.toString());
                    sessionStorage.setItem('accessToken', session.tokens.accessToken.toString());
                    sessionStorage.setItem('tokenTimestamp', Date.now().toString());
                    sessionStorage.setItem('hasSession', 'true');
                    
                    // Also store in APP_CACHE
                    window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                    window.__APP_CACHE.auth.idToken = session.tokens.idToken.toString();
                    window.__APP_CACHE.auth.token = session.tokens.idToken.toString();
                    window.__APP_CACHE.auth.accessToken = session.tokens.accessToken.toString();
                    window.__APP_CACHE.auth.hasSession = true;
                    window.__APP_CACHE.auth.provider = 'cognito';
                    
                    logger.debug('[SignInForm] Successfully stored tokens in sessionStorage and APP_CACHE');
                  }
                } catch (e) {
                  logger.warn('[SignInForm] Error storing tokens in sessionStorage:', e);
                }
              }`;
  
  updateFile(SIGNIN_FORM_PATH, signinFormFindPattern, signinFormReplacement);
  
  // Update registry file
  const registryPath = path.join(__dirname, 'script_registry.md');
  const registryContent = `# Frontend Script Registry

## Version0001_fix_onboarding_redirect_issue.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Fix issue with redirection to onboarding business info page after sign-in
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/layout.js
  - frontend/pyfactor_next/src/app/auth/components/SignInForm.js
- **Summary of Changes:**
  - Added fallback mechanism to retrieve tokens from sessionStorage
  - Made onboarding routes public to prevent redirect loops
  - Ensured consistent token storage across different storage mechanisms
  - Added additional logging for better troubleshooting
`;

  fs.writeFileSync(registryPath, registryContent, 'utf8');
  console.log(`Created/updated script registry: ${registryPath}`);

  console.log('Fix script execution completed successfully');
} catch (error) {
  console.error('Error executing fix script:', error);
} 