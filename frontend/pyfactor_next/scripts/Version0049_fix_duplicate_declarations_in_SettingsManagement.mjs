/**
 * Version0049_fix_duplicate_declarations_in_SettingsManagement.mjs
 * 
 * This script fixes a build error in the SettingsManagement component where
 * variables (notifySuccess, notifyError) were declared twice due to our
 * previous fix.
 *
 * Version: 1.0.0
 * Created: 2025-05-03
 * Author: Claude
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const settingsManagementPath = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const backupPath = path.join(__dirname, 'backups', `SettingsManagement.js.backup-duplicateVars-${new Date().toISOString().replace(/:/g, '-')}`);

// Create the backup directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'backups'))) {
  fs.mkdirSync(path.join(__dirname, 'backups'), { recursive: true });
}

// Function to create a backup of the file
function backupFile(sourcePath, backupPath) {
  try {
    fs.copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    return false;
  }
}

// Function to update the script registry
function updateScriptRegistry(scriptName, description, status) {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const timestamp = new Date().toISOString();
  
  let registryContent = '';
  
  try {
    if (fs.existsSync(registryPath)) {
      registryContent = fs.readFileSync(registryPath, 'utf8');
    } else {
      registryContent = '# Script Registry\n\n| Script Name | Description | Status | Timestamp |\n| ----------- | ----------- | ------ | --------- |\n';
    }
    
    // Add new entry to registry
    const newEntry = `| ${scriptName} | ${description} | ${status} | ${timestamp} |\n`;
    
    // Check if the entry already exists
    if (!registryContent.includes(scriptName)) {
      registryContent += newEntry;
    } else {
      // Update existing entry
      const lines = registryContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.includes(scriptName)) {
          return newEntry.trim();
        }
        return line;
      });
      registryContent = updatedLines.join('\n');
    }
    
    fs.writeFileSync(registryPath, registryContent);
    console.log(`✅ Script registry updated at ${registryPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update script registry: ${error.message}`);
    return false;
  }
}

// Main function to fix duplicate declarations
async function fixDuplicateDeclarations() {
  try {
    // Backup the file first
    if (!backupFile(settingsManagementPath, backupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the file content
    let content = fs.readFileSync(settingsManagementPath, 'utf8');
    
    // Fix the duplicate declarations by removing them from the inserted logging code
    // and keeping only the original declarations
    const badInsertedCode = `const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // Log component initialization with user data
  console.log('[SettingsManagement] Component initialized with user data:', { 
    hasUser: !!user, 
    hasAttributes: !!(user && user.attributes),
    userRole: user?.attributes?.['custom:userrole'] 
  });`;
  
    // Replace with corrected version that doesn't redeclare variables
    const fixedInsertedCode = `const { user } = useAuth();
  
  // Log component initialization with user data
  console.log('[SettingsManagement] Component initialized with user data:', { 
    hasUser: !!user, 
    hasAttributes: !!(user && user.attributes),
    userRole: user?.attributes?.['custom:userrole'] 
  });
  
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);`;
    
    content = content.replace(badInsertedCode, fixedInsertedCode);
    
    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content);
    
    console.log('✅ Successfully fixed duplicate declarations in SettingsManagement.js');
    
    // Update script registry
    updateScriptRegistry(
      'Version0049_fix_duplicate_declarations_in_SettingsManagement.mjs',
      'Fixes duplicate variable declarations (notifySuccess, notifyError) in SettingsManagement.js',
      'EXECUTED'
    );
    
    console.log('✅ Script execution completed successfully!');
  } catch (error) {
    console.error(`❌ Error fixing duplicate declarations: ${error.message}`);
    // Try to restore from backup if there was an error
    try {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, settingsManagementPath);
        console.log('✅ Restored original file from backup due to error');
      }
    } catch (restoreError) {
      console.error(`❌ Failed to restore backup: ${restoreError.message}`);
    }
    
    // Update script registry with failure
    updateScriptRegistry(
      'Version0049_fix_duplicate_declarations_in_SettingsManagement.mjs',
      'Attempt to fix duplicate variable declarations in SettingsManagement.js',
      'FAILED'
    );
  }
}

// Execute the function
fixDuplicateDeclarations()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 