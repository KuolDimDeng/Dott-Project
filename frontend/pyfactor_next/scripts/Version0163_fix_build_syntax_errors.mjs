#!/usr/bin/env node

/**
 * Script: Version0163_fix_build_syntax_errors.mjs
 * Purpose: Fix syntax errors in multiple files that are causing the Vercel build to fail
 * 
 * Fixes:
 * 1. axiosConfig.js - Missing closing brace on line 187
 * 2. inventoryService.js - Malformed method definition and extra closing braces
 * 3. ultraOptimizedInventoryService.js - Invalid assignment to function call (appCache.getAll())
 * 4. amplifyResiliency.js - Duplicate import statement
 * 5. apiHelpers.js - Invalid assignment to function call (appCache.get())
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

// Fix 1: Fix axiosConfig.js - Missing closing brace
function fixAxiosConfig() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/lib/axiosConfig.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the missing closing brace on line 187
    content = content.replace(
      /if \(!config\.params\) \{config\.params = \{\};/g,
      'if (!config.params) { config.params = {}; }'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosConfig.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosConfig.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 2: Fix inventoryService.js - Malformed method definition
function fixInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/inventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the problematic section and fix it
    const problematicSection = `    // Get from app cache
    if (typeof window !== 'undefined' && appCache.getAll()) {
      logger.debug(\`Retrieved \${appCache.get('offline.products').length} products from app cache\`);
      return appCache.get('offline.products');
    }
    }
  
      // Get offline products
  getOfflineProducts() {
    if (typeof window !== 'undefined' && appCache) {
      if (appCache.get('offline.products')) {
        return appCache.get('offline.products');
      }
    } else {
      logger.debug('No products found in app cache for offline use');
      return [];
    }
  } catch (error) {
    logger.error('Failed to get offline products:', error);
    return [];`;
    
    const fixedSection = `    // Get from app cache
    if (typeof window !== 'undefined' && appCache.getAll()) {
      const offlineProducts = appCache.get('offline.products');
      if (offlineProducts && offlineProducts.length) {
        logger.debug(\`Retrieved \${offlineProducts.length} products from app cache\`);
        return offlineProducts;
      }
    }
    return [];
  },
  
  // Get offline products
  getOfflineProducts() {
    try {
      if (typeof window !== 'undefined' && appCache) {
        const offlineProducts = appCache.get('offline.products');
        if (offlineProducts) {
          return offlineProducts;
        }
      }
      logger.debug('No products found in app cache for offline use');
      return [];
    } catch (error) {
      logger.error('Failed to get offline products:', error);
      return [];
    }`;
    
    content = content.replace(problematicSection, fixedSection);
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed inventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing inventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 3: Fix ultraOptimizedInventoryService.js - Invalid assignment
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the invalid assignment to appCache.getAll()
    content = content.replace(
      /appCache\.getAll\(\) = appCache\.getAll\(\) \|\| \{\};/g,
      '// Ensure app cache is initialized\n      const cacheData = appCache.getAll() || {};\n      if (!cacheData.offline) {\n        cacheData.offline = {};\n      }'
    );
    
    content = content.replace(
      /appCache\.getAll\(\)\.offline = appCache\.getAll\(\)\.offline \|\| \{\};/g,
      ''
    );
    
    content = content.replace(
      /appCache\.getAll\(\)\.offline\[\`ultra_products_\$\{tenantId\}\`\] = offlineData;/g,
      'cacheData.offline[`ultra_products_${tenantId}`] = offlineData;\n      appCache.set(\'offline.ultra_products_\' + tenantId, offlineData);'
    );
    
    // Also fix the storeProductsOffline method declaration
    content = content.replace(
      /storeProductsOffline\(products\) \{/g,
      'const storeProductsOffline = (products) => {'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed ultraOptimizedInventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing ultraOptimizedInventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 4: Fix amplifyResiliency.js - Duplicate import
function fixAmplifyResiliency() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/amplifyResiliency.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove duplicate import and fix the import statement
    content = content.replace(
      /import appCache from '..\/utils\/appCache';/g,
      'import { appCache } from \'../utils/appCache\';'
    );
    
    // Remove the duplicate import line
    content = content.replace(
      /import { getFallbackTenantId } from '\.\/tenantFallback';\nimport { appCache } from '..\/utils\/appCache';/g,
      'import { getFallbackTenantId } from \'./tenantFallback\';'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed amplifyResiliency.js`, 'success');
  } catch (error) {
    log(`Error fixing amplifyResiliency.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 5: Fix apiHelpers.js - Invalid assignment
function fixApiHelpers() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/apiHelpers.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the invalid assignment to appCache.get()
    content = content.replace(
      /appCache\.get\('tenant\.id'\) = tenantId;/g,
      'appCache.set(\'tenant.id\', tenantId);'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed apiHelpers.js`, 'success');
  } catch (error) {
    log(`Error fixing apiHelpers.js: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
async function main() {
  log('Starting build syntax error fixes...');
  
  try {
    // Fix all files
    fixAxiosConfig();
    fixInventoryService();
    fixUltraOptimizedInventoryService();
    fixAmplifyResiliency();
    fixApiHelpers();
    
    log('All syntax errors fixed successfully!', 'success');
    
    // Update script registry
    const registryPath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/scripts/script_registry.md');
    const registryEntry = `
## Version0163_fix_build_syntax_errors.mjs
- **Purpose**: Fix syntax errors in multiple files causing Vercel build failure
- **Files Fixed**: 
  - src/lib/axiosConfig.js - Missing closing brace
  - src/services/inventoryService.js - Malformed method definition
  - src/services/ultraOptimizedInventoryService.js - Invalid assignment to function call
  - src/utils/amplifyResiliency.js - Duplicate import
  - src/utils/apiHelpers.js - Invalid assignment to function call
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