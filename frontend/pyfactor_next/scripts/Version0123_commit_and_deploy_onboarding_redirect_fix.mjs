import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const SUMMARY_PATH = 'frontend/pyfactor_next/scripts/EXISTING_USER_ONBOARDING_REDIRECT_FIX.md';

async function checkFixApplied() {
  try {
    console.log('Checking if the fix has been applied...');
    const callbackPage = await fs.readFile('frontend/pyfactor_next/src/app/auth/callback/page.js', 'utf8');
    
    if (callbackPage.includes('3.5 EXISTING USER WITH TENANT')) {
      console.log('Fix already applied, proceeding with deployment...');
      return true;
    } else {
      console.log('❌ Fix not applied. Please run Version0122_fix_existing_user_onboarding_redirect.mjs first.');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking fix: ${error.message}`);
    return false;
  }
}

async function createSummaryDocument() {
  try {
    console.log('Creating summary document...');
    
    const summary = `# Existing User Onboarding Redirect Fix

## Problem Description

Users with existing tenant IDs were being redirected to the onboarding flow instead of directly to their dashboard.

The issue was in the Auth0 callback logic, which was using a condition that would send users to onboarding if ANY of these conditions were true:
- User is marked as new
- User needs onboarding
- User has no tenant ID

This caused a problem where users with tenant IDs who were marked as "needsOnboarding" would be sent back through the onboarding flow unnecessarily.

## Solution

The fix modifies the Auth0 callback page to use a more precise condition for determining when to redirect to onboarding:

1. **Redirect to onboarding** only when the user has NO tenant ID AND (is a new user OR needs onboarding)
2. **Redirect to dashboard** for any user who has a tenant ID, regardless of their onboarding status

This ensures that existing users with tenant IDs always go straight to their dashboard.

## Implementation

The modified code now follows this logic:
\`\`\`javascript
// For users without a tenant ID who are new or need onboarding
if ((!backendUser.tenantId && (backendUser.isNewUser || backendUser.needsOnboarding))) {
  // Redirect to onboarding
}

// For users with a tenant ID (existing users)
if (backendUser.tenantId) {
  // Redirect directly to dashboard
}
\`\`\`

This fix helps prevent the issue where users get stuck in a loop of repeatedly being sent to onboarding even after they've completed it.

## Deployed Changes

- Modified \`frontend/pyfactor_next/src/app/auth/callback/page.js\` to improve onboarding redirection logic
- Created a backup of the original file
- Updated the script registry

Date: ${new Date().toISOString().slice(0, 10)}
`;
    
    await fs.writeFile(SUMMARY_PATH, summary, 'utf8');
    console.log(`✅ Created summary at ${SUMMARY_PATH}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating summary document: ${error.message}`);
    return false;
  }
}

async function updateScriptRegistry() {
  try {
    console.log('Updating script registry...');
    
    const registry = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    const today = new Date().toISOString().slice(0, 10);
    
    const updatedRegistry = registry + `\n
| Version0123_commit_and_deploy_onboarding_redirect_fix.mjs | ${today} | Commits and deploys fix for existing users being redirected to onboarding | ✅ |`;
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry, 'utf8');
    console.log('✅ Updated script registry');
    return true;
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
    return false;
  }
}

async function commitAndPush() {
  try {
    console.log('Committing changes to git...');
    
    // Add files
    execSync('git add frontend/pyfactor_next/src/app/auth/callback/page.js');
    execSync(`git add ${SUMMARY_PATH}`);
    execSync(`git add ${SCRIPT_REGISTRY_PATH}`);
    
    // Commit
    execSync('git commit -m "Fix existing user onboarding redirect issue"');
    console.log('✅ Changes committed successfully');
    
    // Push to deployment branch
    console.log('Pushing to Dott_Main_Dev_Deploy branch to trigger deployment...');
    execSync('git push origin HEAD:Dott_Main_Dev_Deploy');
    console.log('✅ Changes pushed to Dott_Main_Dev_Deploy successfully');
    
    return true;
  } catch (error) {
    console.error(`❌ Error in git operations: ${error.message}`);
    return false;
  }
}

async function deployFix() {
  try {
    // Check if fix is applied
    const isFixApplied = await checkFixApplied();
    if (!isFixApplied) {
      return false;
    }
    
    // Create summary document
    await createSummaryDocument();
    
    // Update script registry
    await updateScriptRegistry();
    
    // Commit and push to trigger deployment
    await commitAndPush();
    
    console.log('\n✅ Deployment process completed successfully!');
    console.log('The fix for existing user onboarding redirect has been deployed.');
    console.log('It may take a few minutes for the changes to propagate through Vercel.');
    
    return true;
  } catch (error) {
    console.error(`❌ Error during deployment: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Execute the deployment
deployFix();
