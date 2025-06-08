#!/usr/bin/env node

/**
 * Version0181_fix_remaining_amplify_syntax_errors.mjs
 * 
 * This script fixes the remaining syntax errors in files with Amplify imports
 * that were caught during the build process.
 * 
 * Issues fixed:
 * 1. Duplicate variable declarations in SignInForm.js
 * 2. Missing imports in DashboardClient.js
 * 3. 'use client' directive not at top of DashboardLoader.js
 * 4. Import syntax errors in hooks/auth.js
 * 5. Duplicate imports in i18n.js
 * 
 * @author Cline AI
 * @date 2025-06-07
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Setup logging with timestamps
const logger = {
  info: (message) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`),
  warn: (message) => console.log(`[${new Date().toISOString()}] [WARN] ${message}`),
  error: (message) => console.log(`[${new Date().toISOString()}] [ERROR] ${message}`),
};

// Helper function to backup and update a file
function backupAndUpdateFile(filePath, newContent) {
  try {
    if (!fs.existsSync(filePath)) {
      logger.error(`File does not exist: ${filePath}`);
      return false;
    }

    // Create a backup with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '').split('.')[0];
    const backupPath = `${filePath}.backup_${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    logger.info(`Created backup at: ${backupPath}`);

    // Write the new content
    fs.writeFileSync(filePath, newContent);
    logger.info(`Successfully updated ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

// Fix SignInForm.js - Remove duplicate variable declaration
async function fixSignInForm() {
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`SignInForm.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix duplicate variable declaration
    // Pattern: Remove the second declaration of "const user"
    content = content.replace(
      /const user = await getAuth0UserProfile\(\);\s+const user = await getAuth0UserProfile\(\);/g,
      'const user = await getAuth0UserProfile();'
    );

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error fixing SignInForm.js: ${error.message}`);
    return false;
  }
}

// Fix DashboardClient.js - Fix import and syntax issues
async function fixDashboardClient() {
  const filePath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`DashboardClient.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix incomplete import statement
    content = content.replace(
      /const { fetchUserAttributes, fetchAuthSession } = await\s+\/\/ Get the user attributes directly from Cognito/g,
      'const { fetchUserAttributes, fetchAuthSession } = await import("../../../utils/auth0Adapter.js");\n// Get the user attributes directly from Cognito'
    );

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error fixing DashboardClient.js: ${error.message}`);
    return false;
  }
}

// Fix DashboardLoader.js - Move 'use client' directive to top
async function fixDashboardLoader() {
  const filePath = path.join(projectRoot, 'src/components/DashboardLoader.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`DashboardLoader.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove 'use client' from current position
    content = content.replace(/'use client';/g, '');
    
    // Add 'use client' to the top of the file
    content = "'use client';\n\n" + content;

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error fixing DashboardLoader.js: ${error.message}`);
    return false;
  }
}

// Fix hooks/auth.js - Fix import syntax errors
async function fixAuthHooks() {
  const filePath = path.join(projectRoot, 'src/hooks/auth.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`auth.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix import syntax
    content = content.replace(
      /import {\nimport { SafeHub } from ''utils\/safeHub'' \(see below for file content\);/g,
      "import { SafeHub } from '../utils/auth0Adapter.js';"
    );
    
    // Fix other import syntax
    content = content.replace(
      /import { CognitoNetworkDiagnostic } from ''utils\/cognitoNetworkDiagnostic'' \(see below for file content\);/g,
      "import { CognitoNetworkDiagnostic } from '../utils/auth0Adapter.js';"
    );
    
    // Fix logger import
    content = content.replace(
      /import { logger } from ''utils\/logger'' \(see below for file content\);/g,
      "import { logger } from '../utils/logger.js';"
    );
    
    // Fix refreshUserSession import
    content = content.replace(
      /import { setupHubDeduplication } from ''utils\/refreshUserSession'' \(see below for file content\);/g,
      "import { setupHubDeduplication } from '../utils/auth0Adapter.js';"
    );

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error fixing auth.js: ${error.message}`);
    return false;
  }
}

// Fix i18n.js - Fix duplicate imports and 'use client' directive
async function fixI18n() {
  const filePath = path.join(projectRoot, 'src/i18n.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`i18n.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the first import and move 'use client' to the top
    content = content.replace(
      /import appCache from '\.\.\/utils\/appCache';\s+\s+'use client';/g,
      "'use client';"
    );
    
    // Fix duplicate appCache import
    content = content.replace(
      /import { appCache } from '\.\.\/utils\/appCache';/g,
      "import { appCache } from './utils/appCache.js';"
    );

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error fixing i18n.js: ${error.message}`);
    return false;
  }
}

// Create logger.js if it doesn't exist
async function createLoggerUtility() {
  const filePath = path.join(projectRoot, 'src/utils/logger.js');
  
  try {
    if (fs.existsSync(filePath)) {
      logger.info(`logger.js already exists at: ${filePath}`);
      return true;
    }

    const content = `/**
 * logger.js
 * Utility for consistent logging throughout the application
 */

