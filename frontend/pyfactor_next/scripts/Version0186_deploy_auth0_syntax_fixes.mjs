#!/usr/bin/env node

/**
 * Version0186_deploy_auth0_syntax_fixes.mjs
 * 
 * This script:
 * 1. Runs the fixes from Version0185
 * 2. Tests the build locally
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
const fixScriptPath = path.join(__dirname, 'Version0185_fix_syntax_errors_for_auth0_migration.mjs');
const deployBranch = 'Dott_Main_Dev_Deploy';
const commitMessage = 'Fix Auth0 migration syntax errors';

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
  
  // Add both script entries to the registry
  const fixEntry = `| Version0185_fix_syntax_errors_for_auth0_migration.mjs | Fix Auth0 migration syntax errors | ${date} | Executed |\n`;
  const deployEntry = `| Version0186_deploy_auth0_syntax_fixes.mjs | Deploy Auth0 syntax fixes | ${date} | Executed |\n`;
  
  // Check if entries already exist
  if (!registry.includes('Version0185_fix_syntax_errors_for_auth0_migration.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + fixEntry);
  }
  
  if (!registry.includes('Version0186_deploy_auth0_syntax_fixes.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + deployEntry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Main function
async function main() {
  console.log('Starting Auth0 syntax fixes deployment process');
  
  // 1. Make scripts executable
  console.log('Making fix script executable');
  runCommand(`chmod +x ${fixScriptPath}`);
  
  // 2. Run the fix script
  console.log('Running fix script');
  const fixResult = runCommand(`node ${fixScriptPath}`);
  if (!fixResult.success) {
    console.error('Fix script failed, aborting deployment');
    process.exit(1);
  }
  
  // 3. Test the build locally
  console.log('Testing build locally');
  const buildResult = runCommand('pnpm build:production', { timeout: 300000 });
  if (!buildResult.success) {
    console.error('Build failed, syntax errors might remain. Please check the build logs.');
    console.log('Deployment aborted. Fix the remaining issues and try again.');
    process.exit(1);
  }
  
  // 4. Commit changes
  console.log('Committing changes');
  runCommand('git add .');
  runCommand(`git commit -m "${commitMessage}"`);
  
  // 5. Get current branch
  const { output: currentBranchOutput } = runCommand('git branch --show-current', { silent: true });
  const currentBranch = currentBranchOutput.trim();
  
  // 6. Push to deploy branch
  console.log(`Pushing to ${deployBranch} branch`);
  if (currentBranch === deployBranch) {
    runCommand('git push');
  } else {
    runCommand(`git push origin ${currentBranch}:${deployBranch}`);
  }
  
  // 7. Update script registry
  updateScriptRegistry();
  
  console.log('Auth0 syntax fixes deployment completed successfully');
  console.log('The fixes have been pushed to the deployment branch and should be automatically deployed by Vercel');
}

// Run the main function
main().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
