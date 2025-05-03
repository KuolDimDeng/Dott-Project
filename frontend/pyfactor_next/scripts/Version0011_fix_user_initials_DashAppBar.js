/**
 * Version0011_fix_user_initials_DashAppBar.js
 * 
 * Script to fix user initials in DashAppBar component by properly using CognitoAttributes utility
 * 
 * PROBLEM: DashAppBar uses direct attribute access for user initials instead of the CognitoAttributes
 * utility, causing the initials to show 'U' instead of the proper initials from given_name and family_name.
 * 
 * SOLUTION: Update the generateUserInitialsFixed function to use CognitoAttributes.getUserInitials
 * and import the utility properly.
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  targetFile: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
  backupDir: '/Users/kuoldeng/projectx/scripts/backups',
  cognitoUtilPath: '@/utils/CognitoAttributes',
  scriptRegistryPath: '/Users/kuoldeng/projectx/scripts/script_registry.json'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// Logger utility
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`)
};

/**
 * Creates a backup of the target file
 */
function createBackup() {
  const fileName = path.basename(CONFIG.targetFile);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(CONFIG.targetFile, backupPath);
    logger.info(`Backup created at: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Updates the script registry
 */
function updateScriptRegistry(status) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist or read existing registry
    if (fs.existsSync(CONFIG.scriptRegistryPath)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistryPath, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Format entry to match existing registry
    const newEntry = {
      "scriptName": "Version0011_fix_user_initials_DashAppBar.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix user initials in DashAppBar by using CognitoAttributes utility",
      "status": status ? "SUCCESS" : "FAILED",
      "filesModified": [
        CONFIG.targetFile
      ]
    };
    
    // Add new entry to registry
    registry.push(newEntry);
    
    fs.writeFileSync(
      CONFIG.scriptRegistryPath, 
      JSON.stringify(registry, null, 2), 
      'utf8'
    );
    
    logger.info('Script registry updated');
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
  }
}

/**
 * Main fix function - updates the DashAppBar.js file
 */
async function applyFix() {
  logger.info('Starting fix for user initials in DashAppBar...');
  
  try {
    // Create backup first
    const backupPath = createBackup();
    
    // Read the file content
    const content = fs.readFileSync(CONFIG.targetFile, 'utf8');
    
    // Check if import is already present
    const hasImport = content.includes("import CognitoAttributes from");
    
    // Fix imports section first
    let newContent = content;
    
    if (!hasImport) {
      // Find imports section
      const importSectionEndIndex = content.lastIndexOf("import") + 
        content.substring(content.lastIndexOf("import")).indexOf(';') + 1;
      
      // Add import after last import
      newContent = 
        content.substring(0, importSectionEndIndex) + 
        "\nimport CognitoAttributes from '@/utils/CognitoAttributes';" + 
        content.substring(importSectionEndIndex);
    }
    
    // Update generateUserInitialsFixed function to use CognitoAttributes
    const functStart = "const generateUserInitialsFixed = (attributes) => {";
    const functEnd = "return 'U';\n};";
    
    // Find the function in the content
    const startIdx = newContent.indexOf(functStart);
    const endIdx = newContent.indexOf(functEnd, startIdx) + functEnd.length;
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error("Could not find generateUserInitialsFixed function in the file");
    }
    
    // Replace with new implementation using CognitoAttributes
    const newFunction = `const generateUserInitialsFixed = (attributes) => {
  if (!attributes) return 'U';
  
  // Use CognitoAttributes utility to get user initials properly
  return CognitoAttributes.getUserInitials(attributes);
};`;
    
    newContent = 
      newContent.substring(0, startIdx) + 
      newFunction + 
      newContent.substring(endIdx);
    
    // Write the updated content back to file
    fs.writeFileSync(CONFIG.targetFile, newContent, 'utf8');
    
    logger.success('Fix successfully applied to DashAppBar.js!');
    updateScriptRegistry(true);
    
    return {
      success: true,
      message: 'User initials in DashAppBar now properly use CognitoAttributes utility',
      backupPath
    };
  } catch (error) {
    logger.error(`Failed to apply fix: ${error.message}`);
    updateScriptRegistry(false);
    
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Execute the fix
applyFix().then(result => {
  if (result.success) {
    logger.success(result.message);
    logger.info(`Backup created at: ${result.backupPath}`);
  } else {
    logger.error(result.message);
  }
}); 