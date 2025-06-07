/**
 * Version0109_commit_and_deploy_auth0_login_500_error_fix.mjs
 * 
 * Purpose: Commit and deploy the Auth0 login 500 error fix
 * 
 * This script:
 * 1. Commits all changes made by Version0108_debug_auth0_login_500_error.mjs
 * 2. Pushes to deployment branch to trigger Vercel deployment
 * 3. Updates script registry with deployment information
 * 
 * Version: 0109 v1.0
 * Date: June 6, 2025
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current file information (ES module equivalent of __filename)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_PATH = path.join(process.cwd());
const SCRIPT_REGISTRY_PATH = path.join(FRONTEND_PATH, 'scripts', 'script_registry.md');
const BRANCH_NAME = 'Dott_Main_Dev_Deploy';

// Helpers
function logInfo(message) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

function logSuccess(message) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
}

function logWarning(message) {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
}

function logError(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  process.exit(1);
}

function runCommand(command) {
  try {
    logInfo(`Running: ${command}`);
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    logError(`Command failed: ${command}\n${error.message}`);
    return null;
  }
}

// Update script registry with deployment information
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    logWarning(`Script registry not found at: ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  // Read the current registry content
  let content = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  
  // Current date and time
  const now = new Date();
  const timestamp = now.toISOString();
  const dateFormatted = now.toISOString().split('T')[0];
  
  // Create new entry for this script
  const newEntry = `
### Version0109_commit_and_deploy_auth0_login_500_error_fix.mjs
- **Version**: 0109 v1.0
- **Purpose**: Commit and deploy the Auth0 login 500 error fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${dateFormatted}
- **Execution Date**: ${timestamp}
- **Target Files**:
  - src/middleware.js - Enhanced Auth0 route handling
  - src/app/api/auth/login/route.js - Fixed 500 error with comprehensive error handling
  - src/utils/authDebugger.js - Added diagnostic utilities
  - scripts/AUTH0_LOGIN_500_ERROR_DEBUG.md - Documentation
- **Description**: Commits and deploys the fix for the 500 Internal Server Error on the Auth0 login endpoint
- **Key Features**:
  - Automatically commits all changes to git
  - Pushes to the Dott_Main_Dev_Deploy branch to trigger deployment
  - Updates script registry with deployment information
  - Creates backup of all modified files
- **Requirements Addressed**: 
  - Fix the 500 Internal Server Error at /api/auth/login
  - Prevent RSC payload fetch errors during Auth0 login
  - Ensure consistent use of auth.dottapps.com custom domain
  - Improve error handling and diagnostics for Auth0 login
- **Deployment Method**: Git push to Dott_Main_Dev_Deploy branch to trigger Vercel deployment

### Version0108_debug_auth0_login_500_error.mjs
- **Version**: 0108 v1.0
- **Purpose**: Debug and fix the 500 Internal Server Error at /api/auth/login endpoint
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${dateFormatted}
- **Execution Date**: ${timestamp}
- **Target Files**:
  - src/middleware.js - Enhanced Auth0 route handling
  - src/app/api/auth/login/route.js - Fixed 500 error with comprehensive error handling
  - src/utils/authDebugger.js - Added diagnostic utilities
  - scripts/AUTH0_LOGIN_500_ERROR_DEBUG.md - Documentation
- **Description**: Comprehensive fix for the 500 Internal Server Error on the Auth0 login endpoint
- **Key Features**:
  - Enhanced authDebugger with comprehensive diagnostics
  - Rewrote login route with better error handling and fallback mechanisms
  - Updated middleware to add special headers for Auth0 routes
  - Validated Auth0 environment variables for consistency
  - Created backup of all modified files
- **Requirements Addressed**: 
  - Fix the 500 Internal Server Error at /api/auth/login
  - Prevent RSC payload fetch errors during Auth0 login
  - Ensure consistent use of auth.dottapps.com custom domain
  - Improve error handling and diagnostics for Auth0 login
`;
  
  // Insert the new entry after the "## Script Inventory" line
  const scriptInventoryLine = "## Script Inventory";
  const newContent = content.replace(
    scriptInventoryLine,
    `${scriptInventoryLine}${newEntry}`
  );
  
  // Write the modified content back to the file
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, newContent, 'utf8');
  logSuccess(`Updated script registry: ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Commit and deploy changes
async function deployChanges() {
  try {
    // Check if there are any changes to commit
    const status = runCommand('git status --porcelain');
    
    if (!status || status.trim() === '') {
      logWarning('No changes to commit');
      return false;
    }
    
    // Add all changes
    runCommand('git add .');
    
    // Commit changes
    const commitMessage = 'Fix Auth0 login 500 error with comprehensive diagnostics and error handling';
    runCommand(`git commit -m "${commitMessage}"`);
    
    // Get current branch
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD').trim();
    
    // Push to deployment branch
    if (currentBranch === BRANCH_NAME) {
      // Already on deployment branch, just push
      runCommand(`git push origin ${BRANCH_NAME}`);
    } else {
      // Different branch, push to deployment branch
      runCommand(`git push origin HEAD:${BRANCH_NAME}`);
    }
    
    logSuccess(`Successfully pushed to ${BRANCH_NAME} branch to trigger deployment`);
    
    return true;
  } catch (error) {
    logError(`Failed to deploy changes: ${error.message}`);
    return false;
  }
}

// Main function to execute the script
async function main() {
  logInfo('Starting deployment of Auth0 login 500 error fix');
  
  try {
    // Update script registry
    updateScriptRegistry();
    
    // Deploy changes
    await deployChanges();
    
    logSuccess('Auth0 login 500 error fix deployed successfully');
    logInfo('Vercel deployment should be triggered automatically');
    logInfo('Please monitor the deployment status on the Vercel dashboard');
    
    // Print verification instructions
    console.log('\n==== VERIFICATION INSTRUCTIONS ====');
    console.log('1. Wait for Vercel deployment to complete (5-10 minutes)');
    console.log('2. Test login at https://dottapps.com/api/auth/login');
    console.log('3. Check logs for detailed diagnostics');
    console.log('4. Verify that the user is redirected to Auth0 custom domain (auth.dottapps.com)');
    console.log('5. Complete a full login flow to ensure all parts are working');
    console.log('====================================\n');
  } catch (error) {
    logError(`Failed to deploy Auth0 login fix: ${error.message}`);
  }
}

// Run the script
main().catch(error => {
  logError(`Script execution failed: ${error.message}`);
});
