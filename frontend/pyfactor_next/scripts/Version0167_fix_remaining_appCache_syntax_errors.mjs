#!/usr/bin/env node

/**
 * Version 0167: Fix Remaining AppCache Syntax Errors
 * 
 * Addresses remaining syntax errors that were not fixed by the previous script:
 * 1. Invalid assignments to appCache.get() function returns
 * 2. Fixes 'use client' directive positioning
 * 3. Fixes duplicate appCache imports
 * 4. Corrects syntax errors in conditional expressions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper function to create backups
function createBackup(filePath) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupPath = `${filePath}.backup_${date}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup: ${backupPath}`);
  return backupPath;
}

// Fix SignInForm.js
console.log('🔄 Processing SignInForm (/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/components/SignInForm.js)...');
const signInFormPath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');

if (fs.existsSync(signInFormPath)) {
  createBackup(signInFormPath);
  
  let signInFormContent = fs.readFileSync(signInFormPath, 'utf8');
  
  // Fix invalid assignment to appCache.get()
  signInFormContent = signInFormContent.replace(
    /appCache\.get\('tenant\.id'\)\s*=\s*tenantInfo\.tenantId;/g,
    "appCache.set('tenant.id', tenantInfo.tenantId);"
  );
  
  // Fix invalid assignment to appCache.getAll()
  signInFormContent = signInFormContent.replace(
    /appCache\.getAll\(\)\.tenantId\s*=\s*tenantInfo\.tenantId;/g,
    "if (appCache.getAll()) { appCache.set('tenantId', tenantInfo.tenantId); }"
  );
  
  fs.writeFileSync(signInFormPath, signInFormContent);
  console.log('✅ Fixed SignInForm');
} else {
  console.log('⚠️ SignInForm.js not found');
}

// Fix DashboardClient.js
console.log('🔄 Processing DashboardClient (/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardClient.js)...');
const dashboardClientPath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');

if (fs.existsSync(dashboardClientPath)) {
  createBackup(dashboardClientPath);
  
  let dashboardClientContent = fs.readFileSync(dashboardClientPath, 'utf8');
  
  // Fix 'use client' directive and duplicate imports
  dashboardClientContent = dashboardClientContent.replace(
    /import appCache from '..\/utils\/appCache';\s*\n\s*'use client';\s*\n\s*import { appCache } from '..\/utils\/appCache';/,
    "'use client';\n\nimport { appCache } from '../utils/appCache';"
  );
  
  fs.writeFileSync(dashboardClientPath, dashboardClientContent);
  console.log('✅ Fixed DashboardClient');
} else {
  console.log('⚠️ DashboardClient.js not found');
}

// Fix DashAppBar.js
console.log('🔄 Processing DashAppBar (/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js)...');
const dashAppBarPath = path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js');

if (fs.existsSync(dashAppBarPath)) {
  createBackup(dashAppBarPath);
  
  let dashAppBarContent = fs.readFileSync(dashAppBarPath, 'utf8');
  
  // Fix invalid assignment to appCache.getAll()
  dashAppBarContent = dashAppBarContent.replace(
    /if \(!appCache\.getAll\(\)\) appCache\.getAll\(\) = \{\};/g,
    "if (!appCache.getAll()) { appCache.set('tenant', {}); appCache.set('user', {}); }"
  );
  
  // Fix any other invalid assignments to appCache.getAll().tenant
  dashAppBarContent = dashAppBarContent.replace(
    /if \(!appCache\.getAll\(\)\.tenant\) appCache\.getAll\(\)\.tenant = \{\};/g,
    "if (!appCache.get('tenant')) { appCache.set('tenant', {}); }"
  );
  
  fs.writeFileSync(dashAppBarPath, dashAppBarContent);
  console.log('✅ Fixed DashAppBar');
} else {
  console.log('⚠️ DashAppBar.js not found');
}

// Fix EmployeeManagement.js
console.log('🔄 Processing EmployeeManagement (/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js)...');
const employeeManagementPath = path.join(projectRoot, 'src/app/dashboard/components/forms/EmployeeManagement.js');

if (fs.existsSync(employeeManagementPath)) {
  createBackup(employeeManagementPath);
  
  let employeeManagementContent = fs.readFileSync(employeeManagementPath, 'utf8');
  
  // Fix syntax error in appCache.set with == true
  employeeManagementContent = employeeManagementContent.replace(
    /appCache\.set\('debug\.useMockMode',\s*==\s*true\);/g,
    "appCache.set('debug.useMockMode', true);"
  );
  
  // Fix missing parenthesis in if statement
  employeeManagementContent = employeeManagementContent.replace(
    /if \(!userData && appCache\.getAll\(\)\s*\n\s*console\.log\('Using App Cache for user profile data'\);/g,
    "if (!userData && appCache.getAll()) {\n          console.log('Using App Cache for user profile data');"
  );
  
  fs.writeFileSync(employeeManagementPath, employeeManagementContent);
  console.log('✅ Fixed EmployeeManagement');
} else {
  console.log('⚠️ EmployeeManagement.js not found');
}

// Fix OnboardingStateManager.js
console.log('🔄 Processing OnboardingStateManager (/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/state/OnboardingStateManager.js)...');
const onboardingStateManagerPath = path.join(projectRoot, 'src/app/onboarding/state/OnboardingStateManager.js');

if (fs.existsSync(onboardingStateManagerPath)) {
  createBackup(onboardingStateManagerPath);
  
  let onboardingStateManagerContent = fs.readFileSync(onboardingStateManagerPath, 'utf8');
  
  // Fix duplicate imports of appCache
  const imports = [];
  let uniqueImports = new Set();
  
  // Extract all imports
  const importRegex = /import\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(onboardingStateManagerContent)) !== null) {
    const importStatement = match[0];
    const importPath = match[1];
    
    if (!uniqueImports.has(importPath)) {
      uniqueImports.add(importPath);
      imports.push(importStatement);
    }
  }
  
  // Create new content with deduplicated imports
  const contentWithoutImports = onboardingStateManagerContent.replace(/import\s+{[^}]*}\s+from\s+['"][^'"]+['"];?\n/g, '');
  onboardingStateManagerContent = imports.join('\n') + '\n\n' + contentWithoutImports.trim();
  
  fs.writeFileSync(onboardingStateManagerPath, onboardingStateManagerContent);
  console.log('✅ Fixed OnboardingStateManager');
} else {
  console.log('⚠️ OnboardingStateManager.js not found');
}

// Update script registry
console.log('📝 Updating script registry...');
const registryPath = path.join(projectRoot, 'scripts/script_registry.md');

const registryEntry = `
## Version0167_fix_remaining_appCache_syntax_errors.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fix remaining appCache syntax errors that were not addressed by the previous fix
- **Changes**:
  - Fixed invalid assignments to appCache.get() function returns
  - Fixed 'use client' directive positioning in DashboardClient.js
  - Fixed duplicate appCache imports in OnboardingStateManager.js
  - Corrected syntax errors in conditional expressions in EmployeeManagement.js
- **Status**: ✅ Completed
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Fixed SignInForm.js - replaced invalid assignment to appCache.get()');
console.log('- ✅ Fixed DashboardClient.js - fixed use client directive and duplicate imports');
console.log('- ✅ Fixed DashAppBar.js - replaced invalid assignments to appCache.getAll()');
console.log('- ✅ Fixed EmployeeManagement.js - fixed syntax errors in conditional expressions');
console.log('- ✅ Fixed OnboardingStateManager.js - removed duplicate imports');
console.log('- ✅ Updated script registry');
