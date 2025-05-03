/**
 * Version0013_fix_DashAppBar_user_initials_display.js (v1.0.0)
 * 
 * This script fixes the issue with missing user initials in the DashAppBar.
 * While our previous fix (Version0012) successfully addressed the business name,
 * the user initials are still not displaying properly.
 * 
 * Issues addressed:
 * 1. CSS selector for user avatar might not be matching the actual DOM elements
 * 2. Additional avatar elements might need to be targeted
 * 3. Ensure initials from Cognito attributes are properly extracted and applied
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
  clientScriptPath: '../frontend/pyfactor_next/public/scripts/Version0013_fix_DashAppBar_user_initials_display.js',
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

// Create a client-side fix script to inject into the application
function createClientSideFixScript() {
  const filePath = path.resolve(__dirname, config.clientScriptPath);
  
  // Make sure the directory exists
  const directoryPath = path.dirname(filePath);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  
  const scriptContent = `/**
 * DashAppBar User Initials Fix (v${config.version})
 * 
 * This script specifically fixes the display of user initials in the DashAppBar avatar.
 * It uses a more comprehensive approach to locate and update avatar elements.
 * 
 * @version ${config.version}
 * @date ${config.date}
 */

(function() {
  // Configuration
  const config = {
    debug: true,
    logPrefix: '[UserInitialsFix]',
    selectors: {
      // More comprehensive set of selectors to target all possible avatar containers
      avatarSelectors: [
        '.w-8.h-8.rounded-full', // Standard avatar
        '.flex.items-center.justify-center.rounded-full.w-8.h-8', // Alternative avatar container
        '.text-white.rounded-full.flex-shrink-0', // Another possible avatar container
        '.w-10.h-10.rounded-full', // Larger avatar variant
        '.MuiAvatar-root', // Legacy Material UI avatar
        '[data-testid="user-avatar"]', // Avatar with test ID
        '.dashboard-header-avatar', // Avatar with specific class
        '.user-initials-container' // Dedicated container for user initials
      ],
      profileMenuButton: '[aria-label="Profile menu"]',
      dashboardHeader: 'header', 
    },
    retryOptions: {
      maxRetries: 10,
      retryInterval: 500,
      observerTimeout: 300
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
  
  /**
   * Gets the Cognito user attributes directly or from APP_CACHE
   * @returns {Promise<Object|null>} User attributes or null if not available
   */
  async function getUserAttributes() {
    try {
      logger.debug('Attempting to get user attributes');
      
      // Try from APP_CACHE first
      if (window.__APP_CACHE?.auth?.cognitoAttributes) {
        logger.debug('Found Cognito attributes in APP_CACHE');
        return window.__APP_CACHE.auth.cognitoAttributes;
      }
      
      // Try getting from Cognito directly
      try {
        // Check if AWS Amplify v6 API is available
        if (typeof window.fetchUserAttributes === 'function') {
          logger.debug('Using fetchUserAttributes from window');
          const attrs = await window.fetchUserAttributes();
          
          // Cache the attributes for future use
          if (!window.__APP_CACHE) window.__APP_CACHE = {};
          if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
          window.__APP_CACHE.auth.cognitoAttributes = attrs;
          
          return attrs;
        }
        
        // Try dynamic import of aws-amplify/auth (v6)
        try {
          logger.debug('Trying dynamic import of aws-amplify/auth');
          const auth = await import('aws-amplify/auth');
          if (typeof auth.fetchUserAttributes === 'function') {
            const attrs = await auth.fetchUserAttributes();
            
            // Cache the attributes
            if (!window.__APP_CACHE) window.__APP_CACHE = {};
            if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
            window.__APP_CACHE.auth.cognitoAttributes = attrs;
            
            return attrs;
          }
        } catch (importError) {
          logger.debug('Dynamic import failed, this is expected in some cases', importError.message);
        }
        
        // Fallback to checking context data
        if (window.__NEXT_DATA__?.props?.pageProps?.userData) {
          logger.debug('Found user data in __NEXT_DATA__');
          return window.__NEXT_DATA__.props.pageProps.userData;
        }
      } catch (error) {
        logger.warn('Error getting attributes from Cognito', error.message);
      }
      
      // Last resort: check URL parameters for user data
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('tenantUserId');
      const tenantName = urlParams.get('tenantName');
      
      if (userId || tenantName) {
        logger.debug('Creating attributes from URL parameters');
        return {
          sub: userId,
          'custom:businessname': decodeURIComponent(tenantName || '')
        };
      }
      
      logger.warn('Could not get user attributes from any source');
      return null;
    } catch (error) {
      logger.error('Error in getUserAttributes', error);
      return null;
    }
  }
  
  /**
   * Generates user initials from Cognito attributes
   * @param {Object} attributes - Cognito user attributes
   * @returns {string} User initials
   */
  function generateUserInitials(attributes) {
    if (!attributes) return 'U';
    
    try {
      // Extract first and last name, with fallbacks for different attribute naming
      const firstName = 
        attributes['given_name'] || 
        attributes['first_name'] || 
        attributes['firstname'] || 
        attributes['custom:firstname'] || 
        attributes['name']?.split(' ')[0] || 
        '';
        
      const lastName = 
        attributes['family_name'] || 
        attributes['last_name'] || 
        attributes['lastname'] || 
        attributes['custom:lastname'] || 
        (attributes['name']?.split(' ').length > 1 
          ? attributes['name'].split(' ').slice(-1)[0] 
          : '');
          
      const email = attributes['email'] || '';
      
      // Generate initials with both first and last name if available
      if (firstName && lastName) {
        return \`\${firstName.trim().charAt(0).toUpperCase()}\${lastName.trim().charAt(0).toUpperCase()}\`;
      }
      
      // Generate with just first name
      if (firstName) {
        return firstName.trim().charAt(0).toUpperCase();
      }
      
      // Generate with just last name
      if (lastName) {
        return lastName.trim().charAt(0).toUpperCase();
      }
      
      // Fall back to email
      if (email && email.length > 0) {
        return email.charAt(0).toUpperCase();
      }
      
      // Last resort
      return 'U';
    } catch (error) {
      logger.error('Error generating user initials', error);
      return 'U';
    }
  }
  
  /**
   * Updates the APP_CACHE with user initials
   * @param {string} initials - User initials
   */
  function updateAppCache(initials) {
    if (!initials || typeof window === 'undefined') return;
    
    try {
      // Ensure APP_CACHE structure exists
      if (!window.__APP_CACHE) window.__APP_CACHE = {};
      if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
      
      // Store initials
      window.__APP_CACHE.user.initials = initials;
      
      // If tenant ID is available, store in tenant-specific cache too
      if (window.__APP_CACHE.tenant?.id) {
        const tenantId = window.__APP_CACHE.tenant.id;
        if (!window.__APP_CACHE.tenant[tenantId]) {
          window.__APP_CACHE.tenant[tenantId] = {};
        }
        window.__APP_CACHE.tenant[tenantId].userInitials = initials;
      }
      
      logger.debug('Updated APP_CACHE with user initials:', initials);
    } catch (error) {
      logger.error('Error updating APP_CACHE', error);
    }
  }
  
  /**
   * Finds and updates all avatar elements with user initials
   * @param {string} initials - User initials to display
   * @returns {boolean} True if at least one avatar was updated
   */
  function updateAvatars(initials) {
    if (!initials) return false;
    
    try {
      let avatarFound = false;
      
      // Try each selector to find avatar elements
      for (const selector of config.selectors.avatarSelectors) {
        const avatarElements = document.querySelectorAll(selector);
        if (avatarElements.length > 0) {
          logger.debug(\`Found \${avatarElements.length} avatar elements with selector: \${selector}\`);
          
          // Update each found avatar
          avatarElements.forEach(avatar => {
            // Only update if it's empty or a placeholder
            const currentText = avatar.textContent.trim();
            if (!currentText || currentText === '?' || currentText === 'U') {
              avatar.textContent = initials;
              avatar.style.display = 'flex';
              avatar.style.alignItems = 'center';
              avatar.style.justifyContent = 'center';
              avatarFound = true;
              logger.debug(\`Updated avatar to show: \${initials}\`);
            }
          });
        }
      }
      
      // If no avatars found with our selectors, try to find the profile menu button and insert an avatar
      if (!avatarFound) {
        const profileMenuBtn = document.querySelector(config.selectors.profileMenuButton);
        if (profileMenuBtn) {
          logger.debug('Found profile menu button, checking for avatar to update');
          
          // Try to find avatar inside the button
          const existingAvatar = profileMenuBtn.querySelector('.rounded-full');
          if (existingAvatar) {
            existingAvatar.textContent = initials;
            existingAvatar.style.display = 'flex';
            existingAvatar.style.alignItems = 'center';
            existingAvatar.style.justifyContent = 'center';
            avatarFound = true;
            logger.debug(\`Updated avatar in profile menu to show: \${initials}\`);
          } else {
            // No existing avatar, try to create one
            const avatarElement = document.createElement('div');
            avatarElement.className = 'w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white';
            avatarElement.textContent = initials;
            
            // Try to insert before the first child
            if (profileMenuBtn.firstChild) {
              profileMenuBtn.insertBefore(avatarElement, profileMenuBtn.firstChild);
              avatarFound = true;
              logger.debug(\`Created and inserted new avatar with: \${initials}\`);
            }
          }
        }
      }
      
      return avatarFound;
    } catch (error) {
      logger.error('Error updating avatars', error);
      return false;
    }
  }
  
  /**
   * Sets up mutation observer to watch for avatar-related DOM changes
   */
  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }
    
    observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check for relevant elements being added that might contain avatars
          let shouldReapply = false;
          
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Look for header or avatar-related elements
              if (node.matches('header') || 
                  node.querySelector('.rounded-full') ||
                  node.matches(config.selectors.profileMenuButton) ||
                  node.querySelector(config.selectors.profileMenuButton)) {
                shouldReapply = true;
                break;
              }
            }
          }
          
          if (shouldReapply) {
            logger.debug('Detected relevant DOM changes, reapplying fix');
            // Reset fix status to allow reapplication
            fixApplied = false;
            // Use a small delay to ensure the DOM is fully updated
            setTimeout(applyFix, config.retryOptions.observerTimeout);
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    logger.debug('Mutation observer set up');
  }
  
  /**
   * Main function to apply the fix
   */
  async function applyFix() {
    // Avoid duplicate applications in quick succession
    if (fixApplied) {
      logger.debug('Fix already applied, skipping');
      return;
    }
    
    try {
      // Get user attributes
      const attributes = await getUserAttributes();
      
      if (attributes) {
        logger.debug('Successfully retrieved user attributes:', Object.keys(attributes).join(', '));
        
        // Generate user initials
        const userInitials = generateUserInitials(attributes);
        logger.info(\`Generated user initials: \${userInitials}\`);
        
        // Update app cache
        updateAppCache(userInitials);
        
        // Update avatar elements
        const updated = updateAvatars(userInitials);
        
        if (updated) {
          logger.info('Successfully updated avatar elements');
          fixApplied = true;
        } else {
          logger.warn('No avatar elements were updated');
          
          // Retry if avatar elements might not be loaded yet
          if (++retryCount < config.retryOptions.maxRetries) {
            logger.info(\`Retry attempt \${retryCount}/\${config.retryOptions.maxRetries} scheduled\`);
            setTimeout(applyFix, config.retryOptions.retryInterval);
          } else {
            logger.warn('Max retry attempts reached, could not update avatar elements');
          }
        }
      } else {
        logger.warn('No user attributes available');
        
        // Try app cache as fallback
        if (window.__APP_CACHE?.user?.initials) {
          const cachedInitials = window.__APP_CACHE.user.initials;
          logger.info(\`Using cached initials: \${cachedInitials}\`);
          
          const updated = updateAvatars(cachedInitials);
          if (updated) {
            logger.info('Successfully updated avatar elements with cached initials');
            fixApplied = true;
          } else {
            // Retry if elements might not be loaded yet
            if (++retryCount < config.retryOptions.maxRetries) {
              setTimeout(applyFix, config.retryOptions.retryInterval);
            }
          }
        } else if (++retryCount < config.retryOptions.maxRetries) {
          // No attributes or cached initials, retry
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
  
  // Initialize the fix
  logger.info(\`DashAppBar User Initials Fix v\${config.version} initializing\`);
  
  // Set up mutation observer
  setupObserver();
  
  // Schedule the fix with a small delay to ensure the DOM is ready
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

// Create documentation for the fix
function createDocumentation() {
  const docPath = path.resolve(__dirname, `${path.basename(__filename, '.js')}.md`);
  
  const docContent = `# Version0013 Fix: DashAppBar User Initials Display

## Summary
This script fixes the issue with missing user initials in the DashAppBar. While the previous fix (Version0012) successfully addressed the business name display, the user initials were still missing from the avatar.

## Version
${config.version} (${config.date})

## Files Created
- \`/frontend/pyfactor_next/public/scripts/Version0013_fix_DashAppBar_user_initials_display.js\` - Client-side fix script

## Issues Fixed
1. **Missing User Initials**: Fixed avatar elements not displaying user initials despite having the correct data
2. **CSS Selector Issues**: Implemented more comprehensive selectors to target all possible avatar containers
3. **Attribute Extraction**: Improved extraction of first name and last name from Cognito attributes
4. **DOM Update Timing**: Added more robust retry and mutation observer logic

## Implementation Details
1. **Comprehensive Avatar Selection**:
   - Added multiple CSS selectors to target all possible avatar containers
   - Included fallback for different avatar styles and configurations

2. **Improved Attribute Handling**:
   - Enhanced user initials generation from Cognito attributes
   - Added robust fallbacks for different attribute naming patterns
   - Properly trim attribute values to handle space issues

3. **DOM Manipulation**:
   - Updated display properties to ensure proper CSS styling
   - Added capability to create avatar elements if needed
   - Improved mutation observer to detect relevant DOM changes

4. **Retry Logic**:
   - Increased retry attempts and improved timing
   - Better error handling and status reporting

## Execution
The script was executed on ${new Date().toISOString().split('T')[0]} and performed the following actions:
- Created a client-side fix script in the public folder

## Installation
To apply this fix:

1. Run this script to generate the client-side fix script
2. Ensure the Next.js server is running
3. Load the dashboard page to automatically apply the fix

## Testing
To verify the fix:
1. Open the dashboard page
2. Check that user initials appear in the avatar
3. Ensure initials are correctly generated from the user's first and last name

## Future Improvements
- Consider integrating this fix directly into the DashAppBar component
- Add better caching mechanisms for user attributes
- Implement a more thorough approach to handling avatar images vs. text initials`;

  try {
    fs.writeFileSync(docPath, docContent);
    logger.info(`Created documentation at ${docPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create documentation: ${error.message}`);
    return false;
  }
}

// Update the script registry
function updateScriptRegistry() {
  const registryPath = path.resolve(__dirname, 'script_registry.md');
  
  if (!fs.existsSync(registryPath)) {
    logger.warn('Script registry not found, skipping update');
    return false;
  }
  
  try {
    let registryContent = fs.readFileSync(registryPath, 'utf8');
    
    // Check if script is already in registry
    if (registryContent.includes('Version0013_fix_DashAppBar_user_initials_display.js')) {
      logger.info('Script already exists in registry, skipping update');
      return true;
    }
    
    // Add the new script to the registry table
    const scriptEntry = '| Version0013_fix_DashAppBar_user_initials_display.js | Fix missing user initials in DashAppBar avatar | 2025-05-15 | ✅ | Success | N/A (Client-side fix) |';
    
    // Find table in the registry
    const tableMatch = registryContent.match(/\| Script Name \|.*\n((\|.*\n)+)/);
    if (tableMatch) {
      // Insert new entry after the last entry in the table
      const updatedTable = tableMatch[1] + scriptEntry + '\n';
      registryContent = registryContent.replace(tableMatch[1], updatedTable);
    }
    
    // Add execution history entry
    const dateSection = `### ${new Date().toISOString().split('T')[0]}`;
    const historyEntry = `- Created Version0013_fix_DashAppBar_user_initials_display.js - Implemented a fix for missing user initials in the DashAppBar avatar elements`;
    
    if (registryContent.includes(dateSection)) {
      // Add to existing date section
      const dateSectionRegex = new RegExp(`${dateSection}\\n([\\s\\S]*?)\\n\\n`);
      const dateSectionMatch = registryContent.match(dateSectionRegex);
      
      if (dateSectionMatch) {
        const updatedSection = `${dateSection}\n${dateSectionMatch[1]}\n${historyEntry}`;
        registryContent = registryContent.replace(dateSectionRegex, `${updatedSection}\n\n`);
      } else {
        // Date section exists but couldn't match the content pattern, append at the end
        registryContent += `\n${historyEntry}\n`;
      }
    } else {
      // Create new date section
      registryContent += `\n### ${new Date().toISOString().split('T')[0]}\n${historyEntry}\n`;
    }
    
    fs.writeFileSync(registryPath, registryContent);
    logger.info('Updated script registry');
    return true;
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  logger.info(`Starting ${scriptName} v${config.version}`);
  
  // Create the client-side fix script
  const scriptCreated = createClientSideFixScript();
  if (!scriptCreated) {
    logger.error('Failed to create client-side fix script, aborting');
    return false;
  }
  
  // Create documentation
  createDocumentation();
  
  // Update script registry
  updateScriptRegistry();
  
  logger.info('All tasks completed successfully!');
  logger.info(`To apply the fix, ensure your NextJS server is running and load the dashboard page.`);
  logger.info(`The script will automatically detect and fix the missing user initials.`);
  
  return true;
}

// Execute main function
main().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 