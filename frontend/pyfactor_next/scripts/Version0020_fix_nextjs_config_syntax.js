/**
 * Version0020_fix_nextjs_config_syntax.js
 * 
 * Script to fix syntax error in next.config.js introduced by previous script
 * 
 * PROBLEM: Syntax error in next.config.js - "Unexpected token ']'" on line 50
 * 
 * SOLUTION: Fix the malformed rewrites function in next.config.js
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
      "scriptName": "Version0020_fix_nextjs_config_syntax.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix syntax error in next.config.js",
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
 * Main function to fix next.config.js syntax error
 */
async function fixNextConfigSyntax() {
  logger.info('Starting next.config.js syntax error fix...');
  const filesModified = [];
  
  try {
    const nextConfigPath = path.join(CONFIG.frontendDir, 'next.config.js');
    
    if (!fs.existsSync(nextConfigPath)) {
      logger.error(`next.config.js not found at: ${nextConfigPath}`);
      return {
        success: false,
        message: 'next.config.js not found'
      };
    }
    
    // Create backup before modifying
    createBackup(nextConfigPath);
    
    // Instead of trying to fix the syntax error with regex, let's rewrite the file from scratch
    // based on a standard Next.js config template
    const nextConfigContent = `/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  distDir: 'dist',
  swcMinify: true,
  output: 'standalone',
  
  // Images configuration
  images: {
    domains: ['localhost', '127.0.0.1'],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://127.0.0.1:8000',
  },
};

// API proxying configuration
nextConfig.rewrites = async () => {
  console.log('[NextJS Config] Setting up API proxy rewrites to: https://127.0.0.1:8000/api/');
  return [
    {
      source: '/api/:path*',
      destination: 'https://127.0.0.1:8000/api/:path*',
    },
  ];
};

module.exports = nextConfig;
`;

    // Write the fixed config to the file
    fs.writeFileSync(nextConfigPath, nextConfigContent, 'utf8');
    logger.success('Fixed next.config.js syntax error');
    filesModified.push(nextConfigPath);
    
    // Success!
    logger.success('next.config.js fix completed!');
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Fixed syntax error in next.config.js',
      filesModified
    };
  } catch (error) {
    logger.error(`Error fixing next.config.js: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
fixNextConfigSyntax().then(result => {
  if (result.success) {
    logger.success(`${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files modified: ${result.filesModified.join(', ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 