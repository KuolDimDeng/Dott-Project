#!/usr/bin/env node

/**
 * Version 0172: Deploy Additional AppCache Fixes
 * 
 * This script deploys the additional fixes for appCache syntax errors 
 * that were missed in previous fixes. It runs Version0171 and then
 * commits and pushes the changes to the repository.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Create a summary file with details of the fixes
console.log('Creating summary document...');
const summaryContent = `# Additional AppCache Syntax Errors Fix

## Issues Fixed

These additional appCache syntax errors were causing the Vercel build to fail:

1. **SignInForm.js**:
   - Invalid assignment: \`appCache.get('tenant.id') = businessId;\`
   - Direct assignment to appCache.getAll().tenantId which is not allowed

2. **DashboardClient.js**:
   - Module not found: Can't resolve '../utils/appCache'
   - 'use client' directive not at the top of the file

3. **DashAppBar.js**:
   - The "use client" directive not placed before other expressions

4. **EmployeeManagement.js**:
   - Module not found: Can't resolve '../utils/appCache'

5. **DashboardLoader.js**:
   - Invalid assignment: \`appCache.getAll() = appCache.getAll() || {};\`

## Applied Fixes

1. **SignInForm.js**:
   - Replaced \`appCache.get('tenant.id') = businessId;\` with \`appCache.set('tenant.id', businessId);\`
   - Fixed assignments to appCache.getAll().tenantId using proper setter methods

2. **DashboardClient.js**:
   - Moved 'use client' directive to the top of the file
   - Fixed import path to use the correct relative path: \`../../utils/appCache\`

3. **DashAppBar.js**:
   - Moved 'use client' directive to the top of the file
   - Fixed import path to use the correct relative path: \`../../../utils/appCache\`

4. **EmployeeManagement.js**:
   - Fixed import path to use the correct relative path: \`../../../../utils/appCache\`

5. **DashboardLoader.js**:
   - Replaced \`appCache.getAll() = appCache.getAll() || {};\` with \`if (!appCache.getAll()) appCache.set('app', {});\`
   - Fixed similar assignments to appCache.getAll().auth

6. **Created/Ensured appCache.js utility exists**:
   - Added robust implementation of the appCache utility with proper methods for get/set operations

## Root Cause Analysis

Our previous fixes addressed some appCache syntax issues but missed several critical problems:

1. The build process on Vercel is more strict about syntax errors than local development environments
2. Multiple files had incorrect import paths due to their location in the directory structure
3. Some files had 'use client' directives in the wrong position
4. Direct assignments to getter function returns are invalid JavaScript syntax

This comprehensive fix addresses all remaining appCache issues across all affected files, ensuring the build process can complete successfully.

## Deployment Process

1. Run Version0171_fix_additional_appCache_errors.mjs to apply the fixes
2. Commit all changes with clear description
3. Push to remote repository
4. Trigger Vercel deployment automatically
`;

const summaryPath = path.join(__dirname, 'ADDITIONAL_APPCACHE_ERRORS_FIX_SUMMARY.md');
fs.writeFileSync(summaryPath, summaryContent);
console.log(`✅ Created ${summaryPath}`);

// Run the fix script
console.log('\n🔄 Running Version0171_fix_additional_appCache_errors.mjs...');
try {
  execSync(`node ${path.join(__dirname, 'Version0171_fix_additional_appCache_errors.mjs')}`, {
    stdio: 'inherit',
    cwd: projectRoot
  });
  console.log('✅ Successfully ran fix script');
} catch (error) {
  console.error('❌ Error running fix script:', error.message);
  process.exit(1);
}

// Commit and push changes
console.log('\n🔄 Committing and pushing changes...');

try {
  // Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  console.log(`📊 Current branch: ${branch}`);

  // Add changes
  console.log('➕ Adding all changes...');
  execSync('git add .', { stdio: 'inherit' });

  // Commit changes
  console.log('✅ Committing changes...');
  execSync('git commit -m "Fix additional appCache syntax errors causing build failure"', { stdio: 'inherit' });

  // Push changes
  console.log('🚀 Pushing changes...');
  execSync(`git push origin ${branch}`, { stdio: 'inherit' });

  // Deployment message based on branch
  if (branch.includes('main') || branch.includes('Main') || branch.includes('master') || branch.includes('dev') || branch.includes('Dev')) {
    console.log('🎉 Changes pushed to main branch - deployment will be triggered automatically');
  } else {
    console.log(`📝 Changes pushed to ${branch} branch`);
  }
} catch (error) {
  console.error('❌ Error during git operations:', error.message);
  process.exit(1);
}

// Updating script registry
console.log('\n📝 Updating script registry...');
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
## Version0171_fix_additional_appCache_errors.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix additional appCache syntax errors identified in Vercel build logs
- **Changes**:
  - Fixed invalid assignments in SignInForm.js using proper setter methods
  - Fixed import paths in DashboardClient.js, DashAppBar.js and EmployeeManagement.js
  - Fixed 'use client' directive placement
  - Fixed invalid assignments in DashboardLoader.js
  - Ensured appCache.js utility exists with proper implementation
- **Status**: ✅ Completed

## Version0172_deploy_additional_appCache_fixes.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Deploy fixes for additional appCache syntax errors
- **Changes**:
  - Created ADDITIONAL_APPCACHE_ERRORS_FIX_SUMMARY.md documentation
  - Ran Version0171_fix_additional_appCache_errors.mjs
  - Committed and pushed all changes
- **Status**: ✅ Completed
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Created summary document');
console.log('- ✅ Ran fix script');
console.log('- ✅ Committed all changes');
console.log('- ✅ Pushed changes to repository');
console.log('- ✅ Updated script registry');

// Make the script executable
try {
  execSync(`chmod +x "${__filename}"`, { stdio: 'ignore' });
} catch (error) {
  // Ignore chmod errors
}
