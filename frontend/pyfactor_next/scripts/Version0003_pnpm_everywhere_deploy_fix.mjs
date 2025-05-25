#!/usr/bin/env node

/**
 * Version0003_pnpm_everywhere_deploy_fix.mjs
 * 
 * Purpose: Configure and deploy frontend with PNPM everywhere
 * Description: Fixes package manager conflicts and ensures PNPM is used consistently
 * 
 * Requirements Met:
 * - ES Modules only (.mjs extension)
 * - PNPM package manager everywhere
 * - Comprehensive documentation
 * - Versioned script approach
 * - Cleanup of npm lock conflicts
 * - Vercel configuration for PNPM
 * - No hardcoded secrets (uses .env.local)
 * - Follows naming convention: Version####_<description>_<target>
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const config = {
  version: '0003',
  description: 'PNPM Everywhere Deployment Fix',
  timestamp: new Date().toISOString(),
  backupDir: join(projectRoot, 'frontend_file_backups'),
  pnpmVersion: '8.10.0'
};

console.log(`🚀 Starting ${config.description} - Version ${config.version}`);
console.log(`📅 Timestamp: ${config.timestamp}`);

/**
 * Create backup of a file with timestamp
 */
function createBackup(filePath, content = null) {
  const fileName = filePath.split('/').pop();
  const timestamp = config.timestamp.replace(/[:.]/g, '-');
  const backupPath = join(config.backupDir, `${fileName}.backup-${timestamp}`);
  
  // Ensure backup directory exists
  if (!existsSync(config.backupDir)) {
    mkdirSync(config.backupDir, { recursive: true });
  }
  
  if (content) {
    writeFileSync(backupPath, content);
  } else if (existsSync(filePath)) {
    const originalContent = readFileSync(filePath, 'utf8');
    writeFileSync(backupPath, originalContent);
  }
  
  console.log(`📋 Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Execute command with error handling
 */
function executeCommand(command, description, options = {}) {
  console.log(`\n🔧 ${description}`);
  console.log(`   Command: ${command}`);
  
  try {
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options
    });
    console.log(`✅ ${description} - SUCCESS`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} - FAILED`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Main deployment process
 */
async function main() {
  try {
    // Step 1: Clean up npm lock file conflicts
    console.log('\n📦 Step 1: Cleaning up package manager conflicts');
    
    const packageLockPath = join(projectRoot, 'package-lock.json');
    if (existsSync(packageLockPath)) {
      createBackup(packageLockPath);
      executeCommand('rm package-lock.json', 'Removing npm lock file');
    }
    
    // Step 2: Clear npm cache to prevent conflicts
    console.log('\n🧹 Step 2: Clearing npm cache');
    executeCommand('npm cache clean --force', 'Clearing npm cache');
    
    // Step 3: Install/update pnpm globally
    console.log('\n📥 Step 3: Installing/updating pnpm globally');
    executeCommand(`npm install -g pnpm@${config.pnpmVersion}`, 'Installing pnpm globally');
    
    // Step 4: Verify pnpm version
    console.log('\n✅ Step 4: Verifying pnpm installation');
    executeCommand('pnpm --version', 'Checking pnpm version');
    
    // Step 5: Clear pnpm cache and reinstall dependencies
    console.log('\n🔄 Step 5: Refreshing pnpm dependencies');
    executeCommand('pnpm store prune', 'Pruning pnpm store');
    executeCommand('rm -rf node_modules', 'Removing node_modules');
    executeCommand('pnpm install --frozen-lockfile', 'Installing dependencies with pnpm');
    
    // Step 6: Configure Vercel to use pnpm
    console.log('\n⚙️ Step 6: Configuring Vercel for pnpm');
    
    const vercelJsonPath = join(projectRoot, 'vercel.json');
    let vercelConfig = {};
    
    if (existsSync(vercelJsonPath)) {
      const existingConfig = readFileSync(vercelJsonPath, 'utf8');
      createBackup(vercelJsonPath, existingConfig);
      vercelConfig = JSON.parse(existingConfig);
    }
    
    // Update Vercel configuration for pnpm
    vercelConfig.buildCommand = 'pnpm build:production';
    vercelConfig.installCommand = 'pnpm install --frozen-lockfile';
    vercelConfig.framework = 'nextjs';
    
    writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
    console.log('📝 Updated vercel.json for pnpm');
    
    // Step 7: Test build locally
    console.log('\n🏗️ Step 7: Testing local build with pnpm');
    executeCommand('pnpm build:production', 'Building project with pnpm');
    
    // Step 8: Deploy to Vercel with pnpm
    console.log('\n🚀 Step 8: Deploying to Vercel');
    executeCommand('pnpm vercel --prod --yes', 'Deploying to Vercel production');
    
    // Step 9: Update script registry
    console.log('\n📝 Step 9: Updating script registry');
    const registryPath = join(__dirname, 'script_registry.md');
    const registryContent = readFileSync(registryPath, 'utf8');
    
    const newEntry = `\n### Version0003_pnpm_everywhere_deploy_fix.mjs
- **Version**: 0003
- **Purpose**: Configure and deploy frontend with PNPM everywhere
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: ${config.timestamp}
- **Description**: Fixes package manager conflicts and ensures PNPM is used consistently
- **Changes Made**:
  - Removed npm lock file conflicts
  - Configured Vercel for pnpm
  - Updated build and deploy commands
  - Cleared npm cache conflicts
  - Installed pnpm globally
  - Refreshed dependencies with pnpm
  - Tested local build with pnpm
  - Deployed to production with pnpm`;
    
    const updatedRegistry = registryContent + newEntry;
    writeFileSync(registryPath, updatedRegistry);
    
    console.log('\n🎉 DEPLOYMENT COMPLETE!');
    console.log('✅ All steps completed successfully');
    console.log('✅ Package manager conflicts resolved');
    console.log('✅ PNPM configured everywhere');
    console.log('✅ Vercel deployment successful');
    console.log('✅ Script registry updated');
    
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('Error:', error.message);
    console.error('\n💡 Check the logs above for specific error details');
    console.error('💡 Backups are available in frontend_file_backups/');
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main; 