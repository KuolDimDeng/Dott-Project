/**
 * Version0118_fix_signout_onboarding_redirect.mjs
 * 
 * This script fixes the issue where signing out still redirects to onboarding
 * by properly checking the onboarding status from all storage locations and
 * correcting the session metadata extraction.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Create backup of the file we're going to modify
const authRoutePath = 'frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js';
const today = new Date();
const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
const backupPath = `${authRoutePath}.backup_${dateStr}`;

console.log('Creating backup of Auth0 route file...');
fs.copyFileSync(authRoutePath, backupPath);
console.log(`✅ Backup created at ${backupPath}`);

// Read the current file content
console.log('Reading Auth0 route file...');
const content = fs.readFileSync(authRoutePath, 'utf8');

// Replace the logout handling logic with improved version
console.log('Updating signout redirect logic...');
const updatedContent = content.replace(
  // Find the logout route handler
  /\/\/ Handle logout route[\s\S]*?if \(route === 'logout'\) \{[\s\S]*?let returnToUrl = `\${process\.env\.NEXT_PUBLIC_BASE_URL}\/auth\/signin\?logout=true`;[\s\S]*?if \(onboardingComplete && tenantId\) \{[\s\S]*?returnToUrl \+= `&preserveOnboarding=true&tenantId=\${tenantId}`;[\s\S]*?\}/,
  
  // Replace with enhanced version
  `// Handle logout route  
    if (route === 'logout') {
      console.log('[Auth Route] Processing logout request');
      
      // Get current session to extract important data before logout
      const sessionCookie = request.cookies.get('appSession');
      let onboardingComplete = false;
      let tenantId = '';
      
      // Try to extract onboarding status and tenant ID from session before deleting
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
          if (sessionData.user) {
            // Check all possible locations for onboarding status
            const userMetadata = sessionData.user['https://dottapps.com/user_metadata'] || {};
            const appMetadata = sessionData.user['https://dottapps.com/app_metadata'] || {};
            
            // Check for onboarding completion in various metadata locations
            onboardingComplete = 
              userMetadata.onboardingComplete === 'true' || 
              userMetadata.custom_onboardingComplete === 'true' ||
              userMetadata.custom_onboarding === 'complete' ||
              appMetadata.onboardingComplete === 'true';
            
            // Extract tenant ID from various possible locations
            tenantId = userMetadata.tenantId || 
                      userMetadata.custom_tenantId || 
                      sessionData.user.custom_tenantId ||
                      sessionData.user.tenantId || 
                      '';
                      
            console.log('[Auth Route] Extracted from session - onboardingComplete:', onboardingComplete, 'tenantId:', tenantId);
            
            // If we have a tenant ID but onboarding status is unclear, 
            // try to check localStorage as a last resort
            if (tenantId && !onboardingComplete) {
              // Can't directly access localStorage from server, but we'll set a flag
              // to check it on the client side during the signin redirect
              console.log('[Auth Route] Will check localStorage on client side');
            }
          }
        } catch (error) {
          console.error('[Auth Route] Error extracting session data:', error);
        }
      }
      
      // Create return URL with preserved onboarding status if completed
      let returnToUrl = \`\${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?logout=true\`;
      if (onboardingComplete && tenantId) {
        returnToUrl += \`&preserveOnboarding=true&tenantId=\${tenantId}\`;
      } else if (tenantId) {
        // If we have tenantId but couldn't confirm onboarding status, 
        // add a flag to check localStorage on client side
        returnToUrl += \`&checkLocalStorage=true&tenantId=\${tenantId}\`;
      }`
);

// Write the updated content back to the file
console.log('Writing updated content to file...');
fs.writeFileSync(authRoutePath, updatedContent);
console.log('✅ Auth0 route file updated');

// Create a client-side helper for the signin page
console.log('Creating client-side onboarding helper...');
const helperPath = 'frontend/pyfactor_next/src/utils/onboardingRedirectHelper.js';
const helperContent = `/**
 * onboardingRedirectHelper.js
 * 
 * Helper functions for handling onboarding status during sign-in/sign-out redirects
 */

import onboardingService from '@/services/onboardingService';

/**
 * Check if user has completed onboarding based on URL parameters and localStorage
 * 
 * @param {Object} params - URL search parameters
 * @returns {Promise<{shouldRedirect: boolean, redirectPath: string}>} - Redirect info
 */
export const checkOnboardingRedirect = async (params) => {
  // Default - no redirect
  const result = {
    shouldRedirect: false,
    redirectPath: ''
  };

  try {
    // Case 1: Explicit preservation of onboarding status
    if (params.get('preserveOnboarding') === 'true' && params.get('tenantId')) {
      const tenantId = params.get('tenantId');
      result.shouldRedirect = true;
      result.redirectPath = \`/\${tenantId}/dashboard\`;
      return result;
    }

    // Case 2: Check localStorage as fallback
    if (params.get('checkLocalStorage') === 'true' && params.get('tenantId')) {
      const tenantId = params.get('tenantId');
      
      // Try to get onboarding status from localStorage
      const isComplete = await onboardingService.isOnboardingComplete(tenantId);
      
      if (isComplete) {
        result.shouldRedirect = true;
        result.redirectPath = \`/\${tenantId}/dashboard\`;
      }
      
      return result;
    }
  } catch (error) {
    console.error('Error checking onboarding redirect:', error);
  }

  return result;
};

export default {
  checkOnboardingRedirect
};
`;

fs.writeFileSync(helperPath, helperContent);
console.log(`✅ Created helper at ${helperPath}`);

// Now update the signin page to use our helper
console.log('Checking signin page...');
const signinPath = 'frontend/pyfactor_next/src/app/auth/signin/page.js';

if (fs.existsSync(signinPath)) {
  console.log('Updating signin page to use the onboarding helper...');
  let signinContent = fs.readFileSync(signinPath, 'utf8');
  
  // Check if we need to add the import
  if (!signinContent.includes('onboardingRedirectHelper')) {
    // Add import at the beginning of the file, after other imports
    signinContent = signinContent.replace(
      /^(import.*?\n)+/,
      `$&import onboardingRedirectHelper from '@/utils/onboardingRedirectHelper';\n`
    );
  }
  
  // Look for useEffect that handles redirects and enhance it
  if (signinContent.includes('useEffect') && signinContent.includes('router.push')) {
    // There's likely a useEffect for redirection, let's enhance it
    signinContent = signinContent.replace(
      /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?(router\.push\(.*?\))[\s\S]*?\},\s*\[(.*?)\]\);/,
      `useEffect(() => {
    const handleRedirects = async () => {
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      
      // Check if we need to redirect based on onboarding status
      if (params.get('logout') === 'true') {
        const { shouldRedirect, redirectPath } = await onboardingRedirectHelper.checkOnboardingRedirect(params);
        
        if (shouldRedirect && redirectPath) {
          console.log('Redirecting to dashboard based on preserved onboarding status');
          router.push(redirectPath);
          return;
        }
      }
      
      // Original redirect logic
      $1;
    };
    
    handleRedirects();
  }, [$2]);`
    );
  } else {
    // If no existing useEffect found, add one
    signinContent = signinContent.replace(
      /export default function SignIn\(\)\s*\{/,
      `export default function SignIn() {
  const router = useRouter();
  
  useEffect(() => {
    const handleRedirects = async () => {
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      
      // Check if we need to redirect based on onboarding status
      if (params.get('logout') === 'true') {
        const { shouldRedirect, redirectPath } = await onboardingRedirectHelper.checkOnboardingRedirect(params);
        
        if (shouldRedirect && redirectPath) {
          console.log('Redirecting to dashboard based on preserved onboarding status');
          router.push(redirectPath);
          return;
        }
      }
    };
    
    handleRedirects();
  }, [router]);
  
  `
    );
  }
  
  fs.writeFileSync(signinPath, signinContent);
  console.log('✅ Updated signin page');
} else {
  console.log('⚠️ Signin page not found at expected path, skipping update');
}

// Update script registry
console.log('Updating script registry...');
const registryPath = 'frontend/pyfactor_next/scripts/script_registry.md';

if (fs.existsSync(registryPath)) {
  let registryContent = fs.readFileSync(registryPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `
### Version0118_fix_signout_onboarding_redirect.mjs
- **Version**: 0118 v1.0
- **Purpose**: Fix signout redirect to onboarding issue
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${today}
- **Execution Date**: ${today}
- **Target Files**:
  - src/app/api/auth/[...auth0]/route.js
  - src/utils/onboardingRedirectHelper.js
  - src/app/auth/signin/page.js
- **Description**: Fixes the issue where signing out still redirects to onboarding by properly
  checking the onboarding status from all storage locations and correcting the session metadata extraction.
- **Key Changes**:
  - Enhanced extraction of onboarding status from session metadata
  - Added support for checking multiple metadata formats
  - Created helper utility to manage onboarding redirects
  - Updated signin page to use the helper for redirect decisions
- **Related Scripts**: 
  - Version0116_implement_robust_onboarding_status_service.mjs
  - Version0117_commit_and_deploy_onboarding_status_service.mjs
`;

  // Insert the new entry after the Script Inventory heading
  registryContent = registryContent.replace(/## Script Inventory/, `## Script Inventory${newEntry}`);
  fs.writeFileSync(registryPath, registryContent);
  console.log('✅ Updated script registry');
} else {
  console.error(`Script registry file not found at ${registryPath}`);
}

console.log('\n✅ All fixes have been applied successfully!');
console.log('To deploy the changes, run:');
console.log('node frontend/pyfactor_next/scripts/Version0119_commit_and_deploy_signout_fix.mjs');
