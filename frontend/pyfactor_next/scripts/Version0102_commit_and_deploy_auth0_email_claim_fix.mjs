/**
 * Version0102_commit_and_deploy_auth0_email_claim_fix.mjs
 * 
 * This script commits and deploys the Auth0 email claim fix to production.
 * It adds all modified files to git, commits them, and pushes to the deployment branch.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  deployBranch: 'Dott_Main_Dev_Deploy',
  commitMessage: 'Fix Auth0 token email claim issue causing onboarding redirect loop',
  filesToAdd: [
    '../src/config/auth0.js',
    '../src/middleware.js',
    './Version0101_fix_auth0_token_email_claim.mjs',
    './AUTH0_TOKEN_EMAIL_CLAIM_FIX_SUMMARY.md',
    './script_registry.md'
  ],
  scriptRegistryPath: './script_registry.md'
};

// Update script registry with deployment information
function updateScriptRegistry() {
  const registryPath = path.resolve(process.cwd(), config.scriptRegistryPath);
  const entry = `### Version0102_commit_and_deploy_auth0_email_claim_fix.mjs
- **Version**: 0102 v1.0
- **Purpose**: Deploy the Auth0 token email claim fix to production
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${new Date().toISOString().split('T')[0]}
- **Execution Date**: ${new Date().toISOString()}
- **Target Files**:
  - src/config/auth0.js - Email claim fix
  - src/middleware.js - Email scope enforcement
  - scripts/Version0101_fix_auth0_token_email_claim.mjs - Fix script
  - scripts/AUTH0_TOKEN_EMAIL_CLAIM_FIX_SUMMARY.md - Documentation
- **Description**: Commits and deploys the Auth0 token email claim fix to resolve the issue with users being redirected to onboarding instead of dashboard after signing in again
- **Deployment Method**: Git push to ${config.deployBranch} branch to trigger Vercel deployment

`;

  let registry = fs.readFileSync(registryPath, 'utf8');
  const insertPoint = registry.indexOf('### Version0101_');
  
  if (insertPoint > 0) {
    registry = registry.slice(0, insertPoint) + entry + registry.slice(insertPoint);
    fs.writeFileSync(registryPath, registry);
    return true;
  } else {
    console.error('❌ Could not find insertion point in script registry');
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting Auth0 email claim fix deployment...');
  
  try {
    // Add files to git
    console.log('📋 Adding files to git...');
    for (const file of config.filesToAdd) {
      const filePath = path.resolve(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`  Adding: ${file}`);
        execSync(`git add "${filePath}"`);
      } else {
        console.log(`  Skipping (not found): ${file}`);
      }
    }
    
    // Commit changes
    console.log('💾 Committing changes...');
    execSync(`git commit -m "${config.commitMessage}"`);
    console.log('✅ Changes committed successfully');
    
    // Push to deployment branch
    console.log(`🚀 Pushing to ${config.deployBranch} branch...`);
    execSync(`git push origin HEAD:${config.deployBranch}`);
    console.log('✅ Changes pushed successfully');
    
    // Update script registry
    if (updateScriptRegistry()) {
      console.log('✅ Script registry updated');
    }
    
    console.log('\n🎉 Auth0 email claim fix deployment complete!');
    console.log('\nSummary:');
    console.log('1. Fixed Auth0 tokens to include email claims');
    console.log('2. Updated middleware to enforce email scope in token requests');
    console.log('3. Added debugging hooks to track token and session information');
    console.log('4. Committed and pushed changes to trigger Vercel deployment');
    console.log('\nThe deployment should now be building on Vercel. Check the Vercel dashboard');
    console.log('for deployment status and logs if any issues arise.');
    
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
    console.error('Please fix the issue and try again.');
    process.exit(1);
  }
}

// Execute the main function
main();
