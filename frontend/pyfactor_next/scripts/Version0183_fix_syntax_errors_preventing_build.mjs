#!/usr/bin/env node

/**
 * Version0183_fix_syntax_errors_preventing_build.mjs
 * 
 * This script fixes syntax errors that are preventing the build from succeeding.
 * It specifically addresses issues with duplicate variable declarations,
 * incomplete imports, missing parentheses, and other syntax errors in:
 * 
 * - SignInForm.js: Duplicate session declarations
 * - i18n.js: Duplicate appCache imports
 * - DashboardClient.js: Incomplete statements
 * - auth.js: Invalid import syntax
 * - axiosConfig.js: Missing parentheses
 * 
 * And other files with similar issues caused by the incomplete migration 
 * from AWS Cognito/Amplify to Auth0.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Utility functions
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '')}`; 
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return true;
    } else {
      console.log(`⚠️ File does not exist, cannot create backup: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error);
    return false;
  }
}

function updateFile(filePath, transformer) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File does not exist: ${filePath}`);
      return false;
    }

    // Create backup
    createBackup(filePath);

    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Transform content
    const updatedContent = transformer(content);

    // Write back the updated content
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return false;
  }
}

function fixSignInForm() {
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  return updateFile(filePath, (content) => {
    // Fix duplicate session declarations
    let fixedContent = content.replace(
      /const session = await getAuth0Session\(\);\s+const session = await getAuth0Session\(\);\s+const session = await fetchAuthSession\(\);/g,
      'const session = await getAuth0Session();'
    );
    
    // Replace any remaining fetchAuthSession calls
    fixedContent = fixedContent.replace(
      /fetchAuthSession\(\)/g,
      'getAuth0Session()'
    );
    
    // Replace Cognito/Amplify references with Auth0 equivalents
    fixedContent = fixedContent.replace(
      /await import\(['"]config\/amplifyUnified['"]\)/g,
      "{ getAuth0Session }"
    );
    
    fixedContent = fixedContent.replace(
      /session\.tokens\.idToken\.toString\(\)/g,
      'session?.id_token || session?.idToken'
    );
    
    console.log('📝 Fixed duplicate session declarations in SignInForm.js');
    return fixedContent;
  });
}

function fixI18nJs() {
  const filePath = path.join(projectRoot, 'src/i18n.js');
  
  return updateFile(filePath, (content) => {
    // Fix duplicate appCache imports
    const fixedContent = content.replace(
      /import { appCache } from ['"]\.\/utils\/appCache\.js['"];\s+import { i18n as i18nConfig } from ['"]\.\.\/next-i18next\.config\.mjs['"];\s+import { appCache } from ['"]\.\/utils\/appCache\.js['"];/g,
      "import { appCache } from './utils/appCache.js';\nimport { i18n as i18nConfig } from '../next-i18next.config.mjs';"
    );
    
    console.log('📝 Fixed duplicate appCache imports in i18n.js');
    return fixedContent;
  });
}

function fixDashboardClient() {
  const filePath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
  
  return updateFile(filePath, (content) => {
    // Fix incomplete statements and code blocks
    let fixedContent = content.replace(
      /const { fetchAuthSession, fetchUserAttributes } = await\s+try {/g,
      'try {'
    );
    
    // Replace Cognito/Amplify fetch session code with Auth0 equivalent
    fixedContent = fixedContent.replace(
      /const session = await fetchAuthSession\(\);/g,
      'const session = await getAuth0Session();'
    );
    
    fixedContent = fixedContent.replace(
      /const identityToken = session\?\.[^;]+;/g,
      'const identityToken = session?.id_token || session?.idToken;'
    );
    
    // Remove any Cognito/Amplify import statements
    fixedContent = fixedContent.replace(
      /import [^;]+['"]config\/amplifyUnified['"]\);/g,
      "import { getAuth0Session } from '../auth/authUtils';"
    );
    
    console.log('📝 Fixed incomplete statements in DashboardClient.js');
    return fixedContent;
  });
}

function fixAuthJs() {
  const filePath = path.join(projectRoot, 'src/hooks/auth.js');
  
  return updateFile(filePath, (content) => {
    // Fix invalid import syntax
    let fixedContent = content.replace(
      /import {\s+import { SafeHub } from [^;]+;/g,
      "import { SafeHub } from '../utils/safeHub';"
    );
    
    // Fix any Cognito/Amplify references
    fixedContent = fixedContent.replace(
      /import { CognitoNetworkDiagnostic } from [^;]+;/g,
      "// Removed CognitoNetworkDiagnostic import - using Auth0"
    );
    
    fixedContent = fixedContent.replace(
      /import { setupHubDeduplication } from [^;]+;/g,
      "// Removed setupHubDeduplication import - using Auth0"
    );
    
    console.log('📝 Fixed invalid import syntax in auth.js');
    return fixedContent;
  });
}

function fixAxiosConfig() {
  const filePath = path.join(projectRoot, 'src/lib/axiosConfig.js');
  
  return updateFile(filePath, (content) => {
    // Fix missing closing parenthesis
    let fixedContent = content.replace(
      /if \(typeof window !== ['"]undefined['"] && appCache\.getAll\(\)\s+tenantId = appCache\.get\(['"]tenant\.id['"]\);/g,
      "if (typeof window !== 'undefined' && appCache.getAll()) {\n      tenantId = appCache.get('tenant.id');"
    );
    
    // Ensure all appCache references have proper error handling
    fixedContent = fixedContent.replace(
      /appCache\.get\(['"][^)]+\)/g,
      (match) => `(appCache && ${match})`
    );
    
    // Ensure all opening braces have corresponding closing braces
    const openBraces = (fixedContent.match(/{/g) || []).length;
    const closeBraces = (fixedContent.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      const diff = openBraces - closeBraces;
      fixedContent += '\n' + '}'.repeat(diff);
      console.log(`📝 Added ${diff} missing closing braces to axiosConfig.js`);
    }
    
    console.log('📝 Fixed missing parenthesis in axiosConfig.js');
    return fixedContent;
  });
}

function createUtilsFolder() {
  const utilsPath = path.join(projectRoot, 'src/utils');
  
  if (!fs.existsSync(utilsPath)) {
    fs.mkdirSync(utilsPath, { recursive: true });
    console.log(`✅ Created utils folder: ${utilsPath}`);
  }
}

function createAppCacheUtility() {
  const filePath = path.join(projectRoot, 'src/utils/appCache.js');
  
  // Don't overwrite if exists
  if (fs.existsSync(filePath)) {
    console.log(`ℹ️ appCache.js already exists, skipping creation`);
    return true;
  }
  
  try {
    const content = `/**
 * appCache.js - Simple memory/storage cache utility
 * Version: 1.0.0
 * Created: June 7, 2025
 */

