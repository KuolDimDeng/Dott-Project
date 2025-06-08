#!/usr/bin/env node

/**
 * Script: Version0166_comprehensive_syntax_fixes.mjs
 * Purpose: Comprehensive fixes for all remaining syntax errors
 * 
 * Fixes:
 * 1. axiosConfig.js - Missing closing braces in nested blocks
 * 2. inventoryService.js - Function definition inside object literal
 * 3. ultraOptimizedInventoryService.js - Extra closing brace
 * 4. awsAppCache.js - Duplicate identifier
 * 5. axiosInstance.js - Invalid assignment to function call
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

// Fix 1: Fix axiosConfig.js - Missing closing braces
function fixAxiosConfig() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/lib/axiosConfig.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // The issue is that there's a missing closing brace before the else statement
    // and the structure is malformed
    // Find the problematic section and fix it
    
    // Look for the specific pattern where we have auth token handling
    const problematicSection = /if \(appCache\.getAll\(\)\) \{[\s\S]*?logger\.debug\('\[AxiosConfig\] Using auth token from APP_CACHE'\);\s*}\s*} else \{[\s\S]*?} catch \(importError\) \{/g;
    
    content = content.replace(problematicSection, (match) => {
      // Rewrite the entire section with proper structure
      return `if (appCache.getAll()) {
              const authToken = appCache.get('auth.token');
              if (authToken) {
                config.headers.Authorization = \`Bearer \${authToken}\`;
                logger.debug('[AxiosConfig] Using auth token from APP_CACHE');
              }
            } else {
              // Fall back to Amplify Auth
              try {
                const session = await fetchAuthSession();
                if (session?.tokens?.accessToken) {
                  config.headers.Authorization = \`Bearer \${session.tokens.accessToken.toString()}\`;
                }
              } catch (authError) {
                logger.warn('[AxiosConfig] Auth session error:', authError.message);
              }
            }
          } catch (importError) {`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosConfig.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosConfig.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 2: Fix inventoryService.js - Function inside object
function fixInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/inventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // The getOfflineProducts is being defined inside getOfflineProducts method
    // Need to fix the structure
    
    // Find the duplicate getOfflineProducts definition
    content = content.replace(
      /return \[\];\s*};\s*\/\/ Get offline products\s*export const getOfflineProducts = \(\) => \{[\s\S]*?return \[\];\s*}\s*}\s*};/g,
      `return [];
  }
};`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed inventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing inventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 3: Fix ultraOptimizedInventoryService.js - Extra closing brace
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // There's an extra closing brace after the appCache check
    content = content.replace(
      /if \(!appCache\.getAll\(\)\) \{\s*return \[\];\s*}\s*}/g,
      'if (!appCache.getAll()) {\n        return [];\n      }'
    );
    
    // Also need to fix the getOfflineProducts method - it's not properly closed
    // Find where it starts and ensure it's properly structured
    content = content.replace(
      /getOfflineProducts\(\) \{[\s\S]*?return offlineData\.products \|\| \[\];\s*} catch \(error\) \{/g,
      (match) => {
        // Check if the offlineData access is properly guarded
        if (!match.includes('if (!offlineData)')) {
          return match.replace(
            'const offlineData = appCache.getAll().offline[`ultra_products_${tenantId}`];',
            `const offlineData = appCache.getAll().offline[\`ultra_products_\${tenantId}\`];
      
      if (!offlineData) {
        return [];
      }`
          );
        }
        return match;
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed ultraOptimizedInventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing ultraOptimizedInventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 4: Fix awsAppCache.js - Duplicate identifier
function fixAwsAppCache() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/awsAppCache.js');
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    log(`File ${filePath} does not exist, skipping...`);
    return;
  }
  
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if appCache is already imported
    if (content.includes('import { appCache }') || content.includes('import appCache')) {
      // Remove the duplicate export
      content = content.replace(/export const appCache = \{/g, 'const awsAppCache = {');
      // Update the export at the end
      content = content.replace(/export { appCache };/g, 'export { awsAppCache as appCache };');
      content = content.replace(/export default appCache;/g, 'export default awsAppCache;');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed awsAppCache.js`, 'success');
  } catch (error) {
    log(`Error fixing awsAppCache.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 5: Fix axiosInstance.js - Invalid assignment
function fixAxiosInstance() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/axiosInstance.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the invalid assignments to appCache.getAll()
    content = content.replace(
      /if \(typeof window !== 'undefined'\) \{\s*appCache\.getAll\(\) = appCache\.getAll\(\) \|\| \{\};\s*appCache\.getAll\(\)\.auth = appCache\.getAll\(\)\.auth \|\| \{\};\s*appCache\.getAll\(\)\.tenant = appCache\.getAll\(\)\.tenant \|\| \{\};\s*}/g,
      `if (typeof window !== 'undefined') {
  // Initialize app cache structure
  const cache = appCache.getAll() || {};
  if (!cache.auth) {
    appCache.set('auth', {});
  }
  if (!cache.tenant) {
    appCache.set('tenant', {});
  }
}`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosInstance.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosInstance.js: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
async function main() {
  log('Starting comprehensive syntax fixes...');
  
  try {
    // Fix all files
    fixAxiosConfig();
    fixInventoryService();
    fixUltraOptimizedInventoryService();
    fixAwsAppCache();
    fixAxiosInstance();
    
    log('All comprehensive syntax errors fixed successfully!', 'success');
    
    // Update script registry
    const registryPath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/scripts/script_registry.md');
    const registryEntry = `
## Version0166_comprehensive_syntax_fixes.mjs
- **Purpose**: Comprehensive fixes for all remaining syntax errors
- **Files Fixed**: 
  - src/lib/axiosConfig.js - Missing closing braces in nested blocks
  - src/services/inventoryService.js - Function definition inside object literal
  - src/services/ultraOptimizedInventoryService.js - Extra closing brace and missing null check
  - src/utils/awsAppCache.js - Duplicate identifier
  - src/utils/axiosInstance.js - Invalid assignment to function call
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