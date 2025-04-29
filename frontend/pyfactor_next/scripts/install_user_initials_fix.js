/**
 * User Initials Fix - Installation Script (v1.1.0)
 * 
 * This script automatically installs the user initials fix for the DashAppBar component.
 * It modifies the necessary files to include the script loader and creates backups of all
 * modified files for safety.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  version: '1.1.0',
  mainLayoutPath: path.resolve(__dirname, '../src/app/layout.js'),
  dashLayoutPath: path.resolve(__dirname, '../src/app/dashboard/layout.js'),
  scriptRegistryPath: path.resolve(__dirname, './script_registry.md'),
  publicScriptsDir: path.resolve(__dirname, '../public/scripts'),
  scriptSource: path.resolve(__dirname, './Version0003_fix_user_initials_DashAppBar.js'),
  runScriptPath: path.resolve(__dirname, './run_user_initials_fix.js'),
  scriptTag: `{/* User Initials Fix v1.1.0 */}\n    <script src="/scripts/run_user_initials_fix.js" async></script>`,
  backupDir: path.resolve(__dirname, '../.backups'),
  dateTime: new Date().toISOString().replace(/:/g, '-').split('.')[0]
};

// Utility functions
const logger = {
  info: (msg) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  divider: () => console.log('\x1b[36m' + '-'.repeat(60) + '\x1b[0m')
};

/**
 * Creates a backup of a file before modifying it
 * @param {string} filePath - Path to the file
 * @returns {boolean} - Success status
 */
function createBackup(filePath) {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const backupPath = path.join(
      CONFIG.backupDir, 
      `${fileName}.${CONFIG.dateTime}.bak`
    );
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      logger.info(`Created backup: ${backupPath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    return false;
  }
}

/**
 * Adds the script tag to a layout file
 * @param {string} layoutPath - Path to the layout file
 * @returns {boolean} - Success status
 */
function addScriptToLayout(layoutPath) {
  try {
    if (!fs.existsSync(layoutPath)) {
      logger.warn(`Layout file not found: ${layoutPath}`);
      return false;
    }
    
    // Create backup first
    createBackup(layoutPath);
    
    // Read the layout file
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Check if script is already added
    if (layoutContent.includes('run_user_initials_fix.js')) {
      logger.info(`Script already added to ${path.basename(layoutPath)}`);
      return true;
    }
    
    // Insert script tag before </head>
    const headCloseIndex = layoutContent.indexOf('</head>');
    if (headCloseIndex === -1) {
      logger.warn(`Could not find </head> tag in ${path.basename(layoutPath)}`);
      return false;
    }
    
    const updatedContent = 
      layoutContent.substring(0, headCloseIndex) + 
      '    ' + CONFIG.scriptTag + '\n    ' + 
      layoutContent.substring(headCloseIndex);
    
    // Write the updated content back to the file
    fs.writeFileSync(layoutPath, updatedContent, 'utf8');
    logger.success(`Added script to ${path.basename(layoutPath)}`);
    return true;
  } catch (error) {
    logger.error(`Failed to add script to layout: ${error.message}`);
    return false;
  }
}

/**
 * Creates the loader script in the public folder
 * @returns {boolean} - Success status
 */