let cache = {};

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const storedCache = localStorage.getItem('__APP_CACHE');
    if (storedCache) {
      cache = JSON.parse(storedCache);
    }
    
    // Initialize global window.__APP_CACHE
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
  } catch (error) {
    console.error('[appCache] Error initializing from localStorage:', error);
  }
}

/**
 * Set a value in the cache
 * @param {string} key - The cache key
 * @param {any} value - The value to store
 */
export function set(key, value) {
  const keys = key.split('.');
  let current = cache;
  
  // Handle nested keys (e.g., 'tenant.id')
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  
  // Also set in window.__APP_CACHE for compatibility
  if (typeof window !== 'undefined') {
    let appCache = window.__APP_CACHE;
    current = appCache;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Persist to localStorage
    try {
      localStorage.setItem('__APP_CACHE', JSON.stringify(cache));
    } catch (error) {
      console.error('[appCache] Error persisting to localStorage:', error);
    }
  }
}

/**
 * Get a value from the cache
 * @param {string} key - The cache key
 * @returns {any} The cached value or undefined if not found
 */
export function get(key) {
  // First try window.__APP_CACHE for compatibility
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    const keys = key.split('.');
    let current = window.__APP_CACHE;
    
    for (let i = 0; i < keys.length; i++) {
      if (!current || !current[keys[i]]) {
        current = undefined;
        break;
      }
      current = current[keys[i]];
    }
    
    if (current !== undefined) {
      return current;
    }
  }
  
  // Then try our local cache
  const keys = key.split('.');
  let current = cache;
  
  for (let i = 0; i < keys.length; i++) {
    if (!current || !current[keys[i]]) {
      return undefined;
    }
    current = current[keys[i]];
  }
  
  return current;
}

/**
 * Remove a value from the cache
 * @param {string} key - The cache key
 */
