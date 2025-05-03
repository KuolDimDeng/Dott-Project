/**
 * Version0048_fix_reference_error_in_SettingsManagement.mjs
 * 
 * This script fixes a ReferenceError in the SettingsManagement component where
 * the user variable is being accessed before it's declared, causing a lexical 
 * declaration error.
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
const backupPath = path.join(__dirname, 'backups', `SettingsManagement.js.backup-refError-${new Date().toISOString().replace(/:/g, '-')}`);

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

// Main function to fix reference error
async function fixReferenceError() {
  try {
    // Backup the file first
    if (!backupFile(settingsManagementPath, backupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the file content
    let content = fs.readFileSync(settingsManagementPath, 'utf8');
    
    // Fix the console.log statement that is causing the reference error
    // The issue is that we're using 'user' before it's declared
    const componentLogLine = `console.log('[SettingsManagement] Component rendering', { hasUser: !!user, hasAttributes: !!(user && user.attributes) });`;
    const fixedComponentLogLine = `console.log('[SettingsManagement] Component rendering');`;
    
    content = content.replace(componentLogLine, fixedComponentLogLine);
    
    // Move the enhanced logging after the user declaration
    const userDeclarationLine = `const { user } = useAuth();`;
    const movedLogging = `${userDeclarationLine}
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // Log component initialization with user data
  console.log('[SettingsManagement] Component initialized with user data:', { 
    hasUser: !!user, 
    hasAttributes: !!(user && user.attributes),
    userRole: user?.attributes?.['custom:userrole'] 
  });`;
    
    content = content.replace(userDeclarationLine, movedLogging);
    
    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content);
    
    console.log('✅ Successfully fixed reference error in SettingsManagement.js');
    
    // Update script registry
    updateScriptRegistry(
      'Version0048_fix_reference_error_in_SettingsManagement.mjs',
      'Fixes ReferenceError for user variable being accessed before declaration in SettingsManagement.js',
      'EXECUTED'
    );
    
    console.log('✅ Script execution completed successfully!');
  } catch (error) {
    console.error(`❌ Error fixing reference error: ${error.message}`);
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
      'Version0048_fix_reference_error_in_SettingsManagement.mjs',
      'Attempt to fix ReferenceError in SettingsManagement.js',
      'FAILED'
    );
  }
}

// Execute the function
fixReferenceError()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 