#!/usr/bin/env node

/**
 * Version 0174: Deploy Remaining AppCache Fixes
 * 
 * This script deploys the remaining appCache syntax error fixes:
 * 1. Runs the fix script (Version0173)
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
  
  const summaryContent = `# Final AppCache Syntax Errors Fix

This document summarizes the final fixes applied to resolve remaining appCache syntax errors that were causing the Vercel build to fail.

## Issues Identified in Build Logs

The following errors were identified in the Vercel build logs:

1. **SignInForm.js**: The 'use client' directive was not at the top of the file
   - \`The "use client" directive must be placed before other expressions. Move it to the top of the file to resolve this issue.\`

2. **DashboardClient.js**: Incorrect import path for appCache
   - \`Module not found: Can't resolve '../utils/appCache'\`

3. **DashAppBar.js**: Duplicate imports for appCache
   - \`Module parse failed: Identifier 'appCache' has already been declared\`

4. **DashboardLoader.js**: Invalid assignment to appCache.get()
   - \`The left-hand side of an assignment expression must be a variable or a property access.\`
   - \`appCache.get('tenant.id') = tenantId;\`

5. **auth.js**: Invalid assignment to appCache.getAll()
   - \`if (!appCache.getAll()) appCache.getAll() = {};\`

## Fixes Applied

### 1. SignInForm.js
- Moved 'use client' directive to the top of the file
- Fixed double import of appCache 
- Fixed invalid assignments to appCache.get() using proper setter methods

### 2. DashboardClient.js
- Ensured 'use client' is at the top
- Fixed import path to use the correct relative path (../../utils/appCache)

### 3. DashAppBar.js
- Ensured 'use client' is at the top
- Fixed duplicate imports by consolidating them into a single import

### 4. DashboardLoader.js
- Fixed invalid assignments to appCache.get() using proper setter methods
- Replaced \`appCache.get('tenant.id') = tenantId;\` with \`appCache.set('tenant.id', tenantId);\`

### 5. auth.js
- Fixed invalid assignments to appCache.getAll() 
- Replaced \`appCache.getAll() = {};\` with \`appCache.set('app', {});\`

### 6. appCache.js Utility
- Ensured the utility file exists with proper implementation
- Added proper methods for accessing and modifying cache data
- Included localStorage persistence for client-side storage

## Testing Strategy

To verify the fixes locally before deployment:
1. Run \`pnpm run build\` locally to ensure no syntax errors
2. Test the application functionality to ensure data persistence works correctly

## Deployment

The fixes were deployed by:
1. Running the fix script (Version0173_fix_remaining_appCache_errors.mjs)
2. Committing all changes
3. Pushing to the Dott_Main_Dev_Deploy branch
4. Vercel deployment automatically triggered by the push

## Next Steps

Monitor the Vercel build logs to confirm the deployment completes successfully without the previous syntax errors.
`;

  const summaryPath = path.join(__dirname, 'FINAL_APPCACHE_SYNTAX_ERRORS_FIX_SUMMARY.md');
  fs.writeFileSync(summaryPath, summaryContent);
  console.log(`✅ Created ${summaryPath}`);
}

// Run the fix script
function runFixScript() {
  console.log('🔄 Running Version0173_fix_remaining_appCache_errors.mjs...');
  try {
    execSync('node ' + path.join(__dirname, 'Version0173_fix_remaining_appCache_errors.mjs'), 
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
    execSync('git commit -m "Fix remaining appCache syntax errors for Vercel build"', { stdio: 'inherit' });
    
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
  if (!registry.includes('Version0173_fix_remaining_appCache_errors.mjs')) {
    registry += `| Version0173_fix_remaining_appCache_errors.mjs | Fix remaining appCache syntax errors | Completed | ${date} |\n`;
  }
  
  // Add entry for this script
  if (!registry.includes('Version0174_deploy_remaining_appCache_fixes.mjs')) {
    registry += `| Version0174_deploy_remaining_appCache_fixes.mjs | Deploy remaining appCache syntax error fixes | Completed | ${date} |\n`;
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
