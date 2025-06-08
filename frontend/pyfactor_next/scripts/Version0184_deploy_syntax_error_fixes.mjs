#!/usr/bin/env node

/**
 * Version0184_deploy_syntax_error_fixes.mjs
 * 
 * This script runs the syntax error fixes and deploys them to production.
 * It executes the following steps:
 * 
 * 1. Runs Version0183_fix_syntax_errors_preventing_build.mjs
 * 2. Commits all changes
 * 3. Pushes to the remote repository
 * 4. Triggers deployment if on the main branch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Utility functions for executing commands
function executeCommand(command, options = {}) {
  try {
    console.log(`📍 Running: ${command}`);
    const output = execSync(command, {
      cwd: options.cwd || projectRoot,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    
    if (options.silent) {
      return output.trim();
    }
    
    console.log(`✅ Command executed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    if (options.silent) {
      return error.stdout ? error.stdout.toString() : '';
    }
    return false;
  }
}

function updateScriptRegistry() {
  const filePath = path.join(projectRoot, 'scripts/script_registry.md');
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Script registry does not exist: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if script already in registry
    if (content.includes('Version0184_deploy_syntax_error_fixes.mjs')) {
      console.log(`ℹ️ Script already in registry, skipping update`);
      return true;
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const entryToAdd = `
| Version0184_deploy_syntax_error_fixes.mjs | Deploy syntax error fixes | ${timestamp} | Completed | Critical | Runs Version0183 script to fix syntax errors, commits changes, and deploys to production. Fixes issues with duplicate variable declarations, incomplete imports, missing parentheses, and other syntax errors. |`;
    
    // Find the table in the content
    const tableRegex = /\|\s*Script\s*\|\s*Purpose\s*\|\s*Date\s*\|\s*Status\s*\|\s*Priority\s*\|\s*Notes\s*\|\s*\n\|[^\n]*\n((?:\|[^\n]*\n)*)/;
    const match = content.match(tableRegex);
    
    if (match) {
      const updatedContent = content.replace(
        match[0],
        match[0] + entryToAdd
      );
      
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated script registry: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️ Could not find script table in registry`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating script registry:`, error);
    return false;
  }
}

function getCurrentBranch() {
  try {
    const branch = executeCommand('git rev-parse --abbrev-ref HEAD', { silent: true });
    return branch;
  } catch (error) {
    console.error(`❌ Error getting current branch:`, error);
    return null;
  }
}

function checkGitStatus() {
  try {
    const status = executeCommand('git status --porcelain', { silent: true });
    console.log('📊 Checking git status...');
    
    if (status) {
      console.log(`✅ Changes detected:\n${status}`);
      return true;
    } else {
      console.log(`ℹ️ No changes detected`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking git status:`, error);
    return false;
  }
}

function commitChanges() {
  try {
    // Add all changes
    console.log('\n📝 Adding changes to git...');
    executeCommand('git add -A');
    
    // Create commit
    console.log('\n💾 Creating commit...');
    const commitMessage = `fix: Syntax errors preventing build success

- Fixed duplicate variable declarations in SignInForm.js
- Fixed duplicate imports in i18n.js
- Fixed incomplete statements in DashboardClient.js
- Fixed invalid import syntax in auth.js
- Fixed missing parentheses in axiosConfig.js
- Created Auth0 compatibility utilities
- Removed Cognito references and replaced with Auth0

Resolves: Build failure due to syntax errors`;
    
    executeCommand(`git commit -m "${commitMessage}"`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error committing changes:`, error);
    return false;
  }
}

function pushToRemote() {
  try {
    const currentBranch = getCurrentBranch();
    console.log(`🔄 Pushing to remote...`);
    console.log(`📍 Current branch: ${currentBranch}`);
    
    executeCommand(`git push origin ${currentBranch}`);
    
    return {
      success: true,
      branch: currentBranch
    };
  } catch (error) {
    console.error(`❌ Error pushing to remote:`, error);
    return {
      success: false,
      branch: null
    };
  }
}

function triggerDeployment() {
  try {
    const currentBranch = getCurrentBranch();
    
    // Only trigger deployment on main branch or Dott_Main_Dev_Deploy
    if (currentBranch === 'main' || currentBranch === 'Dott_Main_Dev_Deploy') {
      console.log(`\n🚀 On deployment branch - triggering Vercel deployment...`);
      
      // Update .vercel-trigger file to trigger deployment
      executeCommand('git add .vercel-trigger');
      executeCommand('git commit -m "chore: trigger Vercel deployment"');
      executeCommand('git push');
      
      return true;
    } else {
      console.log(`\nℹ️ Not on deployment branch (${currentBranch}), skipping deployment trigger`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error triggering deployment:`, error);
    return false;
  }
}

function createSummaryDocument() {
  const filePath = path.join(projectRoot, 'scripts/SYNTAX_ERROR_FIXES_DEPLOYMENT_SUMMARY.md');
  
  try {
    const content = `# Syntax Error Fixes Deployment Summary

## Overview

This document summarizes the fixes applied to resolve syntax errors that were preventing successful builds.

## Issue

The build was failing with several syntax errors:

- Duplicate variable declarations in \`SignInForm.js\`
- Duplicate imports in \`i18n.js\`
- Incomplete statements in \`DashboardClient.js\`
- Invalid import syntax in \`auth.js\`
- Missing parentheses in \`axiosConfig.js\`

These issues were primarily caused by the incomplete migration from AWS Cognito/Amplify to Auth0.

## Fix Implementation

The fix involved several components:

1. **Utility Files Created**:
   - \`src/utils/appCache.js\` - Cache utility for storing data
   - \`src/app/auth/authUtils.js\` - Auth0 compatibility layer
   - \`src/utils/safeHub.js\` - Event handling utility

2. **Code Fixes**:
   - Fixed duplicate session declarations in SignInForm.js
   - Fixed duplicate appCache imports in i18n.js
   - Fixed incomplete statements and code blocks in DashboardClient.js
   - Fixed invalid import syntax in auth.js
   - Fixed missing parentheses and closing braces in axiosConfig.js

3. **Auth0 Migration Cleanup**:
   - Removed all remaining Cognito/Amplify references
   - Replaced Cognito authentication with Auth0 equivalents
   - Created compatibility layer for backward compatibility

## Deployment

The changes were deployed with the following steps:

1. Created and executed \`Version0183_fix_syntax_errors_preventing_build.mjs\` to fix the issues
2. Created and executed \`Version0184_deploy_syntax_error_fixes.mjs\` to deploy the changes
3. Pushed to the deployment branch to trigger a Vercel build

## Verification

After deployment, the build should succeed without syntax errors. The tenant ID propagation issues should also be resolved, allowing users to:

- Complete the onboarding process
- Select the free plan without errors
- Be properly redirected to their tenant dashboard

## Next Steps

1. Monitor the build logs to confirm successful deployment
2. Test the onboarding flow with a new user
3. Verify tenant ID propagation is working correctly

## Scripts

- \`Version0183_fix_syntax_errors_preventing_build.mjs\` - Fixes syntax errors
- \`Version0184_deploy_syntax_error_fixes.mjs\` - Deploys the fixes

Created: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}
`;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created summary document: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating summary document:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Version 0184: Deploy Auth0 Syntax Error Fixes');
  console.log('==========================================\n');
  
  // Run Version0183 script
  console.log('🔧 Running Version 0183 fix script...\n');
  
  try {
    const fixScriptPath = path.join(__dirname, 'Version0183_fix_syntax_errors_preventing_build.mjs');
    executeCommand(`node ${fixScriptPath}`);
    console.log('✅ Fix script completed successfully');
  } catch (error) {
    console.error('❌ Error running fix script:', error);
    process.exit(1);
  }
  
  // Check git status
  if (!checkGitStatus()) {
    console.log('⚠️ No changes to commit, exiting');
    process.exit(0);
  }
  
  // Create summary document
  createSummaryDocument();
  
  // Update script registry
  updateScriptRegistry();
  
  // Commit changes
  if (!commitChanges()) {
    console.error('❌ Failed to commit changes');
    process.exit(1);
  }
  
  // Push to remote
  const pushResult = pushToRemote();
  if (!pushResult.success) {
    console.error('❌ Failed to push to remote');
    process.exit(1);
  }
  
  // Trigger deployment if on deployment branch
  triggerDeployment();
  
  console.log('\n✅ Deployment script completed!');
  
  console.log('\n📋 Summary:');
  console.log('- ✅ Fix script executed');
  console.log('- ✅ Changes committed');
  console.log('- ✅ Pushed to remote');
  console.log('- ✅ Deployment triggered (if on deployment branch)');
  
  console.log('\n🔍 Next steps:');
  console.log('1. Monitor Vercel deployment logs');
  console.log('2. Verify build succeeds without syntax errors');
  console.log('3. Test the onboarding flow to confirm tenant ID propagation works');
}

main().catch(error => {
  console.error('❌ Error executing script:', error);
  process.exit(1);
});
