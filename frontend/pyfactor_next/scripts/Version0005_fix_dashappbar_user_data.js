/**
 * Version0005_fix_dashappbar_user_data.js
 * 
 * Description: Fixes DashAppBar component's issues with retrieving business name and user initials
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-29
 * 
 * This script addresses issues with the DashAppBar component not displaying business name or user initials
 * due to problems with retrieving data from appCache and Cognito user attributes. The fixes include:
 * 
 * 1. Add error handling in getUserAttributesFromCognito to handle JSON parse errors from appCache
 * 2. Improve resilience when retrieving business name from different sources
 * 3. Add fallback mechanisms to use URL parameters for business name if available
 * 4. Update cache key structures to be more robust against corruption
 * 5. Implement proper error handling for all user data sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const SCRIPT_VERSION = '0005';
const SCRIPT_NAME = `Version${SCRIPT_VERSION}_fix_dashappbar_user_data`;
const BACKUP_DIR = path.join(__dirname, 'backups');
const TARGET_FILES = {
  useSession: path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'hooks', 'useSession.js'),
  dashAppBar: path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'src', 'app', 'dashboard', 'components', 'DashAppBar.js')
};

// Logging function
function log(message) {
  console.log(`[${SCRIPT_NAME}] ${message}`);
}

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  log(`Creating backup directory: ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create a backup of a file
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    log(`Backup created at: ${backupPath}`);
    return true;
  } catch (error) {
    log(`Error creating backup: ${error.message}`);
    return false;
  }
}

// Read a file
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

// Write to a file
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    log(`File updated successfully: ${filePath}`);
    return true;
  } catch (error) {
    log(`Error writing file ${filePath}: ${error.message}`);
    return false;
  }
}

// Fix getUserAttributesFromCognito function in useSession.js
function fixUserSessionHook(content) {
  if (!content) return null;
  
  // Update getUserAttributesFromCognito function to handle appCache JSON parse errors
  const getUserAttributesFromCognitoRegex = 
    /(export const getUserAttributesFromCognito = async \(\) => {[\s\S]+?try {[\s\S]+?const cachedAttributes = getCacheValue\('user_attributes'\);[\s\S]+?if \(cachedAttributes\) {[\s\S]+?return cachedAttributes;[\s\S]+?}[\s\S]+?)(\/\/ If not in cache, fetch from Cognito[\s\S]+?const attributes = await fetchUserAttributes\(\);)/;
  
  const fixedGetUserAttributesFromCognito = 
    '$1// Validate cached attributes structure to prevent propagating corrupted data\n' +
    '    if (cachedAttributes && typeof cachedAttributes === "object") {\n' +
    '      // Make sure required properties are present to avoid app errors\n' +
    '      try {\n' +
    '        // It should be a valid object with expected properties like email\n' +
    '        // Additionally check that critical business attributes exist\n' +
    '        if (cachedAttributes["email"] || \n' +
    '            cachedAttributes["custom:businessname"] || \n' +
    '            cachedAttributes["custom:businessid"]) {\n' +
    '          // Valid attributes found in cache\n' +
    '          return cachedAttributes;\n' +
    '        } else {\n' +
    '          logger.warn("[useSession] Cached user attributes missing critical fields");\n' +
    '        }\n' +
    '      } catch (validationError) {\n' +
    '        logger.warn("[useSession] Error validating cached user attributes:", validationError);\n' +
    '        // Remove corrupted cache entry\n' +
    '        if (typeof window !== "undefined" && window.sessionStorage) {\n' +
    '          try {\n' +
    '            removeCacheValue("user_attributes");\n' +
    '          } catch (e) {\n' +
    '            logger.debug("[useSession] Failed to remove corrupted user_attributes cache");\n' +
    '          }\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '    \n' +
    '    $2';
  
  // Update the code to handle multiple potential cache keys
  const setCacheValueRegex = /(setCacheValue\('user_attributes', attributes, { ttl: 3600000 }\); \/\/ 1 hour)/;
  
  const improvedCacheHandling = 
    'try {\n' +
    '      // Store in multiple cache keys for resilience\n' +
    '      setCacheValue(\'user_attributes\', attributes, { ttl: 3600000 }); // 1 hour\n' +
    '      \n' +
    '      // Also cache with tenant-specific keys if tenant ID is available\n' +
    '      const tenantId = attributes["custom:businessid"] || attributes["custom:tenant_id"];\n' +
    '      if (tenantId) {\n' +
    '        setCacheValue(`user_attributes_${tenantId}`, attributes, { ttl: 3600000 });\n' +
    '      }\n' +
    '      \n' +
    '      // Store in APP_CACHE as well for cross-component usage\n' +
    '      if (typeof window !== "undefined") {\n' +
    '        if (!window.__APP_CACHE) window.__APP_CACHE = {};\n' +
    '        if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};\n' +
    '        window.__APP_CACHE.user.attributes = attributes;\n' +
    '        window.__APP_CACHE.user.timestamp = Date.now();\n' +
    '        \n' +
    '        // Also set business information in tenant cache\n' +
    '        if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};\n' +
    '        const businessName = attributes["custom:businessname"];\n' +
    '        if (businessName) {\n' +
    '          window.__APP_CACHE.tenant.businessName = businessName;\n' +
    '        }\n' +
    '      }\n' +
    '    } catch (cacheError) {\n' +
    '      logger.warn("[useSession] Error caching user attributes:", cacheError);\n' +
    '      // Continue anyway as we have the attributes already\n' +
    '    }';

  let updatedContent = content.replace(getUserAttributesFromCognitoRegex, fixedGetUserAttributesFromCognito);
  updatedContent = updatedContent.replace(setCacheValueRegex, improvedCacheHandling);

  return updatedContent;
}

// Fix DashAppBar component to improve business name and user initials retrieval
function fixDashAppBar(content) {
  if (!content) return null;
  
  // First, find the business name effect and improve it
  const businessNameEffectRegex = /(useEffect\(\) => {[\s\S]+?\/\/ Skip if we've already set it and there's no change in dependencies[\s\S]+?if \(hasSetBusinessNameRef\.current[\s\S]+?return;[\s\S]+?}[\s\S]+?\/\/ Update tracking refs[\s\S]+?prevPropsRef.current = {[\s\S]+?userAttributes: userAttributes \|\| null,[\s\S]+?userData: userData \|\| null,[\s\S]+?profileData: profileData \|\| null[\s\S]+?};[\s\S]+?\/\/ Set our tracking flag[\s\S]+?hasSetBusinessNameRef\.current = true;[\s\S]+?\/\/ Update business name from all potential sources)([\s\S]+?)(if \(newBusinessName && newBusinessName !== ''\) {)/;
  
  // Improved business name handling with URL params and better error handling
  const improvedBusinessNameEffect = 
    '$1\n' +
    '    // Check URL parameters for business name (useful during tenant switching)\n' +
    '    let urlBusinessName;\n' +
    '    if (typeof window !== "undefined") {\n' +
    '      const urlParams = new URLSearchParams(window.location.search);\n' +
    '      urlBusinessName = urlParams.get("tenantName");\n' +
    '      if (urlBusinessName) {\n' +
    '        try {\n' +
    '          // URL params might be URL encoded, try to decode them\n' +
    '          urlBusinessName = decodeURIComponent(urlBusinessName);\n' +
    '        } catch (e) {\n' +
    '          // Use as is if decoding fails\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '    \n' +
    '    // Try to get tenant ID for more specific caching\n' +
    '    let tenantId = userAttributes?.["custom:businessid"] || userAttributes?.["custom:tenant_id"] ||\n' +
    '                  userData?.businessId || userData?.tenantId;\n' +
    '                  \n' +
    '    // Also check URL for tenant ID if not found elsewhere\n' +
    '    if (!tenantId && typeof window !== "undefined") {\n' +
    '      const pathParts = window.location.pathname.split("/");\n' +
    '      // Look for a UUID pattern in the path\n' +
    '      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n' +
    '      const possibleTenantId = pathParts.find(part => uuidRegex.test(part));\n' +
    '      if (possibleTenantId) {\n' +
    '        tenantId = possibleTenantId;\n' +
    '      }\n' +
    '    }\n' +
    '    \n' +
    '    // Try app cache with tenant-specific key if tenant ID is available\n' +
    '    let appCacheTenantName;\n' +
    '    try {\n' +
    '      if (typeof window !== "undefined" && window.__APP_CACHE && tenantId) {\n' +
    '        // Try tenant-specific cache first\n' +
    '        if (window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.businessName) {\n' +
    '          appCacheTenantName = window.__APP_CACHE.tenant.businessName;\n' +
    '        }\n' +
    '        \n' +
    '        // Also check tenant-specific entries\n' +
    '        if (window.__APP_CACHE[`tenant_${tenantId}`]?.businessName) {\n' +
    '          appCacheTenantName = window.__APP_CACHE[`tenant_${tenantId}`].businessName;\n' +
    '        }\n' +
    '      }\n' +
    '    } catch (e) {\n' +
    '      logger.debug("[DashAppBar] Error accessing APP_CACHE for business name");\n' +
    '    }\n' +
    '    $2\n' +
    '    // Adding URL params and APP_CACHE as sources\n' +
    '    const cognitoName = userAttributes?.["custom:businessname"] || user?.["custom:businessname"];\n' +
    '    const userDataName = userData?.businessName || userData?.["custom:businessname"];\n' +
    '    const profileDataName = profileData?.businessName || profileData?.business_name;\n' +
    '    const cachedName = cachedProfileData?.businessName || cachedProfileData?.business_name;\n' +
    '    const appCacheName = appCacheTenantName;\n' +
    '    \n' +
    '    // Check if we have a valid business name from any source\n' +
    '    const newBusinessName = urlBusinessName || cognitoName || userDataName || profileDataName || cachedName || appCacheName || "";\n' +
    '    \n' +
    '    $3';
  
  // Improve initials generation to handle corrupted data more gracefully
  const initialsGenerationRegex = /(const generateInitialsFromNames = useCallback\([\s\S]+?if \(!firstNameValue && !lastNameValue && !emailValue\) return '';)([\s\S]+?)(\s+return '';)/;
  
  const improvedInitialsGeneration = 
    '$1\n' +
    '    try {\n' +
    '      // Add error handling for both name values to avoid issues with invalid inputs\n' +
    '      if (firstNameValue && typeof firstNameValue === "string" && \n' +
    '          lastNameValue && typeof lastNameValue === "string") {\n' +
    '        return `${firstNameValue.charAt(0).toUpperCase()}${lastNameValue.charAt(0).toUpperCase()}`;\n' +
    '      }\n' +
    '      \n' +
    '      // Handle case where only one name is available\n' +
    '      if (firstNameValue && typeof firstNameValue === "string") {\n' +
    '        return firstNameValue.charAt(0).toUpperCase();\n' +
    '      }\n' +
    '      \n' +
    '      if (lastNameValue && typeof lastNameValue === "string") {\n' +
    '        return lastNameValue.charAt(0).toUpperCase();\n' +
    '      }\n' +
    '      \n' +
    '      // If no name values, try to generate from email\n' +
    '      if (emailValue && typeof emailValue === "string") {\n$2\n' +
    '      }\n' +
    '    } catch (error) {\n' +
    '      logger.warn("[DashAppBar] Error generating initials:", error);\n' +
    '      \n' +
    '      // Fallback - generate a simple initial if possible\n' +
    '      try {\n' +
    '        if (emailValue && typeof emailValue === "string") {\n' +
    '          return emailValue.charAt(0).toUpperCase();\n' +
    '        }\n' +
    '        \n' +
    '        if (firstNameValue && typeof firstNameValue === "string") {\n' +
    '          return firstNameValue.charAt(0).toUpperCase();\n' +
    '        }\n' +
    '      } catch (e) {\n' +
    '        // Last resort\n' +
    '        return "U";\n' +
    '      }\n' +
    '    }\n' +
    '$3';
  
  // Add explicit error handling to the component initialization
  const componentInitRegex = /(const DashAppBar = \({[\s\S]+?\}\) => {[\s\S]+?)(\/\/ State for business name and other display properties[\s\S]+?const \[businessName, setBusinessName\] = useState\(''\);)/;
  
  const improvedComponentInit =
    '$1  // Debug initialization with data source flags\n' +
    '  logger.info("[DashAppBar] Component initialized - Using ONLY Cognito and AppCache for data sources (NO GRAPHQL)");\n' +
    '  logger.debug("[DashAppBar] Component initialized with props", { \n' +
    '    hasUserAttrs: !!userAttributes,\n' +
    '    hasUserData: !!userData,\n' +
    '    hasProfileData: !!profileData\n' +
    '  });\n\n' +
    '  $2';
  
  let updatedContent = content.replace(businessNameEffectRegex, improvedBusinessNameEffect);
  updatedContent = updatedContent.replace(initialsGenerationRegex, improvedInitialsGeneration);
  updatedContent = updatedContent.replace(componentInitRegex, improvedComponentInit);
  
  return updatedContent;
}

// Update script registry
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
        script => script.name === SCRIPT_NAME
      );
      
      const scriptEntry = {
        id: `F00${Number(SCRIPT_VERSION) + 6}`, // Continuing from previous script
        name: SCRIPT_NAME,
        version: "1.0",
        description: "Fixes DashAppBar component's issues with retrieving business name and user initials",
        author: "System Administrator",
        date_created: new Date().toISOString().split('T')[0],
        status: "Executed",
        execution_date: new Date().toISOString(),
        target_files: Object.values(TARGET_FILES).map(file => path.relative(path.join(__dirname, '..'), file)),
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
      log('Script registry updated successfully');
    } else {
      log('Script registry not found, skipping update');
    }
    
    return true;
  } catch (error) {
    log(`Error updating script registry: ${error.message}`);
    return false;
  }
}

// Main execution flow
(async function() {
  log(`Running ${SCRIPT_NAME} v1.0`);
  
  try {
    // Fix useSession.js
    log(`Processing file: ${TARGET_FILES.useSession}`);
    
    // Create backup
    if (!createBackup(TARGET_FILES.useSession)) {
      log('Aborting due to backup failure for useSession.js');
      process.exit(1);
    }
    
    // Read file
    const useSessionContent = readFile(TARGET_FILES.useSession);
    if (!useSessionContent) {
      log('Aborting due to file read failure for useSession.js');
      process.exit(1);
    }
    
    // Fix file
    const fixedUseSessionContent = fixUserSessionHook(useSessionContent);
    if (!fixedUseSessionContent) {
      log('Aborting due to fix failure for useSession.js');
      process.exit(1);
    }
    
    // Write file
    if (!writeFile(TARGET_FILES.useSession, fixedUseSessionContent)) {
      log('Aborting due to file write failure for useSession.js');
      process.exit(1);
    }
    
    // Fix DashAppBar.js
    log(`Processing file: ${TARGET_FILES.dashAppBar}`);
    
    // Create backup
    if (!createBackup(TARGET_FILES.dashAppBar)) {
      log('Aborting due to backup failure for DashAppBar.js');
      process.exit(1);
    }
    
    // Read file
    const dashAppBarContent = readFile(TARGET_FILES.dashAppBar);
    if (!dashAppBarContent) {
      log('Aborting due to file read failure for DashAppBar.js');
      process.exit(1);
    }
    
    // Fix file
    const fixedDashAppBarContent = fixDashAppBar(dashAppBarContent);
    if (!fixedDashAppBarContent) {
      log('Aborting due to fix failure for DashAppBar.js');
      process.exit(1);
    }
    
    // Write file
    if (!writeFile(TARGET_FILES.dashAppBar, fixedDashAppBarContent)) {
      log('Aborting due to file write failure for DashAppBar.js');
      process.exit(1);
    }
    
    // Update script registry
    updateScriptRegistry();
    
    log('All fixes have been applied successfully');
    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})(); 