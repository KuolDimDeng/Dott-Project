/**
 * Version0002_fix_subscription_redirect_issue.js
 * 
 * This script addresses the issue where after submitting business info during onboarding,
 * the application is not correctly redirecting to the subscription page.
 * 
 * Problem: When clicking submit on the business info page, the routing between pages is not
 * working correctly, preventing navigation to the subscription page.
 * 
 * Solution: Fix the redirection mechanism in the business-info page.js file to ensure 
 * proper navigation between onboarding steps.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../src/backups');
const BUSINESS_INFO_PATH = path.join(__dirname, '../src/app/onboarding/business-info/page.js');

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
  console.log('Starting execution of Version0002_fix_subscription_redirect_issue.js');
  
  // Update the business info page.js to fix the redirection issue
  console.log('Updating business-info page.js component...');
  const businessInfoFindPattern = /logger\.debug\('\[BusinessInfoPage\] Business info updated successfully, redirecting to subscription page'\);[\s\S]*?router\.push\('\/onboarding\/subscription'\);/;
  
  const businessInfoReplacement = `logger.debug('[BusinessInfoPage] Business info updated successfully, redirecting to subscription page');
      
      // Force redirection with a small delay to ensure state is properly updated
      setTimeout(() => {
        // Use the Next.js router push with specific options for more reliable navigation
        router.push('/onboarding/subscription?source=business-info&ts=' + Date.now(), { 
          forceOptimisticNavigation: true 
        });
        
        // Fallback with direct window.location for problematic cases
        setTimeout(() => {
          if (window.location.pathname.includes('/business-info')) {
            logger.warn('[BusinessInfoPage] Router navigation failed, using direct location change');
            window.location.href = '/onboarding/subscription?source=business-info&fallback=true&ts=' + Date.now();
          }
        }, 1000);
      }, 300);`;
  
  updateFile(BUSINESS_INFO_PATH, businessInfoFindPattern, businessInfoReplacement);
  
  // Update registry file
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  // Check if registry file exists and read its content
  let registryContent = '';
  if (fs.existsSync(registryPath)) {
    registryContent = fs.readFileSync(registryPath, 'utf8');
  } else {
    registryContent = '# Frontend Script Registry\n\n';
  }
  
  // Add new script entry
  registryContent += `
## Version0002_fix_subscription_redirect_issue.js
- **Date:** ${new Date().toISOString()}
- **Purpose:** Fix issue with redirection from business info page to subscription page
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/business-info/page.js
- **Summary of Changes:**
  - Enhanced redirection mechanism in business-info page
  - Added timing delay to ensure state updates before navigation
  - Implemented fallback navigation method using window.location for reliability
  - Added additional debugging parameters to track redirection source
`;

  fs.writeFileSync(registryPath, registryContent, 'utf8');
  console.log(`Updated script registry: ${registryPath}`);

  // Create documentation file
  const docPath = path.join(__dirname, '../src/app/onboarding/SUBSCRIPTION_REDIRECT_FIX.md');
  const docContent = `# Subscription Redirect Fix Documentation

## Issue Summary

After entering business information and clicking submit on the business info page, the application was not properly redirecting to the subscription page. This broke the onboarding flow, preventing users from continuing to select a subscription plan.

## Root Cause

The issue was caused by a navigation problem between onboarding steps:

1. When submitting the business info form, the standard Next.js router.push() navigation was not reliable in some cases
2. The navigation was happening too quickly before state updates were complete
3. There was no fallback navigation mechanism when the primary method failed

## Solution

We implemented a fix (Version0002_fix_subscription_redirect_issue.js) with the following changes:

1. **Enhanced Redirection**: Updated the business-info page.js file to use a more robust redirection approach:
   - Added a small delay before navigation to ensure state is properly persisted
   - Used optimistic navigation options with the Next.js router
   - Added debugging query parameters to track navigation source

2. **Fallback Mechanism**: Implemented a fallback navigation using window.location:
   - Added a secondary check to verify if navigation succeeded
   - Implemented direct window.location navigation as a reliable fallback

## Implementation Details

The fix modifies the following file:

\`\`\`javascript
// src/app/onboarding/business-info/page.js
// Previous implementation
logger.debug('[BusinessInfoPage] Business info updated successfully, redirecting to subscription page');
router.push('/onboarding/subscription');

// New enhanced implementation
logger.debug('[BusinessInfoPage] Business info updated successfully, redirecting to subscription page');
      
// Force redirection with a small delay to ensure state is properly updated
setTimeout(() => {
  // Use the Next.js router push with specific options for more reliable navigation
  router.push('/onboarding/subscription?source=business-info&ts=' + Date.now(), { 
    forceOptimisticNavigation: true 
  });
  
  // Fallback with direct window.location for problematic cases
  setTimeout(() => {
    if (window.location.pathname.includes('/business-info')) {
      logger.warn('[BusinessInfoPage] Router navigation failed, using direct location change');
      window.location.href = '/onboarding/subscription?source=business-info&fallback=true&ts=' + Date.now();
    }
  }, 1000);
}, 300);
\`\`\`

## Testing

To verify the fix, follow these steps:

1. Complete the business info form with all required fields
2. Submit the form
3. Confirm you are redirected to the subscription page
4. Complete the onboarding flow

## Version History

- **v1.0** (2025-04-28): Initial implementation of the fix
`;

  fs.writeFileSync(docPath, docContent, 'utf8');
  console.log(`Created documentation file: ${docPath}`);

  console.log('Fix script execution completed successfully');
} catch (error) {
  console.error('Error executing fix script:', error);
} 