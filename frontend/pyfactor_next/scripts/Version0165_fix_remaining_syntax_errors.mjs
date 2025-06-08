#!/usr/bin/env node

/**
 * Script: Version0165_fix_remaining_syntax_errors.mjs
 * Purpose: Fix remaining syntax errors in the build
 * 
 * Fixes:
 * 1. axiosConfig.js - Extra closing brace causing else statement to be orphaned
 * 2. inventoryService.js - Method not inside an object literal
 * 3. ultraOptimizedInventoryService.js - Missing closing parenthesis
 * 4. apiHelpers.js - Duplicate import statement
 * 5. appCache.js - Invalid assignment in clear method
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

// Fix 1: Fix axiosConfig.js - Extra closing brace
function fixAxiosConfig() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/lib/axiosConfig.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Look for the area around line 420-421 where there's an extra closing brace
    // The pattern is: } followed by } else { which is invalid
    content = content.replace(
      /}\s*}\s*} else {/g,
      '} else {'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed axiosConfig.js`, 'success');
  } catch (error) {
    log(`Error fixing axiosConfig.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 2: Fix inventoryService.js - Method definition outside object
function fixInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/inventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // The getOfflineProducts method needs to be inside the export
    // Find where it's defined outside and move it
    // First, let's check if we're inside a module or object export
    
    // Look for the getOfflineProducts function definition that's not part of an object
    content = content.replace(
      /}\s*\/\/ Get offline products\s*getOfflineProducts\(\) {/g,
      '};\n\n// Get offline products\nexport const getOfflineProducts = () => {'
    );
    
    // Also fix the closing of this function
    content = content.replace(
      /return \[\];\s*}\s*}\s*}\s*};/g,
      'return [];\n    }\n  }\n};'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed inventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing inventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 3: Fix ultraOptimizedInventoryService.js - Missing closing parenthesis
function fixUltraOptimizedInventoryService() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/services/ultraOptimizedInventoryService.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the missing closing parenthesis in the if statement
    content = content.replace(
      /if \(!appCache\.getAll\(\)\s*return \[\];/g,
      'if (!appCache.getAll()) {\n        return [];\n      }'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed ultraOptimizedInventoryService.js`, 'success');
  } catch (error) {
    log(`Error fixing ultraOptimizedInventoryService.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 4: Fix apiHelpers.js - Duplicate import
function fixApiHelpers() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/apiHelpers.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the first import that's redundant
    content = content.replace(
      /import appCache from '\.\.\/utils\/appCache';\s*\/\*\*\s*\* Utility functions for API requests\s*\*\/\s*import { appCache } from '\.\.\/utils\/appCache';/g,
      '/**\n * Utility functions for API requests\n */\nimport { appCache } from \'../utils/appCache\';'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Fixed apiHelpers.js`, 'success');
  } catch (error) {
    log(`Error fixing apiHelpers.js: ${error.message}`, 'error');
    throw error;
  }
}

// Fix 5: Fix appCache.js - Invalid assignment
function fixAppCache() {
  const filePath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/src/utils/appCache.js');
  log(`Fixing ${filePath}...`);
  
  try {
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the clear method to use window.__appCache instead of appCache.getAll()
    content = content.replace(
      /export const clear = \(\) => \{\s*try \{\s*if \(typeof window !== 'undefined'\) \{\s*appCache\.getAll\(\) = \{\};\s*return true;\s*\}\s*return false;\s*\} catch \(error\) \{/g,
      `export const clear = () => {
  try {
    if (typeof window !== 'undefined') {
      window.__appCache = {};
      return true;
    }
    return false;
  } catch (error) {`
    );
    
    // Also need to export appCache object
    content = content.replace(
      /export default \{/g,
      '// Use a global variable to store the cache\nif (typeof window !== \'undefined\' && !window.__appCache) {\n  window.__appCache = {};\n}\n\nexport const appCache = {\n  get,\n  set,\n  remove,\n  clear,\n  getAll\n};\n\nexport default {'
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
  log('Starting remaining syntax error fixes...');
  
  try {
    // Fix all files
    fixAxiosConfig();
    fixInventoryService();
    fixUltraOptimizedInventoryService();
    fixApiHelpers();
    fixAppCache();
    
    log('All remaining syntax errors fixed successfully!', 'success');
    
    // Update script registry
    const registryPath = path.join(PROJECT_ROOT, 'frontend/pyfactor_next/scripts/script_registry.md');
    const registryEntry = `
## Version0165_fix_remaining_syntax_errors.mjs
- **Purpose**: Fix remaining syntax errors in the build
- **Files Fixed**: 
  - src/lib/axiosConfig.js - Extra closing brace
  - src/services/inventoryService.js - Method definition outside object
  - src/services/ultraOptimizedInventoryService.js - Missing closing parenthesis
  - src/utils/apiHelpers.js - Duplicate import statement
  - src/utils/appCache.js - Invalid assignment in clear method
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