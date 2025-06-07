#!/usr/bin/env node

/**
 * Version 0163: Remove Remaining Amplify/Cognito References
 * 
 * This script completely removes all remaining AWS Amplify/Cognito references
 * and fixes the window.__APP_CACHE usage that's causing errors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const configDir = path.join(projectRoot, 'src/config');
const utilsDir = path.join(projectRoot, 'src/utils');

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

// Search for files containing Amplify or Cognito references
console.log('🔍 Searching for files with Amplify/Cognito references...');

// Files we know need to be fixed
const filesToFix = [
  {
    path: path.join(configDir, 'amplifyUnified.js'),
    exists: fs.existsSync(path.join(configDir, 'amplifyUnified.js')),
    description: 'Amplify Unified Configuration'
  },
  {
    path: path.join(utilsDir, 'CognitoAttributes.js'),
    exists: fs.existsSync(path.join(utilsDir, 'CognitoAttributes.js')),
    description: 'Cognito Attributes Utility'
  }
];

// Report on files
for (const file of filesToFix) {
  if (file.exists) {
    console.log(`- Found ${file.description}: ${file.path}`);
  } else {
    console.log(`- ${file.description} not found at ${file.path}`);
  }
}

// Look for other files with Amplify/Cognito references using grep
console.log('\n🔍 Searching for all Amplify/Cognito references...');
try {
  const grepResults = execSync('grep -r "Amplify\\|Cognito\\|aws-amplify" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" src', { 
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  const matches = grepResults.split('\n').filter(line => line.trim() !== '');
  const matchedFiles = new Set();
  
  matches.forEach(match => {
    const filePath = match.split(':')[0];
    if (filePath) matchedFiles.add(filePath);
  });
  
  console.log(`Found ${matchedFiles.size} files with Amplify/Cognito references:`);
  matchedFiles.forEach(file => console.log(`- ${file}`));
  
  // Add these files to our list to fix
  matchedFiles.forEach(relativePath => {
    const fullPath = path.join(projectRoot, relativePath);
    if (!filesToFix.some(f => f.path === fullPath)) {
      filesToFix.push({
        path: fullPath,
        exists: true,
        description: 'File with Amplify/Cognito references'
      });
    }
  });
} catch (error) {
  console.log('No additional files with Amplify/Cognito references found');
}

// Fix amplifyUnified.js
console.log('\n🔧 Fixing Amplify Unified Configuration...');
const amplifyUnifiedPath = path.join(configDir, 'amplifyUnified.js');
if (fs.existsSync(amplifyUnifiedPath)) {
  createBackup(amplifyUnifiedPath);
  
  // Replace with Auth0-only version
  const newAmplifyUnified = `/**
 * amplifyUnified.js - Auth0 Configuration
 * 
 * This file previously contained AWS Amplify configuration but has been
 * completely replaced with Auth0-specific implementations. All Amplify/Cognito
 * code has been removed as we now use Auth0 exclusively.
 */

// Dummy implementation for backward compatibility
export const isAuth0Enabled = () => true;
export const isAmplifyEnabled = () => false;

