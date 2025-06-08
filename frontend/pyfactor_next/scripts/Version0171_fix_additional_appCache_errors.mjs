#!/usr/bin/env node

/**
 * Version 0171: Fix Additional AppCache Errors
 * 
 * This script addresses additional appCache syntax errors that were missed in previous fixes.
 * These errors are causing build failures in the Vercel deployment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Fix SignInForm.js - Invalid assignment to appCache.get()
function fixSignInForm() {
  console.log('🔧 Fixing SignInForm.js...');
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix invalid assignment to appCache.get()
  content = content.replace(
    /appCache\.get\('tenant\.id'\)\s*=\s*businessId;/g,
    "appCache.set('tenant.id', businessId);"
  );
  
  // Fix any direct assignments to appCache.getAll().tenantId
  content = content.replace(
    /appCache\.getAll\(\)\.tenantId\s*=\s*businessId;/g,
    "appCache.set('tenant.id', businessId);"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed SignInForm.js`);
}

// Fix DashboardClient.js - Incorrect import path
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
  if (!content.startsWith("'use client'")) {
    content = content.replace(/'use client';?/g, '');
    content = "'use client';\n\n" + content;
  }
  
  // Fix import path
  content = content.replace(
    /import appCache from ['"]\.\.\/utils\/appCache['"];/g,
    "import appCache from '../../utils/appCache';"
  );
  
  // Remove duplicate imports
  const importLines = content.match(/import appCache from ['"](\.\.\/)+utils\/appCache['"];/g);
  if (importLines && importLines.length > 1) {
    // Keep only the first one
    for (let i = 1; i < importLines.length; i++) {
      content = content.replace(importLines[i], '');
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardClient.js`);
}

// Fix DashAppBar.js - 'use client' not at top
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
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Fix import path if needed
  if (content.includes("import appCache from '../utils/appCache';")) {
    content = content.replace(
      "import appCache from '../utils/appCache';",
      "import appCache from '../../../utils/appCache';"
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashAppBar.js`);
}

// Fix EmployeeManagement.js - Incorrect import path
function fixEmployeeManagement() {
  console.log('🔧 Fixing EmployeeManagement.js...');
  const filePath = path.join(projectRoot, 'src/app/dashboard/components/forms/EmployeeManagement.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Fix import path
  content = content.replace(
    /import appCache from ['"]\.\.\/utils\/appCache['"];/g,
    "import appCache from '../../../../utils/appCache';"
  );
  
  // Remove duplicate imports
  const importLines = content.match(/import appCache from ['"](\.\.\/)+utils\/appCache['"];/g);
  if (importLines && importLines.length > 1) {
    // Keep only the first one
    for (let i = 1; i < importLines.length; i++) {
      content = content.replace(importLines[i], '');
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed EmployeeManagement.js`);
}

// Fix DashboardLoader.js - Invalid assignment to appCache.getAll()
function fixDashboardLoader() {
  console.log('🔧 Fixing DashboardLoader.js...');
  const filePath = path.join(projectRoot, 'src/components/DashboardLoader.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix invalid assignment to appCache.getAll()
  content = content.replace(
    /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*{};/g,
    "if (!appCache.getAll()) appCache.set('app', {});"
  );
  
  // Fix any direct assignments to appCache.getAll().auth
  content = content.replace(
    /appCache\.getAll\(\)\.auth\s*=\s*appCache\.getAll\(\)\.auth\s*\|\|\s*{};/g,
    "if (!appCache.get('auth')) appCache.set('auth', {});"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardLoader.js`);
}

// Ensure all necessary utils exist
function ensureUtilsExist() {
  console.log('🔧 Ensuring utility files exist...');
  
  // Check if appCache.js exists
  const appCachePath = path.join(projectRoot, 'src/utils/appCache.js');
  if (!fs.existsSync(appCachePath)) {
    console.log(`Creating missing appCache.js utility...`);
    const appCacheContent = `/**
 * Simple cache utility for client-side data storage
 */

const appCache = {
  // Internal storage
  _cache: {},

  // Set a value in the cache
  set: function(key, value) {
    // Support for nested keys like 'user.profile.name'
    const parts = key.split('.');
    let current = this._cache;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    
    // Also try to persist in localStorage if available
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('appCache', JSON.stringify(this._cache));
      }
    } catch (e) {
      console.warn('Failed to persist cache to localStorage:', e);
    }
    
    return value;
  },

  // Get a value from the cache
  get: function(key) {
    // Initialize from localStorage if empty and localStorage has data
    if (Object.keys(this._cache).length === 0) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = window.localStorage.getItem('appCache');
          if (stored) {
            this._cache = JSON.parse(stored);
          }
        }
      } catch (e) {
        console.warn('Failed to load cache from localStorage:', e);
      }
    }
    
    // Support for nested keys
    if (!key) return undefined;
    
    const parts = key.split('.');
    let current = this._cache;
    
    for (let i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[parts[i]];
    }
    
    return current;
  },

  // Get all cached data
  getAll: function() {
    return this._cache;
  },

  // Clear all cache
  clear: function() {
    this._cache = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('appCache');
      }
    } catch (e) {
      console.warn('Failed to clear localStorage cache:', e);
    }
  },

  // Remove a specific key
  remove: function(key) {
    const parts = key.split('.');
    let current = this._cache;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        return;
      }
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
    
    // Update localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('appCache', JSON.stringify(this._cache));
      }
    } catch (e) {
      console.warn('Failed to update localStorage after removal:', e);
    }
  }
};

export default appCache;
`;
    fs.mkdirSync(path.dirname(appCachePath), { recursive: true });
    fs.writeFileSync(appCachePath, appCacheContent);
    console.log(`✅ Created appCache.js utility`);
  }
}

// Run all fixes
async function runFixes() {
  // Ensure utilities exist first
  ensureUtilsExist();
  
  // Fix each file
  fixSignInForm();
  fixDashboardClient();
  fixDashAppBar();
  fixEmployeeManagement();
  fixDashboardLoader();
  
  console.log('\n✅ All additional appCache errors fixed!');
}

// Execute
runFixes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
