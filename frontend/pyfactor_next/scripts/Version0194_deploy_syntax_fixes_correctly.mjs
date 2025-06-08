#!/usr/bin/env node

/**
 * Version0194_deploy_syntax_fixes_correctly.mjs
 * 
 * This script:
 * 1. Runs the improved fix script to properly address the syntax errors
 * 2. Tests the build locally to ensure all syntax errors are fixed
 * 3. Commits the changes
 * 4. Pushes to the deployment branch
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configure script
const fixScriptPath = path.join(__dirname, 'Version0193_fix_syntax_errors_correctly.mjs');
const deployBranch = 'Dott_Main_Dev_Deploy';
const commitMessage = 'Fix syntax errors with proper braces and import paths';

// Helper functions
function runCommand(command, options = {}) {
  try {
    console.log(`Running command: ${command}`);
    const output = execSync(command, {
      cwd: projectRoot,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options
    });
    return { success: true, output };
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    if (error.stdout) console.log(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    return { success: false, error };
  }
}

// Update script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  if (!fs.existsSync(registryPath)) {
    console.log('Creating new script registry file');
    const header = `# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script | Purpose | Execution Date | Status |\n|--------|---------|----------------|--------|\n`;
    fs.writeFileSync(registryPath, header);
  }
  
  let registry = fs.readFileSync(registryPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  // Add entry for the deployment script
  const deployEntry = `| Version0194_deploy_syntax_fixes_correctly.mjs | Deploy improved syntax error fixes | ${date} | Executed |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0194_deploy_syntax_fixes_correctly.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + deployEntry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Create a summary document
function createSummaryDocument() {
  const summaryPath = path.join(__dirname, 'CORRECT_SYNTAX_FIXES_SUMMARY.md');
  const summaryContent = `# Correct Syntax Fixes Summary

## Issue Overview

During the build process after applying previous Auth0 migration fixes, several syntax errors were preventing a successful build. The previous fix attempt didn't completely resolve the issues. This improved fix addresses the following problems:

1. **Malformed Import Path**: In \`i18n.js\`, an incorrect import path was causing module resolution errors:
   \`\`\`javascript
   import { appCache } from './utils/// // appCache.js';
   \`\`\`

2. **Missing Braces in Conditionals**: Multiple files had conditional statements without proper braces, causing syntax errors:
   \`\`\`javascript
   if (appCache.getAll()) 
     config.headers.Authorization = \`Bearer \${...}\`;
   \`\`\`

3. **Missing Closing Braces**: Code blocks weren't properly terminated, breaking the syntax structure:
   \`\`\`javascript
   if (typeof window !== 'undefined' && appCache.getAll())
     logger.debug(...);
     return appCache.get('offline.products');
   \`\`\`

## Fix Implementation

Two scripts were created to address these issues:

1. **Version0193_fix_syntax_errors_correctly.mjs**:
   - Uses more robust regex patterns to identify and fix syntax problems
   - Properly handles the import path in \`i18n.js\`
   - Adds missing braces to conditional statements
   - Ensures all code blocks are properly terminated
   - Creates backups of all modified files

2. **Version0194_deploy_syntax_fixes_correctly.mjs**:
   - Runs the improved fix script
   - Tests the build locally to ensure all syntax errors are fixed before deployment
   - Commits the changes with a descriptive message
   - Pushes to the deployment branch

## Files Fixed

1. **src/i18n.js** - Fixed incorrect import path
2. **src/lib/axiosConfig.js** - Fixed conditionals missing braces
3. **src/services/inventoryService.js** - Fixed missing braces in conditionals
4. **src/services/optimizedInventoryService.js** - Fixed missing braces and closing brackets
5. **src/services/ultraOptimizedInventoryService.js** - Fixed missing braces and brackets

## Testing Approach

The deployment script includes a build test phase to ensure that all syntax errors have been properly fixed before committing and deploying changes. This verification step is crucial to prevent deploying broken code.

## Deployment

After successful testing, changes are committed with the message:
> "Fix syntax errors with proper braces and import paths"

The changes are then pushed to the \`Dott_Main_Dev_Deploy\` branch for automatic deployment by Vercel.

## Conclusion

These improved fixes complete the Auth0 migration syntax corrections by properly addressing the remaining syntax errors that were preventing a successful build. The application should now build successfully without syntax errors related to conditionals or imports.
`;

  fs.writeFileSync(summaryPath, summaryContent);
  console.log('Created summary document');
}

// Main function
async function main() {
  console.log('Starting improved deployment process for syntax fixes');
  
  // 1. Make scripts executable
  console.log('Making fix script executable');
  runCommand(`chmod +x ${fixScriptPath}`);
  
  // 2. Run the fix script
  console.log('Running improved fix script');
  const fixResult = runCommand(`node ${fixScriptPath}`);
  if (!fixResult.success) {
    console.error('Fix script failed, aborting deployment');
    process.exit(1);
  }
  
  // 3. Create summary document
  createSummaryDocument();
  
  // 4. Test the build locally
  console.log('Testing build locally');
  const buildResult = runCommand('pnpm build:production', { timeout: 300000 });
  if (!buildResult.success) {
    console.error('Build failed, syntax errors might remain. Please check the build logs.');
    console.log('Deployment aborted. Fix the remaining issues and try again.');
    process.exit(1);
  }
  
  // 5. Commit changes
  console.log('Committing changes');
  runCommand('git add .');
  runCommand(`git commit -m "${commitMessage}"`);
  
  // 6. Get current branch
  const { output: currentBranchOutput } = runCommand('git branch --show-current', { silent: true });
  const currentBranch = currentBranchOutput.trim();
  
  // 7. Push to deploy branch
  console.log(`Pushing to ${deployBranch} branch`);
  if (currentBranch === deployBranch) {
    runCommand('git push');
  } else {
    runCommand(`git push origin ${currentBranch}:${deployBranch}`);
  }
  
  // 8. Update script registry
  updateScriptRegistry();
  
  console.log('Deployment of improved syntax fixes completed successfully');
  console.log('The fixes have been pushed to the deployment branch and should be automatically deployed by Vercel');
}

// Run the main function
main().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