function createRunScript() {
  try {
    // Ensure public/scripts directory exists
    if (!fs.existsSync(CONFIG.publicScriptsDir)) {
      fs.mkdirSync(CONFIG.publicScriptsDir, { recursive: true });
    }
    
    // Create the run script content
    const runScriptContent = `/**
 * User Initials Fix - Script Loader (v${CONFIG.version})
 * 
 * This script loads and executes the user initials fix for the DashAppBar component.
 * It fixes the issue with user initials not displaying correctly in the avatar.
 */

(function() {
  // Configuration
  const config = {
    scriptUrl: '/scripts/Version0003_fix_user_initials_DashAppBar.js',
    debug: true,
    retryDelay: 1000,
    maxRetries: 3
  };
  
  // Logger function for debugging
  const log = function(level, message) {
    if (config.debug || level === 'error') {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console[level](\`[UserInitialsFix Loader] [\${timestamp}] \${message}\`);
    }
  };
  
  // Load and execute the fix script
  function loadFixScript() {
    log('info', 'Loading user initials fix script...');
    
    fetch(config.scriptUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(\`Failed to load script: \${response.status} \${response.statusText}\`);
        }
        return response.text();
      })
      .then(scriptContent => {
        log('info', 'Script loaded successfully, executing...');
        // Create and execute script in global context
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptContent;
        document.head.appendChild(scriptElement);
        log('info', 'Script execution completed');
      })
      .catch(error => {
        log('error', \`Error loading fix script: \${error.message}\`);
      });
  }
  
  // Check if we're on a page where the fix should be applied
  function shouldApplyFix() {
    // Apply on dashboard pages or any page with DashAppBar
    return window.location.pathname.includes('/dashboard') || 
           document.querySelector('[data-testid="dash-app-bar"]') !== null;
  }
  
  // Load the script when DOM is ready or when navigating to dashboard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (shouldApplyFix()) loadFixScript();
    });
  } else {
    if (shouldApplyFix()) loadFixScript();
  }
  
  // Also handle client-side navigation (for Next.js)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      if (shouldApplyFix()) loadFixScript();
    }, 300); // Small delay to ensure DOM is updated
  });
})();`;

    fs.writeFileSync(path.join(CONFIG.publicScriptsDir, 'run_user_initials_fix.js'), runScriptContent, 'utf8');
    logger.success('Created run script in public/scripts directory');
    
    // Copy the main fix script to public/scripts
    fs.copyFileSync(
      CONFIG.scriptSource, 
      path.join(CONFIG.publicScriptsDir, 'Version0003_fix_user_initials_DashAppBar.js')
    );
    logger.success('Copied fix script to public/scripts directory');
    
    return true;
  } catch (error) {
    logger.error(`Failed to create run script: ${error.message}`);
    return false;
  }
}

/**
 * Updates the script registry with the new script
 * @returns {boolean} - Success status
 */
function updateScriptRegistry() {
  try {
    const registryPath = CONFIG.scriptRegistryPath;
    let registryContent = '';
    
    // Create registry if it doesn't exist
    if (!fs.existsSync(registryPath)) {
      registryContent = `# Script Registry\n\nThis file contains a registry of all scripts added to the application.\n\n## Scripts\n\n`;
    } else {
      // Read existing registry
      registryContent = fs.readFileSync(registryPath, 'utf8');
      // Create backup
      createBackup(registryPath);
    }
    
    // Check if script is already in registry
    if (registryContent.includes('User Initials Fix')) {
      logger.info('Script already in registry');
      return true;
    }
    
    // Add script to registry
    const scriptEntry = `### User Initials Fix v${CONFIG.version}
- **Date Added**: ${new Date().toISOString().split('T')[0]}
- **Purpose**: Fixes user initials not displaying in DashAppBar avatar
- **Files**:
  - \`/public/scripts/Version0003_fix_user_initials_DashAppBar.js\`
  - \`/public/scripts/run_user_initials_fix.js\`
- **Added to**:
  - \`src/app/layout.js\`
  - \`src/app/dashboard/layout.js\` (if exists)
- **Description**: Retrieves user attributes from Cognito, generates initials, and updates the UI

`;
    
    registryContent += scriptEntry;
    fs.writeFileSync(registryPath, registryContent, 'utf8');
    logger.success('Updated script registry');
    return true;
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
    return false;
  }
}

/**
 * Main installation function
 */
function install() {
  logger.divider();
  logger.info(`Starting User Initials Fix installation (v${CONFIG.version})`);
  logger.divider();
  
  // Create scripts
  createRunScript();
  
  // Add script to layouts
  const mainLayoutSuccess = addScriptToLayout(CONFIG.mainLayoutPath);
  const dashLayoutSuccess = fs.existsSync(CONFIG.dashLayoutPath) ? 
    addScriptToLayout(CONFIG.dashLayoutPath) : false;
  
  // Update registry
  updateScriptRegistry();
  
  // Installation summary
  logger.divider();
  logger.info('Installation Summary:');
  logger.info(`Main Layout: ${mainLayoutSuccess ? 'Updated ✅' : 'Not updated ❌'}`);
  logger.info(`Dashboard Layout: ${dashLayoutSuccess ? 'Updated ✅' : 'Not found or not updated ❌'}`);
  logger.info(`Scripts Created: ✅`);
  logger.info(`Registry Updated: ✅`);
  logger.divider();
  
  if (mainLayoutSuccess) {
    logger.success('Installation completed successfully!');
    logger.info('Please restart your Next.js server to apply the changes:');
    logger.info('  pnpm run dev');
  } else {
    logger.warn('Installation completed with warnings.');
    logger.info('Please check the logs above and manually complete any missing steps.');
  }
  logger.divider();
}

// Run the installation
install(); 