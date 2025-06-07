#!/usr/bin/env node

/**
 * Version 0166: Deploy AppCache Syntax Fixes
 * 
 * This script commits and deploys the fixes for appCache syntax errors
 * that were causing the build to fail.
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
const summaryContent = `# AppCache Syntax Errors Fix

## Issue
The previous deployment failed with syntax errors in the appCache utility usage:

\`\`\`
Error: The left-hand side of an assignment expression must be a variable or a property access.
appCache.getAll() = appCache.getAll() || {};
            ^
Invalid assignment target
\`\`\`

## Files Fixed
The following files had syntax errors that were fixed:

1. **SignInForm.js**:
   - Replaced \`appCache.getAll() = appCache.getAll() || {}\` with proper initialization
   - Used \`appCache.set()\` method instead of direct assignment

2. **DashboardClient.js**:
   - Fixed invalid assignments to function calls
   - Replaced \`appCache.get('tenant.id') = result.tenantId\` with \`appCache.set('tenant.id', result.tenantId)\`

3. **DashAppBar.js**:
   - Fixed invalid assignment to appCache.getAll()
   - Used proper initialization with if statement and set() method

4. **EmployeeManagement.js**:
   - Fixed invalid assignments similar to other files
   - Used set() method for setting auth token

5. **OnboardingStateManager.js**:
   - Fixed syntax error in tenant ID retrieval code
   - Fixed duplicate lines that were causing parsing issues

## Root Cause
The appCache utility was designed to use \`set()\` methods for modifying values, but the code was
using direct assignment to function return values which is invalid JavaScript syntax.

## Fix Approach
1. Used proper conditional initialization of the app cache
2. Replaced function call assignments with proper set() method calls
3. Added proper null/undefined checks

These changes preserve the same functionality while using valid JavaScript syntax.
`;

const summaryPath = path.join(__dirname, 'APPCACHE_SYNTAX_FIX_SUMMARY.md');
fs.writeFileSync(summaryPath, summaryContent);
console.log(`✅ Created ${summaryPath}`);

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
  execSync('git commit -m "Fix appCache syntax errors causing build failure"', { stdio: 'inherit' });

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
## Version0166_deploy_appCache_syntax_fixes.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Deploy fixes for appCache syntax errors that were causing build failure
- **Changes**:
  - Created APPCACHE_SYNTAX_FIX_SUMMARY.md documentation
  - Committed and pushed all fixes to the repository
  - Fixed invalid JavaScript syntax in 5 files
- **Status**: ✅ Completed
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Created summary document');
console.log('- ✅ Committed all changes');
console.log('- ✅ Pushed changes to repository');
console.log('- ✅ Updated script registry');

// Make the script executable
try {
  execSync(`chmod +x "${__filename}"`, { stdio: 'ignore' });
} catch (error) {
  // Ignore chmod errors
}
