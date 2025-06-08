#!/usr/bin/env node
/**
 * Version0198_deploy_syntax_error_fixes.mjs
 * 
 * This script commits and deploys the syntax error fixes made by Version0197_fix_syntax_errors_blocking_build.mjs.
 * It will run the fix script first to ensure all changes are applied, then commit and push to the deployment branch.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Define commit message
const commitMessage = 'Fix syntax errors blocking Vercel build';

// First run the fix script
async function runFixScript() {
  console.log('🔧 Running syntax error fix script...');
  
  try {
    const fixScriptPath = path.join(__dirname, 'Version0197_fix_syntax_errors_blocking_build.mjs');
    
    if (!fs.existsSync(fixScriptPath)) {
      throw new Error(`Fix script not found at ${fixScriptPath}`);
    }
    
    // Make the script executable
    execSync(`chmod +x ${fixScriptPath}`);
    
    // Run the fix script
    execSync(`node ${fixScriptPath}`, { stdio: 'inherit' });
    
    console.log('✅ Fix script completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error running fix script:', error.message);
    return false;
  }
}

// Commit and push changes
async function commitAndPush() {
  console.log('📝 Committing and pushing changes...');
  
  try {
    // Check if we're on the correct branch
    const currentBranch = execSync('git branch --show-current').toString().trim();
    console.log(`Current branch: ${currentBranch}`);
    
    // Add all changes
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit changes
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // Push to remote
    console.log('🚀 Pushing to remote...');
    execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });
    
    console.log('✅ Changes committed and pushed successfully');
    
    // Check if we're on the deployment branch
    if (currentBranch === 'Dott_Main_Dev_Deploy') {
      console.log('🔔 Detected deployment branch, this will trigger a Vercel deployment');
    } else {
      console.log('⚠️ Not on deployment branch. To trigger a deployment, merge these changes to Dott_Main_Dev_Deploy');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error during git operations:', error.message);
    return false;
  }
}

// Update script registry
async function updateScriptRegistry() {
  console.log('📋 Updating script registry...');
  
  try {
    const registryPath = path.join(projectRoot, 'scripts/script_registry.md');
    
    if (!fs.existsSync(registryPath)) {
      console.warn('⚠️ Script registry not found, creating a new one');
      
      const initialContent = `# Script Registry
      
| Script | Description | Status | Date |
|--------|-------------|--------|------|
`;
      fs.writeFileSync(registryPath, initialContent);
    }
    
    let registryContent = fs.readFileSync(registryPath, 'utf8');
    
    // Add new entry
    const date = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0197_fix_syntax_errors_blocking_build.mjs | Fixes syntax errors in multiple files causing build failures | ✅ Executed | ${date} |\n| Version0198_deploy_syntax_error_fixes.mjs | Commits and deploys syntax error fixes | ✅ Executed | ${date} |\n`;
    
    // Check if the entry already exists
    if (!registryContent.includes('Version0197_fix_syntax_errors_blocking_build.mjs')) {
      // Append the new entry after the header
      const headerEndIndex = registryContent.indexOf('|--------|-------------|--------|------|') + '|--------|-------------|--------|------|'.length;
      const updatedContent = [
        registryContent.slice(0, headerEndIndex),
        '\n',
        newEntry,
        registryContent.slice(headerEndIndex)
      ].join('');
      
      fs.writeFileSync(registryPath, updatedContent);
      console.log('✅ Script registry updated');
    } else {
      console.log('ℹ️ Script already registered in the registry');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
    return false;
  }
}

// Create summary document
function createSummary() {
  console.log('📄 Creating summary document...');
  
  try {
    const summaryPath = path.join(projectRoot, 'scripts/BUILD_SYNTAX_ERRORS_FIX_SUMMARY.md');
    
    const summaryContent = "# Build Syntax Errors Fix Summary\n\n" +
      "## Overview\n\n" +
      "This document summarizes the fixes applied to resolve critical syntax errors that were causing Vercel build failures.\n\n" +
      "## Problem\n\n" +
      "The Vercel build was failing with multiple syntax errors in different files:\n\n" +
      "1. **axiosConfig.js (Line 165)**:\n" +
      "   ```javascript\n" +
      "   if (typeof window !== 'undefined' && appCache.getAll() { {) {\n" +
      "   ```\n" +
      "   - Malformed conditional with extra braces\n\n" +
      "2. **inventoryService.js (Line 1136-1137)**:\n" +
      "   ```javascript\n" +
      "   }\n" +
      "   }\n" +
      "       } else {\n" +
      "   ```\n" +
      "   - Mismatched braces and incorrectly nested code blocks\n\n" +
      "3. **ultraOptimizedInventoryService.js (Line 277)**:\n" +
      "   ```javascript\n" +
      "   }\n" +
      "       }\n" +
      "   ```\n" +
      "   - Extra closing brace\n\n" +
      "4. **amplifyResiliency.js (Line 732)**:\n" +
      "   ```javascript\n" +
      "   if (!appCache.getAll()) appCache.getAll() = {};\n" +
      "   ```\n" +
      "   - Invalid assignment target (can't assign to a function call)\n\n" +
      "5. **apiClient.js (Line 142)**:\n" +
      "   ```javascript\n" +
      "   if (appCache.getAll()\n" +
      "     tenantId = appCache.get('tenant.id');\n" +
      "   ```\n" +
      "   - Missing closing parenthesis\n\n" +
      "## Solution\n\n" +
      "Scripts were created to:\n\n" +
      "1. **Fix axiosConfig.js**\n" +
      "   - Fixed malformed conditional statements and corrected brace syntax throughout the file\n\n" +
      "2. **Fix inventoryService.js**\n" +
      "   - Corrected mismatched braces and reconstructed missing method declaration\n\n" +
      "3. **Fix ultraOptimizedInventoryService.js**\n" +
      "   - Removed extra closing brace and fixed code structure\n\n" +
      "4. **Fix amplifyResiliency.js**\n" +
      "   - Changed invalid assignment to function call to use proper initialization method\n\n" +
      "5. **Fix apiClient.js**\n" +
      "   - Added missing closing parenthesis and fixed code structure\n\n" +
      "## Implementation\n\n" +
      "Two scripts were created:\n\n" +
      "1. **Version0197_fix_syntax_errors_blocking_build.mjs**\n" +
      "   - Identifies and fixes all syntax errors in the affected files\n" +
      "   - Creates backups of all modified files\n" +
      "   - Provides detailed logging of all changes\n\n" +
      "2. **Version0198_deploy_syntax_error_fixes.mjs**\n" +
      "   - Runs the fix script to ensure all fixes are applied\n" +
      "   - Commits the changes with an appropriate message\n" +
      "   - Pushes to the deployment branch\n" +
      "   - Updates the script registry\n\n" +
      "## Verification\n\n" +
      "After applying these fixes, the Vercel build should succeed without syntax errors. The deployment should be monitored to ensure:\n\n" +
      "1. The build completes successfully\n" +
      "2. The application loads correctly in the browser\n" +
      "3. No new errors are introduced\n\n" +
      "## Next Steps\n\n" +
      "1. Implement additional code quality checks to catch syntax errors before deployment\n" +
      "2. Consider adding a pre-commit hook to check for syntax errors\n" +
      "3. Review the codebase for similar patterns that might cause issues\n\n" +
      "## Files Modified\n\n" +
      "- frontend/pyfactor_next/src/lib/axiosConfig.js\n" +
      "- frontend/pyfactor_next/src/services/inventoryService.js\n" +
      "- frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js\n" +
      "- frontend/pyfactor_next/src/utils/amplifyResiliency.js\n" +
      "- frontend/pyfactor_next/src/utils/apiClient.js\n\n" +
      "*Date: " + new Date().toISOString().split('T')[0] + "*";
    
    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`✅ Summary document created: ${summaryPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating summary document:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting deployment of syntax error fixes...');
  
  try {
    // Step 1: Run fix script
    const fixResult = await runFixScript();
    if (!fixResult) {
      throw new Error('Fix script failed');
    }
    
    // Step 2: Update script registry
    const registryResult = await updateScriptRegistry();
    if (!registryResult) {
      console.warn('⚠️ Failed to update script registry, continuing anyway');
    }
    
    // Step 3: Create summary document
    const summaryResult = createSummary();
    if (!summaryResult) {
      console.warn('⚠️ Failed to create summary document, continuing anyway');
    }
    
    // Step 4: Commit and push changes
    const deployResult = await commitAndPush();
    if (!deployResult) {
      throw new Error('Deployment failed');
    }
    
    console.log('\n🎉 Syntax error fixes deployed successfully!');
    console.log('📝 Monitor the Vercel deployment to ensure the build succeeds');
    console.log('📊 Check the application to ensure it functions correctly');
    
    return true;
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('Please fix the issues and try again');
    return false;
  }
}

// Run the main function
try {
  await main();
} catch (error) {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
}