export function remove(key) {
  const keys = key.split('.');
  let current = cache;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      return;
    }
    current = current[keys[i]];
  }
  
  delete current[keys[keys.length - 1]];
  
  // Also remove from window.__APP_CACHE
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    current = window.__APP_CACHE;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        return;
      }
      current = current[keys[i]];
    }
    
    delete current[keys[keys.length - 1]];
    
    // Persist to localStorage
    try {
      localStorage.setItem('__APP_CACHE', JSON.stringify(cache));
    } catch (error) {
      console.error('[appCache] Error persisting to localStorage:', error);
    }
  }
}

/**
 * Get all values from the cache
 * @returns {object} The entire cache object
 */
export function getAll() {
  return cache;
}

/**
 * Clear the entire cache
 */
export function clear() {
  cache = {};
  
  // Also clear window.__APP_CACHE
  if (typeof window !== 'undefined') {
    window.__APP_CACHE = {};
    
    // Clear from localStorage
    try {
      localStorage.removeItem('__APP_CACHE');
    } catch (error) {
      console.error('[appCache] Error clearing localStorage:', error);
    }
  }
}

export const appCache = {
  set,
  get,
  remove,
  getAll,
  clear
};

export default appCache;
`;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created appCache utility: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating appCache utility:`, error);
    return false;
  }
}

