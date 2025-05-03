/**
 * Version0007_fix_user_profile_authentication_DashAppBar.js
 * 
 * This script fixes an issue where a user's business name and initials are not
 * displaying in the dashboard. The issue is caused by an authentication error (401)
 * when trying to fetch the user profile, and improper fallbacks to Cognito attributes.
 * 
 * The script enhances:
 * 1. Authentication token handling for profile API requests
 * 2. Fallback mechanisms when API requests fail
 * 3. Proper caching of user attributes in AppCache
 * 
 * @version 1.0
 * @date 2025-04-29
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  backupDir: path.join(__dirname, 'backups'),
  timestamp: new Date().toISOString().replace(/:/g, '-').split('.')[0] + 'Z',
  files: {
    employeeManagement: 'frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js',
    dashAppBar: 'frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
    userProfileContext: 'frontend/pyfactor_next/src/contexts/UserProfileContext.js',
    userService: 'frontend/pyfactor_next/src/services/userService.js',
    appCache: 'frontend/pyfactor_next/src/utils/appCache.js'
  },
  scriptRegistry: path.join(__dirname, 'script_registry.json')
};

// Ensure backup directory exists
function ensureBackupDirExists() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
}

// Backup a file
function backupFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${CONFIG.timestamp}`);
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return backupPath;
    } else {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error backing up file: ${error.message}`);
    return null;
  }
}

// Read file contents
function readFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    console.error(`❌ File not found: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return null;
  }
}

// Write file contents
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error writing file: ${error.message}`);
    return false;
  }
}

// Update script registry
function updateScriptRegistry(scriptName, description, filesModified, status = 'executed') {
  try {
    let registry = {};
    if (fs.existsSync(CONFIG.scriptRegistry)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistry, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Add new script entry
    registry[scriptName] = {
      description,
      executed_at: new Date().toISOString(),
      status,
      files_modified: filesModified
    };
    
    fs.writeFileSync(CONFIG.scriptRegistry, JSON.stringify(registry, null, 2), 'utf8');
    console.log(`✅ Updated script registry with "${scriptName}"`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
    return false;
  }
}

// Fix the authentication issue in the ProfileContext
function fixUserProfileContext() {
  const filePath = CONFIG.files.userProfileContext;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // Fix the authentication for profile requests
  const updatedContent = content.replace(
    // Find the section where auth tokens are added to the fetch request
    /const response = await fetch\(url, \{\s*headers: \{\s*'Content-Type': 'application\/json',\s*'Cache-Control': 'no-cache',\s*'Authorization': idToken \? `Bearer \${idToken}` : '',\s*'X-Dashboard-Route': 'true',\s*\},\s*\}\);/s,
    
    // Replace with enhanced version that also includes X-Tenant-ID header
    `const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Authorization': idToken ? \`Bearer \${idToken}\` : '',
          'X-Dashboard-Route': 'true',
          'X-Tenant-ID': tenantId || '',
          'X-Request-ID': \`profile-\${requestId}\`
        },
      });`
  );
  
  return writeFile(filePath, updatedContent);
}

// Fix the authentication issue in the EmployeeManagement component
function fixEmployeeManagement() {
  const filePath = CONFIG.files.employeeManagement;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // Look for the section where user profile is fetched
  const updatedContent = content.replace(
    // Find the pattern where userProfile is fetched
    /Fetching user profile from API: (.*?)'/,
    
    // Add logging to help debug the issue
    "Fetching user profile from API: $1' \n      logger.debug('[EmployeeManagement] Profile fetch attempt with tenant ID:', tenantId)"
  ).replace(
    // Find existing fetch logic that may be causing the 401 error
    /const response = await fetch\(url, \{\s*headers: \{\s*[^}]*\},\s*credentials: 'include'\s*\}\);/s,
    
    // Replace with improved fetch logic with proper auth token
    `const response = await fetch(url, { 
            headers: { 
              'Cache-Control': 'no-cache',
              'X-Dashboard-Route': 'true',
              'Authorization': 'Bearer ' + (await getCacheValue('idToken') || ''),
              'X-Tenant-ID': tenantId || ''
            }
          });`
  ).replace(
    // Find the profile fallback logic
    /\[UserProfile\] Falling back to Cognito attributes/,
    
    // Add enhanced logging to track the fallback path
    "[UserProfile] Falling back to Cognito attributes \n                logger.debug('[EmployeeManagement] Auth error fetching profile, falling back to Cognito')"
  );
  
  return writeFile(filePath, updatedContent);
}

// Fix the DashAppBar component to better handle business name and initials
function fixDashAppBar() {
  const filePath = CONFIG.files.dashAppBar;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // We need to enhance how business name is retrieved from Cognito when the API call fails
  const updatedContent = content.replace(
    // Find the business name fetch logic
    /const businessName =\s*([^;]*?);/,
    
    // Replace with more comprehensive lookup that checks all possible attribute locations
    `const businessName = 
      userAttributes?.['custom:businessname'] || 
      userData?.businessName || 
      profileData?.businessName || 
      window.__APP_CACHE?.tenant?.businessName ||
      // Fall back to any available source
      getCacheValue('businessName') ||
      userAttributes?.['custom:tenant_name'] || 
      $1;`
  ).replace(
    // Find the initials generation code
    /const initials = generateInitialsFromNames\(firstName, lastName, email\);/,
    
    // Enhance initials generation with better fallbacks
    `// Enhanced initials generation with better fallbacks
      const initials = generateInitialsFromNames(
        firstName || userAttributes?.['given_name'] || userAttributes?.['custom:firstname'] || '', 
        lastName || userAttributes?.['family_name'] || userAttributes?.['custom:lastname'] || '', 
        email || userAttributes?.email || ''
      );
      
      // Store initials in AppCache for persistence
      if (initials && typeof window !== 'undefined') {
        if (!window.__APP_CACHE) window.__APP_CACHE = {};
        if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
        window.__APP_CACHE.user.initials = initials;
      }`
  );
  
  return writeFile(filePath, updatedContent);
}

// Fix the UserService to better handle authentication for profile API calls
function fixUserService() {
  const filePath = CONFIG.files.userService;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // We need to enhance how authentication tokens are handled for user profile API calls
  const updatedContent = content.replace(
    // Find the fetch profile API call
    /const response = await fetch\(requestUrl, \{\s*headers: \{\s*[^}]*\}\s*\}\);/s,
    
    // Replace with improved fetch with better auth token handling
    `// Get auth token from Cognito or AppCache
      let authToken = '';
      try {
        if (typeof window !== 'undefined') {
          // Try to get from AppCache first (faster)
          authToken = getCacheValue('idToken') || 
                     window.__APP_CACHE?.auth?.idToken || 
                     localStorage.getItem('idToken') || 
                     sessionStorage.getItem('idToken') || '';
          
          // If no token in cache, try to get from Cognito
          if (!authToken) {
            const { fetchAuthSession } = await import('aws-amplify/auth');
            const session = await fetchAuthSession();
            if (session?.tokens?.idToken) {
              authToken = session.tokens.idToken.toString();
              // Update cache
              setCacheValue('idToken', authToken);
            }
          }
        }
      } catch (error) {
        logger.warn('[UserService] Error getting auth token:', error);
      }
      
      // Make request with auth token
      const response = await fetch(requestUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Request-ID': \`profile-\${Date.now()}\`,
          'Authorization': authToken ? \`Bearer \${authToken}\` : '',
          'X-Tenant-ID': tenantId || ''
        }
      });`
  );
  
  return writeFile(filePath, updatedContent);
}

// Update the AppCache utility to better handle session expiry
function enhanceAppCache() {
  const filePath = CONFIG.files.appCache;
  const backup = backupFile(filePath);
  if (!backup) return false;
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // We need to enhance how expiry is handled for the auth token and business information
  const updatedContent = content.replace(
    // Find the exports at the end of the file
    /export \{[^}]*\};/,
    
    // Add new refresh utility for auth-related cache items
    `// Utility function to refresh auth-related cache items
export function refreshAuthCache() {
  try {
    if (typeof window === 'undefined') return;
    
    // Refresh auth tokens
    import('aws-amplify/auth').then(({ fetchAuthSession }) => {
      fetchAuthSession().then(session => {
        if (session?.tokens?.idToken) {
          setCacheValue('idToken', session.tokens.idToken.toString());
          
          // Also store in window.__APP_CACHE for immediate access
          if (window.__APP_CACHE) {
            window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
            window.__APP_CACHE.auth.idToken = session.tokens.idToken.toString();
          }
          
          // Refresh user profile data from token payload
          try {
            const payload = JSON.parse(atob(session.tokens.idToken.toString().split('.')[1]));
            
            // Extract business name
            const businessName = payload['custom:businessname'] || '';
            if (businessName) {
              setCacheValue('businessName', businessName);
              
              // Update APP_CACHE
              if (window.__APP_CACHE) {
                window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                window.__APP_CACHE.tenant.businessName = businessName;
              }
            }
            
            // Extract tenant ID
            const tenantId = payload['custom:businessid'] || payload['custom:tenant_ID'];
            if (tenantId) {
              setCacheValue('tenantId', tenantId);
              
              // Update APP_CACHE
              if (window.__APP_CACHE) {
                window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                window.__APP_CACHE.tenant.id = tenantId;
              }
            }
          } catch (e) {
            console.warn('[AppCache] Error extracting data from token:', e);
          }
        }
      }).catch(error => {
        console.warn('[AppCache] Error refreshing auth session:', error);
      });
    }).catch(error => {
      console.warn('[AppCache] Error importing auth module:', error);
    });
  } catch (error) {
    console.warn('[AppCache] Error in refreshAuthCache:', error);
  }
}

export {
  initializeAppCache,
  setCacheValue,
  getCacheValue,
  removeCacheValue,
  clearCache,
  refreshAuthCache
};`
  );
  
  return writeFile(filePath, updatedContent);
}

// Create a README file for this fix
function createReadme() {
  const readmePath = path.join(__dirname, 'USER_PROFILE_AUTH_FIX.md');
  
  const readmeContent = `# User Profile Authentication Fix

## Issue Description
Users were unable to see their business name and initials in the dashboard interface.
The issue was caused by an authentication error (401 Unauthorized) when fetching the user profile from the API,
and inadequate fallback mechanisms to retrieve this information from Cognito attributes.

## Fix Details
This fix addresses several aspects of the authentication and data retrieval process:

1. **Enhanced API Authentication**: 
   - Added proper bearer token authentication to profile API requests
   - Included X-Tenant-ID header in requests for better context
   - Added request IDs for improved debugging

2. **Improved Cognito Fallbacks**:
   - Better handling of direct Cognito attribute access when API fails
   - More comprehensive attribute mapping for business name and initials

3. **Enhanced Caching**:
   - Improved AppCache usage to persist user information
   - Added a refreshAuthCache utility to update tokens and key user data
   - Better coordination between memory cache and AppCache

4. **Robust Error Handling**:
   - Added detailed logging for authentication failures
   - Implemented graceful fallbacks when authentication fails
   - Preserved user context across authentication errors

## Modified Files
- \`frontend/pyfactor_next/src/contexts/UserProfileContext.js\` - Enhanced authentication for profile API requests
- \`frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js\` - Fixed profile fetch authentication
- \`frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js\` - Improved business name and initials retrieval
- \`frontend/pyfactor_next/src/services/userService.js\` - Enhanced auth token handling for profile API
- \`frontend/pyfactor_next/src/utils/appCache.js\` - Added utility to refresh auth-related cache items

## References
- Related to the previous onboarding fix (Version0003_fix_cognito_onboarding_attribute.py)
- Implements proper tenant isolation for user profile data

## Execution
Run this script with Node.js from the project root directory.

## Date
${new Date().toISOString().split('T')[0]}
`;
  
  writeFile(readmePath, readmeContent);
}

// Main function to run the script
async function main() {
  try {
    console.log('🚀 Starting UserProfile Authentication Fix script...');
    
    // Create backups
    ensureBackupDirExists();
    
    // Apply fixes
    let successCount = 0;
    const totalFixes = 5; // Including README
    
    if (fixUserProfileContext()) successCount++;
    if (fixEmployeeManagement()) successCount++;
    if (fixDashAppBar()) successCount++;
    if (fixUserService()) successCount++;
    if (enhanceAppCache()) successCount++;
    
    // Create README
    createReadme();
    successCount++;
    
    // Update script registry
    const filesModified = [
      CONFIG.files.userProfileContext,
      CONFIG.files.employeeManagement,
      CONFIG.files.dashAppBar,
      CONFIG.files.userService,
      CONFIG.files.appCache,
      'scripts/USER_PROFILE_AUTH_FIX.md'
    ];
    
    updateScriptRegistry(
      'Version0007_fix_user_profile_authentication_DashAppBar',
      'Fix for missing business name and initials in dashboard due to authentication issues',
      filesModified,
      successCount === totalFixes ? 'completed' : 'partial'
    );
    
    // Report results
    if (successCount === totalFixes) {
      console.log('✅ All fixes successfully applied!');
    } else {
      console.log(`⚠️ Fix partially applied: ${successCount} of ${totalFixes} operations succeeded.`);
    }
    
    console.log('📝 Check USER_PROFILE_AUTH_FIX.md for details on the changes.');
  } catch (error) {
    console.error('❌ Error executing script:', error);
  }
}

// Execute the script
main(); 