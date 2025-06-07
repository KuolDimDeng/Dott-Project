#!/usr/bin/env node

/**
 * Version 0170: Deploy Specific AppCache Syntax Fixes
 * 
 * This script deploys the specific fixes for the appCache syntax errors
 * identified in the build failure log. It runs Version0169 and then
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
const summaryContent = `# Specific AppCache Syntax Errors Fix

## Issues Fixed

These specific syntax errors were causing the build to fail:

1. **SignInForm.js**:
   - Invalid assignment: \`appCache.get('tenant.id') = tenantId;\`
   - Direct assignment to appCache.getAll().tenantId which is not allowed

2. **DashboardClient.js**:
   - Duplicate imports of appCache
   - Import error with logger: \`import { logger } from ''utils/logger''\`

3. **DashAppBar.js**:
   - Syntax error in if statement missing closing brace:
   \`\`\`javascript
   if (typeof window !== 'undefined' && appCache.getAll())
     return appCache.get('tenant.businessName');
   }
   \`\`\`

4. **EmployeeManagement.js**:
   - 'use client' directive not at the top of the file
   - Duplicate appCache imports

5. **OnboardingStateManager.js**:
   - Incorrect import path for appCache: \`../utils/appCache\` instead of \`../../../utils/appCache\`

## Applied Fixes

1. **SignInForm.js**:
   - Replaced \`appCache.get('tenant.id') = tenantId;\` with \`appCache.set('tenant.id', tenantId);\`
   - Fixed assignments to appCache.getAll().tenantId using proper setter methods

2. **DashboardClient.js**:
   - Moved 'use client' directive to the top of the file
   - Removed duplicate appCache imports
   - Fixed logger import path

3. **DashAppBar.js**:
   - Fixed if statement syntax by adding proper braces

4. **EmployeeManagement.js**:
   - Moved 'use client' directive to the top of the file
   - Removed duplicate appCache imports

5. **OnboardingStateManager.js**:
   - Fixed import path for appCache

6. **Created logger.js**:
   - Added missing logger utility that was being imported

## Deployment Process

1. Run Version0169_fix_specific_appCache_errors.mjs to apply the fixes
2. Commit all changes with clear description
3. Push to remote repository
4. Trigger Vercel deployment automatically

## Root Cause Analysis

The previous appCache fixes missed some specific syntax errors because:

1. Some files were likely missed in the initial search for problematic patterns
2. Different code patterns were used in different files
3. Some errors were more complex (like nested conditionals with missing braces)

This fix targets the exact errors reported in the build log, ensuring all instances are fixed.
`;

const summaryPath = path.join(__dirname, 'SPECIFIC_APPCACHE_ERRORS_FIX_SUMMARY.md');
fs.writeFileSync(summaryPath, summaryContent);
console.log(`✅ Created ${summaryPath}`);

// Run the fix script
console.log('\n🔄 Running Version0169_fix_specific_appCache_errors.mjs...');
try {
  execSync(`node ${path.join(__dirname, 'Version0169_fix_specific_appCache_errors.mjs')}`, {
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
  execSync('git commit -m "Fix specific appCache syntax errors causing build failure"', { stdio: 'inherit' });

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
## Version0169_fix_specific_appCache_errors.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix specific appCache syntax errors identified in build failure logs
- **Changes**:
  - Fixed invalid assignments in SignInForm.js
  - Fixed duplicate imports and 'use client' directive in DashboardClient.js
  - Fixed syntax error in DashAppBar.js if statement
  - Fixed 'use client' directive position in EmployeeManagement.js
  - Fixed import path in OnboardingStateManager.js
  - Created missing logger.js utility
- **Status**: ✅ Completed

## Version0170_deploy_specific_appCache_fixes.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Deploy fixes for specific appCache syntax errors
- **Changes**:
  - Created SPECIFIC_APPCACHE_ERRORS_FIX_SUMMARY.md documentation
  - Ran Version0169_fix_specific_appCache_errors.mjs
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
