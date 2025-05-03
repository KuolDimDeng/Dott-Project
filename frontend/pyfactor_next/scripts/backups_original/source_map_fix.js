/**
 * Source Map Fix Script
 * Issue ID: AUTH-FIX-2025-06-01
 * Version: v1.0
 * 
 * This script adds proper source map configuration to the Next.js build
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Root directory paths
const rootDir = path.resolve(__dirname, '..');
const nextConfigPath = path.join(rootDir, 'next.config.js');

// Backup function
function backupFile(filePath) {
  const backupPath = `${filePath}.backup-${new Date().toISOString()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Main function
function applySourceMapFix() {
  console.log('[SOURCE-MAP-FIX] Starting source map configuration fix...');
  
  if (fs.existsSync(nextConfigPath)) {
    backupFile(nextConfigPath);
    
    let configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Check if productionBrowserSourceMaps is already configured
    if (!configContent.includes('productionBrowserSourceMaps')) {
      // Find the module.exports section
      const moduleExportsMatch = configContent.match(/module\.exports\s*=\s*{[^}]*}/);
      
      if (moduleExportsMatch) {
        // Extract the existing config
        const existingConfig = moduleExportsMatch[0];
        
        // Replace with updated config that includes source maps
        const updatedConfig = existingConfig.replace(
          /module\.exports\s*=\s*{/, 
          'module.exports = {' + '\n  productionBrowserSourceMaps: true,'
        );
        
        configContent = configContent.replace(existingConfig, updatedConfig);
      } else {
        // If no module.exports found, add one
        configContent += `

module.exports = {
  productionBrowserSourceMaps: true
};
`;
      }
      
      fs.writeFileSync(nextConfigPath, configContent);
      console.log('[SOURCE-MAP-FIX] ✓ Added source map configuration to next.config.js');
    } else {
      console.log('[SOURCE-MAP-FIX] Source maps already configured in next.config.js');
    }
  } else {
    console.log('[SOURCE-MAP-FIX] next.config.js not found, creating new file');
    
    const newConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  swcMinify: true
};

module.exports = nextConfig;
`;
    
    fs.writeFileSync(nextConfigPath, newConfigContent);
    console.log('[SOURCE-MAP-FIX] ✓ Created new next.config.js with source map configuration');
  }
}

// Run the fix
try {
  applySourceMapFix();
  console.log('[SOURCE-MAP-FIX] Source map fix completed successfully');
} catch (error) {
  console.error('[SOURCE-MAP-FIX] Error applying source map fix:', error);
}
