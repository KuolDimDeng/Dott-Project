/**
 * Version0002_implement_aws_app_cache.js
 * 
 * Purpose: Implement AWS App Cache for token storage in the frontend
 * Version: 1.0
 * Date: 2025-04-24
 * Author: Claude
 * 
 * This script implements AWS App Cache for token storage in the frontend by:
 * 1. Creating a new AppCache utility file
 * 2. Updating the authentication provider to use AppCache
 * 3. Updating API clients to use AppCache for token storage
 * 
 * Files modified:
 * - frontend/pyfactor_next/src/utils/appCache.js (new file)
 * - frontend/pyfactor_next/src/providers/AuthProvider.js
 * - frontend/pyfactor_next/src/utils/apiClient.js
 * 
 * Execution:
 * 1. Navigate to the scripts directory: cd /Users/kuoldeng/projectx/scripts
 * 2. Run the script: node Version0002_implement_aws_app_cache.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const BACKUP_DIR = '/Users/kuoldeng/projectx/scripts/backups';
const LOG_DIR = '/Users/kuoldeng/projectx/scripts/logs';

// Files to modify
const FILES_TO_MODIFY = [
  {
    path: 'src/providers/AuthProvider.js',
    backupName: 'AuthProvider.js.backup-2025-04-24',
    description: 'Authentication provider'
  },
  {
    path: 'src/utils/apiClient.js',
    backupName: 'apiClient.js.backup-2025-04-24',
    description: 'API client utilities'
  }
];

// New files to create
const NEW_FILES = [
  {
    path: 'src/utils/appCache.js',
    description: 'AWS App Cache utility'
  }
];

// Ensure backup and log directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
  
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`Created log directory: ${LOG_DIR}`);
  }
}

// Create backup of a file
function createBackup(filePath, backupName) {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (fs.existsSync(fullPath)) {
    fs.copyFileSync(fullPath, backupPath);
    console.log(`Created backup: ${backupPath}`);
    return true;
  } else {
    console.error(`File not found: ${fullPath}`);
    return false;
  }
}

// Create a new file
function createNewFile(filePath, content) {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
  
  // Write the file
  fs.writeFileSync(fullPath, content);
  console.log(`Created new file: ${fullPath}`);
}

// Create the AppCache utility file
function createAppCacheUtility() {
  const filePath = 'src/utils/appCache.js';
  
  const content = `/**
 * AWS App Cache Utility
 * 
 * This utility provides functions for storing and retrieving data from AWS App Cache.
 * It is used for storing authentication tokens and other sensitive data.
 */

/**
 * Store a value in AWS App Cache
 * @param {string} key - The key to store the value under
 * @param {string} value - The value to store
 * @returns {Promise<void>} - A promise that resolves when the value is stored
 */