'use client';

// Simple logger with different log levels
export const logger = {
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(\`[DEBUG] \${message}\`, ...args);
    }
  },
  
  info: (message, ...args) => {
    console.info(\`[INFO] \${message}\`, ...args);
  },
  
  warn: (message, ...args) => {
    console.warn(\`[WARN] \${message}\`, ...args);
  },
  
  error: (message, ...args) => {
    console.error(\`[ERROR] \${message}\`, ...args);
  },
  
  // Log specifically for Auth0 operations
  auth: (message, ...args) => {
    console.log(\`[AUTH] \${message}\`, ...args);
  },
  
  // Log for tenant operations
  tenant: (message, ...args) => {
    console.log(\`[TENANT] \${message}\`, ...args);
  }
};

export default logger;
`;

    // Create directory if it doesn't exist
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, content);
    logger.info(`Created logger utility at: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Error creating logger.js: ${error.message}`);
    return false;
  }
}

// Update Auth0 adapter to include the SafeHub utility
async function enhanceAuth0Adapter() {
  const filePath = path.join(projectRoot, 'src/utils/auth0Adapter.js');
  
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`auth0Adapter.js not found at: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add SafeHub and CognitoNetworkDiagnostic to the exports
    if (!content.includes('export const SafeHub')) {
      const safeHubCode = `
/**
 * SafeHub utility - Auth0 adapter for Cognito's Hub
 */
export const SafeHub = {
  listen: (channel, callback) => {
    // Auth0 doesn't have a direct equivalent to Cognito's Hub
    // This is a compatibility layer that simulates the behavior
    console.log('[SafeHub] Registered listener for channel:', channel);
    
    // Return a dummy method for removing the listener
    return {
      remove: () => {
        console.log('[SafeHub] Removed listener for channel:', channel);
      }
    };
  }
};

/**
 * CognitoNetworkDiagnostic - Compatibility layer for network diagnostics
 */
export const CognitoNetworkDiagnostic = {
  checkConnection: async () => {
    try {
      // Simple connection test
      const response = await fetch('https://auth.dottapps.com/.well-known/openid-configuration');
      return response.ok;
    } catch (error) {
      console.error('[CognitoNetworkDiagnostic] Connection check failed:', error);
      return false;
    }
  }
};

/**
 * setupHubDeduplication - Compatibility layer for Hub deduplication
 */
export const setupHubDeduplication = () => {
  console.log('[Auth0Adapter] Hub deduplication setup (compatibility layer)');
  // This is a no-op in Auth0, just for compatibility
  return {
    cleanup: () => {
      console.log('[Auth0Adapter] Hub deduplication cleanup');
    }
  };
};`;

      // Add the new utilities before the final export
      content = content.replace(
        /export default {/g, 
        `${safeHubCode}\n\nexport default {`
      );
    }

    return backupAndUpdateFile(filePath, content);
  } catch (error) {
    logger.error(`Error enhancing auth0Adapter.js: ${error.message}`);
    return false;
  }
}

// Main function to run everything
async function main() {
  logger.info('Starting script to fix remaining Amplify syntax errors');
  
  // Create logger utility first as it's needed by other fixes
  await createLoggerUtility();
  
  // Enhance Auth0 adapter
  await enhanceAuth0Adapter();
  
  // Fix each file
  await fixSignInForm();
  await fixDashboardClient();
  await fixDashboardLoader();
  await fixAuthHooks();
  await fixI18n();
  
  logger.info('Script completed successfully');
}

// Run the script
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
