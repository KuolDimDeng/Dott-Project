#!/usr/bin/env node
/**
 * Version0200_deploy_remaining_syntax_fixes.mjs
 * 
 * This script commits and deploys the additional syntax error fixes made by Version0199_fix_remaining_syntax_errors.mjs.
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
const commitMessage = 'Fix remaining syntax errors blocking Vercel build';

// First run the fix script
async function runFixScript() {
  console.log('🔧 Running remaining syntax error fix script...');
  
  try {
    const fixScriptPath = path.join(__dirname, 'Version0199_fix_remaining_syntax_errors.mjs');
    
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
    const newEntry = `| Version0199_fix_remaining_syntax_errors.mjs | Fixes additional syntax errors in multiple files causing build failures | ✅ Executed | ${date} |\n| Version0200_deploy_remaining_syntax_fixes.mjs | Commits and deploys additional syntax error fixes | ✅ Executed | ${date} |\n`;
    
    // Check if the entry already exists
    if (!registryContent.includes('Version0199_fix_remaining_syntax_errors.mjs')) {
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
    const summaryPath = path.join(projectRoot, 'scripts/REMAINING_BUILD_SYNTAX_ERRORS_FIX_SUMMARY.md');
    
    const summaryContent = "# Remaining Build Syntax Errors Fix Summary\n\n" +
      "## Overview\n\n" +
      "This document summarizes the fixes applied to resolve additional syntax errors discovered in the Vercel build logs after the initial fix attempt.\n\n" +
      "## Problem\n\n" +
      "The Vercel build was still failing with several syntax errors in different files:\n\n" +
      "1. **axiosConfig.js**:\n" +
      "   ```javascript\n" +
      "   // Expected a semicolon and expression errors around API interceptors\n" +
      "   } catch (error) {\n" +
      "     logger.error('[AxiosConfig] Error in HR API request interceptor:', error);\n" +
      "     return config;\n" +
      "   }\n" +
      "   });\n" +
      "   ```\n" +
      "   - Incorrect structure in API interceptors causing semicolon and expression errors\n\n" +
      "2. **inventoryService.js**:\n" +
      "   ```javascript\n" +
      "   // Get offline products\n" +
      "   getOfflineProducts() {\n" +
      "   ```\n" +
      "   - Method definition not properly structured within class\n\n" +
      "3. **ultraOptimizedInventoryService.js**:\n" +
      "   ```javascript\n" +
      "   }\n" +
      "     }\n" +
      "   ```\n" +
      "   - Extra closing brace and expression errors\n\n" +
      "4. **amplifyResiliency.js**:\n" +
      "   ```javascript\n" +
      "   import { appCache } from '../utils/appCache';\n" +
      "   import { logger } from './logger';\n" +
      "   import { appCache } from '../utils/appCache';\n" +
      "   ```\n" +
      "   - Duplicate imports causing 'Identifier already declared' errors\n\n" +
      "5. **apiClient.js**:\n" +
      "   ```javascript\n" +
      "   import { axiosInstance, backendHrApiInstance } from ''lib/axiosConfig''\n" +
      "   ```\n" +
      "   - Incorrect quote format in imports and duplicate imports\n\n" +
      "## Solution\n\n" +
      "The fix script (`Version0199_fix_remaining_syntax_errors.mjs`) addressed these issues by:\n\n" +
      "1. **For axiosConfig.js**:\n" +
      "   - Restructuring the API interceptors to ensure proper syntax\n" +
      "   - Fixing the interceptor chain format\n\n" +
      "2. **For inventoryService.js**:\n" +
      "   - Fixing method definition to properly place it within the class\n" +
      "   - Ensuring class structure is correct with proper indentation\n\n" +
      "3. **For ultraOptimizedInventoryService.js**:\n" +
      "   - Removing extra closing braces\n" +
      "   - Fixing object structure and indentation\n\n" +
      "4. **For amplifyResiliency.js**:\n" +
      "   - Removing duplicate imports\n" +
      "   - Keeping only the necessary appCache import\n\n" +
      "5. **For apiClient.js**:\n" +
      "   - Fixing import statement format (''lib/axiosConfig'' to '../lib/axiosConfig')\n" +
      "   - Removing duplicate imports\n\n" +
      "## Implementation\n\n" +
      "Two scripts were created to fix and deploy these changes:\n\n" +
      "1. **Version0199_fix_remaining_syntax_errors.mjs**\n" +
      "   - Identifies and fixes all remaining syntax errors in the affected files\n" +
      "   - Creates backups of all modified files with timestamps\n" +
      "   - Provides detailed logging of all changes\n\n" +
      "2. **Version0200_deploy_remaining_syntax_fixes.mjs**\n" +
      "   - Runs the fix script to ensure all fixes are applied\n" +
      "   - Updates the script registry with information about these changes\n" +
      "   - Creates this summary document\n" +
      "   - Commits the changes with an appropriate message\n" +
      "   - Pushes to the deployment branch to trigger a Vercel deployment\n\n" +
      "## Verification\n\n" +
      "After applying these fixes, the Vercel build should succeed without syntax errors. The deployment should be monitored to ensure:\n\n" +
      "1. The build completes successfully\n" +
      "2. The application loads correctly in the browser\n" +
      "3. No new errors are introduced\n\n" +
      "## Prevention\n\n" +
      "To prevent similar issues in the future, we recommend:\n\n" +
      "1. **Automated Testing**:\n" +
      "   - Implement syntax validation in the CI/CD pipeline\n" +
      "   - Add pre-commit hooks with ESLint to catch syntax errors\n\n" +
      "2. **Code Review**:\n" +
      "   - Ensure thorough code reviews focus on structural integrity\n" +
      "   - Use automated tools to validate syntax during review\n\n" +
      "3. **Development Environment**:\n" +
      "   - Ensure all developers use consistent IDE settings\n" +
      "   - Enable syntax highlighting and validation in editors\n\n" +
      "## Files Modified\n\n" +
      "- `frontend/pyfactor_next/src/lib/axiosConfig.js`\n" +
      "- `frontend/pyfactor_next/src/services/inventoryService.js`\n" +
      "- `frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js`\n" +
      "- `frontend/pyfactor_next/src/utils/amplifyResiliency.js`\n" +
      "- `frontend/pyfactor_next/src/utils/apiClient.js`\n\n" +
      "## Execution\n\n" +
      "Run the following commands to apply and deploy these fixes:\n\n" +
      "```bash\n" +
      "# Navigate to the project directory\n" +
      "cd frontend/pyfactor_next\n\n" +
      "# Run the fix script\n" +
      "node scripts/Version0199_fix_remaining_syntax_errors.mjs\n\n" +
      "# Deploy the changes\n" +
      "node scripts/Version0200_deploy_remaining_syntax_fixes.mjs\n" +
      "```\n\n" +
      "*Document created: " + new Date().toISOString().split('T')[0] + "*";
    
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
  console.log('🚀 Starting deployment of remaining syntax error fixes...');
  
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
    
    console.log('\n🎉 Remaining syntax error fixes deployed successfully!');
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
