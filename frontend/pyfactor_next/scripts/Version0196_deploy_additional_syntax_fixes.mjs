#!/usr/bin/env node

/**
 * Version0196_deploy_additional_syntax_fixes.mjs
 * 
 * This script commits and deploys the syntax error fixes made to:
 * - i18n.js (fixed duplicate imports)
 * - axiosConfig.js (fixed syntax error)
 * - inventoryService.js (fixed missing braces)
 * - optimizedInventoryService.js (fixed multiple syntax issues)
 * - ultraOptimizedInventoryService.js (fixed missing braces)
 * 
 * The fixes address issues that would prevent successful building and deployment.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define paths
const rootDir = path.resolve(process.cwd());
const scriptRegistryPath = path.join(rootDir, 'scripts', 'script_registry.md');

// Helper function to execute shell commands
function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8', cwd: rootDir });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.stdout || error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('Starting deployment of syntax error fixes...');

  try {
    // Check for unstaged changes
    console.log('Checking git status...');
    const status = runCommand('git status --porcelain');
    
    if (status.trim()) {
      console.log('Committing changes...');
      
      // Add all changes
      runCommand('git add .');
      
      // Commit with a descriptive message
      runCommand('git commit -m "Fix syntax errors in multiple JS files for Auth0 migration"');
      
      console.log('Changes committed successfully.');
    } else {
      console.log('No changes to commit. Files already in a clean state.');
    }
    
    // Push changes to the repository
    console.log('Pushing changes to remote repository...');
    runCommand('git push origin HEAD');
    
    // Get current branch
    const branch = runCommand('git rev-parse --abbrev-ref HEAD').trim();
    console.log(`Current branch: ${branch}`);
    
    // Check if we're on the deployment branch
    if (branch === 'Dott_Main_Dev_Deploy') {
      console.log('On deployment branch. This will trigger production deployment.');
    } else {
      console.log('Not on deployment branch. Changes pushed but no deployment triggered.');
      console.log('To deploy to production, merge these changes to the Dott_Main_Dev_Deploy branch.');
    }
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('Deployment script completed successfully.');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Update the script registry with information about this script
function updateScriptRegistry() {
  console.log('Updating script registry...');
  
  try {
    if (fs.existsSync(scriptRegistryPath)) {
      const registry = fs.readFileSync(scriptRegistryPath, 'utf8');
      
      // Add this script to the registry if it doesn't exist
      if (!registry.includes('Version0196_deploy_additional_syntax_fixes.mjs')) {
        const newEntry = `| Version0196_deploy_additional_syntax_fixes.mjs | Commit and deploy fixes for syntax errors in multiple JS files | ${new Date().toISOString().split('T')[0]} | Completed | Fixed syntax errors in i18n.js, axiosConfig.js, inventoryService.js, optimizedInventoryService.js, and ultraOptimizedInventoryService.js |\n`;
        
        // Find the table in the registry
        const tableStartIndex = registry.indexOf('| Script Name | Purpose | Date | Status | Notes |');
        if (tableStartIndex !== -1) {
          const tableHeaderEnd = registry.indexOf('\n', tableStartIndex) + 1;
          const beforeTable = registry.substring(0, tableHeaderEnd + 1); // +1 to include the separator row
          const afterTable = registry.substring(tableHeaderEnd + 1);
          
          // Write the updated registry
          fs.writeFileSync(
            scriptRegistryPath,
            beforeTable + newEntry + afterTable
          );
          
          console.log('Script registry updated successfully.');
        } else {
          console.error('Could not find table in script registry.');
        }
      } else {
        console.log('Script already exists in registry.');
      }
    } else {
      console.error('Script registry file not found.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
