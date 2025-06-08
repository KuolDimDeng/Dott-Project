#!/usr/bin/env node

/**
 * Version0191_fix_remaining_syntax_errors.mjs
 * 
 * This script specifically addresses the syntax errors found during the build process:
 * 1. Fixes import statement in i18n.js
 * 2. Fixes missing braces in conditionals in axiosConfig.js
 * 3. Fixes missing braces in conditionals in inventoryService.js
 * 4. Fixes missing braces in conditionals in optimizedInventoryService.js
 * 5. Fixes missing braces in conditionals in ultraOptimizedInventoryService.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix
const i18nPath = path.join(projectRoot, 'src/i18n.js');
const axiosConfigPath = path.join(projectRoot, 'src/lib/axiosConfig.js');
const inventoryServicePath = path.join(projectRoot, 'src/services/inventoryService.js');
const optimizedInventoryServicePath = path.join(projectRoot, 'src/services/optimizedInventoryService.js');
const ultraOptimizedInventoryServicePath = path.join(projectRoot, 'src/services/ultraOptimizedInventoryService.js');

// Helper function to create backups
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '_')}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup of ${filePath}`);
    return true;
  }
  return false;
}

// Fix i18n.js
function fixI18nJs() {
  if (!fs.existsSync(i18nPath)) {
    console.log(`File not found: ${i18nPath}`);
    return false;
  }

  createBackup(i18nPath);
  console.log(`Fixing import in ${i18nPath}`);

  let content = fs.readFileSync(i18nPath, 'utf8');
  
  // Fix the problematic import
  content = content.replace(
    /import\s*{\s*appCache\s*}\s*from\s*['"]\.\/utils\/\/\/\s*\/\/\s*appCache\.js['"];?/,
    "import { appCache } from './utils/appCache';"
  );

  fs.writeFileSync(i18nPath, content);
  console.log(`Fixed i18n.js`);
  return true;
}

// Fix axiosConfig.js
function fixAxiosConfigJs() {
  if (!fs.existsSync(axiosConfigPath)) {
    console.log(`File not found: ${axiosConfigPath}`);
    return false;
  }

  createBackup(axiosConfigPath);
  console.log(`Fixing conditionals in ${axiosConfigPath}`);

  let content = fs.readFileSync(axiosConfigPath, 'utf8');
  
  // Fix the conditional without braces
  content = content.replace(
    /if\s*\(\s*appCache\.getAll\(\)\s*\)\s*(?!\{)/g,
    'if (appCache.getAll()) {'
  );
  
  // Add missing closing braces where needed
  content = content.replace(
    /config\.headers\.Authorization\s*=\s*`Bearer\s*\${.*?}`;\s*logger\.debug\(\s*'\[AxiosConfig\]\s*Using\s*auth\s*token\s*from\s*APP_CACHE'\s*\);/g,
    match => `${match}\n}`
  );

  fs.writeFileSync(axiosConfigPath, content);
  console.log(`Fixed axiosConfig.js`);
  return true;
}

// Fix inventoryService.js
function fixInventoryServiceJs() {
  if (!fs.existsSync(inventoryServicePath)) {
    console.log(`File not found: ${inventoryServicePath}`);
    return false;
  }

  createBackup(inventoryServicePath);
  console.log(`Fixing conditionals in ${inventoryServicePath}`);

  let content = fs.readFileSync(inventoryServicePath, 'utf8');
  
  // Fix conditionals without braces
  content = content.replace(
    /if\s*\(\s*typeof\s*window\s*!==\s*['"]undefined['"]\s*&&\s*appCache\.getAll\(\)\s*\)\s*(?!\{)/g,
    'if (typeof window !== "undefined" && appCache.getAll()) {'
  );
  
  // Add closing braces where needed
  content = content.replace(
    /logger\.debug\(`Retrieved\s*\${.*?}\s*products\s*from\s*app\s*cache`\);\s*return\s*appCache\.get\('offline\.products'\);/g,
    match => `${match}\n}`
  );

  fs.writeFileSync(inventoryServicePath, content);
  console.log(`Fixed inventoryService.js`);
  return true;
}

// Fix optimizedInventoryService.js
function fixOptimizedInventoryServiceJs() {
  if (!fs.existsSync(optimizedInventoryServicePath)) {
    console.log(`File not found: ${optimizedInventoryServicePath}`);
    return false;
  }

  createBackup(optimizedInventoryServicePath);
  console.log(`Fixing conditionals in ${optimizedInventoryServicePath}`);

  let content = fs.readFileSync(optimizedInventoryServicePath, 'utf8');
  
  // Fix conditionals without braces
  content = content.replace(
    /if\s*\(\s*!\s*appCache\.getAll\(\)\s*\)\s*(?!\{)/g,
    'if (!appCache.getAll()) {'
  );
  
  content = content.replace(
    /if\s*\(\s*typeof\s*window\s*!==\s*['"]undefined['"]\s*&&\s*appCache\.getAll\(\)\s*\)\s*(?!\{)/g,
    'if (typeof window !== "undefined" && appCache.getAll()) {'
  );
  
  // Add closing braces where needed
  content = content.replace(
    /return\s*\[\];\s*\}/g,
    'return [];\n}'
  );

  fs.writeFileSync(optimizedInventoryServicePath, content);
  console.log(`Fixed optimizedInventoryService.js`);
  return true;
}

// Fix ultraOptimizedInventoryService.js
function fixUltraOptimizedInventoryServiceJs() {
  if (!fs.existsSync(ultraOptimizedInventoryServicePath)) {
    console.log(`File not found: ${ultraOptimizedInventoryServicePath}`);
    return false;
  }

  createBackup(ultraOptimizedInventoryServicePath);
  console.log(`Fixing conditionals in ${ultraOptimizedInventoryServicePath}`);

  let content = fs.readFileSync(ultraOptimizedInventoryServicePath, 'utf8');
  
  // Fix conditionals without braces
  content = content.replace(
    /if\s*\(\s*typeof\s*window\s*!==\s*['"]undefined['"]\s*&&\s*appCache\.getAll\(\)\s*\)\s*(?!\{)/g,
    'if (typeof window !== "undefined" && appCache.getAll()) {'
  );
  
  // Add closing braces where needed
  content = content.replace(
    /delete\s*appCache\.getAll\(\)\.offline\[`ultra_products_\${tenantId}`\];\s*logger\.debug\('Cleared\s*ultra\s*product\s*cache\s*from\s*APP_CACHE'\);/g,
    match => `${match}\n}`
  );

  fs.writeFileSync(ultraOptimizedInventoryServicePath, content);
  console.log(`Fixed ultraOptimizedInventoryService.js`);
  return true;
}

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
  
  // Add entry to the registry
  const newEntry = `| Version0191_fix_remaining_syntax_errors.mjs | Fix remaining syntax errors preventing build | ${date} | Executed |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0191_fix_remaining_syntax_errors.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + newEntry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Main function
function main() {
  console.log('Starting comprehensive syntax error fixes');
  
  // Fix each file
  const i18nFixed = fixI18nJs();
  const axiosConfigFixed = fixAxiosConfigJs();
  const inventoryServiceFixed = fixInventoryServiceJs();
  const optimizedInventoryServiceFixed = fixOptimizedInventoryServiceJs();
  const ultraOptimizedInventoryServiceFixed = fixUltraOptimizedInventoryServiceJs();
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('Completed syntax error fixes');
  
  return {
    i18nFixed,
    axiosConfigFixed,
    inventoryServiceFixed,
    optimizedInventoryServiceFixed,
    ultraOptimizedInventoryServiceFixed
  };
}

// Run the main function
main();
