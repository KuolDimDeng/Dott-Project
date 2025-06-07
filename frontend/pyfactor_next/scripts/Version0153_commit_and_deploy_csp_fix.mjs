#!/usr/bin/env node

/**
 * Script: Version0153_commit_and_deploy_csp_fix.mjs
 * Purpose: Commit and deploy the Content Security Policy fix
 * Date: 2025-06-07
 */

import fs from 'fs';
import { execSync } from 'child_process';

// Config
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';

// Update script registry
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `\n| Version0153_commit_and_deploy_csp_fix.mjs | Commit and deploy the Content Security Policy fix | 2025-06-07 | Completed | Committed and pushed CSP fix to Dott_Main_Dev_Deploy branch |`;
  
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Commit and push the changes
function commitAndPushChanges() {
  try {
    console.log('Committing and pushing changes...');
    
    // Add files
    execSync('git add frontend/pyfactor_next/next.config.js frontend/pyfactor_next/scripts/AUTH0_CSP_FIX_SUMMARY.md frontend/pyfactor_next/scripts/Version0152_fix_content_security_policy.mjs frontend/pyfactor_next/scripts/Version0153_commit_and_deploy_csp_fix.mjs frontend/pyfactor_next/scripts/script_registry.md', { stdio: 'inherit' });
    
    // Commit
    execSync('git commit -m "Fix: Added Auth0 custom domain to Content-Security-Policy"', { stdio: 'inherit' });
    
    // Push to deployment branch
    execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
    
    console.log('Changes committed and pushed successfully');
    return true;
  } catch (error) {
    console.error('Error during git operations:', error);
    return false;
  }
}

// Run the script
console.log('Starting deployment of CSP fix...');
updateScriptRegistry();
const success = commitAndPushChanges();

if (success) {
  console.log('Deployment completed successfully!');
  console.log('The CSP fix has been deployed to production.');
  console.log('The auth.dottapps.com domain is now allowed in the Content-Security-Policy.');
} else {
  console.error('Deployment failed. Please check the logs for more information.');
}
