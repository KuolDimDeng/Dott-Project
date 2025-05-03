/**
 * Version0004_fix_appCache_json_parse.js
 * 
 * Description: Fixes JSON.parse errors in the appCache utility
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-29
 * 
 * This script addresses the issue where the appCache utility is encountering
 * JSON.parse errors when retrieving invalid or corrupted cache data. The error
 * appears as "JSON.parse: unexpected character at line 1 column 1 of the JSON data"
 * in the browser console.
 * 
 * The fix:
 * 1. Adds proper error handling around the JSON.parse call
 * 2. Implements cache data validation
 * 3. Adds a cache cleanup function to remove corrupted entries
 * 4. Ensures backward compatibility with existing code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const SCRIPT_VERSION = '0004';
const TARGET_FILE_PATH = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'utils', 'appCache.js');
const BACKUP_DIR = path.join(__dirname, 'backups');

console.log(`Running AppCache JSON Parse Fix Script v${SCRIPT_VERSION}`);
console.log(`Target file: ${TARGET_FILE_PATH}`);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.log(`Creating backup directory: ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create backup with timestamp
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log(`Backup created at: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    return false;
  }
}

// Read the target file
function readTargetFile() {
  try {
    return fs.readFileSync(TARGET_FILE_PATH, 'utf8');
  } catch (error) {
    console.error(`Error reading target file: ${error.message}`);
    return null;
  }
}

// Fix the JSON parse issue in getCacheValue function
function fixJsonParseIssue(content) {
  if (!content) return null;
  
  // Find the exact section with the JSON.parse in getCacheValue function
  const jsonParseRegex = /(const item = window\.sessionStorage\.getItem\(key\);[\r\n\s]+if \(!item\) return null;[\r\n\s]+)(\s*const \{ value, timestamp, ttl \} = JSON\.parse\(item\);)/;
  
  // Create the fixed implementation with proper error handling
  const fixedImplementation = 
`$1        // Handle potential JSON parse errors
        try {
            const parsed = JSON.parse(item);
            
            // Validate that the parsed item has the expected structure
            if (typeof parsed !== 'object' || parsed === null) {
                logger.warn(\`[appCache] Invalid cache entry format for key: \${key}, removing it\`);
                window.sessionStorage.removeItem(key);
                return null;
            }
            
            const { value, timestamp, ttl } = parsed;`;
  
  // Replace the code
  let updatedContent = content.replace(jsonParseRegex, fixedImplementation);
  
  // Now find the matching closing curly brace and add the catch block
  const ttlCheckRegex = /(\/\/ Check if item has expired[\r\n\s]+if \(ttl && Date\.now\(\) - timestamp > ttl\) {[\r\n\s]+window\.sessionStorage\.removeItem\(key\);[\r\n\s]+logger\.debug\(`\[appCache\] Removed expired value for key: \${key}`\);[\r\n\s]+return null;[\r\n\s]+})/;
  
  const updatedTtlCheck = 
`$1
        } catch (error) {
            logger.warn(\`[appCache] Error parsing cache entry for key: \${key}, removing corrupted entry\`, error);
            window.sessionStorage.removeItem(key);
            return null;
        }`;
  
  updatedContent = updatedContent.replace(ttlCheckRegex, updatedTtlCheck);
  
  // Check if the replacement worked
  if (updatedContent === content) {
    console.error('Failed to match the JSON.parse code pattern');
    return null;
  }
  
  return updatedContent;
}

// Add a new function to clean up corrupted cache entries
function addCleanupFunction(content) {
  if (!content) return null;
  
  // Find the export default section
  const exportDefaultRegex = /(export default {[\r\n\s]+setCacheValue,[\r\n\s]+getCacheValue,[\r\n\s]+removeCacheValue,[\r\n\s]+clearCache,[\r\n\s]+setAppCacheItem,[\r\n\s]+getAppCacheItem,[\r\n\s]+removeAppCacheItem,[\r\n\s]+clearAppCache[\r\n\s]+};)/;
  
  // Add our new function before the export default
  const cleanupFunction = `
/**
 * Cleans up potentially corrupted cache entries
 * @param {boolean} [removeAll=false] - Whether to remove all cache entries or just validate them
 * @returns {Promise<number>} - Number of entries cleaned up
 */
export async function cleanupCacheEntries(removeAll = false) {
  try {
    if (!removeAll && !getCacheValue) {
      logger.warn('[appCache] getCacheValue function not available, skipping cleanup');
      return 0;
    }

    let cleanedCount = 0;

    if (appCache) {
      // AWS App Cache doesn't need cleanup as it handles serialization internally
      logger.debug('[appCache] Using AWS App Cache, no cleanup needed');
      return 0;
    } else {
      // Fallback to sessionStorage in development
      if (typeof window === 'undefined') return 0;

      // Get all keys in sessionStorage
      const keys = Object.keys(window.sessionStorage);
      logger.debug(\`[appCache] Checking \${keys.length} sessionStorage items for corruption\`);

      for (const key of keys) {
        if (removeAll) {
          window.sessionStorage.removeItem(key);
          cleanedCount++;
          continue;
        }

        // Attempt to parse each entry to find corrupted ones
        const item = window.sessionStorage.getItem(key);
        if (!item) continue;

        try {
          const parsed = JSON.parse(item);

          // Validate the expected structure
          if (typeof parsed !== 'object' || parsed === null || 
              !('timestamp' in parsed) || typeof parsed.timestamp !== 'number') {
            // Invalid format, remove it
            logger.warn(\`[appCache] Invalid cache format for key: \${key}, removing it\`);
            window.sessionStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // JSON parse error, remove the corrupted entry
          logger.warn(\`[appCache] Corrupted cache entry for key: \${key}, removing it\`);
          window.sessionStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }

    logger.info(\`[appCache] Cleanup completed: \${cleanedCount} entries removed\`);
    return cleanedCount;
  } catch (error) {
    logger.error('[appCache] Error during cache cleanup:', error);
    return 0;
  }
}

$1`;
  
  // Replace the export default section
  const updatedContent = content.replace(exportDefaultRegex, cleanupFunction);
  
  // Update the export default to include our new function
  const updatedDefaultExport = updatedContent.replace(
    'export default {',
    'export default {\n  cleanupCacheEntries,'
  );
  
  // Check if the replacement worked
  if (updatedDefaultExport === content) {
    console.error('Failed to add cleanup function or update export default');
    return null;
  }
  
  return updatedDefaultExport;
}

// Write the updated content back to the file
function writeTargetFile(content) {
  if (!content) return false;
  
  try {
    fs.writeFileSync(TARGET_FILE_PATH, content);
    console.log('Target file updated successfully');
    return true;
  } catch (error) {
    console.error(`Error writing target file: ${error.message}`);
    return false;
  }
}

// Create a script to automatically run the cleanup operation on application load
function createCleanupHelperScript() {
  const cleanupScriptPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'public', 'scripts', 'appCache-cleanup.js');
  const cleanupScriptContent = `/**
 * appCache-cleanup.js
 * 
 * This script automatically cleans up corrupted appCache entries when the application loads.
 * It's designed to be included in the application's HTML to prevent JSON.parse errors.
 */

(function() {
  console.log('[AppCache Cleanup] Script loaded, will clean corrupted cache entries');
  
  // Function to clean up cache entries on page load
  function cleanupCorruptedEntries() {
    try {
      let cleanedCount = 0;
      
      // Get all keys in sessionStorage
      const keys = Object.keys(sessionStorage);
      
      for (const key of keys) {
        // Attempt to parse each entry to find corrupted ones
        const item = sessionStorage.getItem(key);
        if (!item) continue;
        
        try {
          const parsed = JSON.parse(item);
          
          // Validate the expected structure
          if (typeof parsed !== 'object' || parsed === null || 
              !('timestamp' in parsed) || typeof parsed.timestamp !== 'number') {
            // Invalid format, remove it
            console.log(\`[AppCache Cleanup] Removing invalid entry for key: \${key}\`);
            sessionStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // JSON parse error, remove the corrupted entry
          console.log(\`[AppCache Cleanup] Removing corrupted entry for key: \${key}\`);
          sessionStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(\`[AppCache Cleanup] Removed \${cleanedCount} corrupted entries\`);
      } else {
        console.log('[AppCache Cleanup] No corrupted entries found');
      }
    } catch (error) {
      console.error('[AppCache Cleanup] Error during cleanup:', error);
    }
  }
  
  // Run cleanup immediately
  cleanupCorruptedEntries();
  
  // Also handle unhandled promise rejections related to JSON parse errors
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && 
        (event.reason.message && event.reason.message.includes('JSON.parse') || 
         event.reason.toString().includes('JSON.parse'))) {
      console.warn('[AppCache Cleanup] Detected unhandled JSON.parse error, cleaning cache');
      cleanupCorruptedEntries();
    }
  });
})();`;

  try {
    // Ensure the public scripts directory exists
    const publicScriptsDir = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'public', 'scripts');
    if (!fs.existsSync(publicScriptsDir)) {
      fs.mkdirSync(publicScriptsDir, { recursive: true });
    }
    
    // Write the cleanup script
    fs.writeFileSync(cleanupScriptPath, cleanupScriptContent);
    console.log(`Cleanup helper script created at: ${cleanupScriptPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating cleanup helper script: ${error.message}`);
    return false;
  }
}

// Add the cleanup script to the dashboard page
function addCleanupScriptToDashboard() {
  const dashboardPath = path.join(__dirname, '..', 'src', 'app', '[tenantId]', 'dashboard', 'page.js');
  
  // Check if the dashboard page exists - if not, try the alternative path
  if (!fs.existsSync(dashboardPath)) {
    console.log('Dashboard page not found at expected path, trying alternative location');
    const altDashboardPath = path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'tenant', '[tenantId]', 'dashboard', 'page.js');
    
    if (fs.existsSync(altDashboardPath)) {
      console.log(`Found dashboard page at: ${altDashboardPath}`);
      return injectCleanupScript(altDashboardPath);
    } else {
      console.error('Could not find dashboard page at any expected location');
      return false;
    }
  }
  
  return injectCleanupScript(dashboardPath);
}

// Inject the cleanup script into a dashboard page
function injectCleanupScript(dashboardPath) {
  try {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    
    // Create a backup
    const fileName = path.basename(dashboardPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
    fs.writeFileSync(backupPath, content);
    console.log(`Backup of dashboard page created at: ${backupPath}`);
    
    // Check if our script is already injected
    if (content.includes('appCache-cleanup.js')) {
      console.log('Cleanup script already injected into dashboard page, skipping');
      return true;
    }
    
    // Find a good injection point - right after the MiddlewareHeaderHandler component
    const injectionPoint = content.indexOf('<MiddlewareHeaderHandler');
    if (injectionPoint === -1) {
      console.error('Could not find injection point in dashboard page');
      return false;
    }
    
    // Find the end of the MiddlewareHeaderHandler tag
    let endOfTag = content.indexOf('/>', injectionPoint);
    if (endOfTag === -1) {
      endOfTag = content.indexOf('>', injectionPoint);
      if (endOfTag === -1) {
        console.error('Could not find end of MiddlewareHeaderHandler tag');
        return false;
      }
    } else {
      endOfTag += 2; // Include the '/>' characters
    }
    
    // Create the script tag
    const scriptTag = `\n        {/* AppCache Cleanup Script */}
        <script 
          src="/scripts/appCache-cleanup.js"
          defer
          id="appCache-cleanup-script"
        />`;
    
    // Insert the script tag
    const updatedContent = 
      content.substring(0, endOfTag) + 
      scriptTag + 
      content.substring(endOfTag);
    
    // Write the updated content
    fs.writeFileSync(dashboardPath, updatedContent);
    console.log('Successfully injected cleanup script into dashboard page');
    return true;
  } catch (error) {
    console.error(`Error injecting cleanup script: ${error.message}`);
    return false;
  }
}

// Update the script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.json');
  
  try {
    if (fs.existsSync(registryPath)) {
      const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      
      // Add our script to the frontend scripts array
      if (!registryData.frontend_scripts) {
        registryData.frontend_scripts = [];
      }
      
      // Check if script already exists
      const existingScriptIndex = registryData.frontend_scripts.findIndex(
        script => script.name === `Version${SCRIPT_VERSION}_fix_appCache_json_parse.js`
      );
      
      const scriptEntry = {
        id: `F00${Number(SCRIPT_VERSION) + 6}`, // Assuming we're continuing from F0009
        name: `Version${SCRIPT_VERSION}_fix_appCache_json_parse.js`,
        version: "1.0",
        description: "Fixes JSON.parse errors in the appCache utility",
        author: "System Administrator",
        date_created: new Date().toISOString().split('T')[0],
        status: "Executed",
        execution_date: new Date().toISOString(),
        target_files: [
          "frontend/pyfactor_next/src/utils/appCache.js"
        ],
        dependencies: [],
        backup_created: true
      };
      
      if (existingScriptIndex >= 0) {
        registryData.frontend_scripts[existingScriptIndex] = scriptEntry;
      } else {
        registryData.frontend_scripts.push(scriptEntry);
      }
      
      // Save the updated registry
      fs.writeFileSync(registryPath, JSON.stringify(registryData, null, 2));
      console.log('Script registry updated successfully');
    } else {
      console.log('Script registry not found, skipping update');
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating script registry: ${error.message}`);
    return false;
  }
}

// Main execution flow
(async function() {
  try {
    // Create backup
    if (!createBackup(TARGET_FILE_PATH)) {
      console.error('Aborting due to backup failure');
      process.exit(1);
    }
    
    // Read target file
    const content = readTargetFile();
    if (!content) {
      console.error('Aborting due to file read failure');
      process.exit(1);
    }
    
    // Fix JSON parse issue
    const updatedWithJsonParseFix = fixJsonParseIssue(content);
    if (!updatedWithJsonParseFix) {
      console.error('Aborting due to JSON parse fix failure');
      process.exit(1);
    }
    
    // Add cleanup function
    const fullyUpdatedContent = addCleanupFunction(updatedWithJsonParseFix);
    if (!fullyUpdatedContent) {
      console.error('Aborting due to cleanup function addition failure');
      process.exit(1);
    }
    
    // Write updated content
    if (!writeTargetFile(fullyUpdatedContent)) {
      console.error('Aborting due to file write failure');
      process.exit(1);
    }
    
    // Create cleanup helper script
    if (!createCleanupHelperScript()) {
      console.warn('Failed to create cleanup helper script, continuing anyway');
    }
    
    // Add cleanup script to dashboard page
    addCleanupScriptToDashboard();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('AppCache JSON parse fix successfully applied');
    process.exit(0);
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})(); 