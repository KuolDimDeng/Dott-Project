#!/usr/bin/env node

/**
 * Version0195_fix_additional_syntax_errors.mjs
 * 
 * This script fixes additional syntax errors identified in the build output:
 * 
 * 1. i18n.js - Fix duplicate appCache import
 * 2. axiosConfig.js - Fix malformed condition with extra braces
 * 3. inventoryService.js - Fix missing braces in conditions
 * 4. optimizedInventoryService.js - Fix syntax error
 * 5. ultraOptimizedInventoryService.js - Fix missing braces
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filePaths = {
  i18n: path.join(projectRoot, 'src/i18n.js'),
  axiosConfig: path.join(projectRoot, 'src/lib/axiosConfig.js'),
  inventoryService: path.join(projectRoot, 'src/services/inventoryService.js'),
  optimizedInventoryService: path.join(projectRoot, 'src/services/optimizedInventoryService.js'),
  ultraOptimizedInventoryService: path.join(projectRoot, 'src/services/ultraOptimizedInventoryService.js')
};

// Update script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  if (!fs.existsSync(registryPath)) {
    console.log('Creating new script registry file');
    const header = `# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script | Purpose | Execution Date | Status |\n|--------|---------|----------------|--------|\n`;
    fs.writeFileSync(registryPath, header);
  }
  
  let registry = fs.readFileSync(registryPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  // Add entry for the fix script
  const entry = `| Version0195_fix_additional_syntax_errors.mjs | Fix additional syntax errors from build output | ${date} | Executed |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0195_fix_additional_syntax_errors.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + entry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Helper function to create backup
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '')}`; 
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup of ${filePath}`);
}

// Fix i18n.js - Resolve duplicate appCache import
function fixI18nFile() {
  if (!fs.existsSync(filePaths.i18n)) {
    console.log(`File not found: ${filePaths.i18n}`);
    return false;
  }

  createBackup(filePaths.i18n);
  console.log(`Fixing duplicate imports in ${filePaths.i18n}`);

  let content = fs.readFileSync(filePaths.i18n, 'utf8');
  
  // Remove the duplicate appCache import, keep only the import from utils/appCache
  content = content.replace(
    /import { appCache } from '\.\/utils\/appCache';\s*import { getLanguageForCountry } from/g,
    'import { getLanguageForCountry } from'
  );
  
  fs.writeFileSync(filePaths.i18n, content);
  console.log('Fixed i18n.js');
  return true;
}

// Fix axiosConfig.js - Fix malformed condition with extra braces
function fixAxiosConfig() {
  if (!fs.existsSync(filePaths.axiosConfig)) {
    console.log(`File not found: ${filePaths.axiosConfig}`);
    return false;
  }

  createBackup(filePaths.axiosConfig);
  console.log(`Fixing syntax error in ${filePaths.axiosConfig}`);

  let content = fs.readFileSync(filePaths.axiosConfig, 'utf8');
  
  // Fix the malformed condition with extra braces
  content = content.replace(
    /if \(config\.url\?\.includes\('\/payroll\/'\) \{ \{\) \{/g,
    "if (config.url?.includes('/payroll/')) {"
  );
  
  fs.writeFileSync(filePaths.axiosConfig, content);
  console.log('Fixed axiosConfig.js');
  return true;
}

// Fix inventoryService.js - Fix missing braces in conditions
function fixInventoryService() {
  if (!fs.existsSync(filePaths.inventoryService)) {
    console.log(`File not found: ${filePaths.inventoryService}`);
    return false;
  }

  createBackup(filePaths.inventoryService);
  console.log(`Fixing missing braces in ${filePaths.inventoryService}`);

  let content = fs.readFileSync(filePaths.inventoryService, 'utf8');
  
  // Fix the missing braces in the if condition
  content = content.replace(
    /if \(typeof window !== 'undefined' &&\s+appCache\.getAll\(\)\s+logger\.debug/g,
    "if (typeof window !== 'undefined' && appCache.getAll()) {\n      logger.debug"
  );
  
  // Add closing brace for the condition
  content = content.replace(
    /return appCache\.get\('offline\.products'\);\s+\}/g,
    "return appCache.get('offline.products');\n    }\n  }"
  );
  
  fs.writeFileSync(filePaths.inventoryService, content);
  console.log('Fixed inventoryService.js');
  return true;
}

// Fix optimizedInventoryService.js - Fix syntax error
function fixOptimizedInventoryService() {
  if (!fs.existsSync(filePaths.optimizedInventoryService)) {
    console.log(`File not found: ${filePaths.optimizedInventoryService}`);
    return false;
  }

  createBackup(filePaths.optimizedInventoryService);
  console.log(`Fixing syntax error in ${filePaths.optimizedInventoryService}`);

  let content = fs.readFileSync(filePaths.optimizedInventoryService, 'utf8');
  
  // Check if there's an extra comma or incorrect block closure
  const lines = content.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '},') {
      // Check if this is the problematic line near "Cleared product cache from APP_CACHE"
      if (i > 0 && lines[i-1].includes('Cleared product cache from APP_CACHE')) {
        lines[i] = '  }';
        fixed = true;
        break;
      }
    }
  }
  
  if (fixed) {
    content = lines.join('\n');
    fs.writeFileSync(filePaths.optimizedInventoryService, content);
    console.log('Fixed optimizedInventoryService.js');
    return true;
  } else {
    console.log('Could not locate the specific syntax error in optimizedInventoryService.js');
    return false;
  }
}

// Fix ultraOptimizedInventoryService.js - Fix missing braces
function fixUltraOptimizedInventoryService() {
  if (!fs.existsSync(filePaths.ultraOptimizedInventoryService)) {
    console.log(`File not found: ${filePaths.ultraOptimizedInventoryService}`);
    return false;
  }

  createBackup(filePaths.ultraOptimizedInventoryService);
  console.log(`Fixing missing braces in ${filePaths.ultraOptimizedInventoryService}`);

  let content = fs.readFileSync(filePaths.ultraOptimizedInventoryService, 'utf8');
  
  // Fix the missing braces in the if condition
  content = content.replace(
    /if \(typeof window !== 'undefined' && appCache\.getAll\(\)\s+delete appCache\.getAll/g,
    "if (typeof window !== 'undefined' && appCache.getAll()) {\n      delete appCache.getAll"
  );
  
  // Add closing brace for the condition
  content = content.replace(
    /logger\.debug\('Cleared ultra product cache from APP_CACHE'\);\s+\}\s+\}/g,
    "logger.debug('Cleared ultra product cache from APP_CACHE');\n    }\n  }\n}"
  );
  
  fs.writeFileSync(filePaths.ultraOptimizedInventoryService, content);
  console.log('Fixed ultraOptimizedInventoryService.js');
  return true;
}

// Main function
async function main() {
  console.log('Starting additional syntax error fixes');
  
  // Fix each file
  const fixes = [
    fixI18nFile(),
    fixAxiosConfig(),
    fixInventoryService(),
    fixOptimizedInventoryService(),
    fixUltraOptimizedInventoryService()
  ];
  
  // Update script registry
  updateScriptRegistry();
  
  if (fixes.some(fix => fix === true)) {
    console.log('Successfully fixed one or more syntax errors');
  } else {
    console.log('No fixes were applied - check if the files exist or if they already have been fixed');
  }
  
  console.log('Completed additional syntax error fixes');
}

// Run the main function
main().catch(error => {
  console.error('Error fixing syntax errors:', error);
  process.exit(1);
});
