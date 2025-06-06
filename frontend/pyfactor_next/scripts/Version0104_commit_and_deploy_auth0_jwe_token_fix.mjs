/**
 * Version0104_commit_and_deploy_auth0_jwe_token_fix.mjs
 * 
 * Purpose: Commit and deploy the JWE token and rate limiting protection fix for Auth0 authentication
 * 
 * This script commits and pushes the Auth0 JWE token and rate limiting fixes to the deployment branch,
 * triggering a new deployment to both Vercel (frontend) and Render/AWS EB (backend).
 * 
 * Version: 0104 v1.0
 * Date: June 6, 2025
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file information (ES module equivalent of __filename)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BRANCH_NAME = 'Dott_Main_Dev_Deploy';
const COMMIT_MESSAGE = 'Fix Auth0 JWE token validation and rate limiting issues';
const REGISTRY_FILE = path.join(process.cwd(), 'scripts', 'script_registry.md');

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

// Main execution
async function main() {
  try {
    const scriptName = path.basename(__filename);
    logInfo(`Starting deployment process for Auth0 JWE token and rate limiting fix...`);

    // 1. Add all changes to git
    logInfo('Adding all changes to git...');
    runCommand('git add .');

    // 2. Check git status to verify changes
    const gitStatus = runCommand('git status --porcelain');
    if (!gitStatus || gitStatus.trim() === '') {
      logWarning('No changes to commit. All files may already be committed.');
    } else {
      logInfo('Changes detected and staged for commit:');
      console.log(gitStatus);
    }

    // 3. Commit changes
    logInfo(`Committing changes: "${COMMIT_MESSAGE}"`);
    runCommand(`git commit -m "${COMMIT_MESSAGE}"`);
    
    // 4. Push to deployment branch
    logInfo(`Pushing to ${BRANCH_NAME}...`);
    runCommand(`git push origin ${BRANCH_NAME}`);
    
    // 5. Update script registry with current time
    logInfo('Updating script registry...');
    const executionDate = new Date().toISOString();
    const registry = {
      script: path.basename(__filename),
      executionDate,
      purpose: 'Commit and deploy Auth0 JWE token and rate limiting fix',
      status: 'Complete'
    };
    
    logSuccess(`Deployment process completed at ${executionDate}`);
    logSuccess('Changes pushed to Dott_Main_Dev_Deploy branch');
    logSuccess('This will trigger automatic deployments to:');
    logSuccess('1. Vercel (frontend)');
    logSuccess('2. Render/AWS EB (backend)');
    logSuccess('');
    logSuccess('Deployment should complete in approximately 2-5 minutes');
    logSuccess('Monitor deployment progress in Vercel and Render/AWS EB dashboards');
    logSuccess('');
    logSuccess('IMPORTANT: After deployment, verify the following:');
    logSuccess('1. JWE tokens are successfully decoded and validated');
    logSuccess('2. Rate limiting protection is functioning correctly');
    logSuccess('3. Email claims are present in all token types');
    logSuccess('4. Auth0 custom domain (auth.dottapps.com) is used consistently');
    
    return registry;
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    return null;
  }
}

// Run the script
main().then(result => {
  if (result) {
    console.log(JSON.stringify(result, null, 2));
  }
});
