#!/usr/bin/env node

/**
 * Script: Version0164_fix_additional_build_syntax_errors.mjs
 * Purpose: Fix additional syntax errors found after initial fixes
 * 
 * Fixes:
 * 1. axiosConfig.js - Malformed if statement blocks and missing braces
 * 2. inventoryService.js - Fix method definition syntax
 * 3. ultraOptimizedInventoryService.js - Fix function definition syntax
 * 4. apiHelpers.js - Fix missing closing parenthesis
 * 5. appCache.js - Fix invalid assignment to function call
 * 
 * Author: Claude
 * Date: 2025-06-08
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Helper function to log with timestamp
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Helper function to create backups
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '-')}`;
  fs.copyFileSync(filePath, backupPath);
  log(`Created backup: ${backupPath}`, 'success');
  return backupPath;
}

// Fix 1: Fix axiosConfig.js - Malformed if blocks
function fixAxiosConfig() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/lib/axiosConfig.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the malformed if statement around line 414
    // The issue is that there are multiple closing braces on one line without proper if statement
    content = content.replace(
      /if \(appCache\.getAll\(\)\) \{config\.headers\.Authorization = `Bearer \$\{.*?\}\`;[\s\S]*?logger\.debug\('\[AxiosConfig\] Using auth token from APP_CACHE'\);\s*\}\s*\}\s*\} else \{/g,
      `if (appCache.getAll()) {
              const authToken = appCache.get('auth.token');
              if (authToken) {
                config.headers.Authorization = \`Bearer \${authToken}\`;
                logger.debug('[AxiosConfig] Using auth token from APP_CACHE');
              }
            }
          } else {`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosConfig.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosConfig.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 2: Fix inventoryService.js - Method definition syntax
function fixInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/inventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the malformed getOfflineProducts method definition
    // The issue is there's a closing brace followed by a comma, then a method definition
    content = content.replace(
      /return \[\];\s*\},\s*\/\/ Get offline products\s*getOfflineProducts\(\) \{/g,
      `return [];
  }
  
  // Get offline products  
  getOfflineProducts() {`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed inventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing inventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 3: Fix ultraOptimizedInventoryService.js - Function definition syntax
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the function definition that's outside of the object
    // Look for where the object ends and the function is defined
    content = content.replace(
      /}\s*}\s*},\s*\/\*\*[\s\S]*?\*\/\s*const storeProductsOffline = \(products\) => \{/g,
      `}
  },

  /**
   * Store product data in app cache for offline access
   * @param {Array} products - List of products to store
   */
  storeProductsOffline(products) {`
    );
    
    // Also need to ensure this is inside the object
    // Find the closing of clearProductCache and add storeProductsOffline as a method
    content = content.replace(
      /clearProductCache\(\) \{[\s\S]*?logger\.debug\('Cleared ultra product cache from APP_CACHE'\);\s*\}\s*\}\s*\}\s*},/g,
      (match) => {
        return match.replace(/\}\s*},/, `}
  },`);
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed ultraOptimizedInventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing ultraOptimizedInventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 4: Fix apiHelpers.js - Missing closing parenthesis
function fixApiHelpers() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/apiHelpers.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the missing closing parenthesis in the if statement
    content = content.replace(
      /if \(!idToken && appCache\.getAll\(\)\s*idToken = appCache\.get\('auth\.idToken'\);/g,
      `if (!idToken && appCache.getAll()) {
        idToken = appCache.get('auth.idToken');`
    );
    
    // Also fix similar issue for tenant ID
    content = content.replace(
      /if \(!tenantId && appCache\.getAll\(\)\s*tenantId = appCache\.get\('tenant\.id'\);/g,
      `if (!tenantId && appCache.getAll()) {
        tenantId = appCache.get('tenant.id');`
    );
    
    // Fix another missing closing parenthesis around line 336
    content = content.replace(
      /if \(typeof window !== 'undefined' && appCache\.getAll\(\)\s*const tenantId = appCache\.get\('tenant\.id'\);/g,
      `if (typeof window !== 'undefined' && appCache.getAll()) {
      const tenantId = appCache.get('tenant.id');`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed apiHelpers.js`, 'success');
  } catch (error) {
    log(`Error fixing apiHelpers.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 5: Fix appCache.js - Invalid assignment to function call
function fixAppCache() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/appCache.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the invalid assignment to appCache.getAll()
    // We need to properly initialize the cache
    content = content.replace(
      /const initCache = \(\) => \{\s*if \(typeof window !== 'undefined'\) \{\s*appCache\.getAll\(\) = appCache\.getAll\(\) \|\| \{\};\s*return appCache\.getAll\(\);\s*\}\s*return null;\s*\};/g,
      `const initCache = () => {
  if (typeof window !== 'undefined') {
    if (!window.__appCache) {
      window.__appCache = {};
    }
    return window.__appCache;
  }
  return null;
};`
    );
    
    // Also need to update the appCache object to use window.__appCache
    content = content.replace(
      /export const appCache = \{/g,
      `// Use a global variable to store the cache
if (typeof window !== 'undefined' && !window.__appCache) {
  window.__appCache = {};
}

export const appCache = {`
    );
    
    // Update getAll method
    content = content.replace(
      /getAll\(\) \{[\s\S]*?\},/g,
      `getAll() {
    if (typeof window !== 'undefined') {
      return window.__appCache || {};
    }
    return {};
  },`
    );
    
    // Fix the circular import at the top
    content = content.replace(
      /import appCache from '\.\.\/utils\/appCache';\s*\n/g,
      ''
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed appCache.js`, 'success');
  } catch (error) {
    log(`Error fixing appCache.js: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
async function main() {
  log('Starting additional build syntax error fixes...');
  
  try {
    // Fix all files
    fixAxiosConfig();
    fixInventoryService();
    fixUltraOptimizedInventoryService();
    fixApiHelpers();
    fixAppCache();
    
    log('All additional syntax errors fixed successfully!', 'success');
    
    // Update script registry
    const registryPath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/scripts/script_registry.md');
    const registryEntry = `
## Version0164_fix_additional_build_syntax_errors.mjs
- **Purpose**: Fix additional syntax errors found after initial fixes
- **Files Fixed**: 
  - src/lib/axiosConfig.js - Malformed if statement blocks
  - src/services/inventoryService.js - Method definition syntax
  - src/services/ultraOptimizedInventoryService.js - Function definition syntax
  - src/utils/apiHelpers.js - Missing closing parenthesis
  - src/utils/appCache.js - Invalid assignment to function call
- **Status**: Completed
- **Date**: ${new Date().toISOString()}
`;
    
    let registryContent = fs.readFileSync(registryPath, 'utf8');
    registryContent += registryEntry;
    fs.writeFileSync(registryPath, registryContent, 'utf8');
    
    log('Script registry updated', 'success');
    
  } catch (error) {
    log(`Script failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
main();