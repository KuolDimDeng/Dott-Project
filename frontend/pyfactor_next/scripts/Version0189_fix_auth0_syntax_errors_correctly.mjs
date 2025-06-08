#!/usr/bin/env node

/**
 * Version0189_fix_auth0_syntax_errors_correctly.mjs
 * 
 * This script properly fixes syntax errors that are preventing the Auth0 migration build:
 * 1. Properly removes duplicate userAttributes declaration in SignInForm.js
 * 2. Properly fixes i18n.js by removing the improper comments that cause syntax errors
 * 3. Properly fixes axiosConfig.js by adding missing parenthesis and braces
 * 4. Properly fixes inventoryService.js by using proper appCache initialization
 * 5. Properly fixes optimizedInventoryService.js syntax errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix
const filesToFix = {
  signInForm: path.join(projectRoot, 'src/app/auth/components/SignInForm.js'),
  i18n: path.join(projectRoot, 'src/i18n.js'),
  axiosConfig: path.join(projectRoot, 'src/lib/axiosConfig.js'),
  inventoryService: path.join(projectRoot, 'src/services/inventoryService.js'),
  optimizedInventoryService: path.join(projectRoot, 'src/services/optimizedInventoryService.js')
};

// Helper functions
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '').split('.')[0];
  const backupPath = `${filePath}.backup_${timestamp}`;
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`Creating backup of ${filePath}`);
      return true;
    } else {
      console.log(`File does not exist: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating backup for ${filePath}:`, error);
    return false;
  }
}

function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  if (!fs.existsSync(registryPath)) {
    console.log('Creating new script registry file');
    const header = `# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script | Purpose | Execution Date | Status |\n|--------|---------|----------------|--------|\n`;
    fs.writeFileSync(registryPath, header);
  }
  
  let registry = fs.readFileSync(registryPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  const entry = `| Version0189_fix_auth0_syntax_errors_correctly.mjs | Fix Auth0 syntax errors correctly | ${date} | Executed |\n`;
  
  if (!registry.includes('Version0189_fix_auth0_syntax_errors_correctly.mjs')) {
    registry = registry.replace('|--------|---------|----------------|--------|', '|--------|---------|----------------|--------|\n' + entry);
  }
  
  fs.writeFileSync(registryPath, registry);
  console.log('Updated script registry');
}

// Fix functions
function fixSignInForm() {
  if (!createBackup(filesToFix.signInForm)) return false;
  
  console.log(`Fixing duplicate userAttributes in ${filesToFix.signInForm}`);
  
  let content = fs.readFileSync(filesToFix.signInForm, 'utf8');
  
  // Completely replace the duplicate userAttributes declaration with a better approach
  const pattern = /const userAttributes = await getAuth0UserProfile\(\);[\s\n]+const userAttributes = await fetchUserAttributes\(\);/;
  const replacement = `const userAttributes = await getAuth0UserProfile();
                // Auth0 migration: using Auth0 profile instead of Cognito fetchUserAttributes
                // const cognitoAttributes = await fetchUserAttributes();`;
  
  content = content.replace(pattern, replacement);
  
  fs.writeFileSync(filesToFix.signInForm, content);
  console.log('Fixed SignInForm.js');
  return true;
}

function fixI18n() {
  if (!createBackup(filesToFix.i18n)) return false;
  
  console.log(`Fixing syntax in ${filesToFix.i18n}`);
  
  let content = fs.readFileSync(filesToFix.i18n, 'utf8');
  
  // Fix the improper comments that are causing syntax errors
  content = content.replace(
    /if \(typeof window !== 'undefined' && \/\/ \/\/ appCache\.getAll\(\)\) {/g,
    `if (typeof window !== 'undefined') { // appCache.getAll() removed during Auth0 migration`
  );
  
  content = content.replace(
    /const country = \/\/ \/\/ appCache\.getAll\(\)\.user_country;/g,
    `const country = null; // appCache.getAll().user_country - removed during Auth0 migration`
  );
  
  fs.writeFileSync(filesToFix.i18n, content);
  console.log('Fixed i18n.js');
  return true;
}

function fixAxiosConfig() {
  if (!createBackup(filesToFix.axiosConfig)) return false;
  
  console.log(`Fixing syntax in ${filesToFix.axiosConfig}`);
  
  let content = fs.readFileSync(filesToFix.axiosConfig, 'utf8');
  
  // Fix missing closing parenthesis and opening brace
  content = content.replace(
    /if \(appCache\.getAll\(\)\s+const cachedTenantId/g,
    `if (appCache.getAll()) {
            const cachedTenantId`
  );
  
  fs.writeFileSync(filesToFix.axiosConfig, content);
  console.log('Fixed axiosConfig.js');
  return true;
}

function fixInventoryService() {
  if (!createBackup(filesToFix.inventoryService)) return false;
  
  console.log(`Fixing invalid assignment in ${filesToFix.inventoryService}`);
  
  let content = fs.readFileSync(filesToFix.inventoryService, 'utf8');
  
  // Fix invalid assignment to function call result
  content = content.replace(
    /if \(!appCache\.getAll\(\)\) appCache\.getAll\(\) = {};/g,
    `if (!appCache.getAll()) appCache.init({});`
  );
  
  content = content.replace(
    /if \(!appCache\.getAll\(\)\.offline\) appCache\.getAll\(\)\.offline = {};/g,
    `if (!appCache.get('offline')) appCache.set('offline', {});`
  );
  
  fs.writeFileSync(filesToFix.inventoryService, content);
  console.log('Fixed inventoryService.js');
  return true;
}

function fixOptimizedInventoryService() {
  if (!createBackup(filesToFix.optimizedInventoryService)) return false;
  
  console.log(`Fixing syntax in ${filesToFix.optimizedInventoryService}`);
  
  let content = fs.readFileSync(filesToFix.optimizedInventoryService, 'utf8');
  
  // Fix invalid assignment to function call result
  content = content.replace(
    /appCache\.getAll\(\) = appCache\.getAll\(\) \|\| {};/g,
    `if (!appCache.getAll()) appCache.init({});`
  );
  
  content = content.replace(
    /appCache\.getAll\(\)\.offline = appCache\.getAll\(\)\.offline \|\| {};/g,
    `if (!appCache.get('offline')) appCache.set('offline', {});`
  );
  
  // Fix delete on function call result
  content = content.replace(
    /if \(typeof window !== 'undefined' && appCache\.getAll\(\)\s+delete appCache\.get\('offline\.products'\);/g,
    `if (typeof window !== 'undefined' && appCache.getAll()) {
      if (appCache.get('offline.products')) {
        appCache.remove('offline.products');
      }
    }`
  );
  
  fs.writeFileSync(filesToFix.optimizedInventoryService, content);
  console.log('Fixed optimizedInventoryService.js');
  return true;
}

// Main function
async function main() {
  console.log('Starting correct Auth0 syntax error fixes');
  
  let success = true;
  
  // Fix each file
  success = fixSignInForm() && success;
  success = fixI18n() && success;
  success = fixAxiosConfig() && success;
  success = fixInventoryService() && success;
  success = fixOptimizedInventoryService() && success;
  
  // Update script registry
  if (success) {
    updateScriptRegistry();
    console.log('Successfully fixed Auth0 syntax errors correctly');
  } else {
    console.error('Some fixes failed. Please check the logs.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Error fixing syntax errors:', error);
  process.exit(1);
});
