/**
 * Version0115_commit_and_deploy_auth0_onboarding_redirect_fix.mjs
 * 
 * This script automates the deployment of the post-auth0 onboarding redirect fix
 * by executing Version0114, committing the changes, and pushing to the deployment branch.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const DEPLOYMENT_BRANCH = 'Dott_Main_Dev_Deploy';
const SCRIPT_TO_EXECUTE = './scripts/Version0114_fix_post_auth0_onboarding_redirect.mjs';
const COMMIT_MESSAGE = 'Fix post-auth0 onboarding redirect issues';

// Update script registry with deployment info
const updateScriptRegistry = () => {
  const registryPath = 'scripts/script_registry.md';
  let content = fs.readFileSync(registryPath, 'utf8');
  
  // Update Version0114 status to EXECUTED
  content = content.replace(
    /### Version0114_fix_post_auth0_onboarding_redirect\.mjs[\s\S]*?- \*\*Status\*\*: 🔄 PENDING EXECUTION[\s\S]*?- \*\*Execution Date\*\*: -/,
    `### Version0114_fix_post_auth0_onboarding_redirect.mjs\\
- **Version**: 0114 v1.0\\
- **Purpose**: Fix post-auth0 onboarding redirect issue\\
- **Status**: ✅ EXECUTED SUCCESSFULLY\\
- **Creation Date**: 2025-06-06\\
- **Execution Date**: ${new Date().toISOString().split('T')[0]}`
  );
  
  // Add Version0115 (this script) to registry
  content = content.replace(
    /## Script Inventory\n\n### Version0114/,
    `## Script Inventory

### Version0115_commit_and_deploy_auth0_onboarding_redirect_fix.mjs
- **Version**: 0115 v1.0
- **Purpose**: Commit and deploy auth0 onboarding redirect fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${new Date().toISOString().split('T')[0]}
- **Execution Date**: ${new Date().toISOString().split('T')[0]}
- **Target Files**: Deploys changes from Version0114
- **Description**: Commits and deploys the auth0 onboarding redirect fix
- **Key Features**:
  - Automatically commits all changes to git
  - Pushes to the ${DEPLOYMENT_BRANCH} branch to trigger deployment
  - Updates script registry with deployment information
- **Requirements Addressed**: 
  - Users should be redirected to dashboard, not onboarding, after signing out and back in
  - The Dashboard button should be shown in the AppBar after authentication
  - Multiple source persistence for onboarding status
- **Deployment Method**: Git push to ${DEPLOYMENT_BRANCH} branch

### Version0114`
  );
  
  fs.writeFileSync(registryPath, content);
  console.log('Updated script registry with deployment info');
};

// Main deployment process
const deployFix = async () => {
  try {
    console.log('Starting deployment process...');
    
    // 1. Execute the fix script
    console.log(`Executing ${SCRIPT_TO_EXECUTE}...`);
    execSync(`node ${SCRIPT_TO_EXECUTE}`, { stdio: 'inherit' });
    
    // 2. Update script registry
    console.log('Updating script registry...');
    updateScriptRegistry();
    
    // 3. Stage all changes
    console.log('Staging changes for commit...');
    execSync('git add .', { stdio: 'inherit' });
    
    // 4. Commit changes
    console.log('Committing changes...');
    execSync(`git commit -m "${COMMIT_MESSAGE}"`, { stdio: 'inherit' });
    
    // 5. Push to deployment branch
    console.log(`Pushing to ${DEPLOYMENT_BRANCH}...`);
    execSync(`git push origin ${DEPLOYMENT_BRANCH}`, { stdio: 'inherit' });
    
    console.log('Deployment completed successfully!');
    console.log('Changes have been pushed to the deployment branch and will be automatically deployed.');
    console.log('The fix for post-auth0 onboarding redirect should be live within a few minutes.');
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
};

// Execute deployment
deployFix();
