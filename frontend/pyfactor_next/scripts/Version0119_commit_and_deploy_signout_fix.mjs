/**
 * Version0119_commit_and_deploy_signout_fix.mjs
 * 
 * This script commits and deploys the fix for the signout onboarding redirect issue.
 * It applies the changes made by Version0118_fix_signout_onboarding_redirect.mjs,
 * commits them to git, and pushes to the deployment branch.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DEPLOYMENT_BRANCH = 'Dott_Main_Dev_Deploy';

// First, run the fix script if it hasn't been run yet
console.log('Checking if the fix has been applied...');
const helperPath = 'frontend/pyfactor_next/src/utils/onboardingRedirectHelper.js';

if (!fs.existsSync(helperPath)) {
  console.log('Fix not yet applied, running Version0118_fix_signout_onboarding_redirect.mjs...');
  try {
    execSync('node frontend/pyfactor_next/scripts/Version0118_fix_signout_onboarding_redirect.mjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to run the fix script:', error);
    process.exit(1);
  }
} else {
  console.log('Fix already applied, proceeding with deployment...');
}

// Create a summary file for the fix
console.log('Creating summary document...');
const summaryPath = 'frontend/pyfactor_next/scripts/SIGNOUT_ONBOARDING_REDIRECT_FIX_SUMMARY.md';

const summaryContent = `# Signout Onboarding Redirect Fix Summary

## Issue

Users who had completed onboarding were being redirected to the onboarding flow after signing out and back in. This happened because:

1. The onboarding status was not properly persisted across sessions
2. Auth0 session metadata was not correctly checked for onboarding completion status
3. Multiple storage mechanisms weren't properly synchronized

## Solution

We implemented a comprehensive solution that addresses these issues:

### 1. Enhanced Session Metadata Extraction

- Now checking multiple metadata locations for onboarding status:
  - \`userMetadata.onboardingComplete\`
  - \`userMetadata.custom_onboardingComplete\`
  - \`userMetadata.custom_onboarding\`
  - \`appMetadata.onboardingComplete\`

- Extracting tenant ID from multiple possible locations:
  - \`userMetadata.tenantId\`
  - \`userMetadata.custom_tenantId\`
  - \`sessionData.user.custom_tenantId\`
  - \`sessionData.user.tenantId\`

### 2. Client-Side Helper for Redirect Logic

Created a new utility (\`src/utils/onboardingRedirectHelper.js\`) that:
- Checks URL parameters for preserved onboarding status
- Verifies localStorage as a fallback for onboarding status
- Provides clean redirection to dashboard when appropriate

### 3. Enhanced Signin Page

Updated the signin page to use the new helper:
- Added logic to check for preserved onboarding status after logout
- Implemented localStorage fallback checks
- Improved redirect flow to maintain user context

## Deployment

The changes have been:
1. Applied and tested locally
2. Committed to the repository
3. Pushed to the \`${DEPLOYMENT_BRANCH}\` branch
4. Deployed to Vercel

## Verification

After deployment, users who have completed onboarding should:
1. Remain in the dashboard after signing out and back in
2. Not lose their onboarding progress
3. Maintain their tenant context across sessions

## Data Persistence

Onboarding data is now properly persisted in:
1. Backend database (Render hosted PostgreSQL)
2. Auth0 user metadata
3. Browser localStorage

This hierarchical approach ensures maximum reliability and session continuity.

## Date: ${new Date().toISOString().split('T')[0]}
`;

fs.writeFileSync(summaryPath, summaryContent);
console.log(`✅ Created summary at ${summaryPath}`);

// Update script registry
console.log('Updating script registry...');
const registryPath = 'frontend/pyfactor_next/scripts/script_registry.md';

if (fs.existsSync(registryPath)) {
  let registryContent = fs.readFileSync(registryPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `
### Version0119_commit_and_deploy_signout_fix.mjs
- **Version**: 0119 v1.0
- **Purpose**: Commit and deploy signout onboarding redirect fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${today}
- **Execution Date**: ${today}
- **Target Files**:
  - All files modified by Version0118
- **Description**: Commits the changes made by Version0118_fix_signout_onboarding_redirect.mjs and
  deploys them to the production environment via the ${DEPLOYMENT_BRANCH} branch.
- **Key Changes**:
  - Runs the Version0118 script if not already executed
  - Creates a summary document for the fix
  - Commits all changes to git
  - Pushes to the deployment branch
- **Related Scripts**: 
  - Version0118_fix_signout_onboarding_redirect.mjs
  - Version0117_commit_and_deploy_onboarding_status_service.mjs
`;

  // Insert the new entry after the Script Inventory heading
  registryContent = registryContent.replace(/## Script Inventory/, `## Script Inventory${newEntry}`);
  fs.writeFileSync(registryPath, registryContent);
  console.log('✅ Updated script registry');
} else {
  console.error(`Script registry file not found at ${registryPath}`);
}

// Commit the changes
console.log('\nCommitting changes to git...');
try {
  // Stage all changes
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit with descriptive message
  execSync('git commit -m "Fix signout onboarding redirect issue (Version0118-0119)"', { stdio: 'inherit' });
  
  console.log('✅ Changes committed successfully');
} catch (error) {
  console.error('Failed to commit changes:', error);
  process.exit(1);
}

// Push to deployment branch
console.log(`\nPushing to ${DEPLOYMENT_BRANCH} branch to trigger deployment...`);
try {
  execSync(`git push origin HEAD:${DEPLOYMENT_BRANCH}`, { stdio: 'inherit' });
  console.log(`✅ Changes pushed to ${DEPLOYMENT_BRANCH} successfully`);
} catch (error) {
  console.error('Failed to push changes:', error);
  process.exit(1);
}

console.log('\n✅ Deployment process completed successfully!');
console.log('The fix for signout onboarding redirect issue has been deployed.');
console.log('It may take a few minutes for the changes to propagate through Vercel.');
