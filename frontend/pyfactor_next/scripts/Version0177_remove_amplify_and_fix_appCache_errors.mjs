#!/usr/bin/env node

/**
 * Version 0177: Remove All Amplify/Cognito References and Fix AppCache Errors
 * 
 * This script completely removes all Amplify/Cognito references and fixes appCache import errors:
 * 1. Completely removes amplify/cognito imports and functions in SignInForm.js
 * 2. Ensures all 'use client' directives are at the top of files
 * 3. Fixes duplicate appCache imports
 * 4. Corrects import paths for appCache
 * 5. Fixes invalid assignments to appCache.get()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Create backup of file before modifying
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '').split('.')[0]}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
  }
}

// Ensure utils directory exists and create appCache.js if needed
function ensureUtilFiles() {
  console.log('🔧 Ensuring utility files exist...');
  
  const utilsDir = path.join(projectRoot, 'src/utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  
  const appCachePath = path.join(utilsDir, 'appCache.js');
  if (!fs.existsSync(appCachePath)) {
    const appCacheContent = `'use client';

/**
 * Centralized app cache utility for storing and retrieving application state
 */
let cache = {};

const appCache = {
  /**
   * Set a value in the cache using dot notation path
   * @param {string} path - Dot notation path (e.g., 'tenant.id')
   * @param {any} value - Value to store
   */
  set: (path, value) => {
    if (!path) return;
    
    // Handle root level set
    if (path === 'app') {
      cache = value || {};
      return;
    }
    
    const parts = path.split('.');
    let current = cache;
    
    // Create nested objects if they don't exist
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    // Set the value at the leaf
    current[parts[parts.length - 1]] = value;
  },
  
  /**
   * Get a value from the cache using dot notation path
   * @param {string} path - Dot notation path (e.g., 'tenant.id')
   * @returns {any} - The stored value or undefined
   */
  get: (path) => {
    if (!path) return cache;
    
    const parts = path.split('.');
    let current = cache;
    
    for (let i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[parts[i]];
    }
    
    return current;
  },
  
  /**
   * Get the entire cache
   * @returns {Object} - The entire cache object
   */
  getAll: () => {
    return cache;
  },
  
  /**
   * Clear the entire cache or a specific path
   * @param {string} path - Optional. Dot notation path to clear
   */
  clear: (path) => {
    if (!path) {
      cache = {};
      return;
    }
    
    const parts = path.split('.');
    let current = cache;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === undefined || current === null) {
        return;
      }
      current = current[parts[i]];
    }
    
    if (current) {
      delete current[parts[parts.length - 1]];
    }
  }
};

