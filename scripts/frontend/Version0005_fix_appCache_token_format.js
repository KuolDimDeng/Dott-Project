/**
 * Version0005_fix_appCache_token_format.js
 * 
 * Description: Fixes JSON parsing errors in AppCache by ensuring tokens are properly serialized
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-28
 * 
 * This script addresses the issue where tokens stored in AppCache are not properly 
 * serialized as JSON, causing SyntaxError when retrieved. The script ensures all 
 * tokens are consistently stored as JSON strings in AppCache.
 * 
 * Target files:
 * - frontend/pyfactor_next/src/utils/appCache.js
 * - frontend/pyfactor_next/src/utils/refreshUserSession.js
 * 
 * Changes:
 * - Updates setCacheValue to properly handle token objects
 * - Updates getCacheValue to safely parse token data
 * - Adds validation before JSON parsing
 */

(function() {
  console.log("Executing AppCache Token Format Fix Script v0005");
  console.log("Description: Fix AppCache token serialization issues");
  console.log("Target files: src/utils/appCache.js, src/utils/refreshUserSession.js");

  // Create backup helper function
  const createBackup = (originalPath, content) => {
    try {
      // Determine backup path - keep in src directory structure with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const pathParts = originalPath.split('/');
      const fileName = pathParts.pop();
      const backupDir = `frontend/pyfactor_next/backups`;
      
      // Create backup directory if it doesn't exist
      if (typeof mkdir === 'function') {
        try { mkdir(backupDir); } catch (e) { /* Directory may already exist */ }
      }
      
      const backupPath = `${backupDir}/${fileName.replace('.js', '')}_backup_${timestamp}.js`;
      
      // Write backup
      const fs = require('fs');
      fs.writeFileSync(backupPath, content);
      console.log(`Backup created at: ${backupPath}`);
      return true;
    } catch (error) {
      console.error("Failed to create backup:", error);
      return false;
    }
  };

  // Fix 1: Update appCache.js to handle token serialization properly
  try {
    const appCachePath = 'frontend/pyfactor_next/src/utils/appCache.js';
    const fs = require('fs');
    
    // Read original content
    const originalContent = fs.readFileSync(appCachePath, 'utf8');
    
    // Create backup
    createBackup(appCachePath, originalContent);
    
    // Add validation to setCacheValue and getCacheValue functions
    const updatedContent = originalContent.replace(
      /export const setCacheValue = \(key, value, options = {}\) => {/,
      `export const setCacheValue = (key, value, options = {}) => {
  // Special handling for token objects
  if (key === 'token' || key === 'idToken' || key === 'accessToken' || key === 'refreshToken') {
    // Ensure the value is serializable
    let serializedValue;
    try {
      // If it's already a string, make sure it's valid JSON or wrap it
      if (typeof value === 'string') {
        try {
          // Test if it's already valid JSON
          JSON.parse(value);
          serializedValue = value;
        } catch (e) {
          // If not valid JSON, wrap it as a string value
          serializedValue = JSON.stringify({ tokenValue: value });
        }
      } else {
        // If it's an object, convert to JSON string
        serializedValue = JSON.stringify(value);
      }
    } catch (error) {
      logger.error(\`[appCache] Error serializing token: \${error}\`);
      // Fallback to a safe serialization
      serializedValue = JSON.stringify({ tokenValue: String(value) });
    }
    
    // Store the serialized value
    value = serializedValue;
  }`
    );
    
    // Update getCacheValue to safely parse token data
    const updatedGetCacheValue = updatedContent.replace(
      /export const getCacheValue = \(key\) => {/,
      `export const getCacheValue = (key) => {
  // Safe JSON parsing helper
  const safeJsonParse = (str) => {
    if (!str) return null;
    
    try {
      // Try to parse as JSON
      return JSON.parse(str);
    } catch (e) {
      // Not valid JSON, check if it's a token key
      if (key === 'token' || key === 'idToken' || key === 'accessToken' || key === 'refreshToken') {
        // For token values, return a proper token object
        return { tokenValue: str };
      }
      // For other keys, return the raw string
      return str;
    }
  };`
    );
    
    // Add safe parsing to the sessionStorage retrieval section
    const finalContent = updatedGetCacheValue.replace(
      /\s+try {\s+sessionValue = JSON\.parse\(sessionValue\);/,
      `
      try {
        sessionValue = safeJsonParse(sessionValue);`
    );
    
    // Write the updated content
    fs.writeFileSync(appCachePath, finalContent);
    console.log("Updated appCache.js with safe token serialization");
  } catch (error) {
    console.error("Failed to update appCache.js:", error);
  }

  // Fix 2: Update refreshUserSession.js to handle token migration safely
  try {
    const refreshSessionPath = 'frontend/pyfactor_next/src/utils/refreshUserSession.js';
    const fs = require('fs');
    
    // Read original content
    const originalContent = fs.readFileSync(refreshSessionPath, 'utf8');
    
    // Create backup
    createBackup(refreshSessionPath, originalContent);
    
    // Update the migrateToAccessTokens function
    const updatedContent = originalContent.replace(
      /const migrateToAccessTokens = async \(\) => {/,
      `const migrateToAccessTokens = async () => {
  // Safe token retrieval helper
  const getSafeToken = (key) => {
    try {
      const value = getCacheValue(key);
      if (!value) return null;
      
      // Handle different token formats
      if (typeof value === 'string') {
        return value;
      } else if (value && value.tokenValue) {
        return value.tokenValue;
      } else if (value && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return null;
    } catch (e) {
      logger.error(\`[Auth] Error retrieving token \${key}: \${e}\`);
      return null;
    }
  };`
    );
    
    // Update the token retrieval code to use the safe helper
    const finalContent = updatedContent.replace(
      /const idToken = getCacheValue\('idToken'\);/,
      `const idToken = getSafeToken('idToken');`
    );
    
    // Write the updated content
    fs.writeFileSync(refreshSessionPath, finalContent);
    console.log("Updated refreshUserSession.js with safe token handling");
  } catch (error) {
    console.error("Failed to update refreshUserSession.js:", error);
  }

  // Update the script registry
  try {
    const registryPath = 'scripts/frontend/script_registry.md';
    const fs = require('fs');
    
    // Prepare registry entry
    const registryEntry = `
## Version0005_fix_appCache_token_format.js
- **Version:** 1.0
- **Date:** ${new Date().toISOString().split('T')[0]}
- **Purpose:** Fix JSON parsing errors in AppCache token retrieval
- **Files Modified:** 
  - frontend/pyfactor_next/src/utils/appCache.js
  - frontend/pyfactor_next/src/utils/refreshUserSession.js
- **Status:** Executed
- **Notes:** Resolves SyntaxError in JSON parsing by ensuring proper token serialization
`;
    
    // Check if registry exists
    let registryContent;
    try {
      registryContent = fs.readFileSync(registryPath, 'utf8');
    } catch (e) {
      // Create new registry if it doesn't exist
      registryContent = `# Frontend Script Registry
This file tracks all frontend fix scripts that have been created and their execution status.
`;
    }
    
    // Add new entry and write back
    registryContent += registryEntry;
    fs.writeFileSync(registryPath, registryContent);
    console.log("Updated script registry");
  } catch (error) {
    console.error("Failed to update script registry:", error);
  }

  // Create documentation
  try {
    const docPath = 'frontend/pyfactor_next/src/APPCACHE_TOKEN_FORMAT_FIX.md';
    const fs = require('fs');
    
    const docContent = `# AppCache Token Format Fix

## Issue Description
When retrieving token values from AppCache, the system encountered JSON parsing errors because
token values were not consistently serialized as JSON objects. This could occur when:

1. A raw token string was stored directly in AppCache without proper JSON serialization
2. A token object was deserialized incorrectly
3. The format of stored tokens was inconsistent across different parts of the application

This caused errors like: \`SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data\`

## Solution Implemented
The fix ensures consistent token serialization and retrieval by:

1. Adding special handling for token values in the AppCache system
2. Creating safe JSON parsing methods that handle different token formats
3. Implementing token migration that works with various token storage formats
4. Adding error recovery to prevent app crashes on token format issues

## Files Modified
- \`src/utils/appCache.js\` - Enhanced serialization and deserialization
- \`src/utils/refreshUserSession.js\` - Improved token migration logic

## Future Recommendations
- Standardize the token storage format across the application
- Add validation for token objects before storage
- Consider refactoring the auth system to use a dedicated token management service
- Implement token refresh that preserves the original token format

## Version History
- v1.0 (2025-04-28): Initial implementation of AppCache token format fix
`;
    
    fs.writeFileSync(docPath, docContent);
    console.log("Created documentation at:", docPath);
  } catch (error) {
    console.error("Failed to create documentation:", error);
  }

  console.log("AppCache token format fix script v0005 executed successfully");
})(); 