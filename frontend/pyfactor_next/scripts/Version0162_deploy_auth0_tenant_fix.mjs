#!/usr/bin/env node

/**
 * Version 0162: Deploy Auth0 Tenant ID Fix
 * 
 * This script commits and deploys the Auth0 tenant ID propagation fixes
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Version 0162: Deploy Auth0 Tenant ID Fix');
console.log('==========================================');

// Helper function to run commands
function runCommand(command, options = {}) {
  console.log(`\n📍 Running: ${command}`);
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    });
    return output;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

// Check if running the fix script first
console.log('\n🔧 Running Version 0161 fix script...');
try {
  // Use correct path to the script relative to project root
  runCommand('node scripts/Version0161_fix_auth0_tenant_id_propagation.mjs');
  console.log('✅ Fix script completed successfully');
} catch (error) {
  console.error('❌ Fix script failed. Please run it manually first.');
  process.exit(1);
}

// Check git status
console.log('\n📊 Checking git status...');
try {
  const status = execSync('git status --porcelain', { 
    encoding: 'utf8',
    cwd: projectRoot 
  });
  
  if (!status.trim()) {
    console.log('✅ No changes to commit');
  } else {
    console.log('✅ Changes detected:\n', status);
  }
} catch (error) {
  console.error('❌ Failed to check git status');
  process.exit(1);
}

// Add all changes
console.log('\n📝 Adding changes to git...');
try {
  runCommand('git add -A');
  console.log('✅ Changes added');
} catch (error) {
  console.error('❌ Failed to add changes');
  process.exit(1);
}

// Create commit
console.log('\n💾 Creating commit...');
const commitMessage = `fix: Auth0 tenant ID propagation and login error fixes

- Fixed business-info API to properly store tenant_id in Auth0 session
- Updated SubscriptionForm to get tenant_id from multiple sources
- Created TenantStorage utility for centralized tenant ID management  
- Fixed auth login route Auth0 domain configuration
- Removed Cognito references and replaced with Auth0
- Fixed 500 error on /api/auth/login endpoint
- Fixed missing tenant ID during free plan selection

Resolves: Tenant ID not found error during onboarding flow`;

try {
  runCommand(`git commit -m "${commitMessage}"`);
  console.log('✅ Commit created');
} catch (error) {
  if (error.message.includes('nothing to commit')) {
    console.log('ℹ️  No changes to commit');
  } else {
    console.error('❌ Failed to create commit:', error.message);
    process.exit(1);
  }
}

// Push to current branch
console.log('\n🔄 Pushing to remote...');
try {
  const currentBranch = execSync('git branch --show-current', { 
    encoding: 'utf8',
    cwd: projectRoot 
  }).trim();
  
  console.log(`📍 Current branch: ${currentBranch}`);
  runCommand(`git push origin ${currentBranch}`);
  console.log('✅ Pushed to remote');
} catch (error) {
  console.error('❌ Failed to push:', error.message);
  console.log('ℹ️  You may need to push manually');
}

// Check if on main branch
const currentBranch = execSync('git branch --show-current', { 
  encoding: 'utf8',
  cwd: projectRoot 
}).trim();

if (currentBranch === 'Dott_Main_Dev_Deploy') {
  console.log('\n🚀 On deployment branch - triggering Vercel deployment...');
  
  // Create a deployment trigger file
  const triggerPath = path.join(projectRoot, '.vercel-trigger');
  fs.writeFileSync(triggerPath, new Date().toISOString());
  
  try {
    runCommand('git add .vercel-trigger');
    runCommand('git commit -m "chore: trigger Vercel deployment"');
    runCommand('git push');
    console.log('✅ Vercel deployment triggered');
  } catch (error) {
    console.log('ℹ️  Could not trigger automatic deployment');
  }
} else {
  console.log('\n⚠️  Not on Dott_Main_Dev_Deploy branch');
  console.log('To deploy to production:');
  console.log('1. Merge these changes to Dott_Main_Dev_Deploy');
  console.log('2. Push to trigger Vercel deployment');
}

// Update script registry
console.log('\n📝 Updating script registry...');
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
## Version0162_deploy_auth0_tenant_fix.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Deploy Auth0 tenant ID propagation fixes
- **Changes**:
  - Ran Version0161 fix script
  - Committed all changes
  - Pushed to remote repository
  - Triggered deployment if on main branch
- **Status**: Deployment ${currentBranch === 'Dott_Main_Dev_Deploy' ? 'triggered' : 'ready'}
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Deployment script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Fix script executed');
console.log('- ✅ Changes committed');
console.log('- ✅ Pushed to remote');
console.log(`- ${currentBranch === 'Dott_Main_Dev_Deploy' ? '✅' : '⏳'} Deployment ${currentBranch === 'Dott_Main_Dev_Deploy' ? 'triggered' : 'pending'}`);

console.log('\n🔍 Next steps:');
console.log('1. Monitor Vercel deployment logs');
console.log('2. Test the onboarding flow on production');
console.log('3. Verify tenant ID is properly propagated');
console.log('4. Confirm no more 500 errors on login');

// Make the script executable
if (process.platform !== 'win32') {
  try {
    execSync(`chmod +x "${__filename}"`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore chmod errors
  }
}
