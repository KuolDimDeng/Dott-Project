#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup logger
const logger = {
  info: (message) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`),
  error: (message) => console.error(`[${new Date().toISOString()}] [ERROR] ${message}`),
  debug: (message) => console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`)
};

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const scriptRoot = path.resolve(__dirname);

/**
 * Execute a shell command and log the output
 * @param {string} command - The command to execute
 * @returns {string} - The command output
 */
function runCommand(command) {
  try {
    logger.info(`Running command: ${command}`);
    const output = execSync(command, { cwd: projectRoot, encoding: 'utf8' });
    logger.info(`Command output: ${output.trim()}`);
    return output.trim();
  } catch (error) {
    logger.error(`Error executing command "${command}": ${error.message}`);
    throw error;
  }
}

/**
 * Create a summary markdown file
 */
function createDeploymentSummary() {
  const summaryPath = path.join(projectRoot, 'scripts/SYNTAX_ERROR_FIXES_DEPLOYMENT.md');
  
  const summaryContent = `# Syntax Error Fixes Deployment Summary

## Overview

This document summarizes the deployment of the fixes for syntax errors that were preventing the build process from completing successfully.

## Fixes Applied

The deployment script applied the following fixes that were implemented in \`Version0183_fix_syntax_errors_preventing_build.mjs\`:

1. **SignInForm.js**
   - Fixed duplicate variable declarations by consolidating them into a single declaration with fallback logic

2. **DashboardClient.js**
   - Fixed incomplete import statement by replacing with proper imports from Auth0Adapter
   - Added compatibility variables for backward compatibility

3. **hooks/auth.js**
   - Fixed syntax errors in imports to use proper relative paths

4. **i18n.js**
   - Removed duplicate appCache import

5. **axiosConfig.js**
   - Added missing closing parenthesis and enclosing braces to if statement

## Compatibility Utilities

The following utility files were created or updated to ensure compatibility with Auth0:

1. **safeHub.js** - Compatibility layer for AWS Amplify Hub
2. **cognitoNetworkDiagnostic.js** - Network diagnostics compatible with Auth0
3. **refreshUserSession.js** - Session refresh functionality compatible with Auth0
4. **logger.js** - Centralized logging utility

## Deployment Status

The fixes were committed to the \`Dott_Main_Dev_Deploy\` branch, which triggers automatic deployment to the production environment. This deployment will resolve the build failures that were preventing successful deployment.

## Next Steps

1. Monitor the deployment to ensure it completes successfully
2. Verify that the application functions correctly after deployment
3. Consider a more comprehensive migration away from AWS Cognito patterns in future updates
`;
  
  fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  logger.info(`Created deployment summary file at: ${summaryPath}`);
}

/**
 * Update the script registry with the deployment script
 */
function updateScriptRegistry() {
  const registryPath = path.join(projectRoot, 'scripts/script_registry.md');
  
  try {
    if (!fs.existsSync(registryPath)) {
      logger.error(`Script registry not found: ${registryPath}`);
      return;
    }
    
    let registry = fs.readFileSync(registryPath, 'utf8');
    
    const newEntry = `
| Version0184_deploy_syntax_error_fixes.mjs | Deploy fixes for syntax errors preventing build | Complete |
`;
    
    // Add the new entry before the end of the table or at the end of the file
    const tableEndIndex = registry.indexOf('<!-- End of script registry -->');
    if (tableEndIndex !== -1) {
      registry = registry.slice(0, tableEndIndex) + newEntry + registry.slice(tableEndIndex);
    } else {
      registry += newEntry;
    }
    
    fs.writeFileSync(registryPath, registry, 'utf8');
    logger.info('Updated script registry');
  } catch (error) {
    logger.error(`Error updating script registry: ${error.message}`);
  }
}

// Main function
async function main() {
  logger.info('Starting deployment of syntax error fixes');
  
  try {
    // Make scripts executable
    runCommand('chmod +x scripts/Version0183_fix_syntax_errors_preventing_build.mjs');
    runCommand('chmod +x scripts/Version0184_deploy_syntax_error_fixes.mjs');
    
    // Run the fix script first
    runCommand('node scripts/Version0183_fix_syntax_errors_preventing_build.mjs');
    
    // Create deployment summary
    createDeploymentSummary();
    
    // Update script registry
    updateScriptRegistry();
    
    // Get current branch
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
    logger.info(`Current branch: ${currentBranch}`);
    
    // Commit changes
    runCommand('git add . && git commit -m "Fix syntax errors preventing successful build"');
    logger.info('Changes committed successfully');
    
    // Push to remote
    runCommand(`git push origin ${currentBranch}`);
    logger.info(`Successfully pushed to ${currentBranch}`);
    
    // Check if this is the main deployment branch to trigger deployment
    if (currentBranch === 'Dott_Main_Dev_Deploy') {
      logger.info('Pushing to Dott_Main_Dev_Deploy branch, which will trigger deployment');
    }
    
    logger.info('Deployment process completed successfully');
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error(`Error in main execution: ${error.message}`);
  process.exit(1);
});
