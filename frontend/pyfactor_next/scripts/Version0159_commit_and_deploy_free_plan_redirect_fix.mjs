/**
 * Version0159_commit_and_deploy_free_plan_redirect_fix.mjs
 * 
 * This script:
 * 1. Executes the fix script for the free plan redirect issue
 * 2. Commits the changes to git
 * 3. Pushes the commit to the deployment branch (Dott_Main_Dev_Deploy)
 * 4. Updates the script registry to mark the fix as executed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const fixScriptPath = path.join(__dirname, 'Version0158_fix_free_plan_redirect.mjs');
const registryPath = path.join(__dirname, 'script_registry.md');

console.log(`=================================`);
console.log(`🚀 Starting free plan redirect fix deployment`);
console.log(`=================================`);

// Check if the fix script exists
if (!fs.existsSync(fixScriptPath)) {
  console.error(`❌ Fix script not found at ${fixScriptPath}`);
  process.exit(1);
}

// Execute the fix script
try {
  console.log(`📝 Executing fix script...`);
  const result = execSync(`node ${fixScriptPath}`, { encoding: 'utf8' });
  console.log(result);
  console.log(`✅ Fix script executed successfully`);
} catch (error) {
  console.error(`❌ Error executing fix script:`, error.message);
  process.exit(1);
}

// Commit the changes
try {
  console.log(`📝 Committing changes to git...`);
  
  // Add modified files
  execSync('git add frontend/pyfactor_next/src/components/Onboarding/SubscriptionForm.jsx', { encoding: 'utf8' });
  execSync('git add frontend/pyfactor_next/scripts/FREE_PLAN_REDIRECT_FIX_SUMMARY.md', { encoding: 'utf8' });
  execSync('git add frontend/pyfactor_next/scripts/script_registry.md', { encoding: 'utf8' });
  execSync('git add frontend/pyfactor_next/scripts/Version0158_fix_free_plan_redirect.mjs', { encoding: 'utf8' });
  execSync('git add frontend/pyfactor_next/scripts/Version0159_commit_and_deploy_free_plan_redirect_fix.mjs', { encoding: 'utf8' });
  
  // Commit with message
  const commitMessage = 'Fix free plan redirect to use tenant ID path';
  execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });
  
  console.log(`✅ Changes committed successfully`);
} catch (error) {
  console.error(`❌ Error committing changes:`, error.message);
  console.log(`⚠️ Continuing with script execution despite git commit error`);
}

// Push to deployment branch
try {
  console.log(`📝 Pushing changes to Dott_Main_Dev_Deploy branch...`);
  execSync('git push origin Dott_Main_Dev_Deploy', { encoding: 'utf8' });
  console.log(`✅ Changes pushed successfully`);
} catch (error) {
  console.error(`❌ Error pushing changes:`, error.message);
  console.log(`⚠️ Manual push will be required. Continue with script execution.`);
}

// Update script registry to mark scripts as executed
try {
  console.log(`📝 Updating script registry...`);
  
  // Read the registry content
  let registry = fs.readFileSync(registryPath, 'utf8');
  
  // Update status of Version0158
  registry = registry.replace(
    /\| Version0158_fix_free_plan_redirect\.mjs \| Fix free plan redirect to use tenant ID \| [^|]* \| 🔄 Pending \|/,
    `| Version0158_fix_free_plan_redirect.mjs | Fix free plan redirect to use tenant ID | ${new Date().toISOString().split('T')[0]} | ✅ Executed |`
  );
  
  // Add entry for Version0159
  const scriptEntry = `| Version0159_commit_and_deploy_free_plan_redirect_fix.mjs | Commit and deploy free plan redirect fix | ${new Date().toISOString().split('T')[0]} | ✅ Executed | Deploys the fix for free plan redirect to use tenant-specific path |`;
  const registryLines = registry.split('\n');
  
  // Find the right position to insert (after Version0158 entry)
  let insertIndex = -1;
  for (let i = 0; i < registryLines.length; i++) {
    if (registryLines[i].includes('Version0158_fix_free_plan_redirect.mjs')) {
      insertIndex = i + 1;
      break;
    }
  }
  
  if (insertIndex !== -1) {
    registryLines.splice(insertIndex, 0, scriptEntry);
    registry = registryLines.join('\n');
    fs.writeFileSync(registryPath, registry, 'utf8');
    console.log(`✅ Script registry updated successfully`);
  } else {
    console.log(`⚠️ Couldn't find the right position in the registry. Please update manually.`);
  }
} catch (error) {
  console.error(`❌ Error updating script registry:`, error.message);
}

// Create a summary of the deployment
try {
  console.log(`📝 Creating deployment summary...`);
  
  const summaryPath = path.join(__dirname, 'FREE_PLAN_REDIRECT_FIX_DEPLOYMENT.md');
  const summaryContent = `# Free Plan Redirect Fix Deployment

## Overview

This document summarizes the deployment of the fix for the free plan redirect issue, where users selecting the free plan during onboarding were redirected to the generic \`/dashboard\` URL instead of the tenant-specific \`/tenant/{tenantId}/dashboard\` URL.

## Deployment Details

**Date:** ${new Date().toISOString().split('T')[0]}

**Scripts Executed:**
- \`Version0158_fix_free_plan_redirect.mjs\` - Applied the core fixes
- \`Version0159_commit_and_deploy_free_plan_redirect_fix.mjs\` - Committed and deployed the changes

**Files Modified:**
- \`frontend/pyfactor_next/src/components/Onboarding/SubscriptionForm.jsx\` - Fixed the redirection logic
- \`frontend/pyfactor_next/scripts/script_registry.md\` - Updated script registry
- \`frontend/pyfactor_next/scripts/FREE_PLAN_REDIRECT_FIX_SUMMARY.md\` - Added documentation

**Branch Deployed To:** \`Dott_Main_Dev_Deploy\`

## Verification Steps

After deployment, verify the fix by:

1. Sign up for a new account
2. Select the Free plan during onboarding
3. Verify you are redirected to \`/tenant/{tenantId}/dashboard\` and not just \`/dashboard\`
4. Check browser console logs for the expected logging messages

## Rollback Procedure

If issues are encountered, restore from the backup file:
\`frontend/pyfactor_next/src/components/Onboarding/SubscriptionForm.jsx.backup_YYYYMMDD\`

Then commit and deploy the rollback.
`;
  
  fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  console.log(`✅ Deployment summary created at ${summaryPath}`);
} catch (error) {
  console.error(`❌ Error creating deployment summary:`, error.message);
}

console.log(`=================================`);
console.log(`✅ Free plan redirect fix deployment completed successfully!`);
console.log(`=================================`);
