/**
 * Version0047_fix_nextjs_config_warnings.js
 * 
 * This script fixes the warnings in the Next.js configuration for Next.js 15.3.1
 * 
 * Version: 1.0
 * Date: 2025-05-03
 * 
 * Changes:
 * - Removes unrecognized 'srcDir' property
 * - Updates experimental section to use correct options for Next.js 15.3.1
 * - Fixes serverActions configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');
const nextConfigPath = path.join(frontendRoot, 'next.config.js');
const backupDir = path.join(projectRoot, 'scripts', 'backups');
const backupFileName = `next.config.js.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const backupPath = path.join(backupDir, backupFileName);

// Function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

// Function to create a backup of the file
const createBackup = (filePath, backupPath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    ensureDirectoryExists(path.dirname(backupPath));
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`Created backup at: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    return false;
  }
};

// Function to update the Next.js configuration
const updateNextConfig = async () => {
  try {
    // Read the current next.config.js file
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Remove the srcDir property
    const withoutSrcDir = content.replace(
      /\/\/ Ensure src directory is correctly used\n\s+srcDir: ['"]src['"],/s,
      ``
    );
    
    // Update the experimental section to properly handle options
    const updatedContent = withoutSrcDir.replace(
      /\/\/ Experimental features that are still supported\n\s+experimental: {[^}]*}/s,
      `// Experimental features that are still supported
  experimental: {
    // Enable server actions with correct configuration
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000']
    }
  }`
    );
    
    // Write the updated configuration back to the file
    fs.writeFileSync(nextConfigPath, updatedContent, 'utf8');
    console.log('Updated Next.js configuration to fix warnings');
    
    return true;
  } catch (error) {
    console.error(`Error updating Next.js configuration: ${error.message}`);
    return false;
  }
};

// Function to update script registry
const updateScriptRegistry = () => {
  try {
    const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
    
    if (fs.existsSync(registryPath)) {
      const registry = fs.readFileSync(registryPath, 'utf8');
      const entry = `| Version0047_fix_nextjs_config_warnings.js | Fixed Next.js configuration warnings for Next.js 15.3.1 | 2025-05-03 | Success |`;
      
      if (!registry.includes('Version0047_fix_nextjs_config_warnings.js')) {
        const updatedRegistry = registry.replace(
          /\| Script Name \| Purpose \| Execution Status \| Date \| Result \|\n\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|/,
          `| Script Name | Purpose | Execution Status | Date | Result |\n|------------|---------|-----------------|------|--------|\n${entry}`
        );
        
        fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
        console.log('Updated script registry');
      }
    }
    
    // Update JSON registry
    const jsonRegistryPath = path.join(projectRoot, 'scripts', 'script_registry.json');
    if (fs.existsSync(jsonRegistryPath)) {
      const jsonRegistry = JSON.parse(fs.readFileSync(jsonRegistryPath, 'utf8'));
      
      // Check if the entry already exists
      const exists = jsonRegistry.some(entry => entry.name === 'Version0047_fix_nextjs_config_warnings.js');
      
      if (!exists) {
        // Add the new entry at the beginning
        jsonRegistry.unshift({
          "name": "Version0047_fix_nextjs_config_warnings.js",
          "description": "Fixes Next.js configuration warnings for Next.js 15.3.1",
          "dateExecuted": new Date().toISOString(),
          "status": "success",
          "version": "1.0",
          "modifiedFiles": [
            "/Users/kuoldeng/projectx/frontend/pyfactor_next/next.config.js"
          ]
        });
        
        fs.writeFileSync(jsonRegistryPath, JSON.stringify(jsonRegistry, null, 2), 'utf8');
        console.log('Updated JSON script registry');
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating script registry: ${error.message}`);
    return false;
  }
};

// Main execution function
const main = async () => {
  console.log('Starting Next.js configuration warnings fix');
  
  // Create backup
  const backupCreated = createBackup(nextConfigPath, backupPath);
  if (!backupCreated) {
    console.error('Failed to create backup. Aborting.');
    return;
  }
  
  // Update Next.js configuration
  const configUpdated = await updateNextConfig();
  if (!configUpdated) {
    console.error('Failed to update Next.js configuration. Check the error above.');
    return;
  }
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('Next.js configuration fix completed successfully');
  console.log('Please restart your Next.js development server to apply the changes');
  console.log('Run: cd ' + frontendRoot + ' && pnpm run dev:https');
};

// Execute the script
main().catch(error => {
  console.error('Script execution failed:', error);
}); 