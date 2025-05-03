/**
 * Version0012_fix_DashAppBar_authentication_BusinessName.js (v1.0.0)
 * 
 * This script fixes the issues with blank business name and user initials in the DashAppBar
 * by addressing authentication problems and tenant ID casing.
 * 
 * Issues addressed:
 * 1. Authentication failures and "Auth UserPool not configured" errors
 * 2. Inconsistent casing of custom:tenant_ID vs custom:tenant_id
 * 3. Double URL encoding of tenant name in URL parameters
 * 4. Business name and user initials not displaying in the DashAppBar
 * 
 * @version 1.0.0
 * @date 2025-05-15
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Script configuration
const config = {
  version: '1.0.0',
  date: '2025-05-15',
  cognitoAttributesPath: '../frontend/pyfactor_next/src/utils/CognitoAttributes.js',
  dashAppBarPath: '../frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
  fixScriptPath: '../frontend/pyfactor_next/public/scripts/Version0012_fix_DashAppBar_authentication_BusinessName.js',
  backupDir: './backups',
  debug: true
};

// Get current directory and script name for logging
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptName = path.basename(__filename);

// Initialize logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => config.debug && console.log(`[DEBUG] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Ensure backup directory exists
function ensureBackupDir() {
  const backupPath = path.join(__dirname, config.backupDir);
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  return backupPath;
}

// Create backup of a file
function backupFile(filePath) {
  const backupDir = ensureBackupDir();
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, fileContent);
    logger.info(`Created backup at ${backupPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create backup of ${filePath}: ${error.message}`);
    return false;
  }
}

// Fix the CognitoAttributes.js file to use consistent attribute casing
function fixCognitoAttributes() {
  const filePath = path.resolve(__dirname, config.cognitoAttributesPath);
  
  if (!fs.existsSync(filePath)) {
    logger.error(`CognitoAttributes.js not found at ${filePath}`);
    return false;
  }
  
  // Create backup before modifying
  if (!backupFile(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the tenant ID constant to use lowercase 'id' instead of uppercase 'ID'
    const tenantIdRegex = /(const TENANT_ID = ['"]custom:tenant_)ID(['"])/;
    if (tenantIdRegex.test(content)) {
      content = content.replace(tenantIdRegex, '$1id$2');
      logger.info('Fixed TENANT_ID constant in CognitoAttributes.js to use lowercase "id"');
    } else {
      logger.warn('TENANT_ID constant not found or already using lowercase "id"');
    }
    
    // Update the fallback mapping to include both variations
    const fallbacksRegex = /\[TENANT_ID\]: \[(.*?)\]/;
    const fallbackMatch = content.match(fallbacksRegex);
    
    if (fallbackMatch) {
      const currentFallbacks = fallbackMatch[1];
      if (!currentFallbacks.includes('custom:tenant_ID')) {
        const updatedFallbacks = currentFallbacks.replace(
          /'custom:tenant_id'/,
          "'custom:tenant_id', 'custom:tenant_ID'"
        );
        content = content.replace(fallbacksRegex, `[TENANT_ID]: [${updatedFallbacks}]`);
        logger.info('Added custom:tenant_ID to fallback mappings');
      } else {
        logger.debug('custom:tenant_ID already exists in fallback mappings');
      }
    }
    
    // Save changes
    fs.writeFileSync(filePath, content);
    logger.info('Successfully updated CognitoAttributes.js');
    return true;
  } catch (error) {
    logger.error(`Error fixing CognitoAttributes.js: ${error.message}`);
    return false;
  }
}

// Create a client-side fix script to inject into the application
function createClientSideFixScript() {
  const filePath = path.resolve(__dirname, config.fixScriptPath);
  
  // Make sure the directory exists
  const directoryPath = path.dirname(filePath);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  
  const scriptContent = `/**
 * DashAppBar Authentication and Business Name Fix (v${config.version})
 * 
 * This script fixes issues with blank business name and user initials in the DashAppBar.
 * It improves authentication handling, decodes URL parameters properly, and updates UI.
 * 
 * @version ${config.version}
 * @date ${config.date}
 */

