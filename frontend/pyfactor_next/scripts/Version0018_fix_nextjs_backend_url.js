/**
 * Version0018_fix_nextjs_backend_url.js
 * 
 * Script to fix Next.js backend API URL and remove invalid configuration options
 * 
 * PROBLEM: 
 * 1. Backend API URL is using localhost instead of 127.0.0.1, causing connection issues
 * 2. Invalid `appDir` configuration in experimental options
 * 3. Problematic `esmExternals` option that should be removed
 * 
 * SOLUTION: Update the Next.js configuration with the correct backend URL and remove invalid options
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  backupDir: '/Users/kuoldeng/projectx/scripts/backups',
  baseDir: '/Users/kuoldeng/projectx',
  frontendDir: '/Users/kuoldeng/projectx/frontend/pyfactor_next',
  scriptRegistryPath: '/Users/kuoldeng/projectx/scripts/script_registry.json'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// Logger utility
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  warn: (message) => console.log(`[WARNING] ${message}`)
};

/**
 * Creates a backup of a target file
 */
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    logger.info(`Backup created at: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Updates the script registry
 */
function updateScriptRegistry(status, filesModified) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist or read existing registry
    if (fs.existsSync(CONFIG.scriptRegistryPath)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistryPath, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Format entry to match existing registry
    const newEntry = {
      "scriptName": "Version0018_fix_nextjs_backend_url.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix Next.js backend API URL and remove invalid configuration options",
      "status": status ? "SUCCESS" : "FAILED",
      "filesModified": filesModified
    };
    
    // Add new entry to registry
    registry.push(newEntry);
    
    fs.writeFileSync(
      CONFIG.scriptRegistryPath, 
      JSON.stringify(registry, null, 2), 
      'utf8'
    );
    
    logger.info('Script registry updated');
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
  }
}

/**
 * Main function to fix Next.js configuration
 */
async function fixNextJsConfig() {
  logger.info('Starting Next.js configuration fix...');
  const filesModified = [];
  
  try {
    // 1. Update next.config.js
    const nextConfigPath = path.join(CONFIG.frontendDir, 'next.config.js');
    
    if (!fs.existsSync(nextConfigPath)) {
      logger.error(`Next.js config file not found at: ${nextConfigPath}`);
      return {
        success: false,
        message: 'Next.js config file not found'
      };
    }
    
    // Create backup before modifying
    createBackup(nextConfigPath);
    
    // Read the file content
    let nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // 1. Remove appDir option which is invalid in Next.js 15.3.1
    nextConfigContent = nextConfigContent.replace(/appDir: true,?/g, '');
    
    // 2. Remove esmExternals option
    nextConfigContent = nextConfigContent.replace(/esmExternals: ['"]loose['"],?/g, '');
    
    // Clean up any empty experimental objects
    nextConfigContent = nextConfigContent.replace(/experimental: {\s*},?/g, '');
    
    // 3. Update proxy configuration to use 127.0.0.1 instead of localhost
    if (nextConfigContent.includes('localhost:8000')) {
      nextConfigContent = nextConfigContent.replace(/localhost:8000/g, '127.0.0.1:8000');
      logger.success('Updated API proxy URL from localhost:8000 to 127.0.0.1:8000');
    }
    
    // Save the updated config back to the file
    fs.writeFileSync(nextConfigPath, nextConfigContent, 'utf8');
    logger.success('Updated Next.js configuration to remove invalid options');
    filesModified.push(nextConfigPath);
    
    // 4. Update .env.local file to use 127.0.0.1 instead of localhost
    const envFilePath = path.join(CONFIG.frontendDir, '.env.local');
    if (fs.existsSync(envFilePath)) {
      // Create backup
      createBackup(envFilePath);
      
      let envContent = fs.readFileSync(envFilePath, 'utf8');
      
      // Update API URLs
      envContent = envContent.replace(/NEXT_PUBLIC_API_URL=https:\/\/localhost:8000/g, 'NEXT_PUBLIC_API_URL=https://127.0.0.1:8000');
      envContent = envContent.replace(/BACKEND_API_URL=https:\/\/localhost:8000/g, 'BACKEND_API_URL=https://127.0.0.1:8000');
      
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      logger.success('Updated .env.local with correct API URLs');
      filesModified.push(envFilePath);
    }
    
    // 5. Update .env file if it exists
    const envDefaultPath = path.join(CONFIG.frontendDir, '.env');
    if (fs.existsSync(envDefaultPath)) {
      // Create backup
      createBackup(envDefaultPath);
      
      let envContent = fs.readFileSync(envDefaultPath, 'utf8');
      
      // Update API URLs
      envContent = envContent.replace(/NEXT_PUBLIC_API_URL=https:\/\/localhost:8000/g, 'NEXT_PUBLIC_API_URL=https://127.0.0.1:8000');
      envContent = envContent.replace(/BACKEND_API_URL=https:\/\/localhost:8000/g, 'BACKEND_API_URL=https://127.0.0.1:8000');
      
      fs.writeFileSync(envDefaultPath, envContent, 'utf8');
      logger.success('Updated .env with correct API URLs');
      filesModified.push(envDefaultPath);
    }
    
    // Success!
    logger.success('Next.js configuration fixes completed!');
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Next.js configuration updated with correct backend URLs and invalid options removed',
      filesModified
    };
  } catch (error) {
    logger.error(`Error fixing Next.js configuration: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
fixNextJsConfig().then(result => {
  if (result.success) {
    logger.success(`${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files modified: ${result.filesModified.join(', ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 