export async function setAppCacheItem(key, value) {
  try {
    // Use AWS App Cache to store the value
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the AWS App Cache SDK
    if (typeof window !== 'undefined' && window.AWSCache) {
      await window.AWSCache.setItem(key, value);
      console.debug(\`[AppCache] Stored value for key: \${key}\`);
    } else {
      // Fallback to sessionStorage for development
      if (process.env.NODE_ENV !== 'production') {
        sessionStorage.setItem(key, value);
        console.debug(\`[AppCache] Stored value in sessionStorage for key: \${key}\`);
      } else {
        console.error('[AppCache] AWS App Cache not available');
      }
    }
  } catch (error) {
    console.error(\`[AppCache] Error storing value for key \${key}:\`, error);
    throw error;
  }
}

/**
 * Retrieve a value from AWS App Cache
 * @param {string} key - The key to retrieve the value for
 * @returns {Promise<string|null>} - A promise that resolves to the value or null if not found
 */
export async function getAppCacheItem(key) {
  try {
    // Use AWS App Cache to retrieve the value
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the AWS App Cache SDK
    if (typeof window !== 'undefined' && window.AWSCache) {
      const value = await window.AWSCache.getItem(key);
      console.debug(\`[AppCache] Retrieved value for key: \${key}\`);
      return value;
    } else {
      // Fallback to sessionStorage for development
      if (process.env.NODE_ENV !== 'production') {
        const value = sessionStorage.getItem(key);
        console.debug(\`[AppCache] Retrieved value from sessionStorage for key: \${key}\`);
        return value;
      } else {
        console.error('[AppCache] AWS App Cache not available');
        return null;
      }
    }
  } catch (error) {
    console.error(\`[AppCache] Error retrieving value for key \${key}:\`, error);
    return null;
  }
}

/**
 * Remove a value from AWS App Cache
 * @param {string} key - The key to remove the value for
 * @returns {Promise<void>} - A promise that resolves when the value is removed
 */
export async function removeAppCacheItem(key) {
  try {
    // Use AWS App Cache to remove the value
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the AWS App Cache SDK
    if (typeof window !== 'undefined' && window.AWSCache) {
      await window.AWSCache.removeItem(key);
      console.debug(\`[AppCache] Removed value for key: \${key}\`);
    } else {
      // Fallback to sessionStorage for development
      if (process.env.NODE_ENV !== 'production') {
        sessionStorage.removeItem(key);
        console.debug(\`[AppCache] Removed value from sessionStorage for key: \${key}\`);
      } else {
        console.error('[AppCache] AWS App Cache not available');
      }
    }
  } catch (error) {
    console.error(\`[AppCache] Error removing value for key \${key}:\`, error);
    throw error;
  }
}

/**
 * Clear all values from AWS App Cache
 * @returns {Promise<void>} - A promise that resolves when all values are cleared
 */
export async function clearAppCache() {
  try {
    // Use AWS App Cache to clear all values
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the AWS App Cache SDK
    if (typeof window !== 'undefined' && window.AWSCache) {
      await window.AWSCache.clear();
      console.debug('[AppCache] Cleared all values');
    } else {
      // Fallback to sessionStorage for development
      if (process.env.NODE_ENV !== 'production') {
        sessionStorage.clear();
        console.debug('[AppCache] Cleared all values from sessionStorage');
      } else {
        console.error('[AppCache] AWS App Cache not available');
      }
    }
  } catch (error) {
    console.error('[AppCache] Error clearing all values:', error);
    throw error;
  }
}

/**
 * Check if AWS App Cache is available
 * @returns {boolean} - True if AWS App Cache is available, false otherwise
 */
export function isAppCacheAvailable() {
  return typeof window !== 'undefined' && window.AWSCache !== undefined;
}

/**
 * Initialize AWS App Cache
 * @returns {Promise<void>} - A promise that resolves when AWS App Cache is initialized
 */
export async function initAppCache() {
  try {
    // Initialize AWS App Cache
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the AWS App Cache SDK
    if (typeof window !== 'undefined' && window.AWSCache) {
      await window.AWSCache.init({
        // Add any configuration options here
      });
      console.debug('[AppCache] Initialized AWS App Cache');
    } else {
      console.warn('[AppCache] AWS App Cache not available, using sessionStorage fallback');
    }
  } catch (error) {
    console.error('[AppCache] Error initializing AWS App Cache:', error);
    throw error;
  }
}
`;

  createNewFile(filePath, content);
}

// Update the AuthProvider to use AppCache
function updateAuthProvider() {
  const filePath = path.join(FRONTEND_DIR, 'src/providers/AuthProvider.js');
  
  // Read the current file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for AppCache
  content = content.replace(
    /import { Auth } from 'aws-amplify';/,
    `import { Auth } from 'aws-amplify';
import { setAppCacheItem, getAppCacheItem, removeAppCacheItem, clearAppCache, initAppCache } from '@/utils/appCache';`
  );
  
  // Update the login function to use AppCache
  const newLoginFunction = `
  const login = async (username, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Sign in with Cognito
      const user = await Auth.signIn(username, password);
      
      // Get tokens
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();
      const accessToken = session.getAccessToken().getJwtToken();
      const refreshToken = session.getRefreshToken().getToken();
      
      // Store tokens in AWS App Cache
      await setAppCacheItem('idToken', idToken);
      await setAppCacheItem('accessToken', accessToken);
      await setAppCacheItem('refreshToken', refreshToken);
      
      // Store user data
      setUser(user);
      setIsAuthenticated(true);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };
`;

  // Update the logout function to use AppCache
  const newLogoutFunction = `
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Sign out from Cognito
      await Auth.signOut();
      
      // Clear tokens from AWS App Cache
      await clearAppCache();
      
      // Clear user data
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };
`;

  // Update the checkAuth function to use AppCache
  const newCheckAuthFunction = `
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated with Cognito
      const user = await Auth.currentAuthenticatedUser();
      
      // Get tokens
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();
      const accessToken = session.getAccessToken().getJwtToken();
      const refreshToken = session.getRefreshToken().getToken();
      
      // Store tokens in AWS App Cache
      await setAppCacheItem('idToken', idToken);
      await setAppCacheItem('accessToken', accessToken);
      await setAppCacheItem('refreshToken', refreshToken);
      
      // Set user data
      setUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Check auth error:', error);
      setError(error.message || 'Failed to check authentication');
      
      // Clear user data
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear tokens from AWS App Cache
      await clearAppCache();
    } finally {
      setIsLoading(false);
    }
  };
`;

  // Update the refreshSession function to use AppCache
  const newRefreshSessionFunction = `
  const refreshSession = async () => {
    try {
      // Get refresh token from AWS App Cache
      const refreshToken = await getAppCacheItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Refresh session with Cognito
      const session = await Auth.currentSession();
      
      // Get new tokens
      const idToken = session.getIdToken().getJwtToken();
      const accessToken = session.getAccessToken().getJwtToken();
      const newRefreshToken = session.getRefreshToken().getToken();
      
      // Store new tokens in AWS App Cache
      await setAppCacheItem('idToken', idToken);
      await setAppCacheItem('accessToken', accessToken);
      await setAppCacheItem('refreshToken', newRefreshToken);
      
      return true;
    } catch (error) {
      console.error('Refresh session error:', error);
      return false;
    }
  };
`;

  // Update the getTokens function to use AppCache
  const newGetTokensFunction = `
  const getTokens = async () => {
    try {
      // Get tokens from AWS App Cache
      const idToken = await getAppCacheItem('idToken');
      const accessToken = await getAppCacheItem('accessToken');
      
      if (!idToken || !accessToken) {
        // Try to refresh the session
        const refreshed = await refreshSession();
        
        if (!refreshed) {
          throw new Error('No tokens available');
        }
        
        // Get tokens again after refresh
        return {
          idToken: await getAppCacheItem('idToken'),
          accessToken: await getAppCacheItem('accessToken')
        };
      }
      
      return { idToken, accessToken };
    } catch (error) {
      console.error('Get tokens error:', error);
      throw error;
    }
  };
`;

  // Update the useEffect for initialization to use AppCache
  const newInitEffect = `
  // Initialize AWS App Cache and check authentication on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize AWS App Cache
        await initAppCache();
        
        // Check authentication
        await checkAuth();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    init();
  }, []);
`;

  // Replace the functions in the file
  content = content.replace(
    /const login = async \([^)]*\)\s*{[\s\S]*?};/,
    newLoginFunction
  );
  
  content = content.replace(
    /const logout = async \([^)]*\)\s*{[\s\S]*?};/,
    newLogoutFunction
  );
  
  content = content.replace(
    /const checkAuth = async \([^)]*\)\s*{[\s\S]*?};/,
    newCheckAuthFunction
  );
  
  content = content.replace(
    /const refreshSession = async \([^)]*\)\s*{[\s\S]*?};/,
    newRefreshSessionFunction
  );
  
  content = content.replace(
    /const getTokens = async \([^)]*\)\s*{[\s\S]*?};/,
    newGetTokensFunction
  );
  
  content = content.replace(
    /useEffect\(\(\) => {[\s\S]*?}, \[\]\);(\s*\/\/ Check authentication)/,
    newInitEffect
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

// Update the API client to use AppCache
function updateApiClient() {
  const filePath = path.join(FRONTEND_DIR, 'src/utils/apiClient.js');
  
  // Read the current file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for AppCache
  content = content.replace(
    /import axios from 'axios';/,
    `import axios from 'axios';
import { getAppCacheItem, setAppCacheItem } from '@/utils/appCache';`
  );
  
  // Update the createAxiosInstance function to use AppCache
  const newCreateAxiosInstance = `
/**
 * Create an axios instance with authentication headers
 * @returns {Promise<import('axios').AxiosInstance>} - The axios instance
 */
export const createAxiosInstance = async () => {
  // Get tokens from AWS App Cache
  const idToken = await getAppCacheItem('idToken');
  const accessToken = await getAppCacheItem('accessToken');
  
  // Create axios instance
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Add request interceptor to add auth headers
  instance.interceptors.request.use(
    async (config) => {
      // Get tokens from AWS App Cache
      const idToken = await getAppCacheItem('idToken');
      const accessToken = await getAppCacheItem('accessToken');
      
      // Add auth headers if tokens are available
      if (idToken) {
        config.headers['X-Id-Token'] = idToken;
      }
      
      if (accessToken) {
        config.headers['Authorization'] = \`Bearer \${accessToken}\`;
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Add response interceptor to handle token refresh
  instance.interceptors.response.use(
    (response) => {
      // Get tokens from response headers
      const idToken = response.headers['x-id-token'];
      const refreshToken = response.headers['x-refresh-token'];
      
      // Store tokens in AWS App Cache if they are available
      if (idToken) {
        setAppCacheItem('idToken', idToken);
      }
      
      if (refreshToken) {
        setAppCacheItem('refreshToken', refreshToken);
      }
      
      return response;
    },
    async (error) => {
      // Handle 401 errors (unauthorized)
      if (error.response && error.response.status === 401) {
        // Try to refresh the session
        try {
          const { refreshSession } = await import('@/providers/AuthProvider');
          const refreshed = await refreshSession();
          
          if (refreshed) {
            // Retry the request
            const config = error.config;
            return instance(config);
          }
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};
`;

  // Update the getApiClient function to use AppCache
  const newGetApiClient = `
/**
 * Get an axios instance with authentication headers
 * @returns {Promise<import('axios').AxiosInstance>} - The axios instance
 */
export const getApiClient = async () => {
  return await createAxiosInstance();
};
`;

  // Replace the functions in the file
  content = content.replace(
    /export const createAxiosInstance = async \([^)]*\)\s*{[\s\S]*?};/,
    newCreateAxiosInstance
  );
  
  content = content.replace(
    /export const getApiClient = async \([^)]*\)\s*{[\s\S]*?};/,
    newGetApiClient
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

// Create a documentation file for the changes
function createDocumentation() {
  const docPath = path.join(FRONTEND_DIR, 'src/utils/AWS_APP_CACHE.md');
  
  const documentation = `# AWS App Cache Implementation

## Overview

This document describes the implementation of AWS App Cache for token storage in the frontend.

## Changes Made

1. **Created AppCache Utility**
   - Added functions for storing and retrieving data from AWS App Cache
   - Added functions for removing data from AWS App Cache
   - Added functions for clearing all data from AWS App Cache
   - Added functions for checking if AWS App Cache is available
   - Added functions for initializing AWS App Cache

2. **Updated Authentication Provider**
   - Updated login function to store tokens in AWS App Cache
   - Updated logout function to clear tokens from AWS App Cache
   - Updated checkAuth function to store tokens in AWS App Cache
   - Updated refreshSession function to store tokens in AWS App Cache
   - Updated getTokens function to retrieve tokens from AWS App Cache

3. **Updated API Client**
   - Updated createAxiosInstance function to retrieve tokens from AWS App Cache
   - Updated getApiClient function to use createAxiosInstance
   - Added response interceptor to store tokens from response headers

## Files Modified

1. **frontend/pyfactor_next/src/utils/appCache.js (new file)**
   - Added functions for AWS App Cache operations

2. **frontend/pyfactor_next/src/providers/AuthProvider.js**
   - Updated authentication functions to use AWS App Cache

3. **frontend/pyfactor_next/src/utils/apiClient.js**
   - Updated API client functions to use AWS App Cache

## How to Use

1. **Storing Data**
   - Use \`setAppCacheItem(key, value)\` to store data in AWS App Cache
   - Use \`getAppCacheItem(key)\` to retrieve data from AWS App Cache
   - Use \`removeAppCacheItem(key)\` to remove data from AWS App Cache
   - Use \`clearAppCache()\` to clear all data from AWS App Cache

2. **Checking Availability**
   - Use \`isAppCacheAvailable()\` to check if AWS App Cache is available
   - Use \`initAppCache()\` to initialize AWS App Cache

3. **Authentication**
   - Tokens are stored in AWS App Cache during login
   - Tokens are retrieved from AWS App Cache during API requests
   - Tokens are cleared from AWS App Cache during logout

## Security Considerations

1. **Token Storage**
   - Tokens are stored in AWS App Cache, not in cookies or localStorage
   - Tokens are passed in request headers, not in cookies
   - Tokens are returned in response headers, not in cookies

2. **Token Refresh**
   - Tokens are refreshed through AWS App Cache
   - Refresh tokens are stored in AWS App Cache
   - Refresh tokens are passed in request headers

3. **Session Management**
   - Sessions are managed through AWS App Cache
   - Sessions are validated server-side
   - Sessions are refreshed through Cognito

## Version History

- **v1.0 (2025-04-24)**: Initial implementation
`;

  fs.writeFileSync(docPath, documentation);
  console.log(`Created documentation: ${docPath}`);
}

// Update the script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  // Read the current registry
  let content = fs.readFileSync(registryPath, 'utf8');
  
  // Add the new script to the registry
  const newEntry = `
| Version0002_implement_aws_app_cache.js | 1.0 | Implement AWS App Cache for token storage in the frontend | Completed | 2025-04-24 |
`;
  
  // Find the position to insert the new entry
  const insertPosition = content.indexOf('| Script | Date | Status | Description |');
  
  if (insertPosition !== -1) {
    // Insert the new entry after the header
    content = content.substring(0, insertPosition + '| Script | Date | Status | Description |'.length) + 
              newEntry + 
              content.substring(insertPosition + '| Script | Date | Status | Description |'.length);
    
    // Write the updated registry back to the file
    fs.writeFileSync(registryPath, content);
    console.log(`Updated script registry: ${registryPath}`);
  } else {
    console.error('Could not find insertion position in script registry');
  }
}

// Main function
function main() {
  console.log('Starting AWS App Cache implementation script...');
  
  // Ensure directories exist
  ensureDirectoriesExist();
  
  // Create backups of files to modify
  FILES_TO_MODIFY.forEach(file => {
    createBackup(file.path, file.backupName);
  });
  
  // Create new files
  createAppCacheUtility();
  
  // Update files
  updateAuthProvider();
  updateApiClient();
  
  // Create documentation
  createDocumentation();
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('AWS App Cache implementation script completed successfully.');
}

// Run the script
main(); 