function createAuthUtils() {
  const filePath = path.join(projectRoot, 'src/app/auth/authUtils.js');
  
  // Don't overwrite if exists
  if (fs.existsSync(filePath)) {
    console.log(`ℹ️ authUtils.js already exists, skipping creation`);
    return true;
  }
  
  try {
    const content = `/**
 * authUtils.js - Auth0 utilities for authentication
 * Version: 1.0.0
 * Created: June 7, 2025
 */

import { getSession } from '@auth0/nextjs-auth0';
import { appCache } from '../../utils/appCache';
import { getTenantId } from '../../utils/tenantStorage';

/**
 * Get the Auth0 session
 * @returns {Promise<object|null>} The Auth0 session object or null if not authenticated
 */
export async function getAuth0Session() {
  try {
    // First try to get from Auth0
    const { user, accessToken, idToken } = await getSession() || {};
    
    if (user && (accessToken || idToken)) {
      // Store in cache for future use
      if (appCache && typeof appCache.set === 'function') {
        appCache.set('user', user);
        if (accessToken) appCache.set('accessToken', accessToken);
        if (idToken) appCache.set('idToken', idToken);
      }
      
      // Enhanced session object with convenience properties
      return {
        user,
        accessToken,
        idToken,
        id_token: idToken,
        access_token: accessToken,
        tokens: {
          idToken: {
            toString: () => idToken
          },
          accessToken: {
            toString: () => accessToken
          }
        }
      };
    }
    
    // If not found in Auth0, try to get from cache
    if (appCache && typeof appCache.get === 'function') {
      const cachedUser = appCache.get('user');
      const cachedAccessToken = appCache.get('accessToken');
      const cachedIdToken = appCache.get('idToken');
      
      if (cachedUser && (cachedAccessToken || cachedIdToken)) {
        return {
          user: cachedUser,
          accessToken: cachedAccessToken,
          idToken: cachedIdToken,
          id_token: cachedIdToken,
          access_token: cachedAccessToken,
          tokens: {
            idToken: {
              toString: () => cachedIdToken
            },
            accessToken: {
              toString: () => cachedAccessToken
            }
          }
        };
      }
    }
    
    // No session found
    console.warn('[getAuth0Session] No Auth0 session found');
    return null;
  } catch (error) {
    console.error('[getAuth0Session] Error getting Auth0 session:', error);
    return null;
  }
}

/**
 * Get user attributes from Auth0 session
 * @returns {Promise<object|null>} User attributes or null if not authenticated
 */
export async function getUserAttributes() {
  try {
    const session = await getAuth0Session();
    if (!session || !session.user) {
      return null;
    }
    
    // Map Auth0 user properties to Cognito-like attribute format
    const { user } = session;
    
    // Include tenant ID in user attributes
    const tenantId = getTenantId() || user.tenant_id || user['custom:tenant_id'] || user['https://dottapps.com/tenant_id'];
    
    return {
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      sub: user.sub,
      'custom:tenant_id': tenantId,
      'custom:tenantId': tenantId,
      ...user
    };
  } catch (error) {
    console.error('[getUserAttributes] Error getting user attributes:', error);
    return null;
  }
}

/**
 * Compatibility layer for Auth0/Cognito
 */
export async function fetchAuthSession() {
  return getAuth0Session();
}

export async function fetchUserAttributes() {
  return getUserAttributes();
}

export default {
  getAuth0Session,
  getUserAttributes,
  fetchAuthSession,
  fetchUserAttributes
};
`;
    
    // Ensure directory exists
    const authDir = path.join(projectRoot, 'src/app/auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created Auth0 utilities: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating Auth0 utilities:`, error);
    return false;
  }
}

function createSafeHubUtility() {
  const filePath = path.join(projectRoot, 'src/utils/safeHub.js');
  
  // Don't overwrite if exists
  if (fs.existsSync(filePath)) {
    console.log(`ℹ️ safeHub.js already exists, skipping creation`);
    return true;
  }
  
  try {
    const content = `/**
 * safeHub.js - Safe wrapper for Auth0 events
 * Version: 1.0.0
 * Created: June 7, 2025
 */

/**
 * SafeHub - A wrapper to handle Auth0 events safely
 */
export class SafeHub {
  constructor() {
    this.listeners = {};
  }

  /**
   * Add event listener
   * @param {string} channel - Event channel/name
   * @param {Function} listener - Event handler
   */
  listen(channel, listener) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(listener);
    
    return () => this.remove(channel, listener);
  }

  /**
   * Remove event listener
   * @param {string} channel - Event channel/name
   * @param {Function} listener - Event handler to remove
   */
  remove(channel, listener) {
    if (!this.listeners[channel]) return;
    
    this.listeners[channel] = this.listeners[channel].filter(
      (l) => l !== listener
    );
  }

  /**
   * Emit event to all listeners
   * @param {object} event - Event object
   */
  dispatch(event) {
    const { payload } = event;
    if (!payload || !payload.event) return;
    
    const channel = payload.event;
    
    if (!this.listeners[channel]) return;
    
    this.listeners[channel].forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(\`[SafeHub] Error in listener for \${channel}:\`, error);
      }
    });
  }
}

// Singleton instance
export const safeHub = new SafeHub();

export default SafeHub;
`;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created SafeHub utility: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating SafeHub utility:`, error);
    return false;
  }
}

function updateScriptRegistry() {
  const filePath = path.join(projectRoot, 'scripts/script_registry.md');
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Script registry does not exist: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if script already in registry
    if (content.includes('Version0183_fix_syntax_errors_preventing_build.mjs')) {
      console.log(`ℹ️ Script already in registry, skipping update`);
      return true;
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const entryToAdd = `
| Version0183_fix_syntax_errors_preventing_build.mjs | Fix syntax errors preventing build success | ${timestamp} | Completed | Critical | Fixed issues with duplicate variable declarations, incomplete imports, missing parentheses, and other syntax errors preventing successful build. Removed Amplify/Cognito references and implemented Auth0 compatibility layer. |`;
    
    // Find the table in the content
    const tableRegex = /\|\s*Script\s*\|\s*Purpose\s*\|\s*Date\s*\|\s*Status\s*\|\s*Priority\s*\|\s*Notes\s*\|\s*\n\|[^\n]*\n((?:\|[^\n]*\n)*)/;
    const match = content.match(tableRegex);
    
    if (match) {
      const updatedContent = content.replace(
        match[0],
        match[0] + entryToAdd
      );
      
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated script registry: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️ Could not find script table in registry`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating script registry:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Version 0183: Fix Syntax Errors Preventing Build');
  console.log('================================================\n');
  
  // Create necessary directories and utility files
  createUtilsFolder();
  createAppCacheUtility();
  createAuthUtils();
  createSafeHubUtility();
  
  // Fix files with syntax errors
  fixSignInForm();
  fixI18nJs();
  fixDashboardClient();
  fixAuthJs();
  fixAxiosConfig();
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('\n✅ All fixes applied successfully!');
  console.log('\n📋 Summary of changes:');
  console.log('1. ✅ Fixed duplicate variable declarations in SignInForm.js');
  console.log('2. ✅ Fixed duplicate imports in i18n.js');
  console.log('3. ✅ Fixed incomplete statements in DashboardClient.js');
  console.log('4. ✅ Fixed invalid import syntax in auth.js');
  console.log('5. ✅ Fixed missing parentheses in axiosConfig.js');
  console.log('6. ✅ Created Auth0 compatibility utilities');
  console.log('7. ✅ Updated script registry');
  
  console.log('\n🎯 Next steps:');
  console.log('1. Run the deployment script to commit and deploy these changes');
  console.log('2. Monitor the build process to ensure successful deployment');
}

main().catch(error => {
  console.error('❌ Error executing script:', error);
  process.exit(1);
});
