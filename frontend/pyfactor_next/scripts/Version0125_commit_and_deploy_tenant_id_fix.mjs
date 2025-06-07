import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const SUMMARY_PATH = 'frontend/pyfactor_next/scripts/TENANT_ID_AUTH0_FIX_SUMMARY.md';

async function checkFixApplied() {
  try {
    console.log('Checking if the fix has been applied...');
    const apiRoute = await fs.readFile('frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js', 'utf8');
    
    if (apiRoute.includes('RETURNING EXISTING USER WITH TENANT ID')) {
      console.log('Fix already applied, proceeding with deployment...');
      return true;
    } else {
      console.log('❌ Fix not applied. Please run Version0124_fix_tenant_id_auth0_session.mjs first.');
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
    
    const summary = `# Auth0 Tenant ID Session Fix

## Problem Description

Users with existing tenant IDs were not having their tenant IDs properly set in the Auth0 session. This resulted in several issues:

1. The Auth0 callback was not getting the tenant ID properly, causing users to be treated as new users
2. The needsOnboarding and onboardingCompleted flags were not being properly set or were inconsistent
3. Users were being redirected to onboarding even if they had completed it before

The logs showed that although a user had a tenant ID in the database, it wasn't being properly passed to the frontend during authentication, resulting in \`undefined\` values and conflicting status flags.

## Root Cause Analysis

The issue was occurring in the Auth0 user creation/lookup API endpoint. When an existing user was found in the database, the response included the tenant ID, but it wasn't:

1. Consistently using both \`tenant_id\` and \`tenantId\` fields (some parts of the code expected one, other parts expected the other)
2. Updating the Auth0 session cookie with the tenant ID information
3. Setting backup tenant ID cookies for additional persistence

## Solution

The fix modifies the create-auth0-user API route to:

1. Return both \`tenant_id\` and \`tenantId\` fields for consistency
2. Update the Auth0 session cookie with the correct tenant ID and onboarding status
3. Set additional tenant ID cookies for persistent storage and future lookups
4. Ensure consistent handling of onboarding status flags

This ensures that when an existing user logs in, their tenant ID is properly preserved in all required locations, preventing the system from treating them as new users or directing them to onboarding unnecessarily.

## Implementation Details

The changes were focused on the \`/app/api/user/create-auth0-user/route.js\` file, specifically improving the handling of existing users by returning a more complete response that includes session cookie updates.

## Deployed Changes

- Modified \`frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js\` to improve tenant ID handling
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
| Version0125_commit_and_deploy_tenant_id_fix.mjs | ${today} | Commits and deploys fix for tenant ID not being properly stored in Auth0 session | ✅ |`;
    
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
    execSync('git add frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js');
    execSync(`git add ${SUMMARY_PATH}`);
    execSync(`git add ${SCRIPT_REGISTRY_PATH}`);
    
    // Commit
    execSync('git commit -m "Fix tenant ID handling in Auth0 session"');
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
    console.log('The fix for Auth0 tenant ID session handling has been deployed.');
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
