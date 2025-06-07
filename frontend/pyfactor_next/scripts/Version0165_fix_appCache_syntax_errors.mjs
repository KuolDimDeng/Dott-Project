#!/usr/bin/env node

/**
 * Version 0165: Fix AppCache Syntax Errors
 * 
 * This script fixes syntax errors in the appCache usage that were causing
 * the build to fail. We cannot assign to function calls like appCache.getAll().
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Backup utility
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
    return true;
  }
  return false;
}

// List of files with syntax errors
const filesToFix = [
  {
    path: path.join(projectRoot, 'src/app/auth/components/SignInForm.js'),
    description: 'SignInForm'
  },
  {
    path: path.join(projectRoot, 'src/app/dashboard/DashboardClient.js'),
    description: 'DashboardClient'
  },
  {
    path: path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js'),
    description: 'DashAppBar'
  },
  {
    path: path.join(projectRoot, 'src/app/dashboard/components/forms/EmployeeManagement.js'),
    description: 'EmployeeManagement'
  },
  {
    path: path.join(projectRoot, 'src/app/onboarding/state/OnboardingStateManager.js'),
    description: 'OnboardingStateManager'
  }
];

console.log('🔧 Fixing appCache syntax errors...');

// Fix each file
for (const file of filesToFix) {
  console.log(`\n🔄 Processing ${file.description} (${file.path})...`);
  
  if (!fs.existsSync(file.path)) {
    console.log(`❌ File not found: ${file.path}`);
    continue;
  }
  
  createBackup(file.path);
  let content = fs.readFileSync(file.path, 'utf8');
  
  // Fix SignInForm.js
  if (file.description === 'SignInForm') {
    // Replace invalid appCache.getAll() assignments
    content = content
      .replace(
        /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*{};/g,
        "// Initialize app cache properly\nif (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {\n  appCache.set('auth', {});\n  appCache.set('user', {});\n  appCache.set('tenant', {});\n}"
      )
      .replace(
        /appCache\.getAll\(\)\.auth\s*=\s*appCache\.getAll\(\)\.auth\s*\|\|\s*{};/g,
        "if (!appCache.get('auth')) appCache.set('auth', {});"
      )
      .replace(
        /appCache\.getAll\(\)\.user\s*=\s*appCache\.getAll\(\)\.user\s*\|\|\s*{};/g,
        "if (!appCache.get('user')) appCache.set('user', {});"
      )
      .replace(
        /appCache\.getAll\(\)\.tenant\s*=\s*appCache\.getAll\(\)\.tenant\s*\|\|\s*{};/g,
        "if (!appCache.get('tenant')) appCache.set('tenant', {});"
      );
  }
  
  // Fix DashboardClient.js
  if (file.description === 'DashboardClient') {
    // Replace invalid appCache.getAll() assignments
    content = content
      .replace(
        /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*{};/g,
        "// Initialize app cache properly\nif (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {\n  appCache.set('auth', {});\n  appCache.set('user', {});\n  appCache.set('tenant', {});\n}"
      )
      .replace(
        /appCache\.getAll\(\)\.tenant\s*=\s*appCache\.getAll\(\)\.tenant\s*\|\|\s*{};/g,
        "if (!appCache.get('tenant')) appCache.set('tenant', {});"
      )
      .replace(
        /appCache\.get\('tenant\.id'\)\s*=\s*result\.tenantId;/g,
        "appCache.set('tenant.id', result.tenantId);"
      );
  }
  
  // Fix DashAppBar.js
  if (file.description === 'DashAppBar') {
    // Replace invalid appCache.getAll() assignments
    content = content
      .replace(
        /appCache\.getAll\(\)\s*=\s*{\s*auth:\s*{},\s*user:\s*{},\s*tenant:\s*{}\s*};/g,
        "// Initialize app cache properly\nif (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {\n  appCache.set('auth', {});\n  appCache.set('user', {});\n  appCache.set('tenant', {});\n}"
      );
  }
  
  // Fix EmployeeManagement.js
  if (file.description === 'EmployeeManagement') {
    // Replace invalid appCache.getAll() assignments
    content = content
      .replace(
        /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*{};/g,
        "// Initialize app cache properly\nif (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {\n  appCache.set('auth', {});\n  appCache.set('user', {});\n  appCache.set('tenant', {});\n}"
      )
      .replace(
        /appCache\.getAll\(\)\.auth\s*=\s*appCache\.getAll\(\)\.auth\s*\|\|\s*{};/g,
        "if (!appCache.get('auth')) appCache.set('auth', {});"
      );
  }
  
  // Fix OnboardingStateManager.js
  if (file.description === 'OnboardingStateManager') {
    // Fix the duplicate line and syntax error
    content = content
      .replace(
        /\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*\n\s*\(typeof window !== 'undefined' && appCache\.getAll\(\)/g,
        "(typeof window !== 'undefined' && appCache.getAll() && appCache.get('tenant.id'))"
      );
  }
  
  // Write the fixed content back to the file
  fs.writeFileSync(file.path, content);
  console.log(`✅ Fixed ${file.description}`);
}

// Updating script registry
console.log('\n📝 Updating script registry...');
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
## Version0165_fix_appCache_syntax_errors.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix syntax errors in appCache usage that were causing the build to fail
- **Changes**:
  - Fixed invalid assignment to function calls (appCache.getAll())
  - Properly initialized app cache with set() method instead of direct assignment
  - Fixed syntax error in OnboardingStateManager.js
- **Status**: ✅ Completed
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Fixed appCache.getAll() invalid assignments');
console.log('- ✅ Replaced function call assignments with proper set() method calls');
console.log('- ✅ Fixed syntax error in OnboardingStateManager.js');
console.log('- ✅ Updated script registry');

// Make the script executable
if (process.platform !== 'win32') {
  try {
    execSync(`chmod +x "${__filename}"`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore chmod errors
  }
}
