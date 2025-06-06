/**
 * Version0098_commit_and_deploy_auth0_custom_domain_fix.mjs
 * 
 * Purpose: Commit and push the Auth0 custom domain fix to trigger deployment
 * Version: 0098
 * Date: 2025-06-06
 * 
 * This script:
 * 1. Commits all changes related to the Auth0 custom domain fix
 * 2. Pushes to the Dott_Main_Dev_Deploy branch to trigger deployment
 * 3. Updates the script registry
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');
const SCRIPT_REGISTRY_PATH = path.join(__dirname, 'script_registry.md');

// Commit message for the changes
const COMMIT_MESSAGE = 'Fix Auth0 custom domain issues and add debugging utilities';
// Branch to push to for deployment
const DEPLOY_BRANCH = 'Dott_Main_Dev_Deploy';

/**
 * Execute a shell command and return its output
 */
function executeCommand(command, cwd = REPO_ROOT) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout.trim());
    });
  });
}

/**
 * Updates the script registry with information about this script
 */
async function updateScriptRegistry() {
  try {
    const registry = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    
    // Check if this script is already in the registry
    if (registry.includes('Version0098_commit_and_deploy_auth0_custom_domain_fix.mjs')) {
      console.log('Script already registered in registry');
      return;
    }
    
    // Get current date in ISO format
    const executionDate = new Date().toISOString();
    
    // New entry for the registry
    const newEntry = `
### Version0098_commit_and_deploy_auth0_custom_domain_fix.mjs
- **Version**: 0098 v1.0
- **Purpose**: Commit and push Auth0 custom domain fix to trigger deployment
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: ${executionDate}
- **Description**: Commits and pushes Auth0 custom domain fix to Dott_Main_Dev_Deploy branch for deployment
- **Key Features**:
  - Commits all changes related to Auth0 custom domain fix
  - Pushes to deployment branch to trigger Vercel build
  - Updates script registry with deployment information
- **Requirements Addressed**: 
  - Fix Auth0 domain mismatch causing 500 errors
  - Trigger deployment of fixes to production
`;

    // Add the new entry after the Purpose section
    const updatedRegistry = registry.replace(
      '## Script Inventory',
      '## Script Inventory' + newEntry
    );
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('Error updating script registry:', error);
    throw error;
  }
}

/**
 * Main function to commit and push changes
 */
async function main() {
  try {
    console.log('Starting commit and deploy process for Auth0 custom domain fix...');
    
    // 1. Check git status
    const gitStatus = await executeCommand('git status --porcelain');
    if (!gitStatus) {
      console.log('No changes to commit. Repository is clean.');
      return;
    }
    
    console.log('Changes detected in the repository:');
    console.log(gitStatus);
    
    // 2. Add all changes
    await executeCommand('git add .');
    console.log('✅ Added all changes to git staging');
    
    // 3. Commit the changes
    await executeCommand(`git commit -m "${COMMIT_MESSAGE}"`);
    console.log(`✅ Committed changes with message: "${COMMIT_MESSAGE}"`);
    
    // 4. Get current branch
    const currentBranch = await executeCommand('git rev-parse --abbrev-ref HEAD');
    console.log(`Current branch: ${currentBranch}`);
    
    // 5. Push changes to trigger deployment
    if (currentBranch === DEPLOY_BRANCH) {
      // If already on deploy branch, just push
      await executeCommand(`git push origin ${DEPLOY_BRANCH}`);
    } else {
      // Otherwise checkout deploy branch, merge changes, and push
      const hasDeployBranch = await executeCommand(`git branch --list ${DEPLOY_BRANCH}`).then(output => !!output);
      
      if (hasDeployBranch) {
        // Branch exists, checkout and merge
        await executeCommand(`git checkout ${DEPLOY_BRANCH}`);
        await executeCommand(`git merge ${currentBranch}`);
      } else {
        // Branch doesn't exist, create and checkout
        await executeCommand(`git checkout -b ${DEPLOY_BRANCH}`);
      }
      
      // Push to trigger deployment
      await executeCommand(`git push origin ${DEPLOY_BRANCH}`);
      
      // Return to original branch
      await executeCommand(`git checkout ${currentBranch}`);
    }
    
    console.log(`✅ Pushed changes to ${DEPLOY_BRANCH} to trigger deployment`);
    
    // 6. Update script registry
    await updateScriptRegistry();
    
    console.log('\n📝 SUMMARY OF ACTIONS:');
    console.log('1. Committed all Auth0 custom domain fix changes');
    console.log(`2. Pushed changes to ${DEPLOY_BRANCH} branch`);
    console.log('3. Updated script registry with deployment information');
    
    console.log('\n🚀 Deployment triggered successfully! The fix will be live after the build completes.');

  } catch (error) {
    console.error('Error in commit and deploy process:', error);
    process.exit(1);
  }
}

// Execute the main function
main();
