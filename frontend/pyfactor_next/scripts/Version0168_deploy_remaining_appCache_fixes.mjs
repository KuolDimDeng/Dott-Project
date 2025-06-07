#!/usr/bin/env node

/**
 * Version 0168: Deploy Remaining AppCache Syntax Fixes
 * 
 * This script commits and deploys the remaining fixes for appCache syntax errors
 * that were causing the build to fail in the previous deployment.
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
const summaryContent = `# Remaining AppCache Syntax Errors Fix

## Issue
The previous deployment still failed with additional syntax errors that weren't caught by the first fix:

\`\`\`
Error: The left-hand side of an assignment expression must be a variable or a property access.
appCache.get('tenant.id') = tenantInfo.tenantId;
        ^
Invalid assignment target
\`\`\`

\`\`\`
Error: The "use client" directive must be placed before other expressions. Move it to the top of the file
import appCache from '../utils/appCache';

'use client';
^^^^^^^^^^^^^
\`\`\`

\`\`\`
Error: Expression expected
appCache.set('debug.useMockMode', == true);
                               ^^
\`\`\`

## Files Fixed

1. **SignInForm.js**:
   - Fixed \`appCache.get('tenant.id') = tenantInfo.tenantId\` → \`appCache.set('tenant.id', tenantInfo.tenantId)\`
   - Fixed assignments to appCache.getAll().tenantId

2. **DashboardClient.js**:
   - Moved 'use client' directive to the top of the file
   - Fixed duplicate imports of appCache

3. **DashAppBar.js**:
   - Fixed invalid assignment: \`if (!appCache.getAll()) appCache.getAll() = {}\`
   - Replaced with proper initialization using appCache.set()

4. **EmployeeManagement.js**:
   - Fixed syntax error: \`appCache.set('debug.useMockMode', == true)\` → \`appCache.set('debug.useMockMode', true)\`
   - Fixed unclosed if statement with console.log

5. **OnboardingStateManager.js**:
   - Fixed duplicate imports of appCache causing declaration errors

## Root Cause

The previous fix missed some of the invalid assignments to appCache methods. The fundamental issue is the same:
- You cannot assign values to function return values (e.g., \`appCache.get('key') = value\`)
- The 'use client' directive must be at the top of the file
- Some components had syntax errors in conditional expressions

## Fix Approach

1. Used proper method calls with appCache.set() instead of direct assignments
2. Fixed the order of imports and directives
3. Corrected syntax errors in boolean expressions
4. Removed duplicate imports

These changes ensure the code follows valid JavaScript syntax while maintaining the same functionality.
`;

const summaryPath = path.join(__dirname, 'REMAINING_APPCACHE_SYNTAX_FIX_SUMMARY.md');
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
  execSync('git commit -m "Fix remaining appCache syntax errors causing build failure"', { stdio: 'inherit' });

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
## Version0168_deploy_remaining_appCache_fixes.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Deploy fixes for remaining appCache syntax errors that were still causing build failure
- **Changes**:
  - Created REMAINING_APPCACHE_SYNTAX_FIX_SUMMARY.md documentation
  - Committed and pushed all fixes from Version0167_fix_remaining_appCache_syntax_errors.mjs
  - Fixed syntax errors in 5 key files
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
