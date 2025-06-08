#!/usr/bin/env node

/**
 * Version 0176: Deploy AppCache Import Fixes
 * 
 * This script deploys the fixes for appCache import errors:
 * 1. Runs the fix script (Version0175)
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
  
  const summaryContent = `# AppCache Import Errors Fix

This document summarizes the fixes applied to resolve the appCache import errors that were causing the Vercel build to fail.

## Issues Identified in Vercel Build Logs

The following errors were identified in the Vercel build logs:

1. **SignInForm.js**: Duplicate appCache imports
   - \`Module parse failed: Identifier 'appCache' has already been declared\`
   - Had both \`import { appCache } from '../utils/appCache';\` and \`import appCache from '../utils/appCache';\`

2. **DashboardClient.js**: Incorrect import path
   - \`Module not found: Can't resolve '../utils/appCache'\`
   - The path needed to be adjusted to \`'../../utils/appCache'\`

3. **DashAppBar.js**: Duplicate appCache imports
   - \`Module parse failed: Identifier 'appCache' has already been declared\`
   - Multiple import statements with different styles

4. **DashboardLoader.js**: Invalid assignment to appCache.get()
   - \`The left-hand side of an assignment expression must be a variable or a property access.\`
   - \`appCache.get('tenant.id') = tenantIdMeta;\` is invalid JavaScript

5. **auth.js**: 'use client' directive not at top of file
   - \`The "use client" directive must be placed before other expressions.\`
   - The directive was after an import statement

## Fixes Applied

### 1. SignInForm.js
- Moved 'use client' directive to the top of the file
- Removed duplicate import of appCache
- Fixed reference to amplifyUnified config

### 2. DashboardClient.js
- Fixed import path for appCache to use the correct relative path (../../utils/appCache)

### 3. DashAppBar.js
- Consolidated duplicate imports into a single import statement
- Fixed the relative path to properly point to the utils directory

### 4. DashboardLoader.js
- Replaced invalid assignments with proper setter methods:
  - Changed \`appCache.get('tenant.id') = tenantIdMeta;\` to \`appCache.set('tenant.id', tenantIdMeta);\`

### 5. auth.js
- Moved 'use client' directive to the top of the file
- Removed duplicate appCache imports

## Impact

These fixes ensure that:
1. No duplicate imports exist in the codebase
2. All import paths are correct
3. All assignments to appCache use the proper setter methods
4. 'use client' directives are correctly placed at the top of the file

This should resolve the build errors and allow the application to deploy successfully.

## Deployment

The fixes were deployed by:
1. Running the fix script (Version0175_fix_appCache_import_errors.mjs)
2. Committing all changes
3. Pushing to the Dott_Main_Dev_Deploy branch
4. Vercel deployment automatically triggered by the push

## Next Steps

Monitor the Vercel build logs to confirm the deployment completes successfully without the import-related syntax errors.
`;

  const summaryPath = path.join(__dirname, 'APPCACHE_IMPORT_ERRORS_FIX_SUMMARY.md');
  fs.writeFileSync(summaryPath, summaryContent);
  console.log(`✅ Created ${summaryPath}`);
}

// Run the fix script
function runFixScript() {
  console.log('🔄 Running Version0175_fix_appCache_import_errors.mjs...');
  try {
    execSync('node ' + path.join(__dirname, 'Version0175_fix_appCache_import_errors.mjs'), 
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
    execSync('git commit -m "Fix appCache import errors causing Vercel build failure"', { stdio: 'inherit' });
    
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
  if (!registry.includes('Version0175_fix_appCache_import_errors.mjs')) {
    registry += `| Version0175_fix_appCache_import_errors.mjs | Fix appCache import errors causing build failure | Completed | ${date} |\n`;
  }
  
  // Add entry for this script
  if (!registry.includes('Version0176_deploy_appCache_import_fixes.mjs')) {
    registry += `| Version0176_deploy_appCache_import_fixes.mjs | Deploy appCache import error fixes | Completed | ${date} |\n`;
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
