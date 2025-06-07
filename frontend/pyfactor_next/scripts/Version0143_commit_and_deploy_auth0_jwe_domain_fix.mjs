// Version0143_commit_and_deploy_auth0_jwe_domain_fix.mjs
// Deploy the Auth0 JWE token and domain mismatch fix
// Created: 2025-06-07

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Update the script registry
function updateScriptRegistry() {
  console.log("Updating script registry");
  
  const registryPath = 'frontend/pyfactor_next/scripts/script_registry.md';
  const scriptEntry = `| Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs | Fix Auth0 JWE token validation, rate limiting, and domain mismatch issues | 2025-06-07 | ✅ |
| Version0143_commit_and_deploy_auth0_jwe_domain_fix.mjs | Deploy the Auth0 JWE token and domain mismatch fix | 2025-06-07 | ✅ |`;
  
  try {
    let content = fs.readFileSync(path.resolve(registryPath), 'utf8');
    
    if (!content.includes('Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs')) {
      // Find the table in the registry and add the new entry
      const tableRegex = /(\|\s*Script Name\s*\|\s*Purpose\s*\|\s*Date\s*\|\s*Status\s*\|[\s\S]*?)(\n\n|$)/;
      content = content.replace(tableRegex, (match, table, ending) => {
        return `${table}${scriptEntry}${ending}`;
      });
      
      fs.writeFileSync(path.resolve(registryPath), content, 'utf8');
      console.log("Updated script registry");
    } else {
      console.log("Script already registered, skipping update");
    }
  } catch (error) {
    console.error("Error updating script registry:", error);
  }
}

// Commit changes to Git
function commitChanges() {
  console.log("Committing changes");
  
  try {
    // Stage all changed files
    execSync('git add frontend/pyfactor_next/src/config/auth0.js frontend/pyfactor_next/src/services/apiService.js frontend/pyfactor_next/src/app/api/auth/callback/route.js frontend/pyfactor_next/production.env frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js frontend/pyfactor_next/scripts/AUTH0_JWE_DOMAIN_MISMATCH_FIX.md frontend/pyfactor_next/scripts/Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs frontend/pyfactor_next/scripts/Version0143_commit_and_deploy_auth0_jwe_domain_fix.mjs frontend/pyfactor_next/scripts/script_registry.md', { stdio: 'inherit' });
    
    // Commit with message
    execSync('git commit -m "Fix Auth0 JWE token validation, rate limiting, and domain mismatch issues"', { stdio: 'inherit' });
    
    console.log("Changes committed successfully");
  } catch (error) {
    console.error("Error committing changes:", error);
    process.exit(1);
  }
}

// Push changes to remote
function pushChanges() {
  console.log("Deploying changes");
  
  try {
    // Push to the deployment branch
    execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
    
    console.log("Changes deployed successfully");
  } catch (error) {
    console.error("Error deploying changes:", error);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log("Starting deployment of Auth0 JWE and domain mismatch fix");
  
  // Update script registry
  updateScriptRegistry();
  
  // Commit changes
  commitChanges();
  
  // Push changes to trigger deployment
  pushChanges();
  
  console.log("Completed deployment of Auth0 JWE and domain mismatch fix");
}

main().catch(console.error);