export default appCache;
export { appCache };
`;
    fs.writeFileSync(appCachePath, appCacheContent);
    console.log(`✅ Created appCache utility at ${appCachePath}`);
  }
}

// Fix SignInForm.js - Remove all amplify references and fix imports
function fixSignInForm() {
  console.log('🔧 Fixing SignInForm.js...');
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add 'use client' at top if not already there
  if (!content.trim().startsWith("'use client'")) {
    content = "'use client';\n\n" + content.replace(/'use client';?/g, '');
  }
  
  // Fix imports - remove duplicate appCache imports and remove amplify imports
  const importLines = content.split('\n').filter(line => 
    line.startsWith('import') && 
    !line.includes('amplifyUnified') && 
    !line.includes('amplifySignIn') && 
    !line.includes('signInWithRedirect') && 
    !line.includes('directOAuthSignIn') && 
    !line.includes('cognito')
  );
  
  // Ensure only one appCache import
  const hasDefaultAppCacheImport = importLines.some(line => line.includes("import appCache from"));
  const hasNamedAppCacheImport = importLines.some(line => line.includes("import { appCache }"));
  
  // Filter out duplicate imports
  const filteredImports = hasDefaultAppCacheImport 
    ? importLines.filter(line => !line.includes("import { appCache }"))
    : importLines;
  
  // Ensure appCache import is correct
  const appCacheImport = hasDefaultAppCacheImport
    ? "import appCache from '../../../utils/appCache';"
    : (hasNamedAppCacheImport 
        ? "import { appCache } from '../../../utils/appCache';" 
        : "import appCache from '../../../utils/appCache';");
  
  // Replace imports with clean imports
  const finalImports = [...new Set([
    "import { useRouter, useSearchParams } from 'next/navigation';",
    "import Link from 'next/link';",
    appCacheImport
  ])];
  
  // Add auth0 imports if they're missing
  if (!finalImports.some(line => line.includes('auth0'))) {
    finalImports.push("import { useAuth0 } from '@auth0/auth0-react';");
  }
  
  // Replace old import section with new imports
  content = content.replace(/^import.*?\n+/gms, '');
  content = "'use client';\n\n" + finalImports.join('\n') + '\n\n' + content.trim().replace(/^'use client';?\n*/g, '');
  
  // Replace amplify/cognito sign-in functions with Auth0
  content = content.replace(/amplifySignIn\s*\([^)]*\)/g, "loginWithAuth0()");
  content = content.replace(/signInWithRedirect\s*\([^)]*\)/g, "loginWithAuth0()");
  content = content.replace(/directOAuthSignIn\s*\([^)]*\)/g, "loginWithAuth0()");
  content = content.replace(/signIn\s*\([^)]*\)/g, "loginWithAuth0()");
  
  // Add Auth0 login function if it doesn't exist
  if (!content.includes("loginWithAuth0")) {
    content = content.replace(/export default function SignInForm/, 
      `// Auth0 login function
function loginWithAuth0() {
  const { loginWithRedirect } = useAuth0();
  loginWithRedirect({
    authorizationParams: {
      redirect_uri: window.location.origin + '/api/auth/callback'
    }
  });
}

export default function SignInForm`);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed SignInForm.js`);
}