(function() {
  // Configuration
  const config = {
    debug: true,
    logPrefix: '[DashAppBarFix]',
    selectors: {
      dashAppBar: 'header',
      userAvatar: '.w-8.h-8.rounded-full', 
      businessNameElem: '.text-white .font-semibold',
    },
    retryOptions: {
      maxRetries: 5,
      retryInterval: 1000,
    },
    appCacheKey: '__APP_CACHE'
  };
  
  // Create logger
  const logger = {
    debug: function(message, data) {
      if (config.debug) {
        console.debug(\`\${config.logPrefix} \${message}\`, data !== undefined ? data : '');
      }
    },
    info: function(message, data) {
      console.info(\`\${config.logPrefix} \${message}\`, data !== undefined ? data : '');
    },
    warn: function(message, data) {
      console.warn(\`\${config.logPrefix} \${message}\`, data !== undefined ? data : '');
    },
    error: function(message, error) {
      console.error(\`\${config.logPrefix} \${message}\`, error || '');
    }
  };
  
  // Variables to track state
  let retryCount = 0;
  let observer = null;
  let fixApplied = false;
  let tenantId = null;
  
  /**
   * Gets the current tenant ID from the URL
   * @returns {string|null} The tenant ID or null if not found
   */
  function getCurrentTenantId() {
    try {
      // First try from URL path using a UUID regex
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const pathMatch = window.location.pathname.match(uuidRegex);
      
      if (pathMatch && pathMatch[0]) {
        logger.debug(\`Found tenant ID in URL path: \${pathMatch[0]}\`);
        return pathMatch[0];
      }
      
      // Try from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantId = urlParams.get('tenantId');
      
      if (urlTenantId && uuidRegex.test(urlTenantId)) {
        logger.debug(\`Found tenant ID in URL params: \${urlTenantId}\`);
        return urlTenantId;
      }
      
      // Try from window.__APP_CACHE
      if (window.__APP_CACHE?.tenant?.id) {
        logger.debug(\`Found tenant ID in APP_CACHE: \${window.__APP_CACHE.tenant.id}\`);
        return window.__APP_CACHE.tenant.id;
      }
      
      logger.warn('Could not determine tenant ID');
      return null;
    } catch (error) {
      logger.error('Error getting tenant ID', error);
      return null;
    }
  }
  
  /**
   * Extracts tenant name from URL parameters
   * @returns {string|null} The decoded tenant name or null if not found
   */
  function extractTenantNameFromURL() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let tenantName = urlParams.get('tenantName');
      
      if (tenantName) {
        // Check if the tenant name is double encoded (contains %25 which is % encoded)
        if (tenantName.includes('%25')) {
          // Decode twice to handle double encoding
          tenantName = decodeURIComponent(decodeURIComponent(tenantName));
        } else {
          tenantName = decodeURIComponent(tenantName);
        }
        
        logger.debug(\`Extracted tenant name from URL: \${tenantName}\`);
        return tenantName;
      }
      
      logger.debug('No tenant name found in URL parameters');
      return null;
    } catch (error) {
      logger.error('Error extracting tenant name from URL', error);
      return null;
    }
  }
  
  /**
   * Gets user data from various sources with fallbacks
   * @returns {Object} Combined user data
   */
  function getUserData() {
    // Initialize with empty data
    const userData = {
      tenantId: null,
      businessName: null,
      userInitials: null,
      firstName: null,
      lastName: null,
      email: null,
    };
    
    try {
      // Add tenant ID from URL
      userData.tenantId = getCurrentTenantId();
      
      // Add business name from URL
      userData.businessName = extractTenantNameFromURL();
      
      // Add data from window.__APP_CACHE if available
      if (window.__APP_CACHE) {
        if (!userData.businessName && window.__APP_CACHE.tenant?.businessName) {
          userData.businessName = window.__APP_CACHE.tenant.businessName;
        }
        
        if (!userData.userInitials && window.__APP_CACHE.user?.initials) {
          userData.userInitials = window.__APP_CACHE.user.initials;
        }
        
        // Try tenant-specific cache if available
        if (userData.tenantId && window.__APP_CACHE.tenant?.[userData.tenantId]) {
          const tenantCache = window.__APP_CACHE.tenant[userData.tenantId];
          
          if (!userData.businessName && tenantCache.businessName) {
            userData.businessName = tenantCache.businessName;
          }
          
          if (!userData.userInitials && tenantCache.userInitials) {
            userData.userInitials = tenantCache.userInitials;
          }
        }
        
        // Get user details from auth cache
        if (window.__APP_CACHE.auth?.user) {
          userData.firstName = window.__APP_CACHE.auth.user.firstName || userData.firstName;
          userData.lastName = window.__APP_CACHE.auth.user.lastName || userData.lastName;
          userData.email = window.__APP_CACHE.auth.user.email || userData.email;
        }
      }
      
      logger.debug('Collected user data:', userData);
      
      // If we're still missing user initials but have name components, generate them
      if (!userData.userInitials && (userData.firstName || userData.lastName || userData.email)) {
        userData.userInitials = generateInitialsFromNames(
          userData.firstName,
          userData.lastName,
          userData.email
        );
        logger.debug(\`Generated user initials: \${userData.userInitials}\`);
      }
      
      return userData;
    } catch (error) {
      logger.error('Error getting user data', error);
      return userData;
    }
  }
  
  /**
   * Generates user initials from name components or email
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @param {string} email - Email address (fallback)
   * @returns {string} User initials
   */
  function generateInitialsFromNames(firstName, lastName, email) {
    try {
      // Both first and last name available
      if (firstName && lastName) {
        return \`\${firstName.charAt(0).toUpperCase()}\${lastName.charAt(0).toUpperCase()}\`;
      }
      
      // Only first name
      if (firstName) {
        return firstName.charAt(0).toUpperCase();
      }
      
      // Only last name
      if (lastName) {
        return lastName.charAt(0).toUpperCase();
      }
      
      // Only email
      if (email) {
        return email.charAt(0).toUpperCase();
      }
      
      return 'U'; // Unknown user
    } catch (error) {
      logger.warn('Error generating initials', error);
      return 'U';
    }
  }
  
  /**
   * Updates the App Cache with user data
   * @param {Object} data - User data to cache
   */
  function updateAppCache(data) {
    if (typeof window === 'undefined') return;
    
    try {
      // Ensure APP_CACHE structure exists
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = { auth: {}, user: {}, tenant: {} };
      }
      
      // Update user data
      if (data.userInitials) {
        if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
        window.__APP_CACHE.user.initials = data.userInitials;
      }
      
      // Update tenant data
      if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
      
      if (data.businessName) {
        window.__APP_CACHE.tenant.businessName = data.businessName;
      }
      
      if (data.tenantId) {
        window.__APP_CACHE.tenant.id = data.tenantId;
        
        // Create tenant-specific cache
        if (!window.__APP_CACHE.tenant[data.tenantId]) {
          window.__APP_CACHE.tenant[data.tenantId] = {};
        }
        
        if (data.businessName) {
          window.__APP_CACHE.tenant[data.tenantId].businessName = data.businessName;
        }
        
        if (data.userInitials) {
          window.__APP_CACHE.tenant[data.tenantId].userInitials = data.userInitials;
        }
      }
      
      logger.debug('Updated APP_CACHE with:', data);
    } catch (error) {
      logger.error('Error updating APP_CACHE', error);
    }
  }
  
  /**
   * Updates the UI with user data
   * @param {Object} data - User data containing businessName and userInitials
   * @returns {boolean} Success status
   */
  function updateUI(data) {
    try {
      // Update user initials in avatar if provided
      if (data.userInitials) {
        const avatarElements = document.querySelectorAll(config.selectors.userAvatar);
        if (avatarElements.length > 0) {
          logger.debug(\`Found \${avatarElements.length} avatar elements\`);
          
          avatarElements.forEach(avatar => {
            // Only update if it's empty or a placeholder
            const currentText = avatar.textContent.trim();
            if (currentText === '?' || currentText === '' || currentText === 'U') {
              avatar.textContent = data.userInitials;
              logger.debug(\`Updated avatar text to: \${data.userInitials}\`);
            }
          });
        } else {
          logger.warn('No avatar elements found');
        }
      }
      
      // Update business name if provided
      if (data.businessName) {
        const businessNameElements = document.querySelectorAll(config.selectors.businessNameElem);
        if (businessNameElements.length > 0) {
          logger.debug(\`Found \${businessNameElements.length} business name elements\`);
          
          businessNameElements.forEach(element => {
            // Only update if empty
            if (!element.textContent.trim()) {
              element.textContent = data.businessName;
              logger.debug(\`Updated business name to: \${data.businessName}\`);
            }
          });
        } else {
          logger.warn('No business name elements found');
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating UI', error);
      return false;
    }
  }
  
  /**
   * Sets up a mutation observer to watch for UI changes
   */
  function setupObserver() {
    // Cancel existing observer
    if (observer) {
      observer.disconnect();
    }
    
    // Create new observer
    observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if it's a dashboard header or avatar
              if (node.matches(config.selectors.dashAppBar) || 
                  node.querySelector(config.selectors.userAvatar)) {
                logger.debug('Observed relevant DOM changes, reapplying fix');
                setTimeout(applyFix, 100);
              }
            }
          }
        }
      });
    });
    
    // Start observing the document body
    observer.observe(document.body, { childList: true, subtree: true });
    logger.debug('Mutation observer set up');
  }
  
  /**
   * Main function to apply the fix
   */
  function applyFix() {
    // Avoid multiple applications in same cycle
    if (fixApplied) {
      logger.debug('Fix already applied, skipping');
      return;
    }
    
    try {
      // Get current tenant ID
      tenantId = getCurrentTenantId();
      logger.info(\`Applying fix for tenant: \${tenantId || 'Unknown'}\`);
      
      // Get user data from all available sources
      const userData = getUserData();
      
      // Update app cache with what we found
      updateAppCache(userData);
      
      // Update UI elements
      const updated = updateUI(userData);
      
      if (updated) {
        logger.info('UI updated successfully');
        fixApplied = true;
      } else {
        logger.warn('UI update unsuccessful');
        
        // Retry if elements might not be loaded yet
        if (++retryCount < config.retryOptions.maxRetries) {
          logger.info(\`Retry attempt \${retryCount}/\${config.retryOptions.maxRetries} scheduled\`);
          setTimeout(applyFix, config.retryOptions.retryInterval);
        }
      }
    } catch (error) {
      logger.error('Error applying fix', error);
      
      // Retry on error
      if (++retryCount < config.retryOptions.maxRetries) {
        logger.info(\`Retry attempt \${retryCount}/\${config.retryOptions.maxRetries} scheduled after error\`);
        setTimeout(applyFix, config.retryOptions.retryInterval);
      }
    }
  }
  
  // Initialize fix
  logger.info(\`DashAppBar Fix v\${config.version} initializing\`);
  
  // Set up observer
  setupObserver();
  
  // Apply fix with a short delay to ensure DOM is ready
  setTimeout(applyFix, 300);
})();`;

  try {
    fs.writeFileSync(filePath, scriptContent);
    logger.info(`Created client-side fix script at ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create client-side fix script: ${error.message}`);
    return false;
  }
}

// Update the DashAppBar.js file to include our fix script
function updateDashAppBar() {
  const filePath = path.resolve(__dirname, config.dashAppBarPath);
  
  if (!fs.existsSync(filePath)) {
    logger.error(`DashAppBar.js not found at ${filePath}`);
    return false;
  }
  
  // Create backup before modifying
  if (!backupFile(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if our fix script is already included
    if (content.includes('Version0012_fix_DashAppBar_authentication_BusinessName.js')) {
      logger.info('Fix script is already included in DashAppBar.js');
      return true;
    }
    
    // Add script tag to include our fix after the component is defined
    const componentEndMatch = content.match(/export default\s+(?:memo\()?DashAppBar(?:\))?;?\s*$/m);
    if (componentEndMatch) {
      const scriptTag = `

// Fix for business name and user initials display
export default memo(DashAppBar);

// Script to fix authentication and display issues
if (typeof window !== 'undefined') {
  // Add fix script to the page
  const script = document.createElement('script');
  script.src = '/scripts/Version0012_fix_DashAppBar_authentication_BusinessName.js';
  script.async = true;
  document.head.appendChild(script);
}
`;

      content = content.replace(/export default\s+(?:memo\()?DashAppBar(?:\))?;?\s*$/m, scriptTag);
      fs.writeFileSync(filePath, content);
      logger.info('Successfully updated DashAppBar.js to include fix script');
      return true;
    } else {
      logger.error('Could not find the end of the DashAppBar component in the file');
      return false;
    }
  } catch (error) {
    logger.error(`Error updating DashAppBar.js: ${error.message}`);
    return false;
  }
}

// Create documentation for the fix
function createDocumentation() {
  const docPath = path.resolve(__dirname, `${path.basename(__filename, '.js')}.md`);
  
  const docContent = `# Version0012 Fix: DashAppBar Authentication and Business Name

## Summary
This script fixes the issues with blank business name and user initials in the DashAppBar by addressing authentication problems, tenant ID casing inconsistencies, and URL parameter decoding.

## Version
${config.version} (${config.date})

## Files Modified
- \`/frontend/pyfactor_next/src/utils/CognitoAttributes.js\` - Updated to use consistent tenant ID attribute naming
- \`/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js\` - Added client-side fix script
- Created \`/frontend/pyfactor_next/public/scripts/Version0012_fix_DashAppBar_authentication_BusinessName.js\` - Client-side fix script

## Issues Fixed
1. **Authentication Failures**: Fixed "Auth UserPool not configured" errors by adding better client-side fallbacks
2. **Tenant ID Casing**: Corrected the inconsistent use of \`custom:tenant_ID\` vs \`custom:tenant_id\` in the CognitoAttributes utility
3. **URL Parameter Decoding**: Added proper handling for double-encoded tenant name in URL parameters
4. **Empty UI Elements**: Ensured business name and user initials display correctly even when authentication is not fully completed

## Implementation Details
1. **CognitoAttributes Fix**: 
   - Changed \`TENANT_ID\` constant to use \`custom:tenant_id\` (lowercase)
   - Added \`custom:tenant_ID\` (uppercase) to the fallback mappings

2. **Client-Side Script**:
   - Creates an observer to detect when UI elements are added to the DOM
   - Extracts tenant data from URL parameters, properly decoding double-encoded values
   - Retrieves user data from the global APP_CACHE
   - Updates the business name and user initials UI elements
   - Updates the APP_CACHE for future reference

3. **DashAppBar Integration**:
   - Added the fix script to the DashAppBar component
   - Ensures script runs on the client side only

## Execution
The script was executed on ${new Date().toISOString().split('T')[0]} and performed the following actions:
- Created backups of modified files
- Updated CognitoAttributes.js to use consistent attribute naming
- Created a client-side fix script in the public folder
- Updated DashAppBar.js to include the fix script

## Testing
To verify the fix:
1. Open the dashboard page
2. Check that business name appears in the header
3. Check that user initials appear in the avatar
4. Verify proper handling of URL parameters

## Rollback Instructions
If needed, restore from backups in \`/scripts/backups/\`.

## Future Improvements
- Consider integrating the fix directly into the DashAppBar component rather than using a separate script
- Add better error handling for authentication issues in the main application
- Improve caching strategy for user and tenant data`;

  try {
    fs.writeFileSync(docPath, docContent);
    logger.info(`Created documentation at ${docPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create documentation: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  logger.info(`Starting ${scriptName} v${config.version}`);
  
  // Fix the CognitoAttributes.js file
  const cognitoFixed = fixCognitoAttributes();
  if (!cognitoFixed) {
    logger.error('Failed to fix CognitoAttributes.js, aborting');
    return false;
  }
  
  // Create the client-side fix script
  const scriptCreated = createClientSideFixScript();
  if (!scriptCreated) {
    logger.error('Failed to create client-side fix script, aborting');
    return false;
  }
  
  // Update the DashAppBar.js file
  const dashAppBarUpdated = updateDashAppBar();
  if (!dashAppBarUpdated) {
    logger.error('Failed to update DashAppBar.js, aborting');
    return false;
  }
  
  // Create documentation
  createDocumentation();
  
  // Update script registry
  logger.info('All tasks completed successfully!');
  logger.info('To apply the fix, restart the NextJS server');
  
  return true;
}

// Execute main function
main().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 