#!/usr/bin/env node

/**
 * Version 0169: Fix Specific AppCache Syntax Errors
 * 
 * This script fixes the exact syntax errors identified in the build failure log:
 * 1. SignInForm.js - Invalid assignments to appCache.get() function returns
 * 2. DashboardClient.js - Duplicate appCache imports and logger import
 * 3. DashAppBar.js - Syntax error in if statement
 * 4. EmployeeManagement.js - 'use client' directive not at top of file
 * 5. OnboardingStateManager.js - Wrong path for appCache import
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper function to create backups
function backupFile(filePath) {
  const date = new Date().toISOString().replace(/:/g, '').split('.')[0];
  const backupPath = `${filePath}.backup_${date.replace(/-/g, '')}`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
  } else {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  return true;
}

// 1. Fix SignInForm.js
console.log('\n🔧 Fixing SignInForm.js...');
const signInFormPath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
if (backupFile(signInFormPath)) {
  let content = fs.readFileSync(signInFormPath, 'utf8');
  
  // Fix invalid assignments to appCache.get() function return
  content = content.replace(
    /appCache\.get\('tenant\.id'\)\s*=\s*tenantId;/g, 
    "appCache.set('tenant.id', tenantId);"
  );
  
  // Fix direct assignment to appCache.getAll().tenantId
  content = content.replace(
    /appCache\.getAll\(\)\.tenantId\s*=\s*tenantId;/g,
    "// Initialize appCache properly\n" +
    "      if (!appCache.get('tenant')) appCache.set('tenant', {});\n" +
    "      appCache.set('tenant.tenantId', tenantId);"
  );
  
  fs.writeFileSync(signInFormPath, content);
  console.log(`✅ Fixed SignInForm.js`);
}

// 2. Fix DashboardClient.js
console.log('\n🔧 Fixing DashboardClient.js...');
const dashboardClientPath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
if (backupFile(dashboardClientPath)) {
  let content = fs.readFileSync(dashboardClientPath, 'utf8');
  
  // Ensure 'use client' is at the top
  if (!content.trim().startsWith("'use client'")) {
    content = "'use client';\n" + content.replace(/'use client';\s*/g, '');
  }
  
  // Remove duplicate appCache imports
  const importLines = content.split('\n');
  const cleanedImports = [];
  const seenImports = new Set();
  
  for (const line of importLines) {
    if (line.includes('import') && line.includes('appCache')) {
      if (!seenImports.has('appCache')) {
        cleanedImports.push(line);
        seenImports.add('appCache');
      }
    } else if (line.includes("import { logger } from ''utils/logger''")) {
      // Fix logger import
      cleanedImports.push("import { logger } from '../utils/logger';");
    } else {
      cleanedImports.push(line);
    }
  }
  
  fs.writeFileSync(dashboardClientPath, cleanedImports.join('\n'));
  console.log(`✅ Fixed DashboardClient.js`);
}

// 3. Fix DashAppBar.js
console.log('\n🔧 Fixing DashAppBar.js...');
const dashAppBarPath = path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js');
if (backupFile(dashAppBarPath)) {
  let content = fs.readFileSync(dashAppBarPath, 'utf8');
  
  // Fix syntax error in if statement
  content = content.replace(
    /if\s*\(typeof\s+window\s+!==\s+'undefined'\s+&&\s+appCache\.getAll\(\)\s*\n\s*return\s+appCache\.get\('tenant\.businessName'\);/g,
    "if (typeof window !== 'undefined' && appCache.getAll()) {\n      return appCache.get('tenant.businessName');"
  );
  
  fs.writeFileSync(dashAppBarPath, content);
  console.log(`✅ Fixed DashAppBar.js`);
}

// 4. Fix EmployeeManagement.js
console.log('\n🔧 Fixing EmployeeManagement.js...');
const employeeManagementPath = path.join(projectRoot, 'src/app/dashboard/components/forms/EmployeeManagement.js');
if (backupFile(employeeManagementPath)) {
  let content = fs.readFileSync(employeeManagementPath, 'utf8');
  
  // Move 'use client' directive to the top
  content = content.replace(
    /import appCache from '..\/utils\/appCache';\s*\n\s*'use client';/,
    "'use client';\nimport appCache from '../utils/appCache';"
  );
  
  // Fix duplicate appCache imports
  const importLines = content.split('\n');
  const cleanedImports = [];
  const seenImports = new Set();
  
  let inImportSection = true;
  for (const line of importLines) {
    if (line.trim() === '') {
      inImportSection = false;
      cleanedImports.push(line);
      continue;
    }
    
    if (inImportSection && line.includes('import') && line.includes('appCache')) {
      if (!seenImports.has('appCache')) {
        cleanedImports.push(line);
        seenImports.add('appCache');
      }
    } else {
      cleanedImports.push(line);
    }
  }
  
  fs.writeFileSync(employeeManagementPath, cleanedImports.join('\n'));
  console.log(`✅ Fixed EmployeeManagement.js`);
}

// 5. Fix OnboardingStateManager.js
console.log('\n🔧 Fixing OnboardingStateManager.js...');
const onboardingStateManagerPath = path.join(projectRoot, 'src/app/onboarding/state/OnboardingStateManager.js');
if (backupFile(onboardingStateManagerPath)) {
  let content = fs.readFileSync(onboardingStateManagerPath, 'utf8');
  
  // Fix import path for appCache
  content = content.replace(
    /import.*?appCache.*?from\s+['"]..\/utils\/appCache['"]/g,
    "import { appCache } from '../../../utils/appCache'"
  );
  
  fs.writeFileSync(onboardingStateManagerPath, content);
  console.log(`✅ Fixed OnboardingStateManager.js`);
}

// Create logger.js if it doesn't exist
console.log('\n🔧 Creating/Checking utils/logger.js...');
const loggerPath = path.join(projectRoot, 'src/utils/logger.js');
if (!fs.existsSync(loggerPath)) {
  const loggerContent = `/**
 * Simple logger utility
 */

export const logger = {
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(\`[DEBUG] \${message}\`, ...args);
    }
  },
  info: (message, ...args) => {
    console.info(\`[INFO] \${message}\`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(\`[WARN] \${message}\`, ...args);
  },
  error: (message, ...args) => {
    console.error(\`[ERROR] \${message}\`, ...args);
  }
};

export default logger;
`;
  
  // Ensure directory exists
  const dir = path.dirname(loggerPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(loggerPath, loggerContent);
  console.log(`✅ Created logger.js`);
}

console.log('\n✅ All specific appCache errors fixed!');