// Fix DashboardClient.js - Fix import path
function fixDashboardClient() {
  console.log('🔧 Fixing DashboardClient.js...');
  const filePath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  if (!content.trim().startsWith("'use client'")) {
    content = "'use client';\n\n" + content.replace(/'use client';?/g, '');
  }
  
  // Fix import path for appCache
  content = content.replace(
    /import\s+appCache\s+from\s+['"]\.\.\/utils\/appCache['"];?/g,
    "import appCache from '../../utils/appCache';"
  );
  
  content = content.replace(
    /import\s+{\s*appCache\s*}\s+from\s+['"]\.\.\/utils\/appCache['"];?/g,
    "import { appCache } from '../../utils/appCache';"
  );
  
  // Remove any amplify/cognito references
  content = content.replace(/import.*?amplify.*?\n/g, '');
  content = content.replace(/import.*?cognito.*?\n/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardClient.js`);
}

// Fix DashAppBar.js - Fix duplicate imports
function fixDashAppBar() {
  console.log('🔧 Fixing DashAppBar.js...');
  const filePath = path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  if (!content.trim().startsWith("'use client'")) {
    content = "'use client';\n\n" + content.replace(/'use client';?/g, '');
  }
  
  // Remove duplicate appCache imports
  const lines = content.split('\n');
  let hasAppCacheImport = false;
  const filteredLines = lines.filter(line => {
    if (line.includes("import") && line.includes("appCache")) {
      if (hasAppCacheImport) {
        return false; // Skip duplicate imports
      }
      hasAppCacheImport = true;
      return true;
    }
    return true;
  });
  
  // Replace content with filtered lines
  content = filteredLines.join('\n');
  
  // Fix the import path if needed
  content = content.replace(
    /import\s+appCache\s+from\s+['"]\.\.\/utils\/appCache['"];?/g,
    "import appCache from '../../../utils/appCache';"
  );
  
  content = content.replace(
    /import\s+{\s*appCache\s*}\s+from\s+['"]\.\.\/utils\/appCache['"];?/g,
    "import { appCache } from '../../../utils/appCache';"
  );
  
  // Remove any amplify/cognito references
  content = content.replace(/import.*?amplify.*?\n/g, '');
  content = content.replace(/import.*?cognito.*?\n/g, '');
  content = content.replace(/\/\*\s*amplify.*?\*\//gs, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashAppBar.js`);
}

// Fix DashboardLoader.js - Fix 'use client' placement and invalid assignments
function fixDashboardLoader() {
  console.log('🔧 Fixing DashboardLoader.js...');
  const filePath = path.join(projectRoot, 'src/components/DashboardLoader.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Move 'use client' to top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Remove duplicate appCache imports
  const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
  const otherLines = content.split('\n').filter(line => !line.trim().startsWith('import'));
  
  // Filter out duplicate appCache imports
  const appCacheImports = importLines.filter(line => line.includes('appCache'));
  const otherImports = importLines.filter(line => !line.includes('appCache'));
  
  // Use just one appCache import
  let finalImports = [...otherImports];
  if (appCacheImports.length > 0) {
    finalImports.unshift("import appCache from '../utils/appCache';");
  }
  
  // Fix invalid assignments to appCache.get()
  let codeContent = otherLines.join('\n');
  codeContent = codeContent.replace(
    /appCache\.get\(['"]tenant\.id['"]\)\s*=\s*([^;]+);/g,
    "appCache.set('tenant.id', $1);"
  );
  
  // Replace any other appCache direct property assignments
  codeContent = codeContent.replace(
    /appCache\.get\(['"]([^'"]+)['"]\)\s*=\s*([^;]+);/g,
    "appCache.set('$1', $2);"
  );
  
  // Remove any amplify/cognito references
  codeContent = codeContent.replace(/\/\/ Cognito.*$/gm, '');
  codeContent = codeContent.replace(/\/\/ AWS.*$/gm, '');
  codeContent = codeContent.replace(/\/\/ Amplify.*$/gm, '');
  codeContent = codeContent.replace(/\/\* Amplify.*?\*\//gs, '');
  
  // Reassemble content
  content = "'use client';\n\n" + finalImports.join('\n') + '\n\n' + codeContent;
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardLoader.js`);
}

// Fix auth.js - Move 'use client' to top and fix duplicate imports
function fixAuthJs() {
  console.log('🔧 Fixing auth.js...');
  const filePath = path.join(projectRoot, 'src/hooks/auth.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Move 'use client' to top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Remove duplicate appCache imports
  const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
  const otherLines = content.split('\n').filter(line => !line.trim().startsWith('import') && !line.trim().startsWith("'use client'"));
  
  // Filter out duplicate appCache imports
  const appCacheImports = importLines.filter(line => line.includes('appCache'));
  const otherImports = importLines.filter(line => !line.includes('appCache'));
  
  // Use just one appCache import
  let finalImports = [...otherImports];
  if (appCacheImports.length > 0) {
    finalImports.unshift("import appCache from '../utils/appCache';");
  }
  
  // Remove any amplify/cognito references
  let codeContent = otherLines.join('\n');
  codeContent = codeContent.replace(/\/\/ Cognito.*$/gm, '');
  codeContent = codeContent.replace(/\/\/ AWS.*$/gm, '');
  codeContent = codeContent.replace(/\/\/ Amplify.*$/gm, '');
  codeContent = codeContent.replace(/\/\* Amplify.*?\*\//gs, '');
  
  // Reassemble content
  content = "'use client';\n\n" + finalImports.join('\n') + '\n\n' + codeContent;
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed auth.js`);
}

// Run all fixes
async function runFixes() {
  // Ensure utility files exist
  ensureUtilFiles();
  
  // Fix each file
  fixSignInForm();
  fixDashboardClient();
  fixDashAppBar();
  fixDashboardLoader();
  fixAuthJs();
  
  console.log('\n✅ All appCache import errors fixed and Amplify/Cognito references removed!');
}

// Execute
runFixes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
