/**
 * Version0045_fix_tenant_id_in_user_management.mjs
 * 
 * This script fixes an issue in the SettingsManagement component where the tenant ID
 * is not being found correctly, causing "Tenant ID not found" errors when trying to 
 * display the users list in the user management section.
 * 
 * The issue is that the component is not using the CognitoAttributes utility correctly
 * and doesn't handle the case when tenant ID might be stored in custom:businessid.
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
const backupPath = path.join(__dirname, 'backups', `SettingsManagement.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

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

// Main function to fix the tenant ID issue
async function fixTenantIDIssue() {
  try {
    // Backup the file first
    if (!backupFile(settingsManagementPath, backupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the file content
    let content = fs.readFileSync(settingsManagementPath, 'utf8');
    
    // Fix 1: Update the tenant ID retrieval in fetchCognitoUsers function
    // This is the main issue - not using the CognitoAttributes utility correctly
    const oldTenantIdCheck = `const currentTenantId = CognitoAttributes.getTenantId(user.attributes);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        setLoading(false);
        return;
      }`;
      
    const newTenantIdCheck = `// Try to get tenant ID from multiple possible attributes
      const currentTenantId = CognitoAttributes.getTenantId(user.attributes) || 
                             CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        setLoading(false);
        return;
      }`;
    
    content = content.replace(oldTenantIdCheck, newTenantIdCheck);
    
    // Fix 2: Update the Filter in the ListUsersCommand to handle different possible tenant ID attribute names
    const oldFilterCommand = `      // Configure the ListUsers command to filter by tenant ID
      const command = new ListUsersCommand({
        UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        Filter: \`custom:tenant_ID = "\${currentTenantId}"\`,
        Limit: 60
      });`;
      
    const newFilterCommand = `      // Configure the ListUsers command to filter by tenant ID or business ID
      const command = new ListUsersCommand({
        UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        Filter: \`custom:tenant_ID = "\${currentTenantId}" or custom:businessid = "\${currentTenantId}"\`,
        Limit: 60
      });`;
      
    content = content.replace(oldFilterCommand, newFilterCommand);
    
    // Fix 3: Update the imports to include CognitoIdentityProviderClient and ListUsersCommand
    const importStatement = `import React, { useState, useEffect, useCallback, useRef } from 'react';`;
    const newImportStatement = `import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";`;

    content = content.replace(importStatement, newImportStatement);
    
    // Fix 4: Update tenant ID check in handleAddUser function
    const oldAddUserTenantCheck = `      const tenantId = CognitoAttributes.getTenantId(user.attributes);
      if (!tenantId) {
        notifyError('Tenant ID not found');
        setIsSubmitting(false);
        return;
      }`;
      
    const newAddUserTenantCheck = `      const tenantId = CognitoAttributes.getTenantId(user.attributes) || 
                   CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID);
      if (!tenantId) {
        notifyError('Tenant ID not found');
        setIsSubmitting(false);
        return;
      }`;
      
    content = content.replace(oldAddUserTenantCheck, newAddUserTenantCheck);
    
    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    
    console.log('✅ Successfully fixed tenant ID issues in SettingsManagement.js');
    
    // Update script registry
    updateScriptRegistry(
      'Version0045_fix_tenant_id_in_user_management.mjs',
      'Fixes tenant ID not found error in User Management list by supporting both custom:tenant_ID and custom:businessid attributes',
      'EXECUTED'
    );
    
    console.log('✅ Script execution completed successfully!');
  } catch (error) {
    console.error(`❌ Error fixing tenant ID issue: ${error.message}`);
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
      'Version0045_fix_tenant_id_in_user_management.mjs',
      'Attempt to fix tenant ID not found error in User Management list',
      'FAILED'
    );
  }
}

// Execute the fix function
fixTenantIDIssue()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 