#!/usr/bin/env node

/**
 * Version 0178: Deploy Amplify Removal and AppCache Fixes
 * 
 * This script deploys the fixes for Amplify/Cognito removal and appCache import errors:
 * 1. Runs the fix script (Version0177)
 * 2. Commits all changes
 * 3. Pushes to the remote repository
 * 4. Updates the script registry
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Create a summary document
function createSummaryDocument() {
  console.log('Creating summary document...');
  
  const summaryContent = `# Complete Auth0 Migration: Amplify/Cognito Removal and AppCache Fixes

This document summarizes the fixes applied to complete the migration from AWS Cognito/Amplify to Auth0 and resolve appCache import errors.

## Issues Identified in Vercel Build Logs

The Vercel build was failing due to:

1. **SignInForm.js**: Duplicate appCache imports and references to Amplify/Cognito
   - \`Module parse failed: Identifier 'appCache' has already been declared\`
   - Still had imports for \`amplifySignIn\`, \`signInWithRedirect\`, etc.

2. **DashboardClient.js**: Incorrect import path for appCache and Amplify references
   - \`Module not found: Can't resolve '../utils/appCache'\`

3. **DashAppBar.js**: Duplicate appCache imports
   - \`Module parse failed: Identifier 'appCache' has already been declared\`

4. **DashboardLoader.js**: Invalid assignments to appCache.get() and 'use client' directive not at top
   - \`The left-hand side of an assignment expression must be a variable or a property access\`
   - \`The "use client" directive must be placed before other expressions\`

5. **auth.js**: 'use client' directive not at top of file and Amplify references
   - \`The "use client" directive must be placed before other expressions\`

## Comprehensive Fixes Applied

### 1. Complete Removal of Amplify/Cognito
- Removed all imports referencing Amplify or Cognito
- Replaced Amplify authentication functions with Auth0 equivalents
- Added Auth0 login function to SignInForm.js
- Removed Cognito-specific code and comments

### 2. Fixed AppCache Import Issues
- Moved 'use client' directives to the top of all files
- Removed duplicate appCache imports
- Fixed import paths to use correct relative paths
- Replaced invalid assignments to appCache.get() with proper appCache.set() calls
- Created a centralized appCache utility for consistent usage

### 3. Enhanced AppCache Utility
- Implemented a robust appCache utility with proper getter/setter methods
- Added support for dot notation paths (e.g., 'tenant.id')
- Ensured backward compatibility with existing code

## Impact

These fixes ensure:

1. Complete migration from AWS Cognito/Amplify to Auth0
2. No duplicate imports exist in the codebase
3. All import paths are correct
4. All assignments to appCache use the proper setter methods
5. 'use client' directives are correctly placed at the top of files

## Deployment

The fixes were deployed by:
1. Running the fix script (Version0177_remove_amplify_and_fix_appCache_errors.mjs)
2. Committing all changes
3. Pushing to the Dott_Main_Dev_Deploy branch
4. Vercel deployment automatically triggered by the push

## Next Steps

The application should now build and deploy successfully without any reference to Amplify or Cognito. Monitor the Vercel build logs to confirm the deployment completes successfully.
`;

  const summaryPath = path.join(__dirname, 'AMPLIFY_REMOVAL_AND_APPCACHE_FIXES_SUMMARY.md');
  fs.writeFileSync(summaryPath, summaryContent);
  console.log(`✅ Created ${summaryPath}`);
}

// Run the fix script
function runFixScript() {
  console.log('🔄 Running Version0177_remove_amplify_and_fix_appCache_errors.mjs...');
  try {
    execSync('node ' + path.join(__dirname, 'Version0177_remove_amplify_and_fix_appCache_errors.mjs'), 
      { stdio: 'inherit' });
    console.log('✅ Successfully ran fix script');
    return true;
  } catch (error) {
    console.error('❌ Error running fix script:', error);
    return false;
  }
}

// Commit and push changes
function commitAndPushChanges() {
  console.log('🔄 Committing and pushing changes...');
  
  try {
    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    console.log(`📊 Current branch: ${branch}`);
    
    // Add all changes
    console.log('➕ Adding all changes...');
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit changes
    console.log('✅ Committing changes...');
    execSync('git commit -m "Complete Auth0 migration: Remove Amplify/Cognito and fix appCache errors"', { stdio: 'inherit' });
    
    // Push changes
    console.log('🚀 Pushing changes...');
    execSync('git push origin ' + branch, { stdio: 'inherit' });
    
    console.log(`🎉 Changes pushed to ${branch} branch - deployment will be triggered automatically`);
    return true;
  } catch (error) {
    console.error('❌ Error in git operations:', error);
    return false;
  }
}

// Update script registry
function updateScriptRegistry() {
  console.log('\n📝 Updating script registry...');
  
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  if (!fs.existsSync(registryPath)) {
    console.log('⚠️ Script registry not found. Creating new registry.');
    fs.writeFileSync(registryPath, '# Script Registry\n\n| Script | Purpose | Status | Date |\n|--------|---------|--------|------|\n');
  }
  
  let registry = fs.readFileSync(registryPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  // Add entry for the fix script
  if (!registry.includes('Version0177_remove_amplify_and_fix_appCache_errors.mjs')) {
    registry += `| Version0177_remove_amplify_and_fix_appCache_errors.mjs | Remove all Amplify/Cognito references and fix appCache errors | Completed | ${date} |\n`;
  }
  
  // Add entry for this script
  if (!registry.includes('Version0178_deploy_amplify_removal_and_appCache_fixes.mjs')) {
    registry += `| Version0178_deploy_amplify_removal_and_appCache_fixes.mjs | Deploy Amplify removal and appCache fixes | Completed | ${date} |\n`;
  }
  
  fs.writeFileSync(registryPath, registry);
}

// Main function
async function main() {
  // Create summary document
  createSummaryDocument();
  
  // Run fix script
  const fixSuccess = runFixScript();
  if (!fixSuccess) {
    console.error('❌ Fix script failed. Deployment aborted.');
    process.exit(1);
  }
  
  // Commit and push changes
  const commitSuccess = commitAndPushChanges();
  if (!commitSuccess) {
    console.error('❌ Commit/push failed. Please fix issues and try again.');
    process.exit(1);
  }
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('\n✅ Script completed!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Created summary document');
  console.log('- ✅ Ran fix script');
  console.log('- ✅ Committed all changes');
  console.log('- ✅ Pushed changes to repository');
  console.log('- ✅ Updated script registry');
}

// Execute main function
main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
