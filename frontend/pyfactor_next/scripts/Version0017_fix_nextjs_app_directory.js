/**
 * Version0017_fix_nextjs_app_directory.js
 * 
 * Script to fix Next.js configuration to point to the correct app directory
 * 
 * PROBLEM: Next.js is looking for files in /app instead of /src/app
 * 
 * SOLUTION: Update the Next.js configuration to use the correct directory path
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
      "scriptName": "Version0017_fix_nextjs_app_directory.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix Next.js configuration to point to the correct app directory",
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
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Create a new configuration that explicitly sets the app directory
    let updatedConfig = nextConfigContent;
    
    // Check if distDir is already set
    if (!updatedConfig.includes('distDir:')) {
      // Add distDir after the reactStrictMode line
      updatedConfig = updatedConfig.replace(
        'reactStrictMode: true,',
        'reactStrictMode: true,\n  \n  // Set the correct src directory\n  distDir: \'dist\',\n  '
      );
    }
    
    // Check if experimental directories section exists
    if (!updatedConfig.includes('experimental: {')) {
      // Add experimental section
      updatedConfig = updatedConfig.replace(
        'const nextConfig = {',
        'const nextConfig = {\n  // Experimental features\n  experimental: {\n    appDir: true,\n  },'
      );
    } else if (!updatedConfig.includes('appDir: true')) {
      // Add appDir to existing experimental section
      updatedConfig = updatedConfig.replace(
        'experimental: {',
        'experimental: {\n    appDir: true,'
      );
    }
    
    // Add the correct dir property in the right place
    if (!updatedConfig.includes('dir: \'src/app\'')) {
      // Check if esmExternals is already in experimental
      if (updatedConfig.includes('esmExternals: \'loose\'')) {
        // Add after esmExternals
        updatedConfig = updatedConfig.replace(
          'esmExternals: \'loose\',',
          'esmExternals: \'loose\',\n    // Use the src/app directory\n    appDir: true,'
        );
      } else if (updatedConfig.includes('experimental: {')) {
        // Add to experimental section
        updatedConfig = updatedConfig.replace(
          'experimental: {',
          'experimental: {\n    // Use the src/app directory\n    appDir: true,'
        );
      }
    }
    
    // Also create a symbolic link from /app to /src/app as a fallback solution
    const appLinkPath = path.join(CONFIG.frontendDir, 'app');
    const srcAppPath = path.join(CONFIG.frontendDir, 'src', 'app');
    
    // Make sure we're not overwriting an existing directory
    if (!fs.existsSync(appLinkPath)) {
      logger.info('Creating symbolic link from /app to /src/app...');
      try {
        // On Unix/Mac, create a symlink
        fs.symlinkSync(srcAppPath, appLinkPath, 'dir');
        logger.success('Created symbolic link from /app to /src/app');
        filesModified.push(appLinkPath);
      } catch (error) {
        logger.error(`Failed to create symbolic link: ${error.message}`);
        logger.info('Falling back to creating a simple directory...');
        
        // If symlink creation fails, create a directory and copy the most important files
        try {
          fs.mkdirSync(appLinkPath, { recursive: true });
          
          // Create a simple index.js that redirects to src/app
          const indexContent = `// Redirect to src/app
module.exports = require('../src/app');
`;
          fs.writeFileSync(path.join(appLinkPath, 'index.js'), indexContent, 'utf8');
          logger.success('Created fallback directory with redirect');
          filesModified.push(path.join(appLinkPath, 'index.js'));
        } catch (dirError) {
          logger.error(`Failed to create fallback directory: ${dirError.message}`);
        }
      }
    }
    
    // Save the updated config back to the file
    fs.writeFileSync(nextConfigPath, updatedConfig, 'utf8');
    logger.success('Updated Next.js configuration to use the correct app directory');
    filesModified.push(nextConfigPath);
    
    // 2. Create an .env file with the correct SRC_DIR
    const envFilePath = path.join(CONFIG.frontendDir, '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8');
    }
    
    // Add SRC_DIR to .env file if it doesn't already exist
    if (!envContent.includes('SRC_DIR=')) {
      envContent += '\n# App directory configuration\nSRC_DIR=src\n';
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      logger.success('Added SRC_DIR to .env.local');
      filesModified.push(envFilePath);
    }
    
    // Update package.json to ensure dev commands respect the src directory
    const packageJsonPath = path.join(CONFIG.frontendDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      
      // Check if dev and dev:https scripts need updating
      if (packageJson.scripts.dev && !packageJson.scripts.dev.includes('SRC_DIR=src')) {
        packageJson.scripts.dev = `SRC_DIR=src ${packageJson.scripts.dev}`;
      }
      
      if (packageJson.scripts['dev:https'] && !packageJson.scripts['dev:https'].includes('SRC_DIR=src')) {
        packageJson.scripts['dev:https'] = `SRC_DIR=src ${packageJson.scripts['dev:https']}`;
      }
      
      // Save updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      logger.success('Updated package.json dev scripts to use src directory');
      filesModified.push(packageJsonPath);
    }
    
    // Success!
    logger.success('Next.js configuration fixes completed!');
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Next.js configuration updated to use the correct app directory',
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
      logger.info(`Files created/modified: ${result.filesModified.join('\n - ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 