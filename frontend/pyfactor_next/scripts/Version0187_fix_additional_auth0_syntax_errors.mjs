#!/usr/bin/env node

/**
 * Version0187_fix_additional_auth0_syntax_errors.mjs
 * 
 * This script fixes additional syntax errors found during the build process:
 * 1. Duplicate userAttributes declaration in SignInForm.js
 * 2. Duplicate appCache declaration in i18n.js
 * 3. Missing closing parenthesis in axiosConfig.js
 * 4. Invalid assignment in inventoryService.js
 * 5. Missing closing parenthesis in optimizedInventoryService.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const signInFormPath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
const i18nPath = path.join(projectRoot, 'src/i18n.js');
const axiosConfigPath = path.join(projectRoot, 'src/lib/axiosConfig.js');
const inventoryServicePath = path.join(projectRoot, 'src/services/inventoryService.js');
const optimizedInventoryServicePath = path.join(projectRoot, 'src/services/optimizedInventoryService.js');

// Helper function to create backup
function createBackup(filePath) {
  const date = new Date().toISOString().replace(/:/g, '').split('.')[0];
  const backupPath = `${filePath}.backup_${date}`;
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Creating backup of ${filePath}`);
    return true;
  }
  
  console.log(`File not found: ${filePath}`);
  return false;
}

// Fix SignInForm.js - duplicate userAttributes declaration
function fixSignInForm() {
  if (!fs.existsSync(signInFormPath)) {
    console.log(`SignInForm.js not found at ${signInFormPath}`);
    return false;
  }
  
  createBackup(signInFormPath);
  console.log(`Fixing duplicate userAttributes in ${signInFormPath}`);
  
  let content = fs.readFileSync(signInFormPath, 'utf8');
  
  // Fix the duplicate userAttributes declaration
  content = content.replace(
    `const userAttributes = await getAuth0UserProfile();
                const userAttributes = await fetchUserAttributes();`,
    `const userAttributes = await getAuth0UserProfile();
                // No need to fetch attributes again, we already have them from Auth0`
  );
  
  fs.writeFileSync(signInFormPath, content);
  console.log('Fixed SignInForm.js');
  return true;
}

// Fix i18n.js - duplicate appCache declaration
function fixI18n() {
  if (!fs.existsSync(i18nPath)) {
    console.log(`i18n.js not found at ${i18nPath}`);
    return false;
  }
  
  createBackup(i18nPath);
  console.log(`Fixing duplicate appCache in ${i18nPath}`);
  
  let content = fs.readFileSync(i18nPath, 'utf8');
  
  // Replace duplicate appCache import with a comment
  content = content.replace(
    `import { appCache } from './utils/appCache.js';`,
    `// Import appCache if needed for language preferences
// import { appCache } from './utils/appCache.js';`
  );
  
  // Also fix any references to appCache in the file
  content = content.replace(/appCache\./g, '// appCache.');
  
  fs.writeFileSync(i18nPath, content);
  console.log('Fixed i18n.js');
  return true;
}

// Fix axiosConfig.js - missing closing parenthesis
function fixAxiosConfig() {
  if (!fs.existsSync(axiosConfigPath)) {
    console.log(`axiosConfig.js not found at ${axiosConfigPath}`);
    return false;
  }
  
  createBackup(axiosConfigPath);
  console.log(`Fixing syntax in ${axiosConfigPath}`);
  
  let content = fs.readFileSync(axiosConfigPath, 'utf8');
  
  // Fix the missing closing parenthesis and incorrect const placement
  content = content.replace(
    `if (typeof window !== 'undefined' && appCache.getAll()
      const token = (appCache && (appCache && appCache.get('auth.token')));`,
    `if (typeof window !== 'undefined' && appCache.getAll()) {
      const token = (appCache && appCache.get('auth.token'));`
  );
  
  fs.writeFileSync(axiosConfigPath, content);
  console.log('Fixed axiosConfig.js');
  return true;
}

// Fix inventoryService.js - invalid assignment
function fixInventoryService() {
  if (!fs.existsSync(inventoryServicePath)) {
    console.log(`inventoryService.js not found at ${inventoryServicePath}`);
    return false;
  }
  
  createBackup(inventoryServicePath);
  console.log(`Fixing invalid assignment in ${inventoryServicePath}`);
  
  let content = fs.readFileSync(inventoryServicePath, 'utf8');
  
  // Fix the invalid assignment
  content = content.replace(
    `appCache.getAll() = appCache.getAll() || {};`,
    `if (!appCache.getAll()) appCache.init(); // Initialize if not already done`
  );
  
  // Also fix the next line that may have a similar issue
  content = content.replace(
    `appCache.getAll().offline = appCache.getAll().offline || {};`,
    `if (appCache.getAll() && !appCache.getAll().offline) appCache.set('offline', {});`
  );
  
  fs.writeFileSync(inventoryServicePath, content);
  console.log('Fixed inventoryService.js');
  return true;
}

// Fix optimizedInventoryService.js - missing closing parenthesis
function fixOptimizedInventoryService() {
  if (!fs.existsSync(optimizedInventoryServicePath)) {
    console.log(`optimizedInventoryService.js not found at ${optimizedInventoryServicePath}`);
    return false;
  }
  
  createBackup(optimizedInventoryServicePath);
  console.log(`Fixing syntax in ${optimizedInventoryServicePath}`);
  
  let content = fs.readFileSync(optimizedInventoryServicePath, 'utf8');
  
  // Fix the missing closing parenthesis
  content = content.replace(
    `if (typeof window !== 'undefined' && appCache.getAll()
      delete appCache.get('offline.products');`,
    `if (typeof window !== 'undefined' && appCache.getAll()) {
      if (appCache.get('offline.products')) {
        appCache.remove('offline.products');
      }`
  );
  
  fs.writeFileSync(optimizedInventoryServicePath, content);
  console.log('Fixed optimizedInventoryService.js');
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
  
  // Add script entry to the registry
  const entry = `| Version0187_fix_additional_auth0_syntax_errors.mjs | Fix additional Auth0 syntax errors found during build | ${date} | Executed |\n`;
  
  // Check if entry already exists
  if (!registry.includes('Version0187_fix_additional_auth0_syntax_errors.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + entry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Main function
async function main() {
  console.log('Starting additional Auth0 syntax error fixes');
  
  let success = true;
  
  // Fix each file
  if (fs.existsSync(signInFormPath)) {
    success = fixSignInForm() && success;
  } else {
    console.log(`SignInForm.js not found, skipping`);
  }
  
  if (fs.existsSync(i18nPath)) {
    success = fixI18n() && success;
  } else {
    console.log(`i18n.js not found, skipping`);
  }
  
  if (fs.existsSync(axiosConfigPath)) {
    success = fixAxiosConfig() && success;
  } else {
    console.log(`axiosConfig.js not found, skipping`);
  }
  
  if (fs.existsSync(inventoryServicePath)) {
    success = fixInventoryService() && success;
  } else {
    console.log(`inventoryService.js not found, skipping`);
  }
  
  if (fs.existsSync(optimizedInventoryServicePath)) {
    success = fixOptimizedInventoryService() && success;
  } else {
    console.log(`optimizedInventoryService.js not found, skipping`);
  }
  
  // Update script registry
  updateScriptRegistry();
  
  if (success) {
    console.log('Successfully fixed additional Auth0 syntax errors');
  } else {
    console.log('Some files could not be fixed. Please check the logs for details.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
