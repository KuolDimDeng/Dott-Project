// Version0141_commit_and_deploy_auth_flow_logging_fixed.mjs
// Commits and deploys the comprehensive auth flow logging
// Created: 2025-06-07

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const scriptRegistryPath = 'frontend/pyfactor_next/scripts/script_registry.md';

// Update script registry
function updateScriptRegistry() {
  console.log('Updating script registry');
  
  try {
    const registryContent = fs.readFileSync(path.resolve(scriptRegistryPath), 'utf8');
    
    // Check if entries already exist
    if (registryContent.includes('Version0140_add_comprehensive_auth_flow_logging_fixed.mjs') &&
        registryContent.includes('Version0141_commit_and_deploy_auth_flow_logging_fixed.mjs')) {
      console.log('Registry already contains entries for these scripts');
      return;
    }
    
    // Parse registry content to find the right location for new entries
    const lines = registryContent.split('\n');
    const headerIndex = lines.findIndex(line => line.includes('| Script Name | Purpose | Date | Status |'));
    
    if (headerIndex === -1) {
      console.error('Could not find header row in script registry');
      // Try to add entries at the top of the file
      const newContent = `| Version0141_commit_and_deploy_auth_flow_logging_fixed.mjs | Commit and deploy the comprehensive auth flow logging (fixed paths) | 2025-06-07 | 🔄 Pending Execution |\n| Version0140_add_comprehensive_auth_flow_logging_fixed.mjs | Add detailed debug logging throughout the auth flow with fixed paths | 2025-06-07 | ✅ Completed |\n\n${registryContent}`;
      fs.writeFileSync(path.resolve(scriptRegistryPath), newContent, 'utf8');
      console.log('Added entries at the top of the registry file');
      return;
    }
    
    // Add new entries after the header
    lines.splice(headerIndex + 1, 0,
      '| Version0141_commit_and_deploy_auth_flow_logging_fixed.mjs | Commit and deploy the comprehensive auth flow logging (fixed paths) | 2025-06-07 | 🔄 Pending Execution |',
      '| Version0140_add_comprehensive_auth_flow_logging_fixed.mjs | Add detailed debug logging throughout the auth flow with fixed paths | 2025-06-07 | ✅ Completed |'
    );
    
    fs.writeFileSync(path.resolve(scriptRegistryPath), lines.join('\n'), 'utf8');
    console.log('Updated script registry');
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

// Commit changes
function commitChanges() {
  console.log('Committing changes');
  
  try {
    // Add modified files
    execSync('git add frontend/pyfactor_next/src/app/api/auth/login/route.js');
    execSync('git add frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js');
    execSync('git add frontend/pyfactor_next/src/config/auth0.js');
    execSync('git add frontend/pyfactor_next/src/middleware.js');
    execSync('git add frontend/pyfactor_next/scripts/AUTH_FLOW_LOGGING_DOCUMENTATION.md');
    execSync('git add frontend/pyfactor_next/scripts/script_registry.md');
    
    // Commit
    execSync('git commit -m "Add comprehensive auth flow logging with fixed paths to diagnose 500 errors"');
    
    console.log('Changes committed successfully');
  } catch (error) {
    console.error('Error committing changes:', error);
    console.error(error.stdout?.toString() || '');
    console.error(error.stderr?.toString() || '');
  }
}

// Deploy changes
function deployChanges() {
  console.log('Deploying changes');
  
  try {
    // Push to deployment branch
    execSync('git push origin Dott_Main_Dev_Deploy');
    
    console.log('Changes deployed successfully');
  } catch (error) {
    console.error('Error deploying changes:', error);
    console.error(error.stdout?.toString() || '');
    console.error(error.stderr?.toString() || '');
  }
}

// Main function
async function main() {
  console.log('Starting deployment of comprehensive auth flow logging');
  
  // Update script registry
  updateScriptRegistry();
  
  // Commit changes
  commitChanges();
  
  // Deploy changes
  deployChanges();
  
  console.log('Completed deployment of comprehensive auth flow logging');
}

main().catch(console.error);
