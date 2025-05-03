#!/usr/bin/env node
/**
 * Script to fix authentication issues in the Employee Management module
 * This script ensures proper Amplify configuration and token handling
 * 
 * Issue: Authentication required error in Employee Management page
 * 
 * Version: 1.0.0
 * Date: 2025-04-20
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting authentication issue fix script');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const configDir = path.join(rootDir, 'src', 'config');
const utilsDir = path.join(rootDir, 'src', 'utils');

// Create backup directory if it doesn't exist
const backupDir = path.join(rootDir, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Backup file before modifying
function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup of ${fileName} at ${backupPath}`);
    return true;
  }
  return false;
}

// ==========================================
// 1. Fix DashboardLoader.js syntax error
// ==========================================
const dashboardLoaderPath = path.join(rootDir, 'src', 'components', 'DashboardLoader.js');
if (fs.existsSync(dashboardLoaderPath)) {
  backupFile(dashboardLoaderPath);
  
  let content = fs.readFileSync(dashboardLoaderPath, 'utf8');
  
  // Fix the missing urlParams in the useEffect dependency array
  content = content.replace(
    /}, \[recoverFromError, isRecoveryOnCooldown\]\);/,
    '}, [recoverFromError, isRecoveryOnCooldown, urlParams]);'
  );
  
  fs.writeFileSync(dashboardLoaderPath, content);
  console.log('Fixed syntax error in DashboardLoader.js');
} else {
  console.error('DashboardLoader.js not found at expected location');
}

// ==========================================
// 2. Improve refreshUserSession.js to ensure it can get fresh tokens
// ==========================================
const refreshUserSessionPath = path.join(utilsDir, 'refreshUserSession.js');
if (fs.existsSync(refreshUserSessionPath)) {
  backupFile(refreshUserSessionPath);
  
  let content = fs.readFileSync(refreshUserSessionPath, 'utf8');
  
  // Enhancement: Improve fetchAuthSession call to always use forceRefresh
  // This ensures we get fresh tokens from Cognito instead of cached ones
  if (!content.includes('fetchAuthSession({ forceRefresh: true })')) {
    content = content.replace(
      /const session = await fetchAuthSession\(\);/g,
      'const session = await fetchAuthSession({ forceRefresh: true });'
    );
  }
  
  // Enhance the storeTokensInAppCache function to also store token in the APP_CACHE.auth.token property
  // This ensures the token is available where EmployeeManagement.js is looking for it
  if (!content.includes('window.__APP_CACHE.auth.token = tokens.idToken')) {
    content = content.replace(
      /window\.__APP_CACHE\.auth\.idToken = tokens\.idToken;/,
      'window.__APP_CACHE.auth.idToken = tokens.idToken;\n      window.__APP_CACHE.auth.token = tokens.idToken;'
    );
    
    if (!content.includes('window.__APP_CACHE.auth.token = tokens.idToken')) {
      // If the previous replace didn't work, try to add it in a different way
      content = content.replace(
        /window\.__APP_CACHE\.auth\.accessToken = tokens\.accessToken;/,
        'window.__APP_CACHE.auth.accessToken = tokens.accessToken;\n      window.__APP_CACHE.auth.token = tokens.idToken;'
      );
    }
  }
  
  fs.writeFileSync(refreshUserSessionPath, content);
  console.log('Enhanced refreshUserSession.js implementation');
} else {
  console.error('refreshUserSession.js not found at expected location');
}

// ==========================================
// 3. Create or update a utility function to ensure the auth token is properly stored
// ==========================================
const authUtilsPath = path.join(utilsDir, 'authUtils.js');
if (fs.existsSync(authUtilsPath)) {
  backupFile(authUtilsPath);
  
  let content = fs.readFileSync(authUtilsPath, 'utf8');
  
  // Add or update a function to ensure the auth token is properly stored in APP_CACHE
  const ensureTokenInCacheFunction = `
/**
 * Ensures the authentication token is properly stored in APP_CACHE
 * This is a utility function to fix issues with token access
 * 
 * @returns {Promise<boolean>} True if token was found or stored, false otherwise
 */
export async function ensureAuthTokenInCache() {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check if we already have the token in APP_CACHE
    if (window.__APP_CACHE?.auth?.token) {
      return true;
    }
    
    logger.debug('[authUtils] No auth token found in APP_CACHE, attempting to fetch from session');
    
    // Try to get the token from session
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession({ forceRefresh: true });
      
      if (session?.tokens?.idToken) {
        // Initialize APP_CACHE if needed
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
        
        // Store token in multiple places for maximum compatibility
        const idToken = session.tokens.idToken.toString();
        window.__APP_CACHE.auth.token = idToken;
        window.__APP_CACHE.auth.idToken = idToken;
        
        if (session.tokens.accessToken) {
          window.__APP_CACHE.auth.accessToken = session.tokens.accessToken.toString();
        }
        
        logger.info('[authUtils] Successfully retrieved and stored auth token in APP_CACHE');
        return true;
      }
    } catch (error) {
      logger.error('[authUtils] Error fetching auth session:', error);
    }
    
    return false;
  } catch (error) {
    logger.error('[authUtils] Error in ensureAuthTokenInCache:', error);
    return false;
  }
}
`;

  // Check if the function already exists
  if (!content.includes('function ensureAuthTokenInCache')) {
    // Add the function at the end of the file
    content += ensureTokenInCacheFunction;
  }
  
  fs.writeFileSync(authUtilsPath, content);
  console.log('Added or updated ensureAuthTokenInCache function in authUtils.js');
} else {
  console.error('authUtils.js not found at expected location');
}

// ==========================================
// 4. Create a README file documenting the changes
// ==========================================
const readmePath = path.join(__dirname, 'AUTH_FIX_README.md');
const readmeContent = `# Authentication Fix for Employee Management

## Issue
Authentication issues in the Employee Management module causing "Authentication required" errors.

## Fix Details
This script implements the following fixes:

1. **DashboardLoader.js** - Fixed syntax error in useEffect dependency array
2. **refreshUserSession.js** - Improved token refresh and storage mechanism
3. **authUtils.js** - Added utility function to ensure auth token is properly stored in APP_CACHE

## Developer Notes
If you continue to experience authentication issues, try these steps:

1. Clear your browser cache and localStorage
2. Restart the Next.js development server with \`pnpm run dev:https\`
3. Ensure AWS Amplify is properly configured with your Cognito credentials

## Version
1.0.0 (2025-04-20)
`;

fs.writeFileSync(readmePath, readmeContent);
console.log('Created documentation file at', readmePath);

// ==========================================
// Final step: Print success message and next steps
// ==========================================
console.log('\nAuthentication fix script completed successfully!');
console.log('Next steps:');
console.log('1. Restart your Next.js development server');
console.log('2. Clear your browser cache (or open in incognito mode)');
console.log('3. Login and try accessing the Employee Management page again');
console.log('\nIf issues persist, check the AUTH_FIX_README.md file for additional steps.'); 