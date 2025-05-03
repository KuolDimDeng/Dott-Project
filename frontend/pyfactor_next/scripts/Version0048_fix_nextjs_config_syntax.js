/**
 * Version0048_fix_nextjs_config_syntax.js
 * 
 * This script fixes the syntax error in the Next.js configuration after the previous fix
 * 
 * Version: 1.0
 * Date: 2025-05-03
 * 
 * Changes:
 * - Removes the extra closing brace after the experimental section
 */

import * as fs from 'fs';
import * as path from 'path';

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
const fixSyntaxError = async () => {
  try {
    // Read the current next.config.js file
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Fix the extra closing brace
    const fixedContent = content.replace(
      /  experimental: {[^}]*}\n  }/s,
      `  experimental: {
    // Enable server actions with correct configuration
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000']
    }
  }`
    );
    
    // Write the updated configuration back to the file
    fs.writeFileSync(nextConfigPath, fixedContent, 'utf8');
    console.log('Fixed syntax error in Next.js configuration');
    
    return true;
  } catch (error) {
    console.error(`Error fixing Next.js configuration: ${error.message}`);
    return false;
  }
};

// Function to update script registry
const updateScriptRegistry = () => {
  try {
    const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
    
    if (fs.existsSync(registryPath)) {
      const registry = fs.readFileSync(registryPath, 'utf8');
      const entry = `| Version0048_fix_nextjs_config_syntax.js | Fixed syntax error in Next.js configuration | 2025-05-03 | Success |`;
      
      if (!registry.includes('Version0048_fix_nextjs_config_syntax.js')) {
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
      const exists = jsonRegistry.some(entry => entry.name === 'Version0048_fix_nextjs_config_syntax.js');
      
      if (!exists) {
        // Add the new entry at the beginning
        jsonRegistry.unshift({
          "name": "Version0048_fix_nextjs_config_syntax.js",
          "description": "Fixed syntax error in Next.js configuration",
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
  console.log('Starting Next.js configuration syntax fix');
  
  // Create backup
  const backupCreated = createBackup(nextConfigPath, backupPath);
  if (!backupCreated) {
    console.error('Failed to create backup. Aborting.');
    return;
  }
  
  // Fix syntax error
  const syntaxFixed = await fixSyntaxError();
  if (!syntaxFixed) {
    console.error('Failed to fix syntax error. Check the error above.');
    return;
  }
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('Next.js configuration syntax fix completed successfully');
  console.log('Please restart your Next.js development server to apply the changes');
  console.log('Run: cd ' + frontendRoot + ' && pnpm run dev:https');
};

// Execute the script
main().catch(error => {
  console.error('Script execution failed:', error);
}); 