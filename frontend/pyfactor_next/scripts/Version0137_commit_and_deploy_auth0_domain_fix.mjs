/**
 * Version0137_commit_and_deploy_auth0_domain_fix.mjs
 * 
 * This script commits and deploys the Auth0 domain mismatch fix:
 * - Executes the fix script (Version0136)
 * - Commits the changes to git
 * - Pushes to the Dott_Main_Dev_Deploy branch
 * 
 * Execution:
 * node scripts/Version0137_commit_and_deploy_auth0_domain_fix.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define paths
const REGISTRY_PATH = 'scripts/script_registry.md';

// Update script registry
function updateScriptRegistry() {
  try {
    let registry = fs.readFileSync(REGISTRY_PATH, 'utf8');
    
    const entry = `
| Version0137_commit_and_deploy_auth0_domain_fix.mjs | Commits and deploys the Auth0 domain mismatch fix | Executed | $(date) |
`;
    
    // Add entry to the registry
    registry = registry.replace(
      /## Script Registry\n\n\| Script Name \| Purpose \| Status \| Date \|\n\|---\|---\|---\|---\|/,
      `## Script Registry\n\n| Script Name | Purpose | Status | Date |\n|---|---|---|---|${entry}`
    );
    
    fs.writeFileSync(REGISTRY_PATH, registry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Error updating script registry:', error);
  }
}

// Execute the fix script
function executeFixScript() {
  try {
    console.log('🔧 Executing Version0136_fix_auth0_domain_mismatch.mjs...');
    execSync('node scripts/Version0136_fix_auth0_domain_mismatch.mjs', { stdio: 'inherit' });
    console.log('✅ Successfully executed fix script');
  } catch (error) {
    console.error('❌ Error executing fix script:', error);
    process.exit(1);
  }
}

// Git operations
function commitAndPushChanges() {
  try {
    // Add modified files to git
    console.log('📝 Adding files to git...');
    execSync('git add src/config/auth0.js src/app/api/auth/login/route.js src/app/api/auth/[...auth0]/route.js scripts/AUTH0_DOMAIN_CONFIG_FIX_SUMMARY.md scripts/Version0136_fix_auth0_domain_mismatch.mjs scripts/Version0137_commit_and_deploy_auth0_domain_fix.mjs scripts/script_registry.md', { stdio: 'inherit' });
    
    // Commit changes
    console.log('💾 Committing changes...');
    execSync('git commit -m "Fix: Auth0 domain mismatch and 500 error in login route"', { stdio: 'inherit' });
    
    // Push to deployment branch
    console.log('🚀 Pushing to Dott_Main_Dev_Deploy branch...');
    execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
    
    console.log('✅ Successfully committed and pushed changes');
  } catch (error) {
    console.error('❌ Error in git operations:', error);
    process.exit(1);
  }
}

// Main execution
console.log('🚀 Starting deployment of Auth0 domain mismatch fix...');

// Execute each step
executeFixScript();
updateScriptRegistry();
commitAndPushChanges();

console.log('');
console.log('✅ Auth0 domain mismatch fix has been deployed');
console.log('');
console.log('📋 Deployment Summary:');
console.log('1. Fixed duplicate domain property in Auth0 config');
console.log('2. Enhanced domain validation in login route');
console.log('3. Resolved route handler conflicts');
console.log('4. Improved error handling and debugging');
console.log('');
console.log('📊 Verification:');
console.log('The changes will be live after the Vercel deployment completes (usually a few minutes)');
console.log('Verify by navigating to https://dottapps.com/api/auth/login');
console.log('');
console.log('🔍 Monitoring:');
console.log('Check Vercel deployment logs for any issues');
console.log('Monitor error rates in production for any regressions');
