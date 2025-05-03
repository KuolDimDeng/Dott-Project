/**
 * Version0047_fix_tenant_id_casing_in_user_management.mjs
 * 
 * This script fixes an issue in the CognitoAttributes utility where the 
 * getTenantId method only looks for 'custom:tenant_ID' but doesn't check
 * other casing variations or the businessid attribute.
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
const cognitoAttributesPath = path.join(__dirname, '../src/utils/CognitoAttributes.js');
const backupPath = path.join(__dirname, 'backups', `CognitoAttributes.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

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

// Main function to fix tenant ID casing issue
async function fixTenantIdCasingIssue() {
  try {
    // Backup the file first
    if (!backupFile(cognitoAttributesPath, backupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the file content
    let content = fs.readFileSync(cognitoAttributesPath, 'utf8');
    
    // Update the getTenantId method to check multiple attribute names
    const oldGetTenantIdMethod = `  /**
   * Get tenant ID with correct casing
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The tenant ID or null if not found
   */
  getTenantId(attributes) {
    return this.getValue(attributes, this.TENANT_ID);
  },`;
  
    const newGetTenantIdMethod = `  /**
   * Get tenant ID with correct casing - checks multiple possible attribute names
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The tenant ID or null if not found
   */
  getTenantId(attributes) {
    // Check all possible tenant ID attribute names in order of preference
    return this.getValue(attributes, this.TENANT_ID) || 
           this.getValue(attributes, this.BUSINESS_ID) ||
           this.getValue(attributes, 'custom:tenant_id') ||
           this.getValue(attributes, 'custom:tenantId') ||
           this.getValue(attributes, 'custom:tenantID') ||
           this.getValue(attributes, 'custom:tenant-id');
  },`;
    
    content = content.replace(oldGetTenantIdMethod, newGetTenantIdMethod);
    
    // Also update CustomAttributes.TENANT_ID to use lowercase 'id' to match server usage
    const oldAttributeDefinition = `  TENANT_ID: 'custom:tenant_ID', // Note the uppercase ID`;
    const newAttributeDefinition = `  TENANT_ID: 'custom:tenant_ID', // Note the uppercase ID - This matches server configuration
  // Additional aliases for TENANT_ID to support various casing that might exist
  TENANT_ID_LC: 'custom:tenant_id', // lowercase version`;
    
    content = content.replace(oldAttributeDefinition, newAttributeDefinition);
    
    // Write the updated content back to the file
    fs.writeFileSync(cognitoAttributesPath, content);
    
    console.log('✅ Successfully updated CognitoAttributes.js to fix tenant ID casing issue');
    
    // Update script registry
    updateScriptRegistry(
      'Version0047_fix_tenant_id_casing_in_user_management.mjs',
      'Fixes tenant ID casing issue in CognitoAttributes utility by making getTenantId check multiple attribute formats',
      'EXECUTED'
    );
    
    console.log('✅ Script execution completed successfully!');
  } catch (error) {
    console.error(`❌ Error fixing tenant ID casing issue: ${error.message}`);
    // Try to restore from backup if there was an error
    try {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, cognitoAttributesPath);
        console.log('✅ Restored original file from backup due to error');
      }
    } catch (restoreError) {
      console.error(`❌ Failed to restore backup: ${restoreError.message}`);
    }
    
    // Update script registry with failure
    updateScriptRegistry(
      'Version0047_fix_tenant_id_casing_in_user_management.mjs',
      'Attempt to fix tenant ID casing issue in CognitoAttributes utility',
      'FAILED'
    );
  }
}

// Execute the function
fixTenantIdCasingIssue()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 