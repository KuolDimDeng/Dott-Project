/**
 * Version0158_fix_free_plan_redirect.mjs
 * 
 * This script fixes an issue where selecting the Free plan in the subscription form
 * redirects to /dashboard instead of /tenant/{tenantId}/dashboard
 * 
 * The issue is in the handleFreePlanSelection function where:
 * 1. There's a missing expiresDate definition when setting cookies
 * 2. The tenant ID retrieval logic needs to be improved
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const subscriptionFormPath = path.join(__dirname, '../src/components/Onboarding/SubscriptionForm.jsx');
const backupPath = `${subscriptionFormPath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

// Backup the original file
console.log(`Creating backup of SubscriptionForm.jsx...`);
fs.copyFileSync(subscriptionFormPath, backupPath);
console.log(`✅ Backup created at ${backupPath}`);

// Read the file content
console.log(`Reading SubscriptionForm.jsx...`);
let content = fs.readFileSync(subscriptionFormPath, 'utf8');

// Fix 1: Missing expiresDate in handleFreePlanSelection function
console.log(`Fixing missing expiresDate definition in handleFreePlanSelection...`);
const handleFreePlanSelectionRegex = /const handleFreePlanSelection = async \(\) => \{[\s\S]*?\/\/ Set cookies for free plan[\s\S]*?document\.cookie = [^;]+;/g;
const cookieSetSection = content.match(handleFreePlanSelectionRegex);

if (cookieSetSection) {
  // Add expiresDate definition before setting cookies
  const fixedCookieSection = cookieSetSection[0].replace(
    '// Set cookies for free plan',
    '// Set cookies for free plan\n      const expiresDate = new Date();\n      expiresDate.setFullYear(expiresDate.getFullYear() + 1);'
  );
  content = content.replace(handleFreePlanSelectionRegex, fixedCookieSection);
}

// Fix 2: Improve tenant ID retrieval and redirection logic
console.log(`Enhancing tenant ID retrieval logic...`);
const tenantRedirectRegex = /\/\/ If we couldn't get tenant ID from Cognito, try AppCache[\s\S]*?window\.location\.href = [^;]+;/g;
const tenantRedirectSection = content.match(tenantRedirectRegex);

if (tenantRedirectSection) {
  const improvedTenantLogic = `// If we couldn't get tenant ID from Cognito, try AppCache
    if (!tenantId || !isValidUUID(tenantId)) {
      // Try to get tenant ID from AppCache
      const appCache = typeof window !== 'undefined' ? (window.__APP_CACHE || {}) : {};
      const tenant = appCache.tenant || {};
      
      if (tenant.id && isValidUUID(tenant.id)) {
        tenantId = tenant.id;
        logger.debug('[SubscriptionForm] Using tenant ID from AppCache:', tenantId);
      } else {
        // Try localStorage as last resort
        try {
          const localTenantId = localStorage.getItem('tenantId');
          if (localTenantId && isValidUUID(localTenantId)) {
            tenantId = localTenantId;
            logger.debug('[SubscriptionForm] Using tenant ID from localStorage:', tenantId);
          }
        } catch (storageError) {
          logger.warn('[SubscriptionForm] Error accessing localStorage:', storageError);
        }
      }
      
      // If we still don't have a valid tenant ID, log and redirect without it
      if (!tenantId || !isValidUUID(tenantId)) {
        logger.warn('[SubscriptionForm] No valid tenant ID found, redirecting to dashboard without tenant path');
        window.location.href = \`/dashboard?newAccount=true&plan=free&freePlan=true&missingTenant=true\`;
        return;
      }
    }
    
    // Log the final destination for debugging
    logger.debug('[SubscriptionForm] Redirecting to dashboard with tenant ID:', tenantId);
    
    // Redirect with tenant ID if we have it
    window.location.href = \`/tenant/\${tenantId}/dashboard?newAccount=true&plan=free&freePlan=true\`;`;
  
  content = content.replace(tenantRedirectRegex, improvedTenantLogic);
}

// Fix 3: Add expiresDate to the handleContinue function as well for consistency
console.log(`Ensuring expiresDate is defined in handleContinue...`);
const handleContinueRegex = /const handleContinue = async \(\) => \{[\s\S]*?document\.cookie = [^;]+;/g;
const handleContinueSection = content.match(handleContinueRegex);

if (handleContinueSection) {
  // Check if expiresDate is already defined
  if (!handleContinueSection[0].includes('expiresDate')) {
    // Add expiresDate definition before setting cookies
    const fixedHandleContinue = handleContinueSection[0].replace(
      'document.cookie =', 
      'const expiresDate = new Date();\n        expiresDate.setFullYear(expiresDate.getFullYear() + 1);\n        document.cookie ='
    );
    content = content.replace(handleContinueRegex, fixedHandleContinue);
  }
}

// Fix 4: Add additional logging for free plan selection
console.log(`Adding enhanced logging for free plan selection...`);
const selectFreePlanRegex = /logger\.debug\(\'\[SubscriptionForm\] Free plan selected\'\);/;
const enhancedLogging = `logger.debug('[SubscriptionForm] Free plan selected');
    logger.info('[SubscriptionForm] Starting free plan selection process');`;
content = content.replace(selectFreePlanRegex, enhancedLogging);

// Write the updated content to the file
console.log(`Writing fixed content to SubscriptionForm.jsx...`);
fs.writeFileSync(subscriptionFormPath, content, 'utf8');
console.log(`✅ Fixed content written to ${subscriptionFormPath}`);

// Create documentation
const documentationPath = path.join(__dirname, 'FREE_PLAN_REDIRECT_FIX_SUMMARY.md');
const documentation = `# Free Plan Redirect Fix Summary

## Issue
When selecting the Free plan in the subscription form, users were being redirected to the generic \`/dashboard\` URL instead of the tenant-specific \`/tenant/{tenantId}/dashboard\` URL.

## Root Causes

1. **Missing expiresDate definition**: The \`handleFreePlanSelection\` function was attempting to use \`expiresDate\` to set cookie expiration, but this variable was not defined, causing a JavaScript error.

2. **Incomplete Tenant ID retrieval logic**: The tenant ID retrieval logic wasn't comprehensive enough, only checking Cognito attributes and AppCache, but not properly falling back to localStorage.

## Fixes Applied

1. **Added expiresDate definition**: Added a proper expiration date definition before setting cookies.

2. **Enhanced tenant ID retrieval**: Improved the tenant ID retrieval logic to:
   - Check Cognito attributes first (highest priority)
   - Then check AppCache
   - Then check localStorage
   - Include proper error handling and logging
   - Add debug logging for the redirection URL

3. **Fixed handleContinue function**: Ensured \`expiresDate\` is properly defined in the \`handleContinue\` function as well.

4. **Added enhanced logging**: Added more detailed logging to track the free plan selection process.

## Impact

This fix ensures that users selecting the Free plan will be properly redirected to their tenant-specific dashboard, maintaining a consistent user experience and preventing potential data access issues.

## Testing

To test this fix:
1. Sign up for a new account
2. Select the Free plan during onboarding
3. Verify you are redirected to \`/tenant/{tenantId}/dashboard\` and not just \`/dashboard\`
4. Check browser console logs for the expected logging messages
`;

console.log(`Creating documentation...`);
fs.writeFileSync(documentationPath, documentation, 'utf8');
console.log(`✅ Documentation created at ${documentationPath}`);

// Script registration
console.log(`Updating script registry...`);
const registryPath = path.join(__dirname, 'script_registry.md');
let registry = fs.readFileSync(registryPath, 'utf8');

// Add the script to the registry
const scriptEntry = `| Version0158_fix_free_plan_redirect.mjs | Fix free plan redirect to use tenant ID | ${new Date().toISOString().split('T')[0]} | 🔄 Pending | Fixes issue where free plan selection redirects to /dashboard instead of /tenant/{tenantId}/dashboard |`;
const registryLines = registry.split('\n');

// Find the right position to insert (after the most recent entry)
let insertIndex = -1;
for (let i = 0; i < registryLines.length; i++) {
  if (registryLines[i].includes('Version0157_commit_and_deploy_auth0_domain_validation.mjs')) {
    insertIndex = i + 1;
    break;
  }
}

if (insertIndex !== -1) {
  registryLines.splice(insertIndex, 0, scriptEntry);
  registry = registryLines.join('\n');
  fs.writeFileSync(registryPath, registry, 'utf8');
  console.log(`✅ Script added to registry at ${registryPath}`);
} else {
  console.log(`⚠️ Couldn't find the right position in the registry. Please add manually.`);
}

console.log(`=================================`);
console.log(`✅ Free plan redirect fix script completed successfully!`);
console.log(`Run this script to apply the fix to the SubscriptionForm component.`);
console.log(`=================================`);
