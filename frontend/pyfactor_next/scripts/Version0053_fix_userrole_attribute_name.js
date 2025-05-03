/**
 * Version0053_fix_userrole_attribute_name.js
 * 
 * Purpose: Fix the attribute name for user roles from 'custom:role' to 'custom:userrole'
 * 
 * This script addresses the error:
 * "Attributes did not conform to the schema: Type for attribute {custom:role} could not be determined"
 * 
 * The issue is that we're using 'custom:role' in our code but the Cognito User Pool 
 * schema expects 'custom:userrole' as the attribute name.
 * 
 * Version: 1.0
 * Date: 2025-05-03
 * Author: System
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FILE_COGNITO = path.join(ROOT_DIR, 'src', 'utils', 'cognito.js');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create timestamped backup name
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
const BACKUP_FILE_COGNITO = path.join(BACKUP_DIR, `cognito.js.backup-${timestamp}`);

// Utility function to log messages
function log(message) {
  console.log(`[fix_userrole_attribute_name] ${message}`);
}

// Function to back up a file
function backupFile(sourcePath, backupPath) {
  try {
    fs.copyFileSync(sourcePath, backupPath);
    log(`Backed up ${path.basename(sourcePath)} to ${path.basename(backupPath)}`);
    return true;
  } catch (error) {
    log(`Error backing up ${path.basename(sourcePath)}: ${error.message}`);
    return false;
  }
}

// Function to update the cognito.js file
function updateCognitoFile() {
  try {
    log('Reading cognito.js file...');
    let content = fs.readFileSync(SOURCE_FILE_COGNITO, 'utf8');
    
    // Update the userAttributes array to use 'custom:userrole' instead of 'custom:role'
    const incorrectRoleAttr = /{ Name: ['"]custom:role['"], Value: /g;
    const correctRoleAttr = '{ Name: "custom:userrole", Value: ';
    
    const updatedContent = content.replace(incorrectRoleAttr, correctRoleAttr);
    
    // Also update any direct references elsewhere in the file
    const directRefPattern = /['"]custom:role['"]/g;
    const finalContent = updatedContent.replace(directRefPattern, '"custom:userrole"');
    
    // Write updated content back to file
    fs.writeFileSync(SOURCE_FILE_COGNITO, finalContent);
    
    // Check if changes were made
    if (content === finalContent) {
      log('No changes were needed to cognito.js file');
      return false;
    } else {
      log('Successfully updated cognito.js file to use custom:userrole');
      return true;
    }
  } catch (error) {
    log(`Error updating cognito.js file: ${error.message}`);
    return false;
  }
}

// Function to update the script registry
function updateScriptRegistry() {
  try {
    const REGISTRY_FILE = path.join(__dirname, 'script_registry.md');
    
    log('Reading script registry...');
    let registry = fs.readFileSync(REGISTRY_FILE, 'utf8');
    
    // Generate entry for the registry
    const scriptName = 'Version0053_fix_userrole_attribute_name.js';
    const dateExecuted = new Date().toISOString().split('T')[0];
    const entryLine = `| F0053 | ${scriptName} | Fixes user role attribute name from 'custom:role' to 'custom:userrole' to match Cognito schema | ${dateExecuted} | Executed | src/utils/cognito.js |\n`;
    
    // Insert the new entry after the table header
    const tablePattern = /\| Script ID \| Script Name \| Purpose \| Created Date \| Status \| Applied To \|\n\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|/;
    registry = registry.replace(tablePattern, `$&\n${entryLine}`);
    
    // Write updated registry back to file
    fs.writeFileSync(REGISTRY_FILE, registry);
    log('Successfully updated script registry');
    return true;
  } catch (error) {
    log(`Error updating script registry: ${error.message}`);
    return false;
  }
}

// Main function to execute the script
async function main() {
  log('Starting fix for user role attribute name...');
  
  // Step 1: Back up the file
  const cognitoBackupSuccess = backupFile(SOURCE_FILE_COGNITO, BACKUP_FILE_COGNITO);
  
  if (!cognitoBackupSuccess) {
    log('Failed to back up file. Aborting script execution.');
    return false;
  }
  
  // Step 2: Update cognito.js file
  const cognitoUpdateSuccess = updateCognitoFile();
  
  // Step 3: Update script registry if changes were made
  if (cognitoUpdateSuccess) {
    const registryUpdateSuccess = updateScriptRegistry();
    
    if (registryUpdateSuccess) {
      log('Successfully completed all updates!');
      
      // Provide additional documentation about the changes
      log('\nFixes implemented:');
      log('1. Changed attribute name from "custom:role" to "custom:userrole" in the createCognitoUser function');
      log('2. Updated all direct references to "custom:role" throughout the file');
      log('\nThis change ensures compatibility with the Cognito User Pool schema,');
      log('which expects the "custom:userrole" attribute for user role information.');
      
      return true;
    } else {
      log('Failed to update script registry. Please update it manually.');
    }
  } else {
    log('No changes were needed or updates failed. Script execution incomplete.');
    return false;
  }
}

// Execute the script
main().catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
});

export default main; 