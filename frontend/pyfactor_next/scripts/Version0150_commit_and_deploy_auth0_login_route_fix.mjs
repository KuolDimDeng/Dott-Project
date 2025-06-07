#!/usr/bin/env node

/**
 * Script: Version0150_commit_and_deploy_auth0_login_route_fix.mjs
 * Purpose: Commit and deploy the Auth0 login route fix to resolve the 500 error
 * Date: 2025-06-07
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Config
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const DEPLOY_BRANCH = 'Dott_Main_Dev_Deploy';
const FILES_TO_COMMIT = [
  'frontend/pyfactor_next/src/app/api/auth/login/route.js',
  'frontend/pyfactor_next/scripts/Version0149_fix_auth0_login_route_domain_issue.mjs',
  'frontend/pyfactor_next/scripts/AUTH0_LOGIN_ROUTE_FIX.md',
  'frontend/pyfactor_next/scripts/script_registry.md'
];

// Documentation
const DOCUMENTATION = `# Auth0 Login Route 500 Error Fix Deployment

## Problem
The Auth0 login route (api/auth/login) was returning a 500 error due to:
1. Variable scope issues in the error handling block
2. Domain consistency issues between Auth0 configuration and the login route
3. Improper error handling when environmental variables are not available

## Solution
This script commits and deploys the fixes implemented in Version0149_fix_auth0_login_route_domain_issue.mjs:
1. Properly scoped variables to ensure they're available in the catch block
2. Ensured consistent domain usage with the Auth0 custom domain (auth.dottapps.com)
3. Improved error handling to provide better diagnostic information
4. Added additional validation to prevent errors during initialization

## Deployment Process
1. Commit the changes to the Auth0 login route
2. Push to the Dott_Main_Dev_Deploy branch to trigger deployment
3. Verify the changes in production

## Verification Steps
After deployment, users should be able to:
1. Access the login page without encountering 500 errors
2. Successfully authenticate with Auth0
3. Be redirected to the appropriate callback URL
`;

// Utility function to execute commands and handle errors
function executeCommand(command, errorMessage) {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`${errorMessage}:\n${error.message}`);
    throw error;
  }
}

// Update script registry
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `\n| Version0150_commit_and_deploy_auth0_login_route_fix.mjs | Deploy Auth0 login route fix to production | 2025-06-07 | Completed | Committed and pushed changes to ${DEPLOY_BRANCH} branch |`;
  
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Create documentation
function createDocumentation() {
  const docPath = 'frontend/pyfactor_next/scripts/AUTH0_LOGIN_ROUTE_FIX_DEPLOYMENT.md';
  fs.writeFileSync(docPath, DOCUMENTATION);
  console.log(`Created deployment documentation at ${docPath}`);
  FILES_TO_COMMIT.push(docPath);
  return docPath;
}

// Commit changes
function commitChanges() {
  // Create documentation first so it's included in the commit
  createDocumentation();
  
  // Add files to staging
  const filesString = FILES_TO_COMMIT.join(' ');
  executeCommand(`git add ${filesString}`, 'Failed to stage files');
  
  // Commit with meaningful message
  const commitMessage = 'Fix Auth0 login route 500 error with proper variable scoping and domain consistency';
  executeCommand(`git commit -m "${commitMessage}"`, 'Failed to commit changes');
  
  return true;
}

// Push to deployment branch
function pushToDeployBranch() {
  // Check current branch
  const currentBranch = executeCommand('git rev-parse --abbrev-ref HEAD', 'Failed to get current branch').trim();
  console.log(`Current branch: ${currentBranch}`);
  
  if (currentBranch !== DEPLOY_BRANCH) {
    console.log(`Not on ${DEPLOY_BRANCH} branch. Creating a new branch...`);
    // Create a temporary branch for deployment
    const tempBranch = `auth0-login-fix-${Date.now()}`;
    executeCommand(`git checkout -b ${tempBranch}`, `Failed to create temporary branch ${tempBranch}`);
    
    // Push to the deployment branch
    executeCommand(`git push origin ${tempBranch}:${DEPLOY_BRANCH}`, `Failed to push to ${DEPLOY_BRANCH}`);
    
    // Switch back to original branch
    executeCommand(`git checkout ${currentBranch}`, `Failed to switch back to ${currentBranch}`);
    console.log(`Switched back to ${currentBranch}`);
  } else {
    // Already on deployment branch, just push
    executeCommand(`git push origin ${DEPLOY_BRANCH}`, `Failed to push to ${DEPLOY_BRANCH}`);
  }
  
  return true;
}

// Main execution
console.log('Starting Auth0 login route fix deployment script...');

try {
  // Update registry first before committing
  updateScriptRegistry();
  
  // Commit changes
  console.log('Committing changes...');
  if (commitChanges()) {
    console.log('Successfully committed changes!');
    
    // Push to deployment branch
    console.log(`Pushing to ${DEPLOY_BRANCH} branch...`);
    if (pushToDeployBranch()) {
      console.log(`Successfully pushed to ${DEPLOY_BRANCH}!`);
      console.log('\nDeployment initiated. Please allow time for the deployment to complete.');
      console.log('\nVerification steps:');
      console.log('1. Check deployment status in Vercel dashboard');
      console.log('2. Test the login functionality at https://dottapps.com/api/auth/login');
      console.log('3. Verify the redirection to Auth0\'s login page works correctly');
      console.log('4. Confirm the URL uses auth.dottapps.com domain instead of the default Auth0 domain');
    }
  }
  
  process.exit(0);
} catch (error) {
  console.error('Error executing script:', error);
  process.exit(1);
}
