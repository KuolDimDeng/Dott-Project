/**
 * Version0046_fix_nextjs_home_page_404.js
 * 
 * This script fixes the 404 error on the home page by ensuring the Next.js configuration
 * correctly handles the app directory structure and route configuration.
 * 
 * Version: 1.0
 * Date: 2025-05-03
 * 
 * Changes:
 * - Creates a backup of next.config.js
 * - Updates the Next.js configuration to properly handle the src/app directory
 * - Adds proper experimental configuration for app directory routing
 * - Updates distDir configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
    
    // Update the experimental section to properly handle app directory
    const updatedContent = content.replace(
      /\/\/ Experimental features that are still supported\n\s+experimental: {[^}]*},/s,
      `// Experimental features that are still supported
  experimental: {
    // Enable app directory features
    appDir: true,
    // Enable serverActions
    serverActions: true,
    // Support for modern image formats
    images: {
      allowFutureImage: true
    }
  },`
    );
    
    // Update the distDir configuration
    const finalContent = updatedContent.replace(
      /\/\/ Set the correct src directory\n\s+distDir: ['"]dist['"],/s,
      `// Set the correct src directory
  distDir: 'dist',
  // Ensure src directory is correctly used
  srcDir: 'src',`
    );
    
    // Write the updated configuration back to the file
    fs.writeFileSync(nextConfigPath, finalContent, 'utf8');
    console.log('Updated Next.js configuration to fix home page 404 error');
    
    // Restart Next.js development server (optional)
    /*
    try {
      console.log('Restarting Next.js development server...');
      await execPromise('cd ' + frontendRoot + ' && pnpm run dev:https', { 
        timeout: 5000 
      });
      console.log('Next.js development server restarted');
    } catch (error) {
      console.warn('Note: Server restart command did not complete. You may need to restart manually.');
    }
    */
    
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
      const entry = `| Version0046_fix_nextjs_home_page_404.js | Fixed 404 error on home page by updating Next.js configuration for app directory | 2025-05-03 | Complete |`;
      
      if (!registry.includes('Version0046_fix_nextjs_home_page_404.js')) {
        const updatedRegistry = registry.replace(
          /\| Script Name \| Purpose \| Date \| Status \|\n\|-+\|-+\|-+\|-+\|/,
          `| Script Name | Purpose | Date | Status |\n|------------|---------|------|--------|\n${entry}`
        );
        
        fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
        console.log('Updated script registry');
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
  console.log('Starting Next.js configuration fix for home page 404 error');
  
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