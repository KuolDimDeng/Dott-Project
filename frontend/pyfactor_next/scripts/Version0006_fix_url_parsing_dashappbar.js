/**
 * Version0006_fix_url_parsing_dashappbar.js
 * 
 * Description: Fixes URL parameter handling for business name in DashAppBar
 * Version: 1.0
 * Author: System Administrator
 * Date: 2025-04-29
 * 
 * This script addresses the continued issue with business name and user initials
 * not displaying in the DashAppBar component. The fix includes:
 * 
 * 1. Adding a direct URL parameter check on component mount
 * 2. Ensuring URL-provided names are displayed immediately rather than waiting for other sources
 * 3. Improving URL parameter decoding for tenantName and tenantUserId
 * 4. Adding debug logging to identify data flow issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const SCRIPT_VERSION = '0006';
const SCRIPT_NAME = `Version${SCRIPT_VERSION}_fix_url_parsing_dashappbar`;
const BACKUP_DIR = path.join(__dirname, 'backups');
const TARGET_FILES = {
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

// Add immediate URL parameter check to DashAppBar component
function fixDashAppBar(content) {
  if (!content) return null;
  
  // Add URL param check on mount
  const componentStartRegex = /(const DashAppBar = \({\s+[^}]+\s+}\) => {\s+})(\/\/ Debug initialization with data source flags)/;
  
  const urlParamCheckCode = 
    '$1// Immediately check URL parameters for business name and user ID on mount\n' +
    '  useEffect(() => {\n' +
    '    if (typeof window !== "undefined") {\n' +
    '      try {\n' +
    '        const urlParams = new URLSearchParams(window.location.search);\n' +
    '        \n' +
    '        // Check for tenantName parameter\n' +
    '        const tenantNameParam = urlParams.get("tenantName");\n' +
    '        if (tenantNameParam) {\n' +
    '          try {\n' +
    '            // URL params are often double-encoded, try to decode properly\n' +
    '            const decodedName = decodeURIComponent(decodeURIComponent(tenantNameParam));\n' +
    '            logger.info(`[DashAppBar] Found business name in URL parameters: ${decodedName}`);\n' +
    '            setBusinessName(decodedName);\n' +
    '            \n' +
    '            // Also add to APP_CACHE for persistence\n' +
    '            if (!window.__APP_CACHE) window.__APP_CACHE = {};\n' +
    '            if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};\n' +
    '            window.__APP_CACHE.tenant.businessName = decodedName;\n' +
    '            \n' +
    '            // Also get tenantID from URL if available\n' +
    '            const pathParts = window.location.pathname.split("/");\n' +
    '            // Look for a UUID pattern in the path\n' +
    '            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n' +
    '            const tenantId = pathParts.find(part => uuidRegex.test(part));\n' +
    '            \n' +
    '            if (tenantId) {\n' +
    '              // Store with tenant-specific key\n' +
    '              window.__APP_CACHE[`tenant_${tenantId}`] = {\n' +
    '                ...window.__APP_CACHE[`tenant_${tenantId}`] || {},\n' +
    '                businessName: decodedName\n' +
    '              };\n' +
    '            }\n' +
    '          } catch (e) {\n' +
    '            // If decoding fails, use as is\n' +
    '            logger.warn(`[DashAppBar] Error decoding tenant name from URL: ${e.message}`);\n' +
    '            setBusinessName(tenantNameParam);\n' +
    '          }\n' +
    '        }\n' +
    '        \n' +
    '        // Check for user ID in URL to generate initials\n' +
    '        const userIdParam = urlParams.get("tenantUserId");\n' +
    '        if (userIdParam && !userInitials) {\n' +
    '          // For user ID, just use first character as initial\n' +
    '          if (userIdParam.length > 0) {\n' +
    '            const initial = userIdParam.charAt(0).toUpperCase();\n' +
    '            logger.info(`[DashAppBar] Generated initial from URL user ID: ${initial}`);\n' +
    '            setUserInitials(initial);\n' +
    '          }\n' +
    '          \n' +
    '          // Also look for email in other URL params\n' +
    '          const email = urlParams.get("email");\n' +
    '          if (email) {\n' +
    '            const emailInitial = email.charAt(0).toUpperCase();\n' +
    '            logger.info(`[DashAppBar] Found email in URL, using initial: ${emailInitial}`);\n' +
    '            setUserInitials(emailInitial);\n' +
    '            \n' +
    '            // Also get real email value for display\n' +
    '            logger.info(`[AppBar] Found real email from URL param: ${email}`);\n' +
    '            if (typeof window !== "undefined") {\n' +
    '              if (!window.__APP_CACHE) window.__APP_CACHE = {};\n' +
    '              if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};\n' +
    '              window.__APP_CACHE.user.email = email;\n' +
    '            }\n' +
    '          }\n' +
    '        }\n' +
    '      } catch (error) {\n' +
    '        logger.warn(`[DashAppBar] Error processing URL parameters: ${error.message}`);\n' +
    '      }\n' +
    '    }\n' +
    '  }, []); // Run once on mount\n' +
    '  \n' +
    '  $2';
  
  // Improve URL parameter handling in business name effect
  const businessNameEffectRegex = /(try {[\s\S]+?const urlParams = new URLSearchParams\(window\.location\.search\);[\s\S]+?urlBusinessName = urlParams\.get\("tenantName"\);[\s\S]+?if \(urlBusinessName\) {[\s\S]+?try {[\s\S]+?\/\/ URL params might be URL encoded, try to decode them)([\s\S]+?)(urlBusinessName = decodeURIComponent\(urlBusinessName\);)/;
  
  const improvedUrlDecoding = 
    '$1\n' +
    '            // URL params are often double-encoded in tenant switching\n' +
    '            $3\n' +
    '            \n' +
    '            // Try double decoding in case it\'s double-encoded\n' +
    '            try {\n' +
    '              const doubleDecoded = decodeURIComponent(urlBusinessName);\n' +
    '              if (doubleDecoded !== urlBusinessName) {\n' +
    '                logger.debug("[DashAppBar] URL parameter was double-encoded, using double-decoded value");\n' +
    '                urlBusinessName = doubleDecoded;\n' +
    '              }\n' +
    '            } catch (decodeError) {\n' +
    '              // Keep original decoded value if double-decoding fails\n' +
    '            }';
  
  // Improve email handling
  const emailHandlingRegex = /(\[AppBar\] Found real email from auth sources: )([^;]+)(;)/;
  
  const improvedEmailHandling = 
    '$1${email || "unknown"}$3\n' +
    '        \n' +
    '        // Store found email in APP_CACHE\n' +
    '        if (email && typeof window !== "undefined") {\n' +
    '          if (!window.__APP_CACHE) window.__APP_CACHE = {};\n' +
    '          if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};\n' +
    '          window.__APP_CACHE.user.email = email;\n' +
    '        }';
  
  // Add additional debug logging for business name data flow
  const businessNameDebugRegex = /(logger\.info\('\[DashAppBar\] Business name sources:', {[\s\S]+?current: businessName\s+}\);)/;
  
  const enhancedBusinessNameDebug = 
    '$1\n' +
    '    \n' +
    '    // URL debug for tenant ID and business name\n' +
    '    if (typeof window !== "undefined") {\n' +
    '      try {\n' +
    '        const urlParams = new URLSearchParams(window.location.search);\n' +
    '        const urlTenantName = urlParams.get("tenantName");\n' +
    '        let decodedTenantName = "";\n' +
    '        \n' +
    '        if (urlTenantName) {\n' +
    '          try {\n' +
    '            decodedTenantName = decodeURIComponent(urlTenantName);\n' +
    '            try {\n' +
    '              const doubleDecoded = decodeURIComponent(decodedTenantName);\n' +
    '              if (doubleDecoded !== decodedTenantName) {\n' +
    '                decodedTenantName = doubleDecoded;\n' +
    '              }\n' +
    '            } catch (e) {}\n' +
    '          } catch (e) {\n' +
    '            decodedTenantName = urlTenantName;\n' +
    '          }\n' +
    '        }\n' +
    '        \n' +
    '        const pathParts = window.location.pathname.split("/");\n' +
    '        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n' +
    '        const pathTenantId = pathParts.find(part => uuidRegex.test(part));\n' +
    '        \n' +
    '        // Log all URL-related data\n' +
    '        logger.debug("[DashAppBar] URL Data:", {\n' +
    '          path: window.location.pathname,\n' +
    '          search: window.location.search,\n' +
    '          tenantId: pathTenantId,\n' +
    '          rawTenantName: urlTenantName,\n' +
    '          decodedTenantName,\n' +
    '          appCacheTenant: window.__APP_CACHE?.tenant,\n' +
    '          tenantSpecificCache: pathTenantId ? window.__APP_CACHE?.[`tenant_${pathTenantId}`] : null\n' +
    '        });\n' +
    '      } catch (e) {\n' +
    '        logger.debug("[DashAppBar] Error getting URL debug info:", e);\n' +
    '      }\n' +
    '    }';

  // Update email finding from auth to properly handle missing email
  const extractEmailRegex = /(const email = )([^;]+)(;)/;
  const improvedEmailExtraction = 
    '$1(userAttributes?.email || userData?.email || profileData?.email || window.__APP_CACHE?.user?.email || "")$3';
  
  let updatedContent = content.replace(componentStartRegex, urlParamCheckCode);
  updatedContent = updatedContent.replace(businessNameEffectRegex, improvedUrlDecoding);
  updatedContent = updatedContent.replace(emailHandlingRegex, improvedEmailHandling);
  updatedContent = updatedContent.replace(businessNameDebugRegex, enhancedBusinessNameDebug);
  updatedContent = updatedContent.replace(extractEmailRegex, improvedEmailExtraction);
  
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
        description: "Fixes URL parameter handling for business name in DashAppBar",
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
    
    log('URL parameter handling fixes have been applied successfully');
    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})(); 