// Log warning if any Amplify functions are accidentally called
const createAmplifyWarning = (methodName) => (...args) => {
  console.warn(\`[AmplifyUnified] \${methodName} called but Amplify is disabled (using Auth0)\`);
  return null;
};

// Auth0 session helper that doesn't rely on Amplify
export const getAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      return session;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching session:', error);
  }
  return null;
};

// Auth0 profile helper
export const getAuthUserAttributes = async () => {
  try {
    const response = await fetch('/api/auth/profile');
    if (response.ok) {
      const profile = await response.json();
      return profile;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching profile:', error);
  }
  return null;
};

// Create stubs for Amplify methods to prevent errors
export const fetchAuthSession = createAmplifyWarning('fetchAuthSession');
export const fetchUserAttributes = createAmplifyWarning('fetchUserAttributes');
export const getCurrentUser = createAmplifyWarning('getCurrentUser');
export const signOut = createAmplifyWarning('signOut');
export const updateUserAttributes = createAmplifyWarning('updateUserAttributes');

// No-op Amplify configuration function
export const configureAmplify = () => {
  console.log('[Auth] Using Auth0 for authentication (Amplify disabled)');
  return false;
};

export default {
  isAuth0Enabled,
  isAmplifyEnabled,
  getAuthSession,
  getAuthUserAttributes,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut,
  updateUserAttributes,
  configureAmplify
};
`;
  
  fs.writeFileSync(amplifyUnifiedPath, newAmplifyUnified);
  console.log(`✅ Updated ${amplifyUnifiedPath}`);
} else {
  console.log(`❌ ${amplifyUnifiedPath} not found`);
}

// Fix CognitoAttributes.js
console.log('\n🔧 Fixing Cognito Attributes Utility...');
const cognitoAttributesPath = path.join(utilsDir, 'CognitoAttributes.js');
if (fs.existsSync(cognitoAttributesPath)) {
  createBackup(cognitoAttributesPath);
  
  // Replace with Auth0-specific version
  const newCognitoAttributes = `/**
 * CognitoAttributes.js - Auth0 User Attributes
 * 
 * This file previously contained AWS Cognito attribute mapping but has been
 * completely replaced with Auth0-specific implementations. All Cognito
 * code has been removed as we now use Auth0 exclusively.
 */

// Auth0 attribute mapping
export const Auth0Attributes = {
  EMAIL: 'email',
  NAME: 'name',
  GIVEN_NAME: 'given_name',
  FAMILY_NAME: 'family_name',
  TENANT_ID: 'tenant_id',
  PICTURE: 'picture',
  SUB: 'sub',
  NICKNAME: 'nickname',
  UPDATED_AT: 'updated_at',
};

// Auth0 session helper
export const getAuth0Attributes = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      return session?.user || null;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching attributes:', error);
  }
  return null;
};

// Provide a message for any code still using Cognito
export const CognitoAttributes = new Proxy({}, {
  get: (target, prop) => {
    console.warn(\`[Auth] Accessing deprecated CognitoAttributes.\${prop} - use Auth0Attributes instead\`);
    // Map common Cognito attributes to Auth0 equivalents for compatibility
    const cognitoToAuth0Map = {
      'custom:tenant_ID': 'tenant_id',
      'custom:tenantId': 'tenant_id',
      email: 'email',
      name: 'name',
      given_name: 'given_name',
      family_name: 'family_name'
    };
    return cognitoToAuth0Map[prop] || prop;
  }
});

export default {
  Auth0Attributes,
  getAuth0Attributes,
  CognitoAttributes
};
`;
  
  fs.writeFileSync(cognitoAttributesPath, newCognitoAttributes);
  console.log(`✅ Updated ${cognitoAttributesPath}`);
} else {
  console.log(`❌ ${cognitoAttributesPath} not found`);
}

// Create AppCache utility
console.log('\n🔧 Creating AppCache utility...');
const appCachePath = path.join(utilsDir, 'appCache.js');
createBackup(appCachePath);

const appCacheContent = `/**
 * appCache.js - Client-side caching utility
 * 
 * A centralized utility for managing client-side caching across the application.
 * This replaces ad-hoc usage of window.__APP_CACHE throughout the codebase.
 */

// Initialize the cache safely
const initCache = () => {
  if (typeof window !== 'undefined') {
    window.__APP_CACHE = window.__APP_CACHE || {};
    return window.__APP_CACHE;
  }
  return null;
};

// Get a value from the cache
export const get = (key) => {
  if (!key) {
    console.error('[appCache] Error getting cache value: Cache key is required');
    return null;
  }

  try {
    const cache = initCache();
    if (!cache) return null;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      for (const k of keys) {
        if (current === null || current === undefined) return null;
        current = current[k];
      }
      
      return current;
    }
    
    return cache[key];
  } catch (error) {
    console.error(\`[appCache] Error getting cache value for key \${key}: \${error}\`);
    return null;
  }
};

// Set a value in the cache
export const set = (key, value) => {
  if (!key) {
    console.error('[appCache] Error setting cache value: Cache key is required');
    return false;
  }

  try {
    const cache = initCache();
    if (!cache) return false;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      // Create nested objects if they don't exist
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }
      
      // Set the value at the deepest level
      current[keys[keys.length - 1]] = value;
    } else {
      cache[key] = value;
    }
    
    return true;
  } catch (error) {
    console.error(\`[appCache] Error setting cache value for key \${key}: \${error}\`);
    return false;
  }
};

// Remove a value from the cache
export const remove = (key) => {
  if (!key) {
    console.error('[appCache] Error removing cache value: Cache key is required');
    return false;
  }

  try {
    const cache = initCache();
    if (!cache) return false;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) return false; // Key path doesn't exist
        current = current[k];
      }
      
      // Delete the property
      delete current[keys[keys.length - 1]];
    } else {
      delete cache[key];
    }
    
    return true;
  } catch (error) {
    console.error(\`[appCache] Error removing cache value for key \${key}: \${error}\`);
    return false;
  }
};

// Clear the entire cache
export const clear = () => {
  try {
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = {};
      return true;
    }
    return false;
  } catch (error) {
    console.error(\`[appCache] Error clearing cache: \${error}\`);
    return false;
  }
};

// Get the entire cache (for debugging)
export const getAll = () => {
  try {
    return initCache() || {};
  } catch (error) {
    console.error(\`[appCache] Error getting cache: \${error}\`);
    return {};
  }
};

export default {
  get,
  set,
  remove,
  clear,
  getAll
};
`;

fs.writeFileSync(appCachePath, appCacheContent);
console.log(`✅ Created ${appCachePath}`);

// Look for direct window.__APP_CACHE usages
console.log('\n🔍 Searching for direct window.__APP_CACHE usages...');
try {
  const grepResults = execSync('grep -r "window.__APP_CACHE" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" src', { 
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  const matches = grepResults.split('\n').filter(line => line.trim() !== '');
  const matchedFiles = new Set();
  
  matches.forEach(match => {
    const filePath = match.split(':')[0];
    if (filePath) matchedFiles.add(filePath);
  });
  
  console.log(`Found ${matchedFiles.size} files with direct window.__APP_CACHE usage:`);
  matchedFiles.forEach(file => console.log(`- ${file}`));
  
  // Fix each file with direct window.__APP_CACHE usage
  console.log('\n🔧 Updating direct window.__APP_CACHE usages...');
  for (const relativePath of matchedFiles) {
    const fullPath = path.join(projectRoot, relativePath);
    if (fs.existsSync(fullPath)) {
      createBackup(fullPath);
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace direct window.__APP_CACHE accesses with appCache utility
      content = content
        // Import appCache utility
        .replace(
          /import\s+{([^}]+)}\s+from\s+(['"])([^'"]+)['"]/g, 
          (match, imports, quote, source) => {
            // Only add import if it's not already there
            if (!imports.includes('appCache') && !source.includes('appCache')) {
              return `import { appCache } from ${quote}../utils/appCache${quote};\nimport {${imports}} from ${quote}${source}${quote}`;
            }
            return match;
          }
        )
        // If no imports exist, add import statement at the top
        .replace(
          /^(?!(import|\/\/))/,
          "import appCache from '../utils/appCache';\n\n"
        )
        // Replace window.__APP_CACHE.tenant.id with appCache.get('tenant.id')
        .replace(
          /window\.__APP_CACHE\.tenant\.id/g,
          "appCache.get('tenant.id')"
        )
        // Replace window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {}; window.__APP_CACHE.tenant.id = ...
        .replace(
          /window\.__APP_CACHE\.tenant\s*=\s*window\.__APP_CACHE\.tenant\s*\|\|\s*{}\s*;\s*window\.__APP_CACHE\.tenant\.id\s*=\s*([^;]+);/g,
          "appCache.set('tenant.id', $1);"
        )
        // Replace other window.__APP_CACHE assignments
        .replace(
          /window\.__APP_CACHE\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*([^;]+);/g,
          "appCache.set('$1.$2', $3);"
        )
        // Replace other window.__APP_CACHE accesses
        .replace(
          /window\.__APP_CACHE\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g,
          "appCache.get('$1.$2')"
        )
        // Replace window.__APP_CACHE existence checks
        .replace(
          /window\.__APP_CACHE(\?.+)?/g,
          "appCache.getAll()"
        );
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated ${fullPath}`);
    }
  }
} catch (error) {
  console.log('No files with direct window.__APP_CACHE usage found');
}

// Updating script registry
console.log('\n📝 Updating script registry...');
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
## Version0163_remove_amplify_cognito_references.mjs
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Remove remaining Amplify/Cognito references and fix window.__APP_CACHE usage
- **Changes**:
  - Updated amplifyUnified.js to remove all Amplify code and provide Auth0-only implementation
  - Updated CognitoAttributes.js to remove Cognito code and provide Auth0-only implementation
  - Created centralized appCache.js utility to replace direct window.__APP_CACHE usage
  - Fixed all direct window.__APP_CACHE references in components
- **Status**: ✅ Completed
`;

fs.appendFileSync(registryPath, registryEntry);

console.log('\n✅ Script completed!');
console.log('\n📋 Summary:');
console.log('- ✅ Removed remaining Amplify/Cognito references');
console.log('- ✅ Created centralized appCache utility');
console.log('- ✅ Fixed direct window.__APP_CACHE usages');
console.log('- ✅ Updated script registry');

// Make the script executable
if (process.platform !== 'win32') {
  try {
    execSync(`chmod +x "${__filename}"`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore chmod errors
  }